import type { FitBoundsOptions } from "leaflet";
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

/**
 * Et kort slik kartet trenger det. Turkort og Alternativkort passer. `mal` og `fra` gir navnet på
 * Startpunkt-markøren når kartet er interaktivt (story 3.5).
 */
export type Kartkort = { turId: string; kart: Kart; mal?: string; fra?: string };

/** Et punkt i WGS84. */
export type Punkt = Kart["startpunkt"];

/**
 * Et Startpunkt på Søk-kartet, fra sidedataene (story 3.3). `kortnavn` står ved prikken, som i skissen pc-1.
 * Det fulle `navn` står i den skjulte listen for skjermlesere og brukes som nøkkel.
 */
export type NavngittPunkt = Punkt & { navn: string; kortnavn: string };

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

/**
 * Det tilgjengelige navnet på et kort i kartet (story 3.5, UX-DR44): «Turforslag N: {mal} {fra}». `fra` fra
 * kjernen er allerede «fra …». Uten `mal` er navnet bare «Turforslag N».
 */
export function kortnavn({ kart, mal, fra }: Kartkort): string {
  const tur = [mal, fra].filter((t) => t !== undefined && t.length > 0).join(" ");
  return tur.length > 0 ? `Turforslag ${kart.nummer}: ${tur}` : `Turforslag ${kart.nummer}`;
}

/** Navnet på en Startpunkt-markør. Et delt Startpunkt nevner alle kortene, i rekkefølge, skilt med « og ». */
export const markornavn = (kort: readonly Kartkort[], gruppe: Startgruppe) =>
  gruppe.kort.map(({ indeks }) => kortnavn(kort[indeks])).join(" og ");

/**
 * Kortet et trykk på en Startpunkt-markør velger (story 3.5). Er ingen av kortene i gruppen valgt, velges
 * det første. Er ett av dem valgt, velges det neste i gruppen, og etter det siste kommer det første igjen.
 * Et Startpunkt med ett kort velger alltid det kortet. Gir indeksen i Resultatet.
 */
export function velgIGruppe(gruppe: Startgruppe, valgt: number): number {
  const plass = gruppe.kort.findIndex((k) => k.indeks === valgt);
  return gruppe.kort[(plass + 1) % gruppe.kort.length].indeks;
}

/** Startpunktet i kartet: sirkelen er 29 px med ringen. */
export const PIN = 29;

/**
 * Margen rundt rutene når kartet zoomer til dem, eller rundt en markør som får fokus (story 3.5). Til venstre
 * står zoomknappene, og nederst står tegnforklaringen, som er `forklaring` px høy. Til sidene er margen minst
 * halve den bredeste Startpunkt-markøren, så en delt markør i kanten ikke klippes. Etiketten «omtrentlig rute»
 * peker inn mot kartet (se `etikettTilVenstre`) og trenger ikke egen marg. Står teksten om bakgrunnskartet
 * øverst, er `feilBunn` bunnen av den i px, og innholdet holdes under den. Dekker Kartinfoboksen `infoboks` px
 * fra høyre kant (PC), holdes innholdet til venstre for den.
 */
export function kartmarg(forklaring: number, bredesteMarkor: number, feilBunn = 0, infoboks = 0): FitBoundsOptions {
  const side = bredesteMarkor / 2 + 8;
  const topp = Math.max(24, PIN / 2 + 8, feilBunn > 0 ? feilBunn + PIN / 2 + 4 : 0);
  return {
    paddingTopLeft: [Math.max(64, side), topp],
    paddingBottomRight: [Math.max(24, side, infoboks > 0 ? infoboks + side : 0), forklaring + 24],
    maxZoom: 16,
    animate: false,
  };
}

/** En boks målt i px i vinduet, som fra `getBoundingClientRect`. */
export type Rekt = { left: number; right: number; top: number; bottom: number };

/**
 * Bredden i px som `boks` dekker av kartflaten `flate` fra høyre kant, eller 0 når boksen står utenfor kartet
 * eller ikke har størrelse (story 3.5). Kartinfoboksen ligger over kartet på PC og over det, utenfor, på mobil.
 */
