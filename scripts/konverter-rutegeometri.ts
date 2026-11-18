import { readFileSync, writeFileSync } from "node:fs";
import { crc32, inflateRawSync } from "node:zlib";
import proj4 from "proj4";

// Rutegeometrien (FR-28, AD-10): Turrutebasen for Molde ligger som GML i EPSG:25833 i en zip-fil.
// Skriptet pakker ut GML-fila i minnet, regner om senterlinjene til WGS84 med proj4 og skriver
// data/rutegeometri.geojson med ett Feature<MultiLineString> per Rutesegment (rutenummer + rutenavn).
// Utdataene er deterministiske: to kjøringer gir byte-identisk fil.
//
// Kjør med `npm run rutegeometri`. Fila committes, og kjernen leser den med en statisk import.

const ZIP = new URL("../data/raw/Friluftsliv_1506_Molde_25833_TurOgFriluftsruter_GML.zip", import.meta.url);
const GEOJSON = new URL("../data/rutegeometri.geojson", import.meta.url);

const SRS_NAVN = "urn:ogc:def:crs:EPSG::25833";
const SRS_DIMENSJON = "2";
const EPSG_25833 = "+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
const DESIMALER = 1e6;

type Posisjon = [number, number];

export type Rutesegment = {
  rutenummer: string;
  rutenavn: string;
  /** Linjene i GML-rekkefølge, i WGS84 som [lon, lat] med 6 desimaler. */
  linjer: Posisjon[][];
};

export type LesteRutesegmenter = {
  rutesegmenter: Rutesegment[];
  /** Antall linjer uten rutenummer. De er hoppet over. */
  utenRutenummer: number;
};

// --- Zip ---

const EOCD = 0x06054b50;
const SENTRALKATALOG = 0x02014b50;
const LOKALT_HODE = 0x04034b50;

/**
 * Pakker ut den ene `.gml`-fila i zip-fila, i minnet. Leser sentralkatalogen og støtter
 * metode 0 (lagret) og 8 (deflate). Alt annet kaster en feil.
 */
export function pakkUtGml(zip: Uint8Array): string {
  const buf = Buffer.from(zip.buffer, zip.byteOffset, zip.byteLength);

  // End of central directory ligger sist, foran en eventuell kommentar på opptil 65 535 byte.
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 0xffff); i--) {
    if (buf.readUInt32LE(i) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Zip-fila mangler sentralkatalog (End of central directory).");

  const antall = buf.readUInt16LE(eocd + 10);
  let pos = buf.readUInt32LE(eocd + 16);
  if (antall === 0xffff || pos === 0xffffffff) throw new Error("Zip64 støttes ikke.");

  const gml: { navn: string; metode: number; komprimert: number; ukomprimert: number; crc: number; offset: number }[] = [];
  for (let i = 0; i < antall; i++) {
    if (buf.readUInt32LE(pos) !== SENTRALKATALOG) throw new Error(`Ugyldig post nr. ${i + 1} i sentralkatalogen.`);
    const metode = buf.readUInt16LE(pos + 10);
    const crc = buf.readUInt32LE(pos + 16);
    const komprimert = buf.readUInt32LE(pos + 20);
    const ukomprimert = buf.readUInt32LE(pos + 24);
    const navnLengde = buf.readUInt16LE(pos + 28);
    const ekstraLengde = buf.readUInt16LE(pos + 30);
    const kommentarLengde = buf.readUInt16LE(pos + 32);
    const offset = buf.readUInt32LE(pos + 42);
    const navn = buf.toString("utf8", pos + 46, pos + 46 + navnLengde);
    if (navn.toLowerCase().endsWith(".gml")) gml.push({ navn, metode, komprimert, ukomprimert, crc, offset });
    pos += 46 + navnLengde + ekstraLengde + kommentarLengde;
  }
  if (gml.length !== 1) throw new Error(`Zip-fila skal ha nøyaktig én .gml-fil, men har ${gml.length}.`);

  const [fil] = gml;
  if (fil.komprimert === 0xffffffff || fil.ukomprimert === 0xffffffff) throw new Error("Zip64 støttes ikke.");
  if (buf.readUInt32LE(fil.offset) !== LOKALT_HODE) throw new Error(`Ugyldig lokalt hode for ${fil.navn}.`);
  const start = fil.offset + 30 + buf.readUInt16LE(fil.offset + 26) + buf.readUInt16LE(fil.offset + 28);
  const data = buf.subarray(start, start + fil.komprimert);

  let innhold: Buffer;
  if (fil.metode === 0) innhold = data;
  else if (fil.metode === 8) innhold = inflateRawSync(data);
  else throw new Error(`Komprimeringsmetode ${fil.metode} for ${fil.navn} støttes ikke (bare 0 og 8).`);

  if (innhold.length !== fil.ukomprimert) {
    throw new Error(`${fil.navn} er ${innhold.length} byte etter utpakking, men skal være ${fil.ukomprimert}.`);
  }
  if (crc32(innhold) !== fil.crc) throw new Error(`${fil.navn} har feil CRC-32 etter utpakking.`);

  return new TextDecoder("utf-8", { fatal: true }).decode(innhold);
}

// --- GML ---

const XML_ENTITETER: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

function tekst(xml: string): string {
  return xml.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-z]+);/g, (hele, navn: string) => {
    if (navn.startsWith("#x")) return String.fromCodePoint(parseInt(navn.slice(2), 16));
    if (navn.startsWith("#")) return String.fromCodePoint(parseInt(navn.slice(1), 10));
    const tegn = XML_ENTITETER[navn];
    if (tegn === undefined) throw new Error(`Ukjent XML-entitet ${hele}.`);
    return tegn;
  });
}

