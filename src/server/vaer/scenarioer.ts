import { z } from "zod";
import { parseMetCompact } from "@/kjerne/vaer/met-compact";
import type { Vaermelding } from "@/kjerne/vaer/typer";
import ingenBedreMet from "../../../data/vaerscenarioer/ingen-bedre/met.json";
import ingenBedreJson from "../../../data/vaerscenarioer/ingen-bedre/scenario.json";
import uj1Met from "../../../data/vaerscenarioer/uj-1/met.json";
import uj1Json from "../../../data/vaerscenarioer/uj-1/scenario.json";
import uj2Met from "../../../data/vaerscenarioer/uj-2/met.json";
import uj2Json from "../../../data/vaerscenarioer/uj-2/scenario.json";
import uj3Met from "../../../data/vaerscenarioer/uj-3/met.json";
import uj3Json from "../../../data/vaerscenarioer/uj-3/scenario.json";
import utenVaerJson from "../../../data/vaerscenarioer/uten-vaer/scenario.json";

// Værscenarioene for Demomodus (AD-13). Hvert scenario har et fast «nå» og en værkilde, og
// importeres statisk, så det følger med i bygget. Demo bruker alltid det ekte Turdatasettet.
// Scenarioene med `vaer: "met"` har en met.json i MET `compact`-form, som parses med
// `parseMetCompact` ved import. MET-adapteren og cachen brukes aldri her.

const Felles = {
  /** Fast «nå» med tidssone, for eksempel «2026-11-09T13:30:00+01:00». */
  na: z.iso.datetime({ offset: true }),
  beskrivelse: z.string().min(1),
};

/** Skjemaet for scenario.json. */
export const ScenarioSkjema = z.discriminatedUnion("vaer", [
  /** `mangler`: værkilden gir ingen Værmelding. */
  z.strictObject({ ...Felles, vaer: z.literal("mangler") }),
  /** `met`: værkilden gir Værmeldingen fra met.json i samme mappe. */
  z.strictObject({ ...Felles, vaer: z.literal("met") }),
]);

export type ScenarioFil = z.infer<typeof ScenarioSkjema>;

/** Et scenario i registeret. Med `vaer: "met"` har det Værmeldingen fra met.json. */
export type Scenario =
  | Extract<ScenarioFil, { vaer: "mangler" }>
  | (Extract<ScenarioFil, { vaer: "met" }> & { vaermelding: Vaermelding });

/**
 * Værmeldingen, frosset helt ned til hver time. Hver forespørsel i demoen får det samme objektet,
 * så ingen kan endre det for de neste.
 */
function frys(melding: Vaermelding): Vaermelding {
  for (const time of melding.timer) Object.freeze(time);
  Object.freeze(melding.timer);
  return Object.freeze(melding);
}

/**
 * Scenarioet med demo-ID `id` fra innholdet i scenario.json (`data`) og eventuelt met.json (`met`).
 * Kaster når scenario.json er ugyldig, når met.json finnes for `mangler` eller mangler for `met`,
 * og når met.json er ugyldig (med feilen fra parseren som `cause`).
 */
export function lesScenario(id: string, data: unknown, met?: unknown): Scenario {
  const svar = ScenarioSkjema.safeParse(data);
  if (!svar.success) {
    throw new Error(`data/vaerscenarioer/${id}/scenario.json er ugyldig: ${z.prettifyError(svar.error)}`);
  }
  const fil = svar.data;
  if (fil.vaer === "mangler") {
    if (met !== undefined) throw new Error(`data/vaerscenarioer/${id} har met.json, men scenario.json sier «mangler».`);
    return fil;
  }
  if (met === undefined) throw new Error(`data/vaerscenarioer/${id}/met.json mangler, men scenario.json sier «met».`);
  try {
    return { ...fil, vaermelding: frys(parseMetCompact(met)) };
  } catch (feil) {
    throw new Error(`data/vaerscenarioer/${id}/met.json er ugyldig: ${feil instanceof Error ? feil.message : String(feil)}`, {
      cause: feil,
    });
  }
}

/** Registeret: demo-ID → scenario. Valideres én gang ved import. */
export const SCENARIOER: Readonly<Record<string, Scenario>> = Object.freeze({
  "uj-1": lesScenario("uj-1", uj1Json, uj1Met),
  "uj-2": lesScenario("uj-2", uj2Json, uj2Met),
  "uj-3": lesScenario("uj-3", uj3Json, uj3Met),
  "ingen-bedre": lesScenario("ingen-bedre", ingenBedreJson, ingenBedreMet),
  "uten-vaer": lesScenario("uten-vaer", utenVaerJson),
});

/** De gyldige demo-ID-ene, i registerets rekkefølge. */
export const DEMO_IDER: readonly string[] = Object.freeze(Object.keys(SCENARIOER));

/** Scenarioet for `id`, eller `undefined` når demo-ID-en er ukjent. */
export function finnScenario(id: string): Scenario | undefined {
  return Object.hasOwn(SCENARIOER, id) ? SCENARIOER[id] : undefined;
}
