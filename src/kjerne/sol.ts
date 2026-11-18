import { VAERPUNKT, type Punkt } from "./vaerpunkt";

// Sol opp og ned (FR-21, AD-11): NOAA-formlene for solposisjon. Solas øvre kant ved havnivå med
// standard refraksjon (senitvinkel 90,833°), uten høydekorreksjon for 400 moh, og avrundet til
// nærmeste hele minutt. Vi bruker ikke suncalc: den gir 16:02 i stedet for 15:59 for 9. november.

export type Soltid = { oppUtc: number; nedUtc: number };

const RAD = Math.PI / 180;
const SENIT_GRADER = 90.833;
const DAG_MS = 24 * 60 * 60 * 1000;
const MINUTT_MS = 60 * 1000;
const JULIANSK_DAG_VED_EPOKE = 2440587.5;
const J2000 = 2451545;

const DATO = /^(\d{4})-(\d{2})-(\d{2})$/;

const grader = (r: number) => r / RAD;
const sin = (g: number) => Math.sin(g * RAD);
const cos = (g: number) => Math.cos(g * RAD);
const tan = (g: number) => Math.tan(g * RAD);

/** Tidsjevningen (minutter) og solas deklinasjon (grader) ved den julianske dagen `jd`. */
function solposisjon(jd: number): { tidsjevning: number; deklinasjon: number } {
  const t = (jd - J2000) / 36525;
  const l0 = (((280.46646 + t * (36000.76983 + t * 0.0003032)) % 360) + 360) % 360;
  const m = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const sentrum =
    sin(m) * (1.914602 - t * (0.004817 + 0.000014 * t)) + sin(2 * m) * (0.019993 - 0.000101 * t) + sin(3 * m) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const lengde = l0 + sentrum - 0.00569 - 0.00478 * sin(omega);
  const skraastilling0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const skraastilling = skraastilling0 + 0.00256 * cos(omega);
  const deklinasjon = grader(Math.asin(sin(skraastilling) * sin(lengde)));
  const y = tan(skraastilling / 2) ** 2;
  const tidsjevning =
    4 *
    grader(
      y * sin(2 * l0) -
        2 * e * sin(m) +
        4 * e * y * sin(m) * cos(2 * l0) -
        0.5 * y * y * sin(4 * l0) -
        1.25 * e * e * sin(2 * m),
    );
  return { tidsjevning, deklinasjon };
}

/**
 * Minutter etter UTC-midnatt for sol opp (`retning` −1) eller ned (+1) på dagen som starter ved
 * den julianske dagen `jd0`. Regnes to ganger, med solposisjonen ved det anslåtte tidspunktet.
 */
function solMinutter(jd0: number, punkt: Punkt, retning: -1 | 1, dato: string): number {
  let minutter = 720;
  for (let runde = 0; runde < 2; runde++) {
    const { tidsjevning, deklinasjon } = solposisjon(jd0 + minutter / 1440);
    const cosTimevinkel = cos(SENIT_GRADER) / (cos(punkt.lat) * cos(deklinasjon)) - tan(punkt.lat) * tan(deklinasjon);
    if (cosTimevinkel < -1) throw new Error(`Sola går ikke ned ${dato} ved ${punkt.lat}, ${punkt.lon} (midnattssol).`);
    if (cosTimevinkel > 1) throw new Error(`Sola går ikke opp ${dato} ved ${punkt.lat}, ${punkt.lon} (mørketid).`);
    const timevinkel = grader(Math.acos(cosTimevinkel));
    minutter = 720 - 4 * (punkt.lon - retning * timevinkel) - tidsjevning;
  }
  return minutter;
}

/**
 * Sol opp og ned som UTC-øyeblikk, avrundet til nærmeste hele minutt, for Oslo-datoen `dato`
 * ('YYYY-MM-DD') ved `punkt` (standard: Værpunktet). Laget for Værpunktet (62,76 N), der sola går
 * opp og ned hver dag og begge tidene ligger på Oslo-datoen. Med refraksjon kan midnattssola nå
 * sør for polarsirkelen, så lenger nord kan beregningen kaste, eller solnedgangen falle etter
 * midnatt i Oslo.
 */
export function soltider(dato: string, punkt: Punkt = VAERPUNKT): Soltid {
  const treff = DATO.exec(dato);
  if (!treff) throw new Error(`Ugyldig dato: ${dato}`);
  const midnattUtc = Date.UTC(Number(treff[1]), Number(treff[2]) - 1, Number(treff[3]));
  const jd0 = midnattUtc / DAG_MS + JULIANSK_DAG_VED_EPOKE;
  const tilUtc = (minutter: number) => midnattUtc + Math.round(minutter) * MINUTT_MS;
  return {
    oppUtc: tilUtc(solMinutter(jd0, punkt, -1, dato)),
    nedUtc: tilUtc(solMinutter(jd0, punkt, 1, dato)),
  };
}
