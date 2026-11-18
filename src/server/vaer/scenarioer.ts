import { z } from "zod";
import utenVaerJson from "../../../data/vaerscenarioer/uten-vaer/scenario.json";

// Værscenarioene for Demomodus (AD-13). Hvert scenario har et fast «nå» og en værkilde, og
// importeres statisk, så det følger med i bygget. Demo bruker alltid det ekte Turdatasettet.
// Scenarioene med Værmelding kommer i story 2.3.

export const ScenarioSkjema = z.strictObject({
  /** Fast «nå» med tidssone, for eksempel «2026-11-09T13:30:00+01:00». */
  na: z.iso.datetime({ offset: true }),
  beskrivelse: z.string().min(1),
  /** `mangler`: værkilden gir ingen Værmelding. */
  vaer: z.literal("mangler"),
});

export type Scenario = z.infer<typeof ScenarioSkjema>;

function les(id: string, data: unknown): Scenario {
  const svar = ScenarioSkjema.safeParse(data);
  if (!svar.success) {
    throw new Error(`data/vaerscenarioer/${id}/scenario.json er ugyldig: ${z.prettifyError(svar.error)}`);
  }
  return svar.data;
}

/** Registeret: demo-ID → scenario. Valideres én gang ved import. */
export const SCENARIOER: Readonly<Record<string, Scenario>> = Object.freeze({
  "uten-vaer": les("uten-vaer", utenVaerJson),
});

/** De gyldige demo-ID-ene, i registerets rekkefølge. */
export const DEMO_IDER: readonly string[] = Object.freeze(Object.keys(SCENARIOER));

/** Scenarioet for `id`, eller `undefined` når demo-ID-en er ukjent. */
export function finnScenario(id: string): Scenario | undefined {
  return Object.hasOwn(SCENARIOER, id) ? SCENARIOER[id] : undefined;
}
