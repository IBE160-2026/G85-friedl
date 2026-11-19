import type { Kart } from "@/kjerne/visning/skjema";

// Rene hjelpere for kartet (story 3.1). Kartet får `kart` fra kortene i Resultatet og tegner ruter,
// Startpunkter og Mål. Her står det som kan regnes ut uten Leaflet, så det kan testes med Vitest:
// grupperingen av Startpunkter, grensene kartet zoomer til, og punktet midt på ruten for etiketten
// «omtrentlig rute». Rutene er GeoJSON i [lon, lat], og resten er { lat, lon }.

/**
 * Kartflisene: Kartverkets topografiske gråtonekart i webmercator, uten nøkkel (AR-19). Nettleseren henter
 * dem direkte. Playwright stubber dem (e2e/fixtures.ts).
 */
export const KARTFLISER_URL =
  "https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png";

/** Et kort slik kartet trenger det. Turkort og Alternativkort passer. */
export type Kartkort = { turId: string; kart: Kart };

/** Et punkt i WGS84. */
export type Punkt = Kart["startpunkt"];

/** Grenser som Leaflet tar imot: [[sør, vest], [nord, øst]]. */
export type Grenser = [[number, number], [number, number]];

/** Ett Startpunkt på kartet, med numrene til kortene som starter der, i rekkefølgen kortene står. */
export type Startgruppe = { punkt: Punkt; kort: { indeks: number; nummer: number }[] };

/**
 * Kort med samme Startpunkt (like koordinater) får én markør med numrene side om side. Gruppene står i
 * rekkefølgen det første kortet i gruppen har.
 */
export function grupperStartpunkter(kort: readonly Kartkort[]): Startgruppe[] {
  const grupper = new Map<string, Startgruppe>();
  kort.forEach(({ kart }, indeks) => {
    const nokkel = `${kart.startpunkt.lat},${kart.startpunkt.lon}`;
    const gruppe = grupper.get(nokkel) ?? { punkt: kart.startpunkt, kort: [] };
    gruppe.kort.push({ indeks, nummer: kart.nummer });
    grupper.set(nokkel, gruppe);
  });
  return [...grupper.values()];
}

/** Grensene for alle ruter, Startpunkter og Mål. `null` når det ikke er noen kort. */
export function grenser(kort: readonly Kartkort[]): Grenser | null {
  const punkter = kort.flatMap(({ kart }) => [
    kart.startpunkt,
    ...(kart.malpunkt ? [kart.malpunkt] : []),
    ...kart.rute.geometry.coordinates.flat().map(([lon, lat]) => ({ lat, lon })),
  ]);
  if (punkter.length === 0) return null;
  const lat = punkter.map((p) => p.lat);
  const lon = punkter.map((p) => p.lon);
  return [
    [Math.min(...lat), Math.min(...lon)],
    [Math.max(...lat), Math.max(...lon)],
  ];
}

/**
 * Punktet halvveis langs ruten, regnet etter lengden. Lengdegrader krympes med cos(breddegrad), så
 * avstandene blir omtrent like i begge retninger. Linjene i en MultiLineString regnes etter hverandre,
 * uten avstanden mellom dem.
 */
export function midtpunkt(rute: Kart["rute"]): Punkt {
  const linjer = rute.geometry.coordinates;
  const forste = linjer[0][0];
  const skala = Math.cos((forste[1] * Math.PI) / 180);
  const strekk = linjer.flatMap((linje) =>
    linje.slice(1).map((til, i) => {
      const fra = linje[i];
      const lengde = Math.hypot((til[0] - fra[0]) * skala, til[1] - fra[1]);
      return { fra, til, lengde };
    }),
  );
  const halve = strekk.reduce((sum, s) => sum + s.lengde, 0) / 2;
  let gatt = 0;
  for (const { fra, til, lengde } of strekk) {
    if (lengde > 0 && gatt + lengde >= halve) {
      const t = (halve - gatt) / lengde;
      return { lat: fra[1] + (til[1] - fra[1]) * t, lon: fra[0] + (til[0] - fra[0]) * t };
    }
    gatt += lengde;
  }
  // Ruten har lengde null: alle punktene er like.
  return { lat: forste[1], lon: forste[0] };
}

/** Tegnforklaringen viser Mål bare når minst ett kort har Mål. */
export const harMal = (kort: readonly Kartkort[]) => kort.some(({ kart }) => kart.malpunkt !== undefined);

/**
 * Etiketten «omtrentlig rute» står til høyre for midten av ruten. Ligger midten i den østre halvdelen av
 * grensene, står den til venstre i stedet, så den peker inn mot kartet og ikke klippes i kanten.
 */
export const etikettTilVenstre = (midt: Punkt, [[, vest], [, ost]]: Grenser) => midt.lon > (vest + ost) / 2;
