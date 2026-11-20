import { describe, expect, it } from "vitest";
import { ApiFeilSkjema, SidedataSvarSkjema, UgyldigSokFeilSkjema, UkjentDemoFeilSkjema } from "./feil";
import { type Sidedata, SidedataSkjema, type Turdag } from "./sidedata";

// Sidedataene (AD-18) og feilformene (AR-7) i matrisen til story 1.4.

const startvalg = (passert: number) =>
  Array.from({ length: 65 }, (_, i) => {
    const min = 6 * 60 + i * 15;
    const verdi = `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
    return { verdi, last: i < passert };
  });

const iDag = (endring: Partial<Turdag> = {}): Turdag => ({
  dato: "2026-11-09",
  etikett: "I dag",
  last: false,
  // 13:30 er første ledige.
  startvalg: startvalg(30),
  ...endring,
});

const iMorgen = (): Turdag => ({
  dato: "2026-11-10",
  etikett: "I morgen",
  last: false,
  startvalg: startvalg(0),
});

const tilgjengeligTid = Array.from({ length: 20 }, (_, i) => {
  const verdi = (i + 1) * 15;
  const t = Math.floor(verdi / 60);
  const m = verdi % 60;
  return { verdi, etikett: [t ? `${t} t` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") };
});

const sidedata = (endring: Partial<Sidedata> = {}): Sidedata => ({
  demo: null,
  sprakmodell: false,
  skjema: {
    turdager: [iDag(), iMorgen()],
    tilgjengeligTid,
    standardSok: {
      dato: "2026-11-09",
      start: "13:30",
      tilgjengeligMin: 120,
      vanskelighetsgrad: "B",
      utsikt: false,
      vann: false,
    },
  },
  startpunkter: [
    { navn: "Parkering ved Damefallet", kortnavn: "Damefallet", lat: 62.7465, lon: 7.1484 },
    { navn: "Parkering ved Romsdalsmuseet", kortnavn: "Romsdalsmuseet", lat: 62.7381, lon: 7.1428 },
  ],
  telletekst: "12 Turer fra 8 Startpunkter",
  ...endring,
});

const LAST: Sidedata = sidedata({
  skjema: {
    turdager: [iDag({ last: true, startvalg: startvalg(65) }), iMorgen()],
    tilgjengeligTid,
    standardSok: { ...sidedata().skjema.standardSok, dato: "2026-11-10", start: "10:00" },
  },
});

const medStandard = (endring: Partial<Sidedata["skjema"]["standardSok"]>, grunnlag = sidedata()) => ({
  ...grunnlag,
  skjema: { ...grunnlag.skjema, standardSok: { ...grunnlag.skjema.standardSok, ...endring } },
});

describe("SidedataSkjema", () => {
  it.each([
    ["uten demo", sidedata()],
    ["med demo", sidedata({ demo: { id: "uten-vaer", beskrivelse: "Værmeldingen mangler", naTekst: "man. 9. nov. kl. 13:30" } })],
    ["med «I dag» låst", LAST],
  ])("godtar sidedata %s", (_navn, s) => {
    const svar = SidedataSkjema.safeParse(s);
    expect(svar.error?.issues).toBeUndefined();
    expect(SidedataSvarSkjema.safeParse(s).success).toBe(true);
  });

  it("avviser standard-Søket på en låst Turdag", () => {
    // 13:30 er ledig, så bare at Turdagen er låst, gir feilen.
    const lastMedLedigTid = sidedata({
      skjema: { ...sidedata().skjema, turdager: [iDag({ last: true }), iMorgen()] },
    });
    const svar = SidedataSkjema.safeParse(lastMedLedigTid);
    expect(svar.error?.issues.map((i) => i.path)).toEqual([["skjema", "standardSok", "dato"]]);
  });

  it("avviser en dato ingen Turdag har", () => {
    const svar = SidedataSkjema.safeParse(medStandard({ dato: "2026-11-11" }));
    expect(svar.error?.issues.map((i) => i.path)).toEqual([["skjema", "standardSok", "dato"]]);
  });

  it("avviser et låst Starttidspunkt og en Tilgjengelig tid som ikke er et valg", () => {
    const svar = SidedataSkjema.safeParse(medStandard({ start: "13:00" }));
    expect(svar.error?.issues.map((i) => i.path)).toEqual([["skjema", "standardSok", "start"]]);
    const utenValg = sidedata();
    utenValg.skjema.tilgjengeligTid = tilgjengeligTid.filter((t) => t.verdi !== 120);
    expect(SidedataSkjema.safeParse(utenValg).success).toBe(false);
  });

  it("avviser ekstra felt, snake_case og ugyldige verdier", () => {
    expect(SidedataSkjema.safeParse({ ...sidedata(), ekstra: 1 }).success).toBe(false);
    expect(SidedataSkjema.safeParse(sidedata({ telletekst: "" })).success).toBe(false);
    expect(SidedataSkjema.safeParse(sidedata({ demo: { id: "x", beskrivelse: "x", na_tekst: "x" } as never })).success).toBe(false);
    expect(SidedataSkjema.safeParse(sidedata({ startpunkter: [{ navn: "x", kortnavn: "x", lat: 91, lon: 7 }] })).success).toBe(false);
    expect(SidedataSkjema.safeParse(sidedata({ startpunkter: [{ navn: "x", kortnavn: "", lat: 62, lon: 7 }] })).success).toBe(false);
    const utenKortnavn = { navn: "x", lat: 62, lon: 7 } as Sidedata["startpunkter"][number];
    expect(SidedataSkjema.safeParse(sidedata({ startpunkter: [utenKortnavn] })).success).toBe(false);
    const enTurdag = sidedata();
    (enTurdag.skjema as { turdager: Turdag[] }).turdager = [iDag()];
    expect(SidedataSkjema.safeParse(enTurdag).success).toBe(false);
    const feilVerdi = sidedata();
    feilVerdi.skjema.turdager[1].startvalg[0].verdi = "05:45";
    expect(SidedataSkjema.safeParse(feilVerdi).success).toBe(false);
  });
});

describe("feilformene", () => {
  const ukjentDemo = { feil: "ukjent-demo", gyldigeDemoIder: ["uten-vaer"] };
  const ugyldigSok = { feil: "ugyldig-sok", detaljer: [{ sti: "start", melding: "Ugyldig klokkeslett." }] };
  const ugyldigSokRot = { feil: "ugyldig-sok", detaljer: [{ sti: "", melding: "Søket mangler." }] };

  it("godtar ukjent-demo i sitt skjema, i unionen og i sidedatasvaret", () => {
    expect(UkjentDemoFeilSkjema.safeParse(ukjentDemo).success).toBe(true);
    expect(ApiFeilSkjema.safeParse(ukjentDemo).success).toBe(true);
    expect(SidedataSvarSkjema.safeParse(ukjentDemo).success).toBe(true);
  });

  it("godtar ugyldig-sok i sitt skjema og i unionen, men ikke i sidedatasvaret", () => {
    expect(UgyldigSokFeilSkjema.safeParse(ugyldigSok).success).toBe(true);
    expect(ApiFeilSkjema.safeParse(ugyldigSok).success).toBe(true);
    expect(SidedataSvarSkjema.safeParse(ugyldigSok).success).toBe(false);
  });

  it("godtar ugyldig-sok med tom sti for en feil på roten av Søket", () => {
    expect(UgyldigSokFeilSkjema.safeParse(ugyldigSokRot).success).toBe(true);
    expect(ApiFeilSkjema.safeParse(ugyldigSokRot).success).toBe(true);
  });

  it.each([
    ["ekstra felt i ukjent-demo", { ...ukjentDemo, ekstra: 1 }],
    ["tom gyldigeDemoIder", { ...ukjentDemo, gyldigeDemoIder: [] }],
    ["ekstra felt i ugyldig-sok", { ...ugyldigSok, ekstra: 1 }],
    ["ekstra felt i en detalj", { ...ugyldigSok, detaljer: [{ sti: "start", melding: "x", kode: "y" }] }],
    ["tom detaljer", { ...ugyldigSok, detaljer: [] }],
    ["ukjent feil", { feil: "noe-annet" }],
  ])("avviser %s", (_navn, v) => {
    expect(ApiFeilSkjema.safeParse(v).success).toBe(false);
  });
});