function elementer(xml: string, navn: string): string[] {
  const re = new RegExp(`<${navn}(?:\\s[^>]*)?>([\\s\\S]*?)</${navn}>`, "g");
  return Array.from(xml.matchAll(re), (m) => m[1]);
}

/** Sammenligner etter kodepunkt (UTF-8-byterekkefølge er kodepunktrekkefølge). */
function sammenlign(a: string, b: string): number {
  return Buffer.compare(Buffer.from(a, "utf8"), Buffer.from(b, "utf8"));
}

const rund = (x: number) => Math.round(x * DESIMALER) / DESIMALER;

/**
 * Leser senterlinjene i GML-fila og grupperer dem per Rutesegment (rutenummer + rutenavn).
 * En linje med flere `*ruteInfo` er med i hvert av Rutesegmentene sine. Linjer uten rutenummer
 * hoppes over og telles. Kaster en feil ved annen `srsName` eller `srsDimension` enn EPSG:25833 i 2D.
 */
export function lesRutesegmenter(gml: string): LesteRutesegmenter {
  const omregn = proj4(EPSG_25833, "WGS84");
  const segmenter = new Map<string, Rutesegment>();
  let utenRutenummer = 0;

  for (const medlem of elementer(gml, "gml:featureMember")) {
    const [senterlinje] = elementer(medlem, "app:senterlinje");
    if (senterlinje === undefined) continue; // Punktobjekter (tilrettelegging) har ingen linje.

    const linestring = /<gml:LineString\b([^>]*)>/.exec(senterlinje);
    if (!linestring) throw new Error("En senterlinje er ikke en gml:LineString.");
    const srsNavn = /\bsrsName="([^"]*)"/.exec(linestring[1])?.[1];
    const srsDimensjon = /\bsrsDimension="([^"]*)"/.exec(linestring[1])?.[1];
    if (srsNavn !== SRS_NAVN) throw new Error(`Ukjent srsName ${srsNavn ?? "(mangler)"}. Forventet ${SRS_NAVN}.`);
    if (srsDimensjon !== SRS_DIMENSJON) {
      throw new Error(`Ukjent srsDimension ${srsDimensjon ?? "(mangler)"}. Forventet ${SRS_DIMENSJON}.`);
    }

    const [posList] = elementer(senterlinje, "gml:posList");
    const tall = (posList ?? "").trim().split(/\s+/).map(Number);
    if (tall.length < 4 || tall.length % 2 !== 0 || !tall.every(Number.isFinite)) {
      throw new Error(`Ugyldig gml:posList: «${(posList ?? "").slice(0, 80)}».`);
    }
    const linje: Posisjon[] = [];
    for (let i = 0; i < tall.length; i += 2) {
      const [lon, lat] = omregn.forward([tall[i], tall[i + 1]]);
      linje.push([rund(lon), rund(lat)]);
    }

    // FotruteInfo, SkiløypeInfo, SykkelruteInfo, AnnenRuteInfo osv. Hver har ett rutenummer og
    // ett rutenavn. Navnene kan ha æøå, så mønsteret bruker \p{L} og ikke \w.
    const nokler = new Map<string, { rutenummer: string; rutenavn: string }>();
    for (const m of medlem.matchAll(/<app:(\p{Lu}[\p{L}\d_]*Info)>([\s\S]*?)<\/app:\1>/gu)) {
      const info = m[2];
      const rutenummer = elementer(info, "app:rutenummer");
      const rutenavn = elementer(info, "app:rutenavn");
      if (rutenummer.length === 0) continue;
      if (rutenummer.length !== 1 || rutenavn.length !== 1) {
        throw new Error(`app:${m[1]} skal ha ett rutenummer og ett rutenavn.`);
      }
      const segment = { rutenummer: tekst(rutenummer[0]), rutenavn: tekst(rutenavn[0]) };
      nokler.set(JSON.stringify([segment.rutenummer, segment.rutenavn]), segment);
    }

    if (nokler.size === 0) {
      utenRutenummer++;
      continue;
    }
    for (const [nokkel, segment] of nokler) {
      const eksisterende = segmenter.get(nokkel);
      if (eksisterende) eksisterende.linjer.push(linje);
      else segmenter.set(nokkel, { ...segment, linjer: [linje] });
    }
  }

  const rutesegmenter = [...segmenter.values()].sort(
    (a, b) => sammenlign(a.rutenummer, b.rutenummer) || sammenlign(a.rutenavn, b.rutenavn),
  );
  return { rutesegmenter, utenRutenummer };
}

