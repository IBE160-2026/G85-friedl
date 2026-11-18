import { afterEach, describe, expect, it, vi } from "vitest";
import { lagStandardSok } from "@/kjerne/sok";
import { SidedataSvarSkjema, UkjentDemoFeilSkjema } from "@/kjerne/visning/feil";
import { type Sidedata, SidedataSkjema } from "@/kjerne/visning/sidedata";
// Testen er unntaket fra lagregelen: den prøver lagSidedata direkte, slik page.tsx bruker den.
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { lagSidedata } from "./side";
import { DEMO_IDER } from "./vaer/scenarioer";

// lagSidedata (story 1.10, AD-18) mot det ekte Turdatasettet.

afterEach(() => {
  vi.useRealTimers();
});

function sidedata(demoId: string | null): Sidedata {
  const svar = lagSidedata(demoId);
  expect(SidedataSvarSkjema.safeParse(svar).success).toBe(true);
  const lest = SidedataSkjema.safeParse(svar);
  expect(lest.error?.issues).toBeUndefined();
  return lest.data as Sidedata;
}

describe("lagSidedata", () => {
  it("uten-vaer: fast «nå» fra scenarioet", () => {
    const s = sidedata("uten-vaer");
    expect(s.demo).toEqual({ id: "uten-vaer", beskrivelse: "Værmeldingen mangler", naTekst: "man. 9. nov. 13:30" });
    expect(s.telletekst).toBe("12 Turer fra 8 Startpunkter");
    expect(s.startpunkter).toHaveLength(8);
    expect(s.skjema.standardSok).toEqual({
      dato: "2026-11-09",
      start: "13:30",
      tilgjengeligMin: 120,
      vanskelighetsgrad: "B",
      utsikt: false,
      vann: false,
    });
    const [iDag, iMorgen] = s.skjema.turdager;
    expect(iDag).toMatchObject({ dato: "2026-11-09", etikett: "I dag", last: false });
    expect(iMorgen).toMatchObject({ dato: "2026-11-10", etikett: "I morgen", last: false });
    // 06:00–13:15 har passert, 13:30 er ledig.
    expect(iDag.startvalg.filter((v) => v.last)).toHaveLength(30);
    expect(iDag.startvalg.find((v) => !v.last)?.verdi).toBe("13:30");
    expect(iMorgen.startvalg.some((v) => v.last)).toBe(false);
  });

  it("uten demo: systemklokka, og ingen demo", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T09:07:00+01:00"));
    const s = sidedata(null);
    expect(s.demo).toBeNull();
    expect(s.skjema.standardSok).toEqual(lagStandardSok(Date.now()));
    expect(s.skjema.turdager.map((d) => d.dato)).toEqual(["2026-11-12", "2026-11-13"]);
  });

  it("uten demo etter 22:00: «I dag» er låst, og standard er i morgen 10:00", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T22:05:00+01:00"));
    const s = sidedata(null);
    expect(s.skjema.turdager[0].last).toBe(true);
    expect(s.skjema.standardSok).toMatchObject({ dato: "2026-11-13", start: "10:00" });
  });

  it("ukjent demo gir UkjentDemoFeil", () => {
    const svar = lagSidedata("finnes-ikke");
    expect(UkjentDemoFeilSkjema.parse(svar)).toEqual({ feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] });
  });
});
