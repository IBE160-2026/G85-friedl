import { klokkeTekst, osloKlokke } from "./tid";

// Tall i tekst (AD-7, Voice and Tone i EXPERIENCE.md). Fila er eneste sted der kjernen gjør tall
// om til tekst: 24-timersklokke i Oslo, «1 t 32 min», desimalkomma og «−» for minus.

/** Minustegnet (U+2212), ikke bindestrek. */
const MINUS = "−";

/** Avrunder `x` til `desimaler` med halve bort fra null, så −2,25 og 2,25 rundes likt. */
function avrund(x: number, desimaler: number): number {
  const faktor = 10 ** desimaler;
  // Rundes først til 1e-6 av siste viste siffer, så flyttallsstøy (2,2499999…) ikke avgjør.
  const skalert = Math.round(Math.abs(x) * faktor * 1e6) / 1e6;
  return (Math.sign(x) * Math.round(skalert)) / faktor;
}

function medFortegn(x: number, tekst: string): string {
  return x < 0 ? `${MINUS}${tekst}` : tekst;
}

function sjekkEndelig(x: number): void {
  if (!Number.isFinite(x)) throw new Error(`Ugyldig tall: ${x}`);
}

/**
 * Hele minutter som varighet: «16 min», «2 t», «1 t 32 min» og «0 min».
 * Kaster for negative tall og tall som ikke er hele.
 */
export function varighet(min: number): string {
  if (!Number.isInteger(min) || min < 0) throw new Error(`Ugyldig varighet i minutter: ${min}`);
  const timer = Math.floor(min / 60);
  const minutter = min % 60;
  if (timer === 0) return `${minutter} min`;
  if (minutter === 0) return `${timer} t`;
  return `${timer} t ${minutter} min`;
}

/** Oslo-klokka for øyeblikket `utc` (epoke-ms) som «HH:MM», avkortet til hele minutter. */
export function klokke(utc: number): string {
  return klokkeTekst(Math.floor(osloKlokke(utc)));
}

/**
 * Et tall med én desimal, uten «,0»: «0», «3,5», «10,8», «−2». Brukes for verdiene i været.
 * Et tall som rundes til null, får ikke minustegn.
 */
export function tall(x: number): string {
  sjekkEndelig(x);
  const v = avrund(x, 1);
  if (v === 0) return "0";
  const abs = Math.abs(v);
  const tekst = Number.isInteger(abs) ? String(abs) : abs.toFixed(1).replace(".", ",");
  return medFortegn(v, tekst);
}

/**
 * Lengde i kilometer som i Turdatasettet, med minst én og høyst to desimaler:
 * «5,0 km», «3,46 km», «8,8 km».
 */
export function km(x: number): string {
  sjekkEndelig(x);
  const v = avrund(x, 2);
  let tekst = Math.abs(v).toFixed(2);
  if (tekst.endsWith("0")) tekst = tekst.slice(0, -1);
  return `${medFortegn(v === 0 ? 0 : v, tekst.replace(".", ","))} km`;
}

/**
 * Hele meter uten enhet, fordi enheten varierer: «500» (m), «318» (høydemeter), «527» (moh).
 */
export function meter(x: number): string {
  sjekkEndelig(x);
  const v = avrund(x, 0);
  if (v === 0) return "0";
  return medFortegn(v, String(Math.abs(v)));
}
