import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

// Værscenarioene (story 2.3, AD-13): skriptet lager data/vaerscenarioer/<id>/met.json i ekte MET
// `compact`-form ut fra en tabell per scenario. «Nå» leses fra scenario.json i samme mappe.
//
// - Én rad per time med `next_1_hours`, fra timen «nå» ligger i, til og med 23:00 dagen etter Turdagen.
// - Etter det tre rader med 6 timers mellomrom som bare har `next_6_hours`, slik MET gir lenger fram.
// - Verdiene varierer innenfor områdene i tabellen etter et fast mønster, med én desimal.
//
// Utdataene er deterministiske: to kjøringer gir byte-identiske filer. Kjør med `npm run vaerscenarioer`.
// Filene committes, og en test sjekker at skriptet gir de committede filene.
// Node 26 fjerner typene selv, så skriptet trenger ingen transpiler.

const MAPPE = new URL("../data/vaerscenarioer/", import.meta.url);

/** Værpunktet fra src/kjerne/vaerpunkt.ts, trunkert til fire desimaler (testen sjekker at de er like). */
export const PUNKT = { lat: 62.7617, lon: 7.1679, hoydeMoh: 400 } as const;

const TIME_MS = 60 * 60 * 1000;

/** Alle datoene i scenarioene er i november, så norsk tid er UTC+1. */
const FORSKYVNING = "+01:00";
const FORSKYVNING_TIMER = 1;

type Omrade = readonly [fra: number, til: number];

/** Symbolene uten nedbør. De har `_day` og `_night` hos MET, unntatt `cloudy`. */
type Torr = "clearsky" | "fair" | "partlycloudy" | "cloudy";

type Periode = {
  /** Slutten på perioden (eksklusiv), norsk tid 'YYYY-MM-DDTHH:MM'. Perioden starter der forrige slutter. */
  til: string;
  tempC: Omrade;
  vindMs: Omrade;
  nedborMmT: Omrade;
  /** Symbolet i timer uten nedbør. */
  torr: Torr;
};

export type Tabell = {
  /** Turdagen 'YYYY-MM-DD'. Timene går til og med 23:00 dagen etter. */
  turdag: string;
  perioder: readonly Periode[];
};

/**
 * Tabellen per scenario. Grensene (data/vaerterskler.json): frarådet ≥ 10 mm/t eller ≥ 17,2 m/s,
 * dårlig ≥ 2 mm/t, ≥ 10,8 m/s eller < −10 °C, middels ≥ 0,5 mm/t, ≥ 8,0 m/s eller < 0 °C.
 */
