import { describe, expect, it } from "vitest";
import type { Kart } from "@/kjerne/visning/skjema";
import turdatasett from "../../data/turer-moldemarka.json";
import {
  etikettTilVenstre,
  grenser,
  grupperStartpunkter,
  dekketHoyre,
  harMal,
  kartmarg,
  type Kartkort,
  kortnavn,
  markornavn,
  midtpunkt,
  MOLDEMARKA,
  punktgrenser,
  SOK_PRIKK,
  sokflate,
  sokMarg,
  velgIGruppe,
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

// Story 3.5: navnet på Startpunkt-markørene og valget ved et trykk på et delt Startpunkt.
describe("kortnavn og markornavn", () => {
  const navngitt = tre.map((k) => ({ ...k, mal: `Mål ${k.kart.nummer}`, fra: "fra Damefallet" }));

  it("gir «Turforslag N: Mål fra …»", () => {
    expect(kortnavn(navngitt[1])).toBe("Turforslag 2: Mål 2 fra Damefallet");
  });

  it("gir bare «Turforslag N» uten Mål og fra", () => {
    expect(kortnavn(tre[0])).toBe("Turforslag 1");
  });

  it("nevner alle kortene i et delt Startpunkt, i rekkefølge", () => {
    const [delt, alene] = grupperStartpunkter(navngitt);
    expect(markornavn(navngitt, delt)).toBe(
      "Turforslag 1: Mål 1 fra Damefallet og Turforslag 3: Mål 3 fra Damefallet",
    );
    expect(markornavn(navngitt, alene)).toBe("Turforslag 2: Mål 2 fra Damefallet");
  });
});

describe("dekketHoyre", () => {
  const flate = { left: 100, right: 1400, top: 300, bottom: 640 };

  it("gir bredden fra venstre kant av boksen til høyre kant av kartet når boksen ligger over kartet", () => {
    expect(dekketHoyre(flate, { left: 1028, right: 1388, top: 312, bottom: 420 })).toBe(372);
  });

  it("gir 0 når boksen står over kartet, utenfor det (mobil), eller mangler størrelse", () => {
    expect(dekketHoyre(flate, { left: 100, right: 1400, top: 180, bottom: 288 })).toBe(0);
    expect(dekketHoyre(flate, { left: 1200, right: 1200, top: 312, bottom: 312 })).toBe(0);
    expect(dekketHoyre(flate, null)).toBe(0);
  });
});

describe("kartmarg", () => {
  it("holder innholdet klar av zoomknappene, tegnforklaringen og en bred markør", () => {
    expect(kartmarg(32, 55)).toMatchObject({ paddingTopLeft: [64, 24], paddingBottomRight: [35.5, 56] });
  });

  it("holder innholdet under teksten om bakgrunnskartet", () => {
    expect(kartmarg(32, 29, 40).paddingTopLeft).toEqual([64, 40 + 29 / 2 + 4]);
  });

  it("holder innholdet til venstre for Kartinfoboksen, med halve markøren i tillegg", () => {
    expect(kartmarg(32, 29, 0, 372).paddingBottomRight).toEqual([372 + 29 / 2 + 8, 56]);
    expect(kartmarg(32, 29, 0, 0).paddingBottomRight).toEqual([24, 56]);
  });
});

describe("velgIGruppe", () => {
  const [delt, alene] = grupperStartpunkter(tre);

  it("velger det første kortet i gruppen når ingen av dem er valgt", () => {
    expect(velgIGruppe(delt, 1)).toBe(0);
  });

  it("velger det neste kortet i gruppen, og går rundt etter det siste", () => {
    expect(velgIGruppe(delt, 0)).toBe(2);
    expect(velgIGruppe(delt, 2)).toBe(0);
  });

  it("et Startpunkt med ett kort velger alltid det kortet", () => {
    expect(velgIGruppe(alene, 0)).toBe(1);
    expect(velgIGruppe(alene, 1)).toBe(1);
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

describe("sokflate", () => {
  // Kartflaten starter 100 px ned i vinduet, med kant på 1,4 px. Hjørnegruppen står 12 px inn: Omradeboksen
  // er 66 px høy, og zoomknappene står 12 px under den og er 88 px høye, så gruppen slutter 178 px ned.
  const innside = { top: 101.4, hoyde: 900 };
  const hjorne = { top: 113.4, bottom: 113.4 + 178 };

  it("måler bunnen av hele hjørnegruppen fra innsiden av kartflaten, ikke bare høyden til boksen", () => {
    const m = sokflate(innside, hjorne, null, [{ top: 950, bottom: 980 }, { top: 960, bottom: 1000 }]);
    expect(m.hoyde).toBe(900);
    expect(m.hjorneBunn).toBeCloseTo(190, 6);
    expect(m.bunnTopp).toBeCloseTo(950 - 101.4, 6);
    // Toppmargen i kartet holder prikkene under zoomknappene.
    expect(sokMarg(m).topp).toBeCloseTo(190 + 16, 6);
  });

  it("bruker teksten om bakgrunnskartet når den står lavere enn hjørnet, og hopper over den når den er tom", () => {
    expect(sokflate(innside, hjorne, { top: 113.4, bottom: 400 }, []).hjorneBunn).toBeCloseTo(400 - 101.4, 6);
    expect(sokflate(innside, hjorne, { top: 113.4, bottom: 113.4 }, []).hjorneBunn).toBeCloseTo(190, 6);
    expect(sokflate(innside, null, { top: 113.4, bottom: 140 }, []).hjorneBunn).toBeCloseTo(140 - 101.4, 6);
  });

  it("gir `null` for det som ikke er målt", () => {
    expect(sokflate(innside, null, null, [null, null])).toEqual({ hoyde: 900, hjorneBunn: null, bunnTopp: null });
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
