import { describe, expect, it } from "vitest";
import { avstand, avstandTilLinje, avstandTilLinjer, storsteHull, type Linje } from "./geometri";

// Rundt Molde. Én meter er ca. 1/111 195 grad breddegrad og 1/(111 195 · cos 62,75°) grad lengdegrad.
const LAT = 62.75;
const LON = 7.15;
const M_LAT = 1 / 111_195;
const M_LON = 1 / (111_195 * Math.cos((LAT * Math.PI) / 180));

/** [lon, lat] for et punkt `ost` meter øst og `nord` meter nord for (LAT, LON). */
const p = (ost: number, nord: number): [number, number] => [LON + ost * M_LON, LAT + nord * M_LAT];
const punkt = (ost: number, nord: number) => ({ lon: LON + ost * M_LON, lat: LAT + nord * M_LAT });

describe("avstand", () => {
  it("måler meter mellom to punkter", () => {
    expect(avstand(punkt(0, 0), punkt(300, 400))).toBeCloseTo(500, 0);
    expect(avstand(punkt(0, 0), punkt(0, 0))).toBe(0);
  });
});

describe("avstandTilLinje", () => {
  const linje: Linje = [p(0, 0), p(1000, 0)];

  it("vinkelrett på et linjestykke", () => {
    expect(avstandTilLinje(punkt(500, 120), linje)).toBeCloseTo(120, 0);
  });

  it("utenfor enden av linja måles til endepunktet", () => {
    expect(avstandTilLinje(punkt(1300, 400), linje)).toBeCloseTo(500, 0);
    expect(avstandTilLinje(punkt(-30, -40), linje)).toBeCloseTo(50, 0);
  });

  it("på linja er avstanden 0", () => {
    expect(avstandTilLinje(punkt(250, 0), linje)).toBeCloseTo(0, 6);
  });

  it("nærmeste av flere linjestykker og flere linjer", () => {
    const knekk: Linje = [p(0, 0), p(0, 1000), p(1000, 1000)];
    expect(avstandTilLinje(punkt(500, 900), knekk)).toBeCloseTo(100, 0);
    expect(avstandTilLinjer(punkt(500, 60), [knekk, linje])).toBeCloseTo(60, 0);
  });
});

describe("storsteHull", () => {
  it("er 0 for ingen eller én linje", () => {
    expect(storsteHull([])).toBe(0);
    expect(storsteHull([[p(0, 0), p(100, 0)]])).toBe(0);
  });

  it("er 0 når en linje ender midt på en annen (T-kryss)", () => {
    expect(storsteHull([[p(0, 0), p(1000, 0)], [p(500, 0), p(500, 800)]])).toBeCloseTo(0, 6);
  });

  it("måler hullet mellom to linjer", () => {
    expect(storsteHull([[p(0, 0), p(1000, 0)], [p(1070, 0), p(2000, 0)]])).toBeCloseTo(70, 0);
  });

  it("måler fra endepunktet til nærmeste sted på den andre linja, begge veier", () => {
    // Endepunktet til b ligger 40 m fra midten av a, men a sine endepunkter ligger langt fra b.
    const a: Linje = [p(0, 0), p(1000, 0)];
    const b: Linje = [p(500, 40), p(500, 900)];
    expect(storsteHull([a, b])).toBeCloseTo(40, 0);
    expect(storsteHull([b, a])).toBeCloseTo(40, 0);
  });

  it("bruker minste spenntre: kjeden med hull på 10 og 20 m binder alt, selv om én kant er 100 m", () => {
    const linjer: Linje[] = [
      [p(0, 0), p(100, 0)],
      [p(110, 0), p(200, 0)],
      [p(220, 0), p(300, 0)],
    ];
    expect(storsteHull(linjer)).toBeCloseTo(20, 0);
  });

  it("en bit langt unna gir det store hullet", () => {
    const linjer: Linje[] = [
      [p(0, 0), p(100, 0)],
      [p(100, 0), p(200, 0)],
      [p(200, 3000), p(300, 3000)],
    ];
    expect(storsteHull(linjer)).toBeCloseTo(3000, -1);
  });
});
