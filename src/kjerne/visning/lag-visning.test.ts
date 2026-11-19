import { describe, expect, it } from "vitest";
import rutegeometriJson from "../../../data/rutegeometri.geojson";
import turerJson from "../../../testdata/turer.json";
import { anbefal } from "../anbefaling";
import type { Soltider } from "../morke";
import { soltider } from "../sol";
import { lagStandardSok, normaliserSok, type Sok } from "../sok";
import { leggTilDager, osloTilUtc, TIME_MS } from "../tid";
import { RutegeometriSkjema } from "../turdata/rutegeometri";
import { TurdatasettSkjema } from "../turdata/skjema";
import { lagVaerVurdert } from "../vaer/sammendrag";
import { lesVaerterskler, VAERTERSKLER, type Vaerterskler } from "../vaer/terskler";
import { TESTSCENARIOER } from "../vaer/testscenarioer";
import type { Vaermelding, Vaertime } from "../vaer/typer";
import { lagResultatvisning, lagVisning, type VisningVaer } from "./lag-visning";
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
    bedreTidsvindu: null,
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
      bedreTidsvindu: null,
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
        bedreTidsvindu: null,
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

// --- Story 2.8: Resultatet med Værklasse (FR-6, FR-11, FR-12, SM-C1) ---

const MINUTT_MS = 60_000;

const soltiderFor = (dato: string): Soltider => ({
  [dato]: soltider(dato),
  [leggTilDager(dato, 1)]: soltider(leggTilDager(dato, 1)),
});

/** `lagResultatvisning` for Søket `s` normalisert mot `na`, validert mot skjemaet. */
function visningMedVaer(s: Sok, na: number, melding: Vaermelding, terskler?: Vaerterskler): Resultatvisning {
  const normalisert = normaliserSok(s, na);
  const v = lagResultatvisning({
    resultatId: "test",
    normalisert,
    na,
    melding,
    turer,
    soltider: soltiderFor(normalisert.sok.dato),
    geometri,
    ...(terskler ? { terskler } : {}),
  });
  const lest = ResultatvisningSkjema.safeParse(v);
  expect(lest.error?.issues).toBeUndefined();
  return v;
}

const scenario = (id: keyof typeof TESTSCENARIOER, s: Sok) =>
  visningMedVaer(s, TESTSCENARIOER[id].na, TESTSCENARIOER[id].vaermelding);

const UJ1_SOK = sok({ utsikt: true });
const UJ2_SOK = sok({ dato: "2026-11-09", start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true });
const UJ3_SOK = sok({ dato: "2026-11-14", start: "10:00", tilgjengeligMin: 120 });

/** En Værmelding med like timer fra `fra` (Oslo-tid 9. nov.) i `antall` timer. */
function melding(fra: string, antall: number, verdier: Partial<Vaertime>): Vaermelding {
  const start = osloTilUtc("2026-11-09", fra);
  return {
    timer: Array.from({ length: antall }, (_, i) => ({
      startUtc: start + i * TIME_MS,
      tempC: 5,
      vindMs: 2,
      nedborMmT: 0,
      symbolKode: "cloudy",
      ...verdier,
    })),
  };
}

