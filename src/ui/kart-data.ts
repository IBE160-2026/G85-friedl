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

/**
 * Et Startpunkt på Søk-kartet, fra sidedataene (story 3.3). Navnet vises med vilje ikke på kartet: skissen
 * pc-1 har ingen etikett ved hover eller fokus, og ingenting skal kreve hover. Det brukes som nøkkel.
 */
export type NavngittPunkt = Punkt & { navn: string };

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
  return punktgrenser(punkter);
}

/** Grensene rundt punktene (Søk-kartet, story 3.3). `null` når det ikke er noen punkter. */
export function punktgrenser(punkter: readonly Punkt[]): Grenser | null {
  if (punkter.length === 0) return null;
  const lat = punkter.map((p) => p.lat);
  const lon = punkter.map((p) => p.lon);
  return [
    [Math.min(...lat), Math.min(...lon)],
    [Math.max(...lat), Math.max(...lon)],
  ];
}

/** Startpunktet på Søk-kartet: en prikk uten nummer, 17 px med papirringen (skissen pc-1). */
export const SOK_PRIKK = 17;
/** Avstanden i px mellom en prikk og boksen øverst, eller tegnforklaringen og krediteringen nederst. */
const SOK_KLARING = 16;

/** Det som står over Søk-kartet, målt i px fra toppen av kartflaten. */
export type Sokflate = {
  /** Høyden til kartflaten. */
  hoyde: number;
  /** Bunnen av hjørnet øverst til venstre (Omradeboksen med zoomknappene), eller `null` før det er målt. */
  hjorneBunn: number | null;
  /** Den øverste toppen av tegnforklaringen og krediteringen nederst, eller `null` før de er målt. */
  bunnTopp: number | null;
};

/** En boks målt i px i vinduet, som fra `getBoundingClientRect`. */
export type Malt = { top: number; bottom: number };

/**
 * Overleggene på Søk-kartet i px fra toppen av innsiden av kartflaten (der Leaflet-flaten starter), fra
 * boksene slik nettleseren har målt dem. `innside` er toppen av innsiden og høyden. Øverst er det den laveste
 * av hjørnegruppen (Omradeboksen med zoomknappene under) og teksten om bakgrunnskartet. En boks uten høyde
 * (teksten uten feil) eller `null` (ikke målt ennå) teller ikke.
 */
export function sokflate(
  innside: { top: number; hoyde: number },
  hjorne: Malt | null,
  feil: Malt | null,
  bunn: readonly (Malt | null)[],
): Sokflate {
  const har = (b: Malt | null): b is Malt => b !== null && b.bottom > b.top;
  const overst = [hjorne, feil].filter(har).map((b) => b.bottom - innside.top);
  const nederst = bunn.filter(har).map((b) => b.top - innside.top);
  return {
    hoyde: innside.hoyde,
    hjorneBunn: overst.length > 0 ? Math.max(...overst) : null,
    bunnTopp: nederst.length > 0 ? Math.min(...nederst) : null,
  };
}

/**
 * Margen i px rundt Startpunktene på Søk-kartet (story 3.3). Prikkene holdes under hjørnet øverst og over
 * tegnforklaringen og krediteringen nederst, og til sidene står hele prikken inne i kartet. Er kartflaten
 * for lav til margene, krymper de like mye, så det alltid er minst 1 px igjen til prikkene.
 */
export function sokMarg({ hoyde, hjorneBunn, bunnTopp }: Sokflate): { side: number; topp: number; bunn: number } {
  const side = SOK_PRIKK / 2 + SOK_KLARING;
  const topp = hjorneBunn === null ? side : hjorneBunn + SOK_KLARING;
  const bunn = bunnTopp === null ? side : Math.max(0, hoyde - bunnTopp) + SOK_KLARING;
  const rom = Math.max(1, hoyde - SOK_PRIKK);
  const skala = topp + bunn > rom ? Math.max(0, rom / (topp + bunn)) : 1;
  return { side, topp: topp * skala, bunn: bunn * skala };
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

/**
 * Moldemarka: grensene rundt de 8 Startpunktene i Turdatasettet (data/turer-moldemarka.json), som det
 * statiske kartet på Frarådet-kortet viser (story 3.2). Sør er Kaia i Molde sentrum (62,73451), nord og
 * øst er Tusten skisenter (62,76412 og 7,27154), og vest er Romsdalsmuseet (7,14728). Kartet zoomer til
 * grensene med litt marg. kart-data.test.ts sjekker tallene mot Turdatasettet.
 */
export const MOLDEMARKA: Grenser = [
  [62.73451, 7.14728],
  [62.76412, 7.27154],
];