export const TABELLER: Readonly<Record<string, Tabell>> = {
  // God ettermiddag mandag 9. november: oppholdsvær og lite vind (< 0,1 mm/t og < 5,5 m/s), 3–5 °C.
  "uj-1": {
    turdag: "2026-11-09",
    perioder: [
      { til: "2026-11-10T00:00", tempC: [3, 5], vindMs: [2, 4.5], nedborMmT: [0, 0], torr: "clearsky" },
      { til: "2026-11-11T00:00", tempC: [3, 5], vindMs: [1.5, 4], nedborMmT: [0, 0], torr: "fair" },
    ],
  },
  // Søndag kveld: middels til midnatt, dårlig formiddag i morgen, god fra kl. 14.
  "uj-2": {
    turdag: "2026-11-09",
    perioder: [
      { til: "2026-11-09T00:00", tempC: [5, 6.5], vindMs: [5, 7.5], nedborMmT: [0.5, 1.5], torr: "cloudy" },
      // Dårlig av vinden.
      { til: "2026-11-09T06:00", tempC: [5, 6.5], vindMs: [10.8, 13], nedborMmT: [0.6, 1.8], torr: "cloudy" },
      // Dårlig av nedbøren, til og med timen 13:00–14:00.
      { til: "2026-11-09T14:00", tempC: [5, 7], vindMs: [6, 10], nedborMmT: [2, 3.5], torr: "cloudy" },
      { til: "2026-11-10T00:00", tempC: [4, 7], vindMs: [3, 6.5], nedborMmT: [0, 0.3], torr: "partlycloudy" },
      { til: "2026-11-11T00:00", tempC: [3, 6], vindMs: [2.5, 6], nedborMmT: [0, 0.2], torr: "fair" },
    ],
  },
  // Lørdag formiddag: sterk kuling (17,2–19,0 m/s) til og med timen 10:00–11:00 i morgen, god fra kl. 11.
  "uj-3": {
    turdag: "2026-11-14",
    perioder: [
      { til: "2026-11-15T11:00", tempC: [4, 6], vindMs: [17.2, 19], nedborMmT: [1, 4], torr: "cloudy" },
      { til: "2026-11-16T00:00", tempC: [3, 6], vindMs: [3, 6], nedborMmT: [0, 0.2], torr: "fair" },
    ],
  },
  // Dårlig vær i dag og i morgen, uten noe bedre vindu og uten frarådede timer.
  "ingen-bedre": {
    turdag: "2026-11-09",
    perioder: [
      { til: "2026-11-10T00:00", tempC: [2, 5], vindMs: [5, 9.5], nedborMmT: [2, 3.5], torr: "cloudy" },
      { til: "2026-11-10T12:00", tempC: [2, 4], vindMs: [10.8, 13.5], nedborMmT: [0.5, 1.8], torr: "cloudy" },
      { til: "2026-11-11T00:00", tempC: [2, 5], vindMs: [6, 10], nedborMmT: [2, 4], torr: "cloudy" },
    ],
  },
};

/** Fast mønster i [0, 1]. Hver verdi tar mønsteret fra sin egen fase, så de ikke følger hverandre. */
const MONSTER = [0.5, 1, 0.6, 0, 0.3, 0.8, 0.2, 0.9, 0.4, 0.7, 0.1] as const;
const FASE = { vind: 0, temp: 1, nedbor: 3, retning: 5, fukt: 7, trykk: 9 } as const;

const andel = (fase: number, i: number) => MONSTER[(i + fase) % MONSTER.length];
const rund = (x: number) => Math.round(x * 10) / 10;
const iOmradet = ([fra, til]: Omrade, p: number) => rund(fra + (til - fra) * p);

/** Et tall som skrives med én desimal, som hos MET (`3.0`, ikke `3`). */
class Desimal {
  readonly verdi: number;
  constructor(verdi: number) {
    this.verdi = verdi;
  }
}
const d = (x: number) => new Desimal(rund(x));

const SYMBOL_MED_DOGN = new Set<string>(["clearsky", "fair", "partlycloudy"]);
const SKYDEKKE: Record<string, number> = {
  clearsky: 3,
  fair: 18,
  partlycloudy: 52,
  cloudy: 96,
  lightrain: 100,
  rain: 100,
  heavyrain: 100,
};

/** Symbolet for timen: nedbøren avgjør, ellers periodens tørre symbol med `_day` eller `_night`. */
function symbol(nedbor: number, torr: Torr, norskTime: number): string {
  if (nedbor >= 5) return "heavyrain";
  if (nedbor >= 1) return "rain";
  if (nedbor >= 0.1) return "lightrain";
  if (!SYMBOL_MED_DOGN.has(torr)) return torr;
  // Sola er oppe omtrent 09–16 i Molde i november.
  return `${torr}_${norskTime >= 9 && norskTime <= 15 ? "day" : "night"}`;
}

const norsk = (lokal: string) => Date.parse(`${lokal}${FORSKYVNING}`);
const utcTekst = (utc: number) => new Date(utc).toISOString().replace(".000Z", "Z");

function leggTilDag(dato: string, n: number): string {
  return new Date(Date.parse(`${dato}T12:00:00Z`) + n * 24 * TIME_MS).toISOString().slice(0, 10);
}

