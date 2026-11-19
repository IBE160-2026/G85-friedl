import { describe, expect, it } from "vitest";
import type { Kart } from "@/kjerne/visning/skjema";
import turdatasett from "../../data/turer-moldemarka.json";
import {
  etikettTilVenstre,
  grenser,
  grupperStartpunkter,
  harMal,
  type Kartkort,
  midtpunkt,
  MOLDEMARKA,
  punktgrenser,
  SOK_PRIKK,
  sokMarg,
} from "./kart-data";

// Story 3.1: grupperingen av Startpunkter, grensene kartet zoomer til, punktet for «omtrentlig rute»
// og Mål i tegnforklaringen. Rutene er GeoJSON i [lon, lat].

type Posisjon = [number, number];

const rute = (...linjer: Posisjon[][]): Kart["rute"] => ({
  type: "Feature",
  geometry: { type: "MultiLineString", coordinates: linjer },
  properties: {},
});

function kort(nummer: number, startpunkt: Kart["startpunkt"], linjer: Posisjon[][], malpunkt?: Kart["startpunkt"]) {
  const kart: Kart = { rute: rute(...linjer), startpunkt, nummer, ...(malpunkt ? { malpunkt } : {}) };
  return { turId: `tur-${nummer}`, kart } satisfies Kartkort;
}

const DAMEFALLET = { lat: 62.75, lon: 7.16 };
const MUSEET = { lat: 62.735, lon: 7.13 };

const tre = [
  kort(1, DAMEFALLET, [[[7.16, 62.75], [7.18, 62.77]]]),
  kort(2, MUSEET, [[[7.13, 62.735], [7.12, 62.75]], [[7.12, 62.75], [7.125, 62.76]]]),
  kort(3, { ...DAMEFALLET }, [[[7.16, 62.75], [7.15, 62.76]]]),
];

describe("grupperStartpunkter", () => {
  it("gir én gruppe per Startpunkt, med numrene side om side når koordinatene er like", () => {
    expect(grupperStartpunkter(tre)).toEqual([
      { punkt: DAMEFALLET, kort: [{ indeks: 0, nummer: 1 }, { indeks: 2, nummer: 3 }] },
      { punkt: MUSEET, kort: [{ indeks: 1, nummer: 2 }] },
    ]);
  });

  it("skiller Startpunkter som bare er nesten like", () => {
    const nesten = [tre[0], kort(2, { lat: 62.75, lon: 7.1600001 }, [[[7.16, 62.75], [7.17, 62.76]]])];
    expect(grupperStartpunkter(nesten)).toHaveLength(2);
  });

  it("gir én gruppe med nummer 1 for Alternativet", () => {
    const alternativ = kort(1, MUSEET, [[[7.13, 62.735], [7.12, 62.75]]]);
    expect(grupperStartpunkter([alternativ])).toEqual([{ punkt: MUSEET, kort: [{ indeks: 0, nummer: 1 }] }]);
  });
});

describe("grenser", () => {
  it("dekker alle koordinater i rutene og alle Startpunkter, som [[sør, vest], [nord, øst]]", () => {
    expect(grenser(tre)).toEqual([
      [62.735, 7.12],
      [62.77, 7.18],
    ]);
    const [[sor, vest], [nord, ost]] = grenser(tre)!;
    for (const { kart } of tre) {
      const punkter = [kart.startpunkt, ...kart.rute.geometry.coordinates.flat().map(([lon, lat]) => ({ lat, lon }))];
      for (const p of punkter) {
        expect(p.lat).toBeGreaterThanOrEqual(sor);
        expect(p.lat).toBeLessThanOrEqual(nord);
        expect(p.lon).toBeGreaterThanOrEqual(vest);
        expect(p.lon).toBeLessThanOrEqual(ost);
      }
    }
  });

  it("tar med et Startpunkt som ligger utenfor ruten, og Mål", () => {
    const utenfor = kort(1, { lat: 62.7, lon: 7.0 }, [[[7.16, 62.75], [7.18, 62.77]]], { lat: 62.8, lon: 7.2 });
    expect(grenser([utenfor])).toEqual([
      [62.7, 7.0],
      [62.8, 7.2],
    ]);
  });

  it("gir null uten kort", () => {
    expect(grenser([])).toBeNull();
  });
});

describe("punktgrenser", () => {
  it("er grensene rundt punktene, som [[sør, vest], [nord, øst]]", () => {
    expect(
      punktgrenser([
        { lat: 62.75, lon: 7.2 },
        { lat: 62.73, lon: 7.27 },
        { lat: 62.76, lon: 7.14 },
      ]),
    ).toEqual([
      [62.73, 7.14],
      [62.76, 7.27],
    ]);
  });

  it("gir null uten punkter", () => {
    expect(punktgrenser([])).toBeNull();
  });
});