describe("lagVisning med Værklasse", () => {
  it("UJ-1: vurdert god, uten Værvarsling og Bedre tidsvindu, «… som passer nå» og Vær-raden «Værklasse god»", () => {
    const v = scenario("uj-1", UJ1_SOK);
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "god", klasseTekst: "Værklasse god", tidsvindu: "13:30–15:30" });
    expect(v.vaer).not.toHaveProperty("vaervarsling");
    expect("bedreTidsvindu" in v).toBe(false);
    expect(v.overskrift).toBe("Tre Turforslag som passer nå");
    expect(v.liveTekst).toBe(v.overskrift);
    if (v.utfall.type !== "turforslag") throw new Error("Forventet Turforslag.");
    for (const kort of v.utfall.kort) {
      expect(kort.kriterier[1]).toMatchObject({ rad: "vaer", merke: "ok", tekst: "Værklasse god" });
      expect(kort.regeltekst).toContain("oppholdsvær og lite vind");
    }
  });

  it("UJ-2: dårlig, Værvarsling med den utløsende verdien først, Bedre tidsvindu 14:00 og Moldevatnet fra Jensgurilia først", () => {
    const v = scenario("uj-2", UJ2_SOK);
    expect(v.vaer).toMatchObject({
      type: "vurdert",
      klasse: "darlig",
      vaervarsling: {
        tittel: "Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00",
        tekst: "Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.",
      },
    });
    expect(v.bedreTidsvindu).toMatchObject({
      type: "funnet",
      nyttSok: { ...UJ2_SOK, start: "14:00" },
      antallTekst: "5 Turer passer før mørket.",
      knappTekst: "Bruk 14:00",
    });
    expect(v.overskrift).toBe("Tre Turforslag i dårlig vær");
    expect(v.liveTekst).toBe("Tre Turforslag i dårlig vær. Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00.");
    if (v.utfall.type !== "turforslag") throw new Error("Forventet Turforslag.");
    expect(v.utfall.kort[0].turId).toBe("moldevatnet-fra-jensgurilia");
    for (const kort of v.utfall.kort) {
      expect(kort.kriterier[1]).toMatchObject({ rad: "vaer", merke: "se-opp", tekst: "Værklasse dårlig" });
    }
  });

  it("UJ-3: frarådet, meldingen, Vær og Tid, Bedre tidsvindu i morgen 11:00 og «Ingen Turforslag» (SM-C1)", () => {
    const v = scenario("uj-3", UJ3_SOK);
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "fraradet" });
    expect(v.vaer).not.toHaveProperty("vaervarsling");
    expect(v.utfall).toEqual({
      type: "fraradet",
      melding: "Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).",
      kriterier: [
        { rad: "vaer", merke: "se-opp", tekst: "Værklasse frarådet", detalj: ["sterk kuling, vind opp mot 19 m/s"] },
        { rad: "tid", merke: "ingen", tekst: "ikke vurdert", detalj: ["Frarådet går foran tid og ønsker."] },
      ],
    });
    expect(v.bedreTidsvindu).toMatchObject({
      type: "funnet",
      nyttSok: { ...UJ3_SOK, dato: "2026-11-15", start: "11:00" },
      dag: "I morgen, søn. 15. nov.",
      detalj: "fra kl. 11:00 · samme 2 t, Middels",
      knappTekst: "Bruk i morgen 11:00",
    });
    expect(v.overskrift).toBe("Ingen Turforslag");
    expect(v.liveTekst).toBe(v.overskrift);
  });

  it("UJ-3 med 15 min: frarådet, ingen korteste Tur. Bedre tidsvindu tatt i bruk gir den korteste Turen", () => {
    const v = scenario("uj-3", { ...UJ3_SOK, tilgjengeligMin: 15 });
    expect(v.utfall.type).toBe("fraradet");
    expect(v.overskrift).toBe("Ingen Turforslag");
    if (v.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");

    const ny = scenario("uj-3", v.bedreTidsvindu.nyttSok);
    expect(ny.overskrift).toBe("Ingen Tur passer 15 min.");
    if (ny.utfall.type !== "kortesteTur") throw new Error("Forventet den korteste Turen.");
    expect(ny.utfall.kort.kriterier[0]).toMatchObject({
      tekst: "16 min av 15 min",
      detalj: ["trenger 1 min mer, uten pauser"],
    });
  });

  it("ingen-bedre: standard-Søket gir Bedre tidsvindu «ingen»", () => {
    const { na } = TESTSCENARIOER["ingen-bedre"];
    const v = scenario("ingen-bedre", lagStandardSok(na));
    expect(v.bedreTidsvindu?.type).toBe("ingen");
  });

  it("alle scenarioene med standard-Søk og UJ-Søkene validerer", () => {
    for (const id of Object.keys(TESTSCENARIOER) as (keyof typeof TESTSCENARIOER)[]) {
      for (const s of [lagStandardSok(TESTSCENARIOER[id].na), UJ1_SOK, UJ2_SOK, UJ3_SOK]) {
        const n = normaliserSok(s, TESTSCENARIOER[id].na).sok;
        scenario(id, n);
      }
    }
  });

  it("en Værmelding som ikke dekker Tidsvinduet gir oppførselen fra Epic 1", () => {
    const v = visningMedVaer(UJ1_SOK, NA, melding("13:00", 2, {}));
    expect(v.vaer.type).toBe("mangler");
    expect(v.overskrift).toBe("Tre Turforslag som passer tiden din");
    expect("bedreTidsvindu" in v).toBe(false);
  });

  it("UJ-2 etter «Bruk 14:00»: god i morgen 14:00 gir «… som passer i morgen fra kl. 14:00»", () => {
    const v = scenario("uj-2", { ...UJ2_SOK, start: "14:00" });
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "god" });
    expect(v.overskrift).toBe("Tre Turforslag som passer i morgen fra kl. 14:00");
    expect(v.liveTekst).toBe(v.overskrift);
  });

  it("UJ-3 etter «Bruk i morgen 11:00»: «… som passer i morgen fra kl. 11:00»", () => {
    const v = scenario("uj-3", { ...UJ3_SOK, dato: "2026-11-15", start: "11:00" });
    expect(v.utfall.type).toBe("turforslag");
    expect(v.overskrift).toMatch(/^(Tre|To|Ett) Turforslag som passer i morgen fra kl\. 11:00$/);
  });

  it("god i dag med et senere Starttidspunkt enn nå gir «… som passer i dag fra kl. 14:00»", () => {
    const v = scenario("uj-1", { ...UJ1_SOK, start: "14:00" });
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "god" });
    expect(v.overskrift).toBe("Tre Turforslag som passer i dag fra kl. 14:00");
  });

  it("«nå» er nå rundet opp til kvarter: 13:20 gir «nå» for 13:30 og «i dag fra kl. 13:45» for 13:45", () => {
    const na = osloTilUtc("2026-11-09", "13:20");
    const melding = TESTSCENARIOER["uj-1"].vaermelding;
    expect(visningMedVaer(UJ1_SOK, na, melding).overskrift).toBe("Tre Turforslag som passer nå");
    expect(visningMedVaer({ ...UJ1_SOK, start: "13:45" }, na, melding).overskrift).toBe(
      "Tre Turforslag som passer i dag fra kl. 13:45",
    );
  });

  it("middels: Værsammendraget, «… som passer nå» og ingen Værvarsling", () => {
    const v = visningMedVaer(UJ1_SOK, NA, melding("06:00", 20, { vindMs: 8 }));
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "middels" });
    expect(v.overskrift).toBe("Tre Turforslag som passer nå");
    expect(v.liveTekst).toBe(v.overskrift);
    expect("bedreTidsvindu" in v).toBe(false);
  });

  it("dårlig med den korteste Turen: «Ingen Tur passer 15 min.»", () => {
    const v = visningMedVaer(sok({ tilgjengeligMin: 15 }), NA, melding("06:00", 20, { nedborMmT: 3 }));
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "darlig" });
    expect(v.overskrift).toBe("Ingen Tur passer 15 min.");
    expect(v.liveTekst).toBe("Ingen Tur passer 15 min. Værvarsling: Værklasse dårlig i Tidsvinduet 13:30–13:45.");
    expect(v.utfall.type).toBe("kortesteTur");
    expect(v.bedreTidsvindu?.type).toBe("ingen");
  });

  it.each([
    [{ tempC: -12 }, "−12 °C, nedbør opptil 0 mm/t, vind opptil 2 m/s."],
    [{ vindMs: 11 }, "Vind opptil 11 m/s, nedbør opptil 0 mm/t, 5 °C."],
    [{ vindMs: 11, nedborMmT: 2, tempC: -10.5 }, "Nedbør opptil 2 mm/t, vind opptil 11 m/s, −11 °C."],
    // −10 °C er ikke under grensen for dårlig (< −10), så temperaturen står sist.
    [{ vindMs: 11, tempC: -10 }, "Vind opptil 11 m/s, nedbør opptil 0 mm/t, −10 °C."],
  ])("Værvarslingen setter de utløsende verdiene først, med stor forbokstav (%j)", (verdier, tekst) => {
    const v = visningMedVaer(UJ1_SOK, NA, melding("06:00", 20, verdier));
    const tittel = "Værvarsling: Værklasse dårlig i Tidsvinduet 13:30–15:30";
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "darlig", vaervarsling: { tittel, tekst } });
    expect(v.liveTekst).toBe(`${v.overskrift}. ${tittel}.`);
  });

  it.each([
    [{ nedborMmT: 12 }, "nedbør opptil 12 mm/t"],
    [{ vindMs: 18, nedborMmT: 10 }, "sterk kuling, vind opp mot 18 m/s og nedbør opptil 10 mm/t"],
    [{ vindMs: 17.2, nedborMmT: 9.9 }, "sterk kuling, vind opp mot 17,2 m/s"],
  ])("frarådet nevner vind før nedbør, og bare det som nådde terskelen (%j)", (verdier, deler) => {
    const v = visningMedVaer(UJ1_SOK, NA, melding("06:00", 20, verdier));
    expect(v.utfall).toMatchObject({
      type: "fraradet",
      melding: `Det er meldt ${deler} i Tidsvinduet ditt (13:30–15:30).`,
      kriterier: [{ rad: "vaer", detalj: [deler] }, { rad: "tid" }],
    });
    expect(v.bedreTidsvindu?.type).toBe("ingen");
  });

  it("frarådet bare på temperatur (egne terskler): «temperatur ned mot −12 °C», etter vind og nedbør", () => {
    const terskler = lesVaerterskler({
      ...VAERTERSKLER,
      klasser: VAERTERSKLER.klasser.map((k) => (k.klasse === "fraradet" ? { ...k, temp_c_under: -11 } : k)),
    });
    const bare = visningMedVaer(UJ1_SOK, NA, melding("06:00", 20, { tempC: -12 }), terskler);
    expect(bare.vaer).toMatchObject({ type: "vurdert", klasse: "fraradet" });
    expect(bare.utfall).toMatchObject({
      type: "fraradet",
      melding: "Det er meldt temperatur ned mot −12 °C i Tidsvinduet ditt (13:30–15:30).",
      kriterier: [{ rad: "vaer", detalj: ["temperatur ned mot −12 °C"] }, { rad: "tid" }],
    });
    const alle = visningMedVaer(UJ1_SOK, NA, melding("06:00", 20, { tempC: -12, vindMs: 18, nedborMmT: 10 }), terskler);
    expect(alle.utfall).toMatchObject({
      melding:
        "Det er meldt sterk kuling, vind opp mot 18 m/s og nedbør opptil 10 mm/t og temperatur ned mot −12 °C i Tidsvinduet ditt (13:30–15:30).",
    });
  });

  it("de samme tersklene avgjør Værklassen, Værvarslingen, Turkortene og Bedre tidsvindu", () => {
    // Med dårlig fra 1,5 m/s er 2 m/s dårlig. Med standardtersklene er det godt vær.
    const terskler = lesVaerterskler({
      ...VAERTERSKLER,
      klasser: VAERTERSKLER.klasser.map((k) => {
        if (k.klasse === "darlig") return { ...k, vind_ms_minst: 1.5 };
        if (k.klasse === "middels") return { ...k, vind_ms_minst: 1.2 };
        return k;
      }),
    });
    // Rolig (1 m/s) hele dagen, utenom 12:00–16:00 med 2 m/s.
    const m = melding("06:00", 20, { vindMs: 1 });
    m.timer = m.timer.map((t, i) => (i >= 6 && i <= 9 ? { ...t, vindMs: 2 } : t));
    const na = osloTilUtc("2026-11-09", "08:00");

    expect(visningMedVaer(UJ1_SOK, na, m)).toMatchObject({ vaer: { type: "vurdert", klasse: "god" } });

    const v = visningMedVaer(UJ1_SOK, na, m, terskler);
    expect(v.vaer).toMatchObject({
      type: "vurdert",
      klasse: "darlig",
      vaervarsling: {
        tittel: "Værvarsling: Værklasse dårlig i Tidsvinduet 13:30–15:30",
        tekst: "Vind opptil 2 m/s, nedbør opptil 0 mm/t, 5 °C.",
      },
    });
    expect(v.bedreTidsvindu).toMatchObject({ type: "funnet", nyttSok: { start: "09:00" } });
    if (v.utfall.type !== "turforslag") throw new Error("Forventet Turforslag.");
    expect(v.utfall.kort[0].regeltekst).toContain("vind opp mot 2 m/s");
  });

  it("kaster når Anbefalingen og Værklassen ikke stemmer med hverandre", () => {
    const s = sok();
    const sol = soltiderFor(s.dato);
    const m = melding("06:00", 20, { vindMs: 18 });
    const startUtc = osloTilUtc(s.dato, s.start);
    const sluttUtc = startUtc + s.tilgjengeligMin * MINUTT_MS;
    const vaer: VisningVaer = { type: "vurdert", ...lagVaerVurdert({ melding: m, startUtc, sluttUtc })! };
    const felles = { resultatId: "test", normalisert: { sok: s }, na: NA, soltider: sol, geometri, bedreTidsvindu: null };
    expect(() => lagVisning({ ...felles, vaer, anbefaling: anbefal(turer, s, sol, "fraradet") })).toThrow(
      /^Værklassen er frarådet, men Anbefalingen har Turer\.$/,
    );
    expect(() => lagVisning({ ...felles, vaer: { type: "mangler" }, anbefaling: null })).toThrow(
      /^Anbefalingen mangler, men Værklassen er ikke frarådet\.$/,
    );
  });
});