type Verdier = { tempC: number; vindMs: number; nedborMmT: number; torr: Torr; i: number };

function verdier(periode: Periode, i: number): Verdier {
  return {
    tempC: iOmradet(periode.tempC, andel(FASE.temp, i)),
    vindMs: iOmradet(periode.vindMs, andel(FASE.vind, i)),
    nedborMmT: iOmradet(periode.nedborMmT, andel(FASE.nedbor, i)),
    torr: periode.torr,
    i,
  };
}

function instant(v: Verdier, symbolKode: string) {
  return {
    details: {
      air_pressure_at_sea_level: d(1004 + 12 * andel(FASE.trykk, v.i)),
      air_temperature: d(v.tempC),
      cloud_area_fraction: d(SKYDEKKE[symbolKode.replace(/_(day|night)$/, "")]),
      relative_humidity: d(78 + 18 * andel(FASE.fukt, v.i)),
      wind_from_direction: d(190 + 70 * andel(FASE.retning, v.i)),
      wind_speed: d(v.vindMs),
    },
  };
}

/**
 * Hele met.json for scenarioet, ut fra tabellen og «nå» fra scenario.json.
 * `tabell` er tabellen for `id` i `TABELLER`, men kan byttes ut i tester.
 */
export function lagMetJson(id: string, na: string, tabell: Tabell | undefined = TABELLER[id]): string {
  if (!tabell) throw new Error(`Ingen tabell for scenarioet ${id}.`);
  if (!na.endsWith(FORSKYVNING)) throw new Error(`${id}: «nå» skal ha forskyvningen ${FORSKYVNING}, men er ${na}.`);
  const naUtc = Date.parse(na);
  if (Number.isNaN(naUtc)) throw new Error(`${id}: «nå» er ikke et gyldig tidspunkt: ${na}.`);

  let forrigeTil = -Infinity;
  for (const { til } of tabell.perioder) {
    const t = norsk(til);
    if (!(t % TIME_MS === 0)) throw new Error(`${id}: periodeslutten ${til} er ikke på en hel time.`);
    if (!(t > forrigeTil)) throw new Error(`${id}: periodeslutten ${til} kommer ikke etter forrige periode.`);
    forrigeTil = t;
  }

  const forste = Math.floor(naUtc / TIME_MS) * TIME_MS;
  // Eksklusiv slutt: timene går til og med 23:00 norsk tid dagen etter Turdagen.
  const slutt = norsk(`${leggTilDag(tabell.turdag, 2)}T00:00`);

  const timeseries: unknown[] = [];
  let periode = 0;
  let periodeStart = forste;
  let siste: Verdier | undefined;

  for (let t = forste; t < slutt; t += TIME_MS) {
    while (periode < tabell.perioder.length && norsk(tabell.perioder[periode].til) <= t) {
      periodeStart = norsk(tabell.perioder[periode].til);
      periode++;
    }
    const p = tabell.perioder[periode];
    if (!p) throw new Error(`${id}: tabellen dekker ikke timen ${utcTekst(t)}.`);

    const v = verdier(p, (t - periodeStart) / TIME_MS);
    const norskTime = (new Date(t).getUTCHours() + FORSKYVNING_TIMER) % 24;
    const kode = symbol(v.nedborMmT, v.torr, norskTime);
    timeseries.push({
      time: utcTekst(t),
      data: {
        instant: instant(v, kode),
        next_1_hours: { summary: { symbol_code: kode }, details: { precipitation_amount: d(v.nedborMmT) } },
      },
    });
    siste = v;
  }
  if (!siste) throw new Error(`${id}: ingen timer.`);
  const sistePeriode = tabell.perioder[periode];
  if (norsk(tabell.perioder.at(-1)!.til) !== slutt) {
    throw new Error(`${id}: siste periode skal slutte ${leggTilDag(tabell.turdag, 2)}T00:00, men slutter ${tabell.perioder.at(-1)!.til}.`);
  }

  // Tre rader lenger fram, bare med `next_6_hours`, 6 timer fra hverandre. Den første kommer rett etter
  // den siste timen, uten hull.
  for (let n = 0; n < 3; n++) {
    const t = slutt + n * 6 * TIME_MS;
    const v = verdier(sistePeriode, siste.i + 1 + n);
    const norskTime = (new Date(t).getUTCHours() + FORSKYVNING_TIMER) % 24;
    const kode = symbol(v.nedborMmT, v.torr, norskTime);
    timeseries.push({
      time: utcTekst(t),
      data: {
        instant: instant(v, kode),
        next_6_hours: { summary: { symbol_code: kode }, details: { precipitation_amount: d(v.nedborMmT * 6) } },
      },
    });
  }

  const melding = {
    type: "Feature",
    geometry: { type: "Point", coordinates: [PUNKT.lon, PUNKT.lat, PUNKT.hoydeMoh] },
    properties: {
      meta: {
        updated_at: utcTekst(forste - TIME_MS / 2),
        units: {
          air_pressure_at_sea_level: "hPa",
          air_temperature: "celsius",
          cloud_area_fraction: "%",
          precipitation_amount: "mm",
          relative_humidity: "%",
          wind_from_direction: "degrees",
          wind_speed: "m/s",
        },
      },
      timeseries,
    },
  };
  return tilJson(melding);
}

