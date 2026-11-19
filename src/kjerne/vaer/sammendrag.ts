import { klokke, tall, temperaturTekst } from "../format";
import type { VaerGrunnlag } from "../regeltekst";
import { timerITidsvindu } from "../tid";
import { vaerord } from "../vaerord";
import type { Vaer } from "../visning/skjema";
import { VAERTERSKLER, type Vaerterskler } from "./terskler";
import type { Vaerklasse, Vaermelding, Vaertime } from "./typer";
import { VAERIKONER } from "./vaerikoner";
import { darligsteKlasse, erBedreKlasse, klasseForTime } from "./vaerklasse";

// Værsammendraget og Værsymbolet (FR-10, FR-20, UX-DR16, UX-DR17). Tidsvinduet oppsummeres over de
// samme timene som Værklassen (`timerITidsvindu`): høyeste nedbør og vind, laveste og høyeste
// temperatur, og symbolet fra timen med dårligst Værklasse (den første ved likhet).
// Ren og deterministisk. Alle tall i tekst lages i format.ts. `vaervarsling` legges til i lag-visning.ts.

/** Det Værsammendraget, Værordene og Regelteksten trenger om Tidsvinduet. */
export type Tidsvinduoppsummering = {
  klasse: Vaerklasse;
  maksNedborMmT: number;
  maksVindMs: number;
  minTempC: number;
  maksTempC: number;
  /** Symbolkoden fra timen med dårligst Værklasse, den første ved likhet. */
  symbolKode: string | null;
};

/** Høydemerknaden (FR-10). */
export const HOYDEMERKNAD = "Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.";

/**
 * Oppsummerer Tidsvinduet [startUtc, sluttUtc) over timene som overlapper det. Gir `null` når en av
 * timene mangler i Værmeldingen, eller når vinduet er tomt, akkurat som `klasseForTidsvindu` gir
 * `mangler`.
 */
export function oppsummerTidsvindu(
  melding: Vaermelding,
  startUtc: number,
  sluttUtc: number,
  terskler: Vaerterskler = VAERTERSKLER,
): Tidsvinduoppsummering | null {
  const timer = timerITidsvindu(startUtc, sluttUtc);
  if (timer.length === 0) return null;

  const raderPerTime = new Map<number, Vaertime[]>();
  for (const time of melding.timer) {
    const rader = raderPerTime.get(time.startUtc);
    if (rader) rader.push(time);
    else raderPerTime.set(time.startUtc, [time]);
  }

  let resultat: Tidsvinduoppsummering | null = null;
  for (const start of timer) {
    const rader = raderPerTime.get(start);
    if (!rader) return null;
    for (const rad of rader) {
      const klasse = klasseForTime(rad, terskler);
      if (resultat === null) {
        resultat = {
          klasse,
          maksNedborMmT: rad.nedborMmT,
          maksVindMs: rad.vindMs,
          minTempC: rad.tempC,
          maksTempC: rad.tempC,
          symbolKode: rad.symbolKode,
        };
        continue;
      }
      // Symbolet byttes bare når timen er strengt dårligere, så den første vinner ved likhet.
      if (erBedreKlasse(resultat.klasse, klasse)) resultat.symbolKode = rad.symbolKode;
      resultat.klasse = darligsteKlasse(resultat.klasse, klasse);
      resultat.maksNedborMmT = Math.max(resultat.maksNedborMmT, rad.nedborMmT);
      resultat.maksVindMs = Math.max(resultat.maksVindMs, rad.vindMs);
      resultat.minTempC = Math.min(resultat.minTempC, rad.tempC);
      resultat.maksTempC = Math.max(resultat.maksTempC, rad.tempC);
    }
  }
  return resultat;
}

/** Ordet for `symbol_code` uten endelse (Værsymbol i EXPERIENCE.md). */
const SYMBOLORD: Record<string, string> = {
  clearsky: "klarvær",
  fair: "lettskyet",
  partlycloudy: "delvis skyet",
  cloudy: "skyet",
  fog: "tåke",
  lightrain: "lett regn",
  rain: "regn",
  heavyrain: "kraftig regn",
  lightrainshowers: "lette regnbyger",
  rainshowers: "regnbyger",
  heavyrainshowers: "kraftige regnbyger",
  lightsleet: "lett sludd",
  sleet: "sludd",
  heavysleet: "kraftig sludd",
  lightsleetshowers: "lette sluddbyger",
  sleetshowers: "sluddbyger",
  heavysleetshowers: "kraftige sluddbyger",
  lightsnow: "lett snø",
  snow: "snø",
  heavysnow: "kraftig snø",
  lightsnowshowers: "lette snøbyger",
  snowshowers: "snøbyger",
  heavysnowshowers: "kraftige snøbyger",
  // METs egne feilstavinger, som bare finnes med «andthunder».
  lightssleetshowers: "lette sluddbyger",
  lightssnowshowers: "lette snøbyger",
};

