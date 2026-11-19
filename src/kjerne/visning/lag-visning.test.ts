import { describe, expect, it } from "vitest";
import rutegeometriJson from "../../../data/rutegeometri.geojson";
import turerJson from "../../../testdata/turer.json";
import { anbefal } from "../anbefaling";
import type { Soltider } from "../morke";
import { soltider } from "../sol";
import { normaliserSok, type Sok } from "../sok";
import { leggTilDager, osloTilUtc } from "../tid";
import { RutegeometriSkjema } from "../turdata/rutegeometri";
import { TurdatasettSkjema } from "../turdata/skjema";
import { lagVisning } from "./lag-visning";
import { type Resultatvisning, ResultatvisningSkjema } from "./skjema";

// Resultatvisningen (story 1.10) mot testdata/turer.json, med «nå» som i scenarioet uten-vaer.

const { turer } = TurdatasettSkjema.parse(turerJson);
const geometri = RutegeometriSkjema.parse(rutegeometriJson);

const NA = osloTilUtc("2026-11-09", "13:30");

const sok = (overstyr: Partial<Sok> = {}): Sok => ({
  dato: "2026-11-09",
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
  ...overstyr,
});

function visning(s: Sok, na = NA): Resultatvisning {
  const normalisert = normaliserSok(s, na);
  const dato = normalisert.sok.dato;
  const sol: Soltider = { [dato]: soltider(dato), [leggTilDager(dato, 1)]: soltider(leggTilDager(dato, 1)) };
  const v = lagVisning({
    resultatId: "test",
    normalisert,
    na,
    anbefaling: anbefal(turer, normalisert.sok, sol, "mangler"),
    soltider: sol,
    geometri,
    vaer: { type: "mangler" },
  });
  const lest = ResultatvisningSkjema.safeParse(v);
  expect(lest.error?.issues).toBeUndefined();
  return v;
}