/** GeoJSON-teksten: én Feature per linje og linjeskift til slutt. */
export function tilGeojson(rutesegmenter: Rutesegment[]): string {
  const features = rutesegmenter.map(({ rutenummer, rutenavn, linjer }) =>
    JSON.stringify({
      type: "Feature",
      properties: { rutenummer, rutenavn },
      geometry: { type: "MultiLineString", coordinates: linjer },
    }),
  );
  return `{"type":"FeatureCollection","features":[\n${features.join(",\n")}\n]}\n`;
}

/** Hele konverteringen: zip-fila inn, innholdet i data/rutegeometri.geojson ut. */
export function konverter(zip: Uint8Array): string {
  return tilGeojson(lesRutesegmenter(pakkUtGml(zip)).rutesegmenter);
}

if (import.meta.main) {
  const { rutesegmenter, utenRutenummer } = lesRutesegmenter(pakkUtGml(readFileSync(ZIP)));
  writeFileSync(GEOJSON, tilGeojson(rutesegmenter));
  const linjer = rutesegmenter.reduce((sum, s) => sum + s.linjer.length, 0);
  console.log(
    `Skrev data/rutegeometri.geojson: ${rutesegmenter.length} Rutesegmenter, ${linjer} linjer (en linje i flere Rutesegmenter telles i hvert). ` +
      `${utenRutenummer} linjer uten rutenummer er hoppet over.`,
  );
}