/** Symbolkodene uten endelse som har et ord. Ikonene i `public/vaerikoner/` sjekkes mot dem. */
export const SYMBOLKODER: readonly string[] = Object.keys(SYMBOLORD);

/** Endelsene velger bare ikonfil og endrer ikke ordet. */
const ENDELSE = /_(day|night|polartwilight)$/;
const TORDEN = "andthunder";

function symbolord(kode: string): string | null {
  const uten = kode.replace(ENDELSE, "");
  if (Object.hasOwn(SYMBOLORD, uten)) return SYMBOLORD[uten];
  if (!uten.endsWith(TORDEN)) return null;
  const resten = uten.slice(0, -TORDEN.length);
  return Object.hasOwn(SYMBOLORD, resten) ? `${SYMBOLORD[resten]} og torden` : null;
}

/**
 * Værsymbolet for en `symbol_code`: ordet og stien til METs ikon, navngitt med endelsen
 * («/vaerikoner/clearsky_day.svg»). En ukjent kode og `null` gir `null`: verken ikon eller ord.
 * Har MET ikke ikon for koden med akkurat den endelsen (`rain_day`, `clearsky`), er `ikonSti` `null`,
 * og bare ordet vises.
 */
export function vaersymbol(kode: string | null): { ord: string; ikonSti: string | null } | null {
  if (kode === null) return null;
  const ord = symbolord(kode);
  if (ord === null) return null;
  return { ord, ikonSti: VAERIKONER.has(kode) ? `/vaerikoner/${kode}.svg` : null };
}

/** Værklassen som ord: «god», «middels», «dårlig», «frarådet». */
export const KLASSEORD: Record<Vaerklasse, string> = {
  god: "god",
  middels: "middels",
  darlig: "dårlig",
  fraradet: "frarådet",
};

/** «Værklasse god», «Værklasse dårlig». */
export function klasseTekst(klasse: Vaerklasse): string {
  return `Værklasse ${KLASSEORD[klasse]}`;
}

/** `vurdert`-delen av visningens `vaer`, uten Værvarsling, som lag-visning.ts legger til ved dårlig vær. */
export type VaerVurdert = Omit<Extract<Vaer, { type: "vurdert" }>, "vaervarsling">;

export type VaerVurdertInput = {
  melding: Vaermelding;
  /** Tidsvinduet [startUtc, sluttUtc) som epoke-ms i UTC: hele Tilgjengelig tid. */
  startUtc: number;
  sluttUtc: number;
  terskler?: Vaerterskler;
};

/**
 * Værsammendraget for Tidsvinduet, grunnlaget Turkortet og Regelteksten bruker, og oppsummeringen
 * (med Værklassen) som Værvarslingen og Frarådet-meldingen trenger. Gir `null` når en av timene mangler
 * i Værmeldingen. Sammendraget er «{symbolord} · {temperatur} · nedbør {X} mm/t · vind opptil {Y} m/s»,
 * uten symbolordet når koden er ukjent. `verdier` er det samme uten symbolordet, til Værsammendraget,
 * der ordet står ved ikonet.
 */
export function lagVaerVurdert({
  melding,
  startUtc,
  sluttUtc,
  terskler = VAERTERSKLER,
}: VaerVurdertInput): { vaer: VaerVurdert; grunnlag: VaerGrunnlag; oppsummering: Tidsvinduoppsummering } | null {
  const o = oppsummerTidsvindu(melding, startUtc, sluttUtc, terskler);
  if (o === null) return null;

  const symbol = vaersymbol(o.symbolKode);
  const temperatur = temperaturTekst(o.minTempC, o.maksTempC);
  const verdier = [temperatur, `nedbør ${tall(o.maksNedborMmT)} mm/t`, `vind opptil ${tall(o.maksVindMs)} m/s`].join(
    " · ",
  );
  const sammendrag = symbol ? `${symbol.ord} · ${verdier}` : verdier;

  return {
    vaer: {
      type: "vurdert",
      klasse: o.klasse,
      klasseTekst: klasseTekst(o.klasse),
      symbol,
      sammendrag,
      verdier,
      tidsvindu: `${klokke(startUtc)}–${klokke(sluttUtc)}`,
      hoydemerknad: HOYDEMERKNAD,
    },
    grunnlag: {
      type: "vurdert",
      klasse: o.klasse,
      vaerord: vaerord(o.maksNedborMmT, o.maksVindMs, terskler),
      temperatur,
    },
    oppsummering: o,
  };
}