export function dekketHoyre(flate: Rekt, boks: Rekt | null): number {
  if (!boks || boks.right <= boks.left) return 0;
  const over = boks.left < flate.right && boks.right > flate.left && boks.top < flate.bottom && boks.bottom > flate.top;
  return over ? flate.right - boks.left : 0;
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

const HTML_TEGN: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
/** Tekst som trygt kan settes inn i HTML-en til en `divIcon` (navnet ved prikken på Søk-kartet). */
export const somHtml = (tekst: string) => tekst.replace(/[&<>"']/g, (t) => HTML_TEGN[t]);

/** Et rektangel i px i kartflaten, med øverste venstre hjørne i (`x`, `y`). */
export type Flatrekt = { x: number; y: number; bredde: number; hoyde: number };

/** Hvor navnet står i forhold til prikken på Søk-kartet. */
export type Etikettplass =
  | "hoyre"
  | "venstre"
  | "over"
  | "under"
  | "overHoyre"
  | "underHoyre"
  | "overVenstre"
  | "underVenstre";

/**
 * Rekkefølgen plassene prøves i. Til høyre er som i skissen pc-1. De diagonale plassene kommer sist og har
 * hjørnet mot hjørnet av prikken. De trengs der prikkene står tett, som rundt Vardeveien når kartet er zoomet ut.
 */
export const ETIKETTPLASSER: readonly Etikettplass[] = [
  "hoyre",
  "venstre",
  "over",
  "under",
  "underHoyre",
  "overHoyre",
  "underVenstre",
  "overVenstre",
];

/** Avstanden i px mellom kanten av prikken og navnet. */
export const ETIKETT_AVSTAND = 4;

/** Rektangelet til et navn som er `bredde` × `hoyde` px, ved prikken med midtpunkt i (`x`, `y`). */
export function etikettrekt(x: number, y: number, bredde: number, hoyde: number, plass: Etikettplass): Flatrekt {
  const r = SOK_PRIKK / 2 + ETIKETT_AVSTAND;
  switch (plass) {
    case "hoyre":
      return { x: x + r, y: y - hoyde / 2, bredde, hoyde };
    case "venstre":
      return { x: x - r - bredde, y: y - hoyde / 2, bredde, hoyde };
    case "over":
      return { x: x - bredde / 2, y: y - r - hoyde, bredde, hoyde };
    case "under":
      return { x: x - bredde / 2, y: y + r, bredde, hoyde };
    case "overHoyre":
      return { x: x + SOK_PRIKK / 2, y: y - SOK_PRIKK / 2 - hoyde, bredde, hoyde };
    case "underHoyre":
      return { x: x + SOK_PRIKK / 2, y: y + SOK_PRIKK / 2, bredde, hoyde };
    case "overVenstre":
      return { x: x - SOK_PRIKK / 2 - bredde, y: y - SOK_PRIKK / 2 - hoyde, bredde, hoyde };
    case "underVenstre":
      return { x: x - SOK_PRIKK / 2 - bredde, y: y + SOK_PRIKK / 2, bredde, hoyde };
  }
}

/** Arealet der to rektangler overlapper. */
function overlapp(a: Flatrekt, b: Flatrekt): number {
  const b0 = Math.min(a.x + a.bredde, b.x + b.bredde) - Math.max(a.x, b.x);
  const h0 = Math.min(a.y + a.hoyde, b.y + b.hoyde) - Math.max(a.y, b.y);
  return b0 > 0 && h0 > 0 ? b0 * h0 : 0;
}

/** Største antall forbedringsrunder i `plasserEtiketter`. Hver runde gjør minst ett navn bedre. */
const MAKS_RUNDER = 20;

/**
 * Plassene til navnene på Søk-kartet (rettelse etter walkthrough av story 3.3). Et navn bør stå helt inne i
 * kartflaten og ikke overlappe andre prikker, andre navn eller `hindringer` (Omradeboksen, zoomknappene,
 * tegnforklaringen, krediteringen og teksten om bakgrunnskartet). Kostnaden til en plass er arealet som
 * overlapper, der areal utenfor kartflaten teller som overlapp.
 *
 * Først tas punktene i en rekkefølge, og hvert får den første plassen i `ETIKETTPLASSER` med lavest kostnad mot
 * navnene som alt er plassert. Så går forbedringsrundene: hvert navn flyttes til plassen med lavest kostnad mot
 * alle de andre, men bare når det blir strengt bedre, til en runde ikke endrer noe. Dette prøves med flere
 * rekkefølger, så et tidlig valg kan vike for et senere punkt som ellers ikke hadde plass. Ved likt overlapp
 * vinner den første plassen og den første rekkefølgen.
 */
export function plasserEtiketter(
  punkter: readonly { x: number; y: number; bredde: number; hoyde: number }[],
  flate: { bredde: number; hoyde: number },
  hindringer: readonly Flatrekt[] = [],
): Etikettplass[] {
  const prikker = punkter.map(({ x, y }) => ({
    x: x - SOK_PRIKK / 2,
    y: y - SOK_PRIKK / 2,
    bredde: SOK_PRIKK,
    hoyde: SOK_PRIKK,
  }));
  const hele: Flatrekt = { x: 0, y: 0, bredde: flate.bredde, hoyde: flate.hoyde };
  const rekt = (i: number, plass: Etikettplass) => {
    const { x, y, bredde, hoyde } = punkter[i];
    return etikettrekt(x, y, bredde, hoyde, plass);
  };
  /** Kostnaden for navn `i` på `plass`, mot de andre navnene i `andre`. */
  const kost = (i: number, plass: Etikettplass, andre: readonly (Flatrekt | null)[]) => {
    const r = rekt(i, plass);
    const utenfor = r.bredde * r.hoyde - overlapp(r, hele);
    const mot = (liste: readonly (Flatrekt | null)[]) =>
      liste.reduce((sum, b, j) => (b === null || j === i ? sum : sum + overlapp(r, b)), 0);
    return utenfor + mot(prikker) + mot(andre) + hindringer.reduce((sum, h) => sum + overlapp(r, h), 0);
  };
  const beste = (i: number, andre: readonly (Flatrekt | null)[]) => {
    let valgt = ETIKETTPLASSER[0];
    let lavest = Infinity;
    for (const plass of ETIKETTPLASSER) {
      const k = kost(i, plass, andre);
      if (k < lavest) [valgt, lavest] = [plass, k];
      if (k === 0) break;
    }
    return { plass: valgt, kost: lavest };
  };

  /** Grådig plassering i `rekkefolge`, så forbedringsrundene. Gir plassene og den samlede kostnaden. */
  const forsok = (rekkefolge: readonly number[]) => {
    const plasser: Etikettplass[] = punkter.map(() => ETIKETTPLASSER[0]);
    const rekter: (Flatrekt | null)[] = punkter.map(() => null);
    for (const i of rekkefolge) {
      plasser[i] = beste(i, rekter).plass;
      rekter[i] = rekt(i, plasser[i]);
    }
    for (let runde = 0; runde < MAKS_RUNDER; runde++) {
      let endret = false;
      for (const i of rekkefolge) {
        const na = kost(i, plasser[i], rekter);
        if (na === 0) continue;
        const ny = beste(i, rekter);
        if (ny.kost < na) {
          plasser[i] = ny.plass;
          rekter[i] = rekt(i, ny.plass);
          endret = true;
        }
      }
      if (!endret) break;
    }
    const samlet = rekkefolge.reduce((sum, i) => sum + kost(i, plasser[i], rekter), 0);
    return { plasser, samlet };
  };

  // Flere startrekkefølger, fordi ett navn om gangen ikke kan bytte plass med et annet: som gitt, baklengs,
  // fra vest og fra øst. Den første med lavest samlet kostnad vinner, så resultatet er stabilt.
  const gitt = punkter.map((_, i) => i);
  const fraVest = [...gitt].sort((a, b) => punkter[a].x - punkter[b].x);
  let best: { plasser: Etikettplass[]; samlet: number } | null = null;
  for (const rekkefolge of [gitt, [...gitt].reverse(), fraVest, [...fraVest].reverse()]) {
    const r = forsok(rekkefolge);
    if (best === null || r.samlet < best.samlet) best = r;
    if (r.samlet === 0) break;
  }
  return best?.plasser ?? [];
}