describe("sokMarg", () => {
  it("holder prikkene under hjørnet og over tegnforklaringen og krediteringen i et høyt kart", () => {
    const m = sokMarg({ hoyde: 900, hjorneBunn: 180, bunnTopp: 850 });
    expect(m).toEqual({ side: SOK_PRIKK / 2 + 16, topp: 196, bunn: 66 });
  });

  it("bruker halve prikken med klaring før overleggene er målt", () => {
    const side = SOK_PRIKK / 2 + 16;
    expect(sokMarg({ hoyde: 900, hjorneBunn: null, bunnTopp: null })).toEqual({ side, topp: side, bunn: side });
  });

  it("krymper margene likt i et lavt kart, så det blir plass igjen til prikkene", () => {
    const m = sokMarg({ hoyde: 300, hjorneBunn: 180, bunnTopp: 200 });
    expect(m.topp + m.bunn).toBeCloseTo(300 - SOK_PRIKK, 6);
    expect(m.topp / m.bunn).toBeCloseTo(196 / 116, 6);
  });

  it("gir aldri negative marger når kartet er lavere enn overleggene", () => {
    for (const hoyde of [0, 5, SOK_PRIKK, 40]) {
      const m = sokMarg({ hoyde, hjorneBunn: 180, bunnTopp: hoyde + 20 });
      expect(m.topp).toBeGreaterThanOrEqual(0);
      expect(m.bunn).toBeGreaterThanOrEqual(0);
      expect(m.topp + m.bunn).toBeLessThanOrEqual(Math.max(1, hoyde - SOK_PRIKK) + 1e-9);
      expect(Number.isFinite(m.topp) && Number.isFinite(m.bunn)).toBe(true);
    }
  });
});

describe("midtpunkt", () => {
  it("ligger halvveis langs en rett rute", () => {
    const m = midtpunkt(rute([[7.1, 62.7], [7.1, 62.8]]));
    expect(m.lat).toBeCloseTo(62.75, 10);
    expect(m.lon).toBeCloseTo(7.1, 10);
  });

  it("følger lengden, ikke antallet punkter", () => {
    // Tre korte strekk nord, så ett langt: midten ligger på det lange strekket.
    const m = midtpunkt(rute([[7, 62], [7, 62.01], [7, 62.02], [7, 62.03], [7, 62.33]]));
    expect(m.lat).toBeCloseTo(62.165, 10);
    expect(m.lon).toBe(7);
  });

  it("krymper lengdegradene med breddegraden", () => {
    // Øst 0,2° ved 60° N er like langt som nord 0,1°. Midten er hjørnet.
    const m = midtpunkt(rute([[7, 60], [7.2, 60], [7.2, 60.1]]));
    expect(m.lat).toBeCloseTo(60, 3);
    expect(m.lon).toBeCloseTo(7.2, 3);
  });

  it("regner linjene i en MultiLineString etter hverandre", () => {
    const m = midtpunkt(rute([[7, 62], [7, 62.1]], [[8, 62], [8, 62.1]]));
    expect(m.lat).toBeCloseTo(62.1, 10);
    expect(m.lon).toBe(7);
  });

  it("gir første punkt når ruten har lengde null", () => {
    expect(midtpunkt(rute([[7, 62], [7, 62]]))).toEqual({ lat: 62, lon: 7 });
  });
});

describe("harMal", () => {
  it("er sann bare når minst ett kort har Mål", () => {
    expect(harMal(tre)).toBe(false);
    expect(harMal([...tre, kort(3, MUSEET, [[[7, 62], [7, 62.1]]], { lat: 62.1, lon: 7 })])).toBe(true);
  });
});

describe("etikettTilVenstre", () => {
  const omrade = [
    [62.7, 7.0],
    [62.8, 7.2],
  ] as [[number, number], [number, number]];

  it("legger etiketten til venstre bare når midten ligger i den østre halvdelen", () => {
    expect(etikettTilVenstre({ lat: 62.75, lon: 7.19 }, omrade)).toBe(true);
    expect(etikettTilVenstre({ lat: 62.75, lon: 7.01 }, omrade)).toBe(false);
    expect(etikettTilVenstre({ lat: 62.75, lon: 7.1 }, omrade)).toBe(false);
  });
});

describe("MOLDEMARKA", () => {
  it("er grensene rundt de 8 Startpunktene i Turdatasettet", () => {
    const startpunkter = new Map(turdatasett.turer.map(({ startpunkt: p }) => [`${p.lat},${p.lon}`, p]));
    expect(startpunkter.size).toBe(8);
    const lat = [...startpunkter.values()].map((p) => p.lat);
    const lon = [...startpunkter.values()].map((p) => p.lon);
    expect(MOLDEMARKA).toEqual([
      [Math.min(...lat), Math.min(...lon)],
      [Math.max(...lat), Math.max(...lon)],
    ]);
  });
});