/** Kompakt JSON for én verdi. `Desimal` skrives med én desimal. */
function kompakt(v: unknown): string {
  if (v instanceof Desimal) return v.verdi.toFixed(1);
  if (Array.isArray(v)) return `[${v.map(kompakt).join(",")}]`;
  if (v !== null && typeof v === "object") {
    return `{${Object.entries(v)
      .map(([k, x]) => `${JSON.stringify(k)}:${kompakt(x)}`)
      .join(",")}}`;
  }
  return JSON.stringify(v);
}

/** Teksten i met.json: toppnivået med innrykk, én rad i `timeseries` per linje og linjeskift til slutt. */
function tilJson(melding: { type: string; geometry: unknown; properties: { meta: unknown; timeseries: unknown[] } }): string {
  return (
    "{\n" +
    `  "type": ${kompakt(melding.type)},\n` +
    `  "geometry": ${kompakt(melding.geometry)},\n` +
    '  "properties": {\n' +
    `    "meta": ${kompakt(melding.properties.meta)},\n` +
    '    "timeseries": [\n' +
    melding.properties.timeseries.map((rad) => `      ${kompakt(rad)}`).join(",\n") +
    "\n    ]\n  }\n}\n"
  );
}

/** «Nå» fra data/vaerscenarioer/<id>/scenario.json. */
export function lesNa(id: string): string {
  const scenario: unknown = JSON.parse(readFileSync(new URL(`${id}/scenario.json`, MAPPE), "utf8"));
  if (scenario === null || typeof scenario !== "object" || Array.isArray(scenario)) {
    throw new Error(`data/vaerscenarioer/${id}/scenario.json er ikke et objekt.`);
  }
  const na = (scenario as { na?: unknown }).na;
  if (typeof na !== "string") throw new Error(`data/vaerscenarioer/${id}/scenario.json mangler «na».`);
  return na;
}

if (import.meta.main) {
  for (const id of Object.keys(TABELLER)) {
    const fil = new URL(`${id}/met.json`, MAPPE);
    mkdirSync(new URL(`${id}/`, MAPPE), { recursive: true });
    const tekst = lagMetJson(id, lesNa(id));
    writeFileSync(fil, tekst);
    const rader = (JSON.parse(tekst) as { properties: { timeseries: unknown[] } }).properties.timeseries.length;
    console.log(`Skrev data/vaerscenarioer/${id}/met.json: ${rader} rader.`);
  }
}
