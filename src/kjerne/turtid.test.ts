import { describe, expect, it } from "vitest";
import turerJson from "../../testdata/turer.json";
import { TurdatasettSkjema } from "./turdata/skjema";
import { turtidMin } from "./turtid";

// FR-14 mot den faste kopien testdata/turer.json (AD-16).

const { turer } = TurdatasettSkjema.parse(turerJson);
const tur = (id: string) => {
  const funnet = turer.find((t) => t.id === id);
  if (!funnet) throw new Error(`Ingen Tur med id ${id} i testdata/turer.json.`);
  return funnet;
};

describe("testdata/turer.json", () => {
  it("består Tur-skjemaet", () => {
    expect(TurdatasettSkjema.safeParse(turerJson).success).toBe(true);
  });
});

describe("turtidMin (FR-14)", () => {
  it("Tusenårsvarden fra Damefallet (5,0 km, 318 høydemeter) får 1 t 32 min", () => {
    expect(turtidMin(tur("tusenarsvarden-fra-damefallet"))).toBe(92);
  });

  it("Storlihytta fra Vardeveien (1,06 km, 35 høydemeter) får 16 min", () => {
    expect(turtidMin(tur("storlihytta-fra-vardeveien"))).toBe(16);
  });

  it("uten høydemeter er det bare lengden: 5 km gir 60 min", () => {
    expect(turtidMin({ lengde_km_totalt: 5, hoydemeter: 0 })).toBe(60);
  });

  it("600 høydemeter gir 60 min ekstra", () => {
    expect(turtidMin({ lengde_km_totalt: 5, hoydemeter: 600 })).toBe(120);
  });

  it("runder halve minutter opp og under halve ned", () => {
    // 0,5 km = 6 min. 5 hm = 0,5 min, 4 hm = 0,4 min, 6 hm = 0,6 min.
    expect(turtidMin({ lengde_km_totalt: 0.5, hoydemeter: 5 })).toBe(7);
    expect(turtidMin({ lengde_km_totalt: 0.5, hoydemeter: 4 })).toBe(6);
    expect(turtidMin({ lengde_km_totalt: 0.5, hoydemeter: 6 })).toBe(7);
  });

  it("flyttallsstøy avgjør ikke avrundingen ved et halvt minutt", () => {
    // 0,05 km = 0,6 min og 59 hm = 5,9 min gir nøyaktig 6,5 min, men flyttall gir 6,4999…
    expect(turtidMin({ lengde_km_totalt: 0.05, hoydemeter: 59 })).toBe(7);
  });

  it("stemmer med en eksakt heltallsreferanse for lengde med to desimaler og hele høydemeter", () => {
    // I hundredeler minutt: km × 100 × 12 + hm × 10. Halve minutter rundes opp.
    const avvik: string[] = [];
    for (let hundredelerKm = 1; hundredelerKm <= 2000; hundredelerKm++) {
      for (let hm = 0; hm <= 1000; hm++) {
        const fasit = Math.floor((hundredelerKm * 12 + hm * 10 + 50) / 100);
        const tid = turtidMin({ lengde_km_totalt: hundredelerKm / 100, hoydemeter: hm });
        if (tid !== fasit && avvik.length < 5) avvik.push(`${hundredelerKm / 100} km, ${hm} hm: ${tid} ≠ ${fasit}`);
      }
    }
    expect(avvik).toEqual([]);
  });

  it.each([
    ["varden-fra-sentrum", 146],
    ["storlihytta-fra-museet", 62],
    ["storlihytta-fra-vardeveien", 16],
    ["skihytta-fra-damefallet", 54],
    ["tusenarsvarden-fra-damefallet", 92],
    ["tusenarsvarden-fra-grua", 136],
    ["tusenarsvarden-om-moldedalen", 130],
    ["fraenavarden-fra-grua", 167],
    ["moldevatnet-fra-jensgurilia", 93],
    ["midtveishuken", 33],
    ["bergsvatnet", 43],
    ["tusten", 168],
  ])("%s får %i min", (id, minutter) => {
    expect(turtidMin(tur(id))).toBe(minutter);
  });

  it("gir et helt antall minutter for hver Tur i testdataene", () => {
    for (const t of turer) expect(Number.isInteger(turtidMin(t))).toBe(true);
  });
});