describe("lagVisning", () => {
  it("UJ-1 uten vær: overskrift, Ditt søk, live-tekst og Værmeldingen mangler", () => {
    const v = visning(sok({ utsikt: true }));
    expect(v.overskrift).toBe("Tre Turforslag som passer tiden din");
    expect(v.liveTekst).toBe(v.overskrift);
    expect(v.dittSok).toEqual({
      turdag: "I dag, man. 9. nov.",
      starttidspunkt: "13:30",
      tilgjengeligTid: "2 t",
      vanskelighetsgrad: "Middels",
      opplevelsespreferanser: ["utsikt"],
    });
    expect(v.vaer).toEqual({ type: "mangler", tekst: "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET." });
    expect("justering" in v).toBe(false);
    expect(v.utfall.type === "turforslag" && v.utfall.kort.map((k) => k.kart.nummer)).toEqual([1, 2, 3]);
  });

  it("UJ-3: Ingen Tur passer 15 min, med Alternativet og «Med 30 min eller mer»", () => {
    const v = visning(sok({ tilgjengeligMin: 15 }));
    expect(v.overskrift).toBe("Ingen Tur passer 15 min.");
    expect(v.utfall).toMatchObject({
      type: "kortesteTur",
      kort: { turId: "storlihytta-fra-vardeveien" },
      passerMedTekst: "Med 30 min eller mer passer minst én Tur.",
    });
  });

  it("tallordet følger antallet: «Ett», «To» og «Tre» Turforslag", () => {
    // 30 min: bare Storlihytta fra Vardeveien (16 min) passer.
    expect(visning(sok({ tilgjengeligMin: 30 })).overskrift).toBe("Ett Turforslag som passer tiden din");
    // To Turforslag kan ikke nås med testdataene i hele kvarter (16, 33 og 43 min), så Anbefalingen kuttes.
    const s = sok({ tilgjengeligMin: 120 });
    const sol: Soltider = { [s.dato]: soltider(s.dato) };
    const tre = anbefal(turer, s, sol, "mangler");
    if (tre.type !== "turforslag") throw new Error("Forventet Turforslag.");
    const to = lagVisning({
      resultatId: "test",
      normalisert: { sok: s },
      na: NA,
      anbefaling: { type: "turforslag", forslag: tre.forslag.slice(0, 2) },
      soltider: sol,
      geometri,
      vaer: { type: "mangler" },
    });
    expect(ResultatvisningSkjema.safeParse(to).success).toBe(true);
    expect(to.overskrift).toBe("To Turforslag som passer tiden din");
    expect(to.utfall.type === "turforslag" && to.utfall.kort.map((k) => k.lesetekst.slice(0, 16))).toEqual([
      "Turforslag 1 av ",
      "Turforslag 2 av ",
    ]);
    expect(to.utfall.type === "turforslag" && to.utfall.kort[1].lesetekst).toMatch(/^Turforslag 2 av 2: /);
  });

  it("tar med justeringen og bruker det justerte Søket", () => {
    const v = visning(sok({ start: "12:00" }));
    expect(v.sok.start).toBe("13:30");
    expect(v.justering).toBe("Flyttet til 13:30, fordi 12:00 har passert.");
    expect(v.dittSok.starttidspunkt).toBe("13:30");
  });

  it("i morgen og etter 22:00: «I morgen» med datoen", () => {
    const v = visning(sok(), osloTilUtc("2026-11-09", "22:10"));
    expect(v.sok).toMatchObject({ dato: "2026-11-10", start: "10:00" });
    expect(v.dittSok.turdag).toBe("I morgen, tir. 10. nov.");
    expect(v.justering).toBe("Flyttet til i morgen kl. 10:00, fordi klokka har passert 22:00.");
  });

  it("Opplevelsespreferansene står i rekkefølgen utsikt, vann", () => {
    expect(visning(sok({ vann: true, utsikt: true })).dittSok.opplevelsespreferanser).toEqual(["utsikt", "vann"]);
    expect(visning(sok({ vann: true })).dittSok.opplevelsespreferanser).toEqual(["vann"]);
    expect(visning(sok()).dittSok.opplevelsespreferanser).toEqual([]);
  });

  it("Krevende og Enkel i Ditt søk", () => {
    expect(visning(sok({ vanskelighetsgrad: "R" })).dittSok.vanskelighetsgrad).toBe("Krevende");
    expect(visning(sok({ vanskelighetsgrad: "G" })).dittSok.vanskelighetsgrad).toBe("Enkel");
  });

  it("kaster for en Turdag som verken er i dag eller i morgen (Søket er ikke normalisert)", () => {
    const s = sok({ dato: "2026-11-12" });
    const sol: Soltider = { [s.dato]: soltider(s.dato) };
    expect(() =>
      lagVisning({
        resultatId: "test",
        normalisert: { sok: s },
        na: NA,
        anbefaling: anbefal(turer, s, sol, "mangler"),
        soltider: sol,
        geometri,
        vaer: { type: "mangler" },
      }),
    ).toThrow(/verken i dag eller i morgen/);
  });

  it("samme input gir samme visning", () => {
    expect(visning(sok({ utsikt: true }))).toEqual(visning(sok({ utsikt: true })));
  });

  it("alle Søk i et rutenett validerer og har ingen nøkler med _", () => {
    const nokler = (x: unknown): string[] =>
      Array.isArray(x)
        ? x.flatMap(nokler)
        : x !== null && typeof x === "object"
          ? Object.entries(x).flatMap(([k, y]) => [k, ...nokler(y)])
          : [];
    for (const start of ["06:00", "13:30", "15:00", "22:00"]) {
      for (const tilgjengeligMin of [15, 60, 120, 300]) {
        for (const vanskelighetsgrad of ["G", "B", "R"] as const) {
          for (const [utsikt, vann] of [[false, false], [true, true]]) {
            const v = visning(sok({ dato: "2026-11-10", start, tilgjengeligMin, vanskelighetsgrad, utsikt, vann }));
            expect(nokler(v).filter((k) => k.includes("_"))).toEqual([]);
          }
        }
      }
    }
  });
});
