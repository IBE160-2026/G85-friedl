import { z } from "zod";
import { TIME_MS } from "../tid";
import type { Vaermelding, Vaertime } from "./typer";

// Parseren for MET Locationforecast `compact` (AR-6, AD-19). Den eneste som lager en `Vaermelding`:
// MET-adapteren (story 2.4) og Værscenarioene (story 2.3) bruker den samme.
// Ren funksjon: data inn, data ut. Ukjente felt godtas, siden MET kan legge til felt.

/** Toppnivået: `properties.timeseries` må være en liste. */
const ToppSkjema = z.object({
  properties: z.object({
    timeseries: z.array(z.unknown()),
  }),
});

/** En rad med `next_1_hours`. Bare disse radene valideres strengt og blir timer i Værmeldingen. */
const TimeradSkjema = z.object({
  time: z.iso.datetime({ offset: true }),
  data: z.object({
    instant: z.object({
      details: z.object({
        air_temperature: z.number(),
        wind_speed: z.number().min(0),
      }),
    }),
    next_1_hours: z.object({
      summary: z.object({ symbol_code: z.string().optional() }).optional(),
      details: z.object({ precipitation_amount: z.number().min(0) }),
    }),
  }),
});

/** Løs sjekk på en rå rad: har den `data.next_1_hours`? Rader uten (6-timersradene) valideres ikke. */
function harEnTime(rad: unknown): boolean {
  if (rad === null || typeof rad !== "object") return true;
  const data = (rad as { data?: unknown }).data;
  if (data === null || typeof data !== "object") return true;
  return (data as { next_1_hours?: unknown }).next_1_hours !== undefined;
}

/**
 * Gjør et MET `compact`-svar om til en `Vaermelding` med én time per rad som har `next_1_hours`,
 * stigende på `startUtc`. Kaster `Error` som nevner `timeseries` når listen mangler, og en Zod-feil
 * når et felt i en rad med `next_1_hours` mangler, har feil type eller er negativt (vind og nedbør).
 * Kaster også når en slik rad ikke starter på en hel time, eller når to rader har samme time.
 * Rader uten `next_1_hours` hoppes over uten validering. En tom `symbol_code` gir `null`.
 */
export function parseMetCompact(data: unknown): Vaermelding {
  const topp = ToppSkjema.safeParse(data);
  if (!topp.success) {
    throw new Error(`MET-svaret har ikke properties.timeseries som en liste:\n${z.prettifyError(topp.error)}`);
  }

  // En rad som ikke er et objekt eller mangler `data`, regnes som en time og gir en Zod-feil.
  const rader = z.array(TimeradSkjema).parse(topp.data.properties.timeseries.filter(harEnTime));

  const timer: Vaertime[] = [];
  const sett = new Set<number>();
  for (const rad of rader) {
    const startUtc = Date.parse(rad.time);
    if (startUtc % TIME_MS !== 0) throw new Error(`MET-svaret har en time som ikke starter på en hel time: ${rad.time}.`);
    if (sett.has(startUtc)) throw new Error(`MET-svaret har timen ${rad.time} to ganger.`);
    sett.add(startUtc);
    const neste = rad.data.next_1_hours;
    timer.push({
      startUtc,
      tempC: rad.data.instant.details.air_temperature,
      vindMs: rad.data.instant.details.wind_speed,
      nedborMmT: neste.details.precipitation_amount,
      symbolKode: neste.summary?.symbol_code || null,
    });
  }
  timer.sort((a, b) => a.startUtc - b.startUtc);
  return { timer };
}
