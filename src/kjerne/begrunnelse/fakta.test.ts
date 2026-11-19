import { describe, expect, it } from "vitest";
import turerJson from "../../../testdata/turer.json";
import { TurdatasettSkjema } from "../turdata/skjema";
import { lagTurfakta } from "./fakta";

// Fakta om Turen for Språkmodellteksten (story 4.1) mot testdata/turer.json.

const { turer } = TurdatasettSkjema.parse(turerJson);

const tur = (id: string) => {
  const funnet = turer.find((t) => t.id === id);
  if (!funnet) throw new Error(`Ingen Tur med id ${id} i testdata/turer.json.`);
  return funnet;
};

describe("lagTurfakta", () => {
  it("Moldevatnet fra Jensgurilia: fast liste med Adkomst sist", () => {
    expect(lagTurfakta(tur("moldevatnet-fra-jensgurilia"))).toEqual([
      "Navn: Moldevatnet fra Jensgurilia",
      "Mål: Moldevatnet, fra Jensgurilia",
      "Lengde totalt: 6,45 km",
      "Stigning: 152 høydemeter",
      "Høyeste punkt: 340 moh",
      "Vanskelighetsgrad: Middels",
      "Startpunkt: Turparkering i Jensgurilia, Nordbyen",
      "Adkomst: ca. 280 m",
    ]);
  });

  it("uten Adkomst: ingen Adkomst-linje, og lengden som i faktalinjen («5,0 km»)", () => {
    const fakta = lagTurfakta(tur("tusenarsvarden-fra-damefallet"));
    expect(fakta).toContain("Lengde totalt: 5,0 km");
    expect(fakta).toContain("Høyeste punkt: 527 moh");
    expect(fakta.some((f) => f.startsWith("Adkomst"))).toBe(false);
    expect(fakta).toHaveLength(7);
  });

  it("navnet starter ikke med Målet: «fra {Startpunkt}», og «via …» står som i Turkortet", () => {
    const bergsvatnet = tur("bergsvatnet");
    expect(lagTurfakta({ ...bergsvatnet, navn: "Rundt Bergsvatnet" })[1]).toBe(
      "Mål: Bergsvatnet, fra Turparkering i Jensgurilia, Nordbyen",
    );
    expect(lagTurfakta(tur("varden-fra-sentrum"))[1]).toBe("Mål: Varden, via Den grønne korridor");
  });
});
