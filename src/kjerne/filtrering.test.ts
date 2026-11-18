import { describe, expect, it } from "vitest";
import turerJson from "../../testdata/turer.json";
import { filtrerTurer, passerTid, passerVanskelighetsgrad } from "./filtrering";
import { TurdatasettSkjema, type Tur } from "./turdata/skjema";
import { turtidMin } from "./turtid";

// FR-15 mot den faste kopien testdata/turer.json (AD-16).

const { turer } = TurdatasettSkjema.parse(turerJson);

/** En syntetisk Tur med gitt Turtid: 5 km per time, ingen høydemeter. */
function turMedTid(id: string, minutter: number, gradering: Tur["gradering"] = "G"): Tur {
  const [grunnlag] = turer;
  return { ...grunnlag, id, gradering, lengde_km_totalt: (minutter / 60) * 5, hoydemeter: 0 };
}

describe("passerTid", () => {
  it("lik Tilgjengelig tid er med, ett minutt over er ute", () => {
    expect(passerTid(60, 60)).toBe(true);
    expect(passerTid(59, 60)).toBe(true);
    expect(passerTid(61, 60)).toBe(false);
  });
});

describe("passerVanskelighetsgrad (G < B < R)", () => {
  it.each([
    ["G", "G", true],
    ["B", "G", false],
    ["R", "G", false],
    ["G", "B", true],
    ["B", "B", true],
    ["R", "B", false],
    ["G", "R", true],
    ["B", "R", true],
    ["R", "R", true],
  ] as const)("Tur %s ved valgt %s: %s", (gradering, valgt, forventet) => {
    expect(passerVanskelighetsgrad(gradering, valgt)).toBe(forventet);
  });
});

describe("filtrerTurer (FR-15)", () => {
  it("ved 1 t Tilgjengelig tid foreslås ingen Tur med Turtid over 60 min", () => {
    const resultat = filtrerTurer(turer, { tilgjengeligMin: 60, vanskelighetsgrad: "R" });
    expect(resultat.length).toBeGreaterThan(0);
    for (const { turtidMin: tid } of resultat) expect(tid).toBeLessThanOrEqual(60);
    // Alle Turer som er ute, har Turtid over 60 min.
    const med = new Set(resultat.map(({ tur }) => tur.id));
    for (const tur of turer.filter((t) => !med.has(t.id))) expect(turtidMin(tur)).toBeGreaterThan(60);
  });

  it("ved 1 t passer fire Turer, og ved 3 t passer alle (addendum)", () => {
    const vedEnTime = filtrerTurer(turer, { tilgjengeligMin: 60, vanskelighetsgrad: "R" });
    expect(new Set(vedEnTime.map(({ tur }) => tur.id))).toEqual(
      new Set(["storlihytta-fra-vardeveien", "skihytta-fra-damefallet", "midtveishuken", "bergsvatnet"]),
    );
    expect(filtrerTurer(turer, { tilgjengeligMin: 180, vanskelighetsgrad: "R" })).toHaveLength(turer.length);
  });

  it("ved Enkel foreslås aldri Middels eller Krevende", () => {
    const resultat = filtrerTurer(turer, { tilgjengeligMin: 300, vanskelighetsgrad: "G" });
    expect(resultat.length).toBeGreaterThan(0);
    expect(new Set(resultat.map(({ tur }) => tur.gradering))).toEqual(new Set(["G"]));
  });

  it("ved Middels er Krevende ute, og ved Krevende er alle graderinger med", () => {
    const middels = filtrerTurer(turer, { tilgjengeligMin: 300, vanskelighetsgrad: "B" });
    expect(new Set(middels.map(({ tur }) => tur.gradering))).toEqual(new Set(["G", "B"]));
    const krevende = filtrerTurer(turer, { tilgjengeligMin: 300, vanskelighetsgrad: "R" });
    expect(krevende).toHaveLength(turer.length);
  });

  it("Turtid lik Tilgjengelig tid er med, ett minutt over er ute", () => {
    const lik = turMedTid("lik", 45);
    const over = turMedTid("over", 46);
    expect(filtrerTurer([lik, over], { tilgjengeligMin: 45, vanskelighetsgrad: "G" }).map(({ tur }) => tur.id)).toEqual([
      "lik",
    ]);
  });

  it("begge kravene gjelder samtidig", () => {
    const kortB = turMedTid("kort-b", 30, "B");
    const langG = turMedTid("lang-g", 90, "G");
    const kortG = turMedTid("kort-g", 30, "G");
    const resultat = filtrerTurer([kortB, langG, kortG], { tilgjengeligMin: 60, vanskelighetsgrad: "G" });
    expect(resultat.map(({ tur }) => tur.id)).toEqual(["kort-g"]);
  });

  it("gir Turtiden med hver Tur", () => {
    for (const { tur, turtidMin: tid } of filtrerTurer(turer, { tilgjengeligMin: 300, vanskelighetsgrad: "R" })) {
      expect(tid).toBe(turtidMin(tur));
    }
  });

  it("gir tom liste når ingen Tur passer", () => {
    expect(filtrerTurer(turer, { tilgjengeligMin: 15, vanskelighetsgrad: "G" })).toEqual([]);
    expect(filtrerTurer([], { tilgjengeligMin: 300, vanskelighetsgrad: "R" })).toEqual([]);
  });

  it("beholder rekkefølgen fra input og endrer ikke input", () => {
    const stokket = [...turer].reverse();
    const forHand = structuredClone(stokket);
    const resultat = filtrerTurer(stokket, { tilgjengeligMin: 300, vanskelighetsgrad: "R" });
    expect(resultat.map(({ tur }) => tur.id)).toEqual(stokket.map((t) => t.id));
    expect(stokket).toEqual(forHand);
  });
});
