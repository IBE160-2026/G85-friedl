import { TZDate } from "@date-fns/tz";

// Tid i kjernen (AD-7). Øyeblikk er epoke-ms i UTC.
// Fila er eneste bruker av @date-fns/tz (lagregel AD-7). Hver TZDate får sonen eksplisitt,
// så resultatet er det samme uansett tidssone på enhet eller server.
// Kjernen leser aldri klokka: «nå» kommer alltid som argument.

/** Én time i millisekunder. */
export const TIME_MS = 60 * 60 * 1000;

/** Én dag i minutter. */
const DOGN_MIN = 24 * 60;

/** Tidssonen all tid i appen følger. */
export const OSLO = "Europe/Oslo";

const DATO = /^(\d{4})-(\d{2})-(\d{2})$/;
const KLOKKE = /^(\d{2}):(\d{2})$/;

function lesDato(dato: string): [aar: number, maned: number, dag: number] {
  const treff = DATO.exec(dato);
  if (!treff) throw new Error(`Ugyldig dato: ${dato}`);
  return [Number(treff[1]), Number(treff[2]), Number(treff[3])];
}

function lesKlokke(klokke: string): [timer: number, minutter: number] {
  const treff = KLOKKE.exec(klokke);
  if (!treff) throw new Error(`Ugyldig klokkeslett: ${klokke}`);
  return [Number(treff[1]), Number(treff[2])];
}

const tosifret = (n: number) => String(n).padStart(2, "0");

function datoTekst(d: TZDate): string {
  return `${d.getFullYear()}-${tosifret(d.getMonth() + 1)}-${tosifret(d.getDate())}`;
}

/** Oslo-datoen 'YYYY-MM-DD' for øyeblikket `utc`. */
export function osloDato(utc: number): string {
  return datoTekst(new TZDate(utc, OSLO));
}

/**
 * Oslo-klokka for øyeblikket `utc`, som minutter etter midnatt.
 * Sekunder og millisekunder er med som brøkdel, så 13:30:01 er litt mer enn 810.
 */
export function osloKlokke(utc: number): number {
  const d = new TZDate(utc, OSLO);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60 + d.getMilliseconds() / 60_000;
}

/** UTC-øyeblikket for veggklokka `klokke` ('HH:MM') på Oslo-datoen `dato` ('YYYY-MM-DD'). */
export function osloTilUtc(dato: string, klokke: string): number {
  const [aar, maned, dag] = lesDato(dato);
  const [timer, minutter] = lesKlokke(klokke);
  return new TZDate(aar, maned - 1, dag, timer, minutter, OSLO).getTime();
}

/**
 * Ukedagen for Oslo-datoen `dato` ('YYYY-MM-DD'): 0 er søndag, 1 er mandag og 6 er lørdag.
 * Kaster for en dato som ikke finnes, for eksempel 2026-02-30.
 */
export function ukedag(dato: string): number {
  const [aar, maned, dag] = lesDato(dato);
  const d = new TZDate(aar, maned - 1, dag, 12, OSLO);
  if (datoTekst(d) !== dato) throw new Error(`Ugyldig dato: ${dato}`);
  return d.getDay();
}

/** Kalenderdatoen `n` dager etter `dato` ('YYYY-MM-DD'). Negativ `n` går bakover. */
export function leggTilDager(dato: string, n: number): string {
  const [aar, maned, dag] = lesDato(dato);
  // Kl. 12 ligger langt unna sommertidsskiftet kl. 02–03.
  return datoTekst(new TZDate(aar, maned - 1, dag + n, 12, OSLO));
}

/** `minutter` rundet opp til nærmeste hele kvarter. Et helt kvarter blir stående. */
export function kvarterOpp(minutter: number): number {
  return Math.ceil(minutter / 15) * 15;
}

/** Minutter etter midnatt som 'HH:MM'. Gjelder bare klokkeslett i samme døgn. */
export function klokkeTekst(minutter: number): string {
  if (!Number.isInteger(minutter) || minutter < 0 || minutter >= DOGN_MIN) {
    throw new Error(`Ugyldig antall minutter: ${minutter}`);
  }
  return `${tosifret(Math.floor(minutter / 60))}:${tosifret(minutter % 60)}`;
}

/**
 * Starten på hver hele time som overlapper det halvåpne intervallet [startUtc, sluttUtc).
 * 13:30–15:30 gir timene som starter 13, 14 og 15, og 10:00–12:00 gir 10 og 11.
 *
 * Ren UTC-aritmetikk er nok: Norge har hele timers forskyvning fra UTC,
 * så hele UTC-timer er hele timer i norsk tid.
 */
export function timerITidsvindu(startUtc: number, sluttUtc: number): number[] {
  const timer: number[] = [];
  if (!(sluttUtc > startUtc)) return timer;
  for (let t = Math.floor(startUtc / TIME_MS) * TIME_MS; t < sluttUtc; t += TIME_MS) {
    timer.push(t);
  }
  return timer;
}
