import { describe, expect, it } from "vitest";
import turerJson from "../../../testdata/turer.json";
import { lagStandardSok } from "../sok";
import { osloTilUtc } from "../tid";
import { TurdatasettSkjema } from "../turdata/skjema";
import { byggSidedata, type SidedataInput } from "./lag-sidedata";
import { type Sidedata, SidedataSkjema } from "./sidedata";

// Sidedataene (story 1.10, AD-18) mot testdata/turer.json.

const { turer } = TurdatasettSkjema.parse(turerJson);

function sidedata(na: number, demo: SidedataInput["demo"] = null): Sidedata {
  const s = byggSidedata({ na, turer, demo, sprakmodell: false });
  const lest = SidedataSkjema.safeParse(s);
  expect(lest.error?.issues).toBeUndefined();
  return s;
}

const last = (s: Sidedata, i: 0 | 1) => s.skjema.turdager[i].startvalg.filter((v) => v.last).map((v) => v.verdi);

describe("byggSidedata", () => {
  it("13:30: 06:00–13:15 er låst i dag, ingenting i morgen", () => {
    const s = sidedata(osloTilUtc("2026-11-09", "13:30"));
    expect(s.skjema.turdager[0]).toMatchObject({ dato: "2026-11-09", etikett: "I dag", last: false });
    expect(s.skjema.turdager[1]).toMatchObject({ dato: "2026-11-10", etikett: "I morgen", last: false });
    expect(s.skjema.turdager[0].startvalg).toHaveLength(65);
    expect(s.skjema.turdager[0].startvalg[0].verdi).toBe("06:00");
    expect(s.skjema.turdager[0].startvalg.at(-1)?.verdi).toBe("22:00");
    expect(last(s, 0)).toHaveLength(30);
    expect(last(s, 0).at(-1)).toBe("13:15");
    expect(last(s, 1)).toEqual([]);
    expect(s.skjema.standardSok).toEqual(lagStandardSok(osloTilUtc("2026-11-09", "13:30")));
  });

  it("13:31: 13:30 er låst, og standard er 13:45", () => {
    const s = sidedata(osloTilUtc("2026-11-09", "13:30") + 60_000);
    expect(last(s, 0).at(-1)).toBe("13:30");
    expect(s.skjema.standardSok.start).toBe("13:45");
  });

  it("22:00 er ikke låst kl. 22:00, men «I dag» er låst kl. 22:01", () => {
    expect(sidedata(osloTilUtc("2026-11-09", "22:00")).skjema.turdager[0].last).toBe(false);
    const s = sidedata(osloTilUtc("2026-11-09", "22:00") + 60_000);
    expect(s.skjema.turdager[0].last).toBe(true);
    expect(last(s, 0)).toHaveLength(65);
    expect(s.skjema.standardSok).toMatchObject({ dato: "2026-11-10", start: "10:00" });
  });

  // Sommertid starter 29. mars (UTC+2) og slutter 25. oktober (UTC+1). «Nå» står i UTC, så testen
  // ikke bruker koden den tester: 09:07 i Oslo begge dager låser 06:00–09:00, og 09:15 er ledig.
  it.each([
    ["2026-03-29", "2026-03-30", Date.UTC(2026, 2, 29, 7, 7)],
    ["2026-10-25", "2026-10-26", Date.UTC(2026, 9, 25, 8, 7)],
  ])("sommertidsskiftet %s: 06:00–09:00 er låst kl. 09:07", (iDag, iMorgen, na) => {
    const s = sidedata(na);
    expect(s.skjema.turdager.map((d) => d.dato)).toEqual([iDag, iMorgen]);
    expect(last(s, 0)).toHaveLength(13);
    expect(last(s, 0).at(-1)).toBe("09:00");
    expect(last(s, 1)).toEqual([]);
    expect(s.skjema.standardSok).toMatchObject({ dato: iDag, start: "09:15" });
  });

  it("tidlig morgen: ingenting er låst, og standard er 06:00", () => {
    const s = sidedata(osloTilUtc("2026-11-09", "03:00"));
    expect(last(s, 0)).toEqual([]);
    expect(s.skjema.standardSok.start).toBe("06:00");
  });

  it("Tilgjengelig tid: 15 min–5 t hvert kvarter med etikett", () => {
    const { tilgjengeligTid } = sidedata(osloTilUtc("2026-11-09", "13:30")).skjema;
    expect(tilgjengeligTid).toHaveLength(20);
    expect(tilgjengeligTid[0]).toEqual({ verdi: 15, etikett: "15 min" });
    expect(tilgjengeligTid[5]).toEqual({ verdi: 90, etikett: "1 t 30 min" });
    expect(tilgjengeligTid.at(-1)).toEqual({ verdi: 300, etikett: "5 t" });
  });

  it("unike Startpunkter og telleteksten", () => {
    const s = sidedata(osloTilUtc("2026-11-09", "13:30"));
    expect(s.startpunkter).toHaveLength(8);
    expect(new Set(s.startpunkter.map((p) => p.navn)).size).toBe(8);
    expect(new Set(s.startpunkter.map((p) => p.kortnavn)).size).toBe(8);
    expect(s.startpunkter.find((p) => p.navn === "Parkering ved Tusten skisenter (mulig avgift)")?.kortnavn).toBe(
      "Tusten skisenter",
    );
    expect(s.telletekst).toBe("12 Turer fra 8 Startpunkter");
    expect(byggSidedata({ na: 0, turer: turer.slice(0, 1), demo: null, sprakmodell: false }).telletekst).toBe("1 Tur fra 1 Startpunkt");
  });

  it("demo: naTekst med dag og klokke", () => {
    const s = sidedata(osloTilUtc("2026-11-09", "13:30"), { id: "uten-vaer", beskrivelse: "Værmeldingen mangler" });
    expect(s.demo).toEqual({ id: "uten-vaer", beskrivelse: "Værmeldingen mangler", naTekst: "man. 9. nov. 13:30" });
  });
});
