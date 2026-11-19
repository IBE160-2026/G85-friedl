import { describe, expect, it } from "vitest";
import { darligVaerDeler, lagRegeltekst, type RegeltekstInput, type VaerGrunnlag } from "./regeltekst";
import type { Vaerklasse } from "./vaer/typer";

// Regeltekst-mønsteret (FR-20) med eksemplene fra EXPERIENCE.md, uten vær (story 1.9) og med vær
// (story 2.7).

const MANGLER = { type: "mangler" } as const;

const vurdert = (klasse: Vaerklasse, vaerord = "oppholdsvær og lite vind"): VaerGrunnlag => ({
  type: "vurdert",
  klasse,
  vaerord,
  temperatur: "3–5 °C",
});

const input = (overstyr: Partial<RegeltekstInput>): RegeltekstInput => ({
  turtidMin: 92,
  tilgjengeligMin: 120,
  vaer: MANGLER,
  treff: [],
  hoyestePunktMoh: 527,
  lavtliggende: false,
  egnetDarligVaer: null,
  ...overstyr,
});

describe("lagRegeltekst", () => {
  it("UJ-1 uten vær: Tid, værdata mangler og utsikt", () => {
    expect(lagRegeltekst(input({ treff: ["utsikt"] }))).toBe(
      "passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt",
    );
  });

  it("to Opplevelsespreferanser bindes med «og», i rekkefølgen utsikt, vann", () => {
    expect(lagRegeltekst(input({ turtidMin: 136, tilgjengeligMin: 150, treff: ["vann", "utsikt"] }))).toBe(
      "passer tiden din (2 t 16 min av 2 t 30 min), værdata mangler, utsikt og vann",
    );
  });

  it("uten treff er det ingen preferansedel", () => {
    expect(lagRegeltekst(input({}))).toBe("passer tiden din (1 t 32 min av 2 t), værdata mangler");
  });

  it("lik Turtid og Tilgjengelig tid passer", () => {
    expect(lagRegeltekst(input({ turtidMin: 120 }))).toBe("passer tiden din (2 t av 2 t), værdata mangler");
  });

  it("Alternativkortet, UJ-3: trenger 1 min mer", () => {
    expect(lagRegeltekst(input({ turtidMin: 16, tilgjengeligMin: 15 }))).toBe(
      "passer ikke tiden din: trenger 1 min mer (16 min av 15 min), værdata mangler",
    );
  });

  it("Alternativkortet med treff har preferansedelen sist", () => {
    expect(lagRegeltekst(input({ turtidMin: 136, tilgjengeligMin: 60, treff: ["vann"] }))).toBe(
      "passer ikke tiden din: trenger 1 t 16 min mer (2 t 16 min av 1 t), værdata mangler, vann",
    );
  });

  it("har liten forbokstav, ikke punktum til slutt og samme tekst for samme input", () => {
    const tekst = lagRegeltekst(input({ treff: ["utsikt", "vann"] }));
    expect(tekst).toMatch(/^[a-zæøå]/);
    expect(tekst.endsWith(".")).toBe(false);
    expect(lagRegeltekst(input({ treff: ["utsikt", "vann"] }))).toBe(tekst);
  });
});

describe("lagRegeltekst med vær (story 2.7)", () => {
  /** Moldevatnet fra Jensgurilia: 340 moh og egnet i dårlig vær. */
  const LAV_OG_EGNET = { hoyestePunktMoh: 340, lavtliggende: true, egnetDarligVaer: true } as const;
  const DARLIG_ORD = "nedbør opptil 3,5 mm/t og frisk vind";

  it("UJ-1: vurdert god, Turtid 92 av 120, utsikt", () => {
    expect(lagRegeltekst(input({ vaer: vurdert("god"), treff: ["utsikt"] }))).toBe(
      "passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt",
    );
  });

  it("UJ-2: dårlig, Moldevatnet fra Jensgurilia, 93 av 180", () => {
    const tekst = lagRegeltekst(
      input({ turtidMin: 93, tilgjengeligMin: 180, vaer: vurdert("darlig", DARLIG_ORD), ...LAV_OG_EGNET }),
    );
    expect(tekst).toBe(
      "passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,5 mm/t og frisk vind, lavtliggende tur (340 moh), " +
        "egnet i dårlig vær",
    );
  });

  it("dårlig, høy Tur og egnet ukjent: verken del 3 eller 4", () => {
    const tekst = lagRegeltekst(input({ vaer: vurdert("darlig", DARLIG_ORD), treff: ["utsikt"] }));
    expect(tekst).toBe(`passer tiden din (1 t 32 min av 2 t), ${DARLIG_ORD}, utsikt`);
  });

  it("dårlig: bare den delen som slo inn, før Opplevelsespreferansene", () => {
    const vaer = vurdert("darlig", DARLIG_ORD);
    expect(lagRegeltekst(input({ vaer, hoyestePunktMoh: 340, lavtliggende: true, egnetDarligVaer: false }))).toBe(
      `passer tiden din (1 t 32 min av 2 t), ${DARLIG_ORD}, lavtliggende tur (340 moh)`,
    );
    expect(lagRegeltekst(input({ vaer, egnetDarligVaer: true, treff: ["vann"] }))).toBe(
      `passer tiden din (1 t 32 min av 2 t), ${DARLIG_ORD}, egnet i dårlig vær, vann`,
    );
  });

  it.each<Vaerklasse>(["god", "middels", "fraradet"])("%s, lav og egnet Tur: ingen del 3 eller 4", (klasse) => {
    expect(lagRegeltekst(input({ vaer: vurdert(klasse), ...LAV_OG_EGNET }))).toBe(
      "passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind",
    );
  });

  it("mangler gir samme tekst som før, også for en lav og egnet Tur", () => {
    expect(lagRegeltekst(input({ ...LAV_OG_EGNET, treff: ["utsikt"] }))).toBe(
      "passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt",
    );
  });

  it("Alternativkortet i dårlig vær har delene etter værordene", () => {
    const tekst = lagRegeltekst(
      input({ turtidMin: 16, tilgjengeligMin: 15, vaer: vurdert("darlig", DARLIG_ORD), ...LAV_OG_EGNET }),
    );
    expect(tekst).toBe(
      `passer ikke tiden din: trenger 1 min mer (16 min av 15 min), ${DARLIG_ORD}, lavtliggende tur (340 moh), ` +
        "egnet i dårlig vær",
    );
  });

  it("har ikke temperatur", () => {
    expect(lagRegeltekst(input({ vaer: vurdert("god") }))).not.toMatch(/°C/);
  });

  it("darligVaerDeler gir delene bare ved dårlig", () => {
    expect(darligVaerDeler({ vaer: vurdert("darlig"), ...LAV_OG_EGNET })).toEqual([
      "lavtliggende tur (340 moh)",
      "egnet i dårlig vær",
    ]);
    expect(darligVaerDeler({ vaer: vurdert("fraradet"), ...LAV_OG_EGNET })).toEqual([]);
    expect(darligVaerDeler({ vaer: MANGLER, ...LAV_OG_EGNET })).toEqual([]);
  });
});
