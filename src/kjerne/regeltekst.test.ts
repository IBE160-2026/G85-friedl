import { describe, expect, it } from "vitest";
import { lagRegeltekst, type RegeltekstInput } from "./regeltekst";

// Regeltekst-mønsteret (FR-20) med eksemplene fra EXPERIENCE.md, uten vær (story 1.9).

const MANGLER = { type: "mangler" } as const;

const input = (overstyr: Partial<RegeltekstInput>): RegeltekstInput => ({
  turtidMin: 92,
  tilgjengeligMin: 120,
  vaer: MANGLER,
  treff: [],
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
