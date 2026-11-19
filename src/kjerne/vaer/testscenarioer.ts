import ingenBedreMet from "../../../data/vaerscenarioer/ingen-bedre/met.json";
import ingenBedreScenario from "../../../data/vaerscenarioer/ingen-bedre/scenario.json";
import uj1Met from "../../../data/vaerscenarioer/uj-1/met.json";
import uj1Scenario from "../../../data/vaerscenarioer/uj-1/scenario.json";
import uj2Met from "../../../data/vaerscenarioer/uj-2/met.json";
import uj2Scenario from "../../../data/vaerscenarioer/uj-2/scenario.json";
import uj3Met from "../../../data/vaerscenarioer/uj-3/met.json";
import uj3Scenario from "../../../data/vaerscenarioer/uj-3/scenario.json";
import { parseMetCompact } from "./met-compact";
import type { Vaermelding } from "./typer";

// Værscenarioene for regeltestene i kjernen (story 2.3, AD-13). Bare testene bruker fila.
// De samme filene som Demomodus bruker, lest med en statisk import og parset med `parseMetCompact`.
// Kjernen importerer ikke fra src/server, så registeret der brukes ikke her.

export type Testscenario = {
  /** «Nå» i scenarioet som epoke-ms i UTC. */
  na: number;
  vaermelding: Vaermelding;
};

/** Kaster når scenario.json ikke har et gyldig `na` eller ikke har `vaer: "met"`. */
function les(id: string, scenario: { na?: unknown; vaer?: unknown }, met: unknown): Testscenario {
  const na = typeof scenario.na === "string" ? Date.parse(scenario.na) : Number.NaN;
  if (Number.isNaN(na)) throw new Error(`data/vaerscenarioer/${id}/scenario.json har ikke et gyldig «na».`);
  if (scenario.vaer !== "met") throw new Error(`data/vaerscenarioer/${id}/scenario.json har ikke «vaer»: «met».`);
  return { na, vaermelding: parseMetCompact(met) };
}

export const TESTSCENARIOER = {
  "uj-1": les("uj-1", uj1Scenario, uj1Met),
  "uj-2": les("uj-2", uj2Scenario, uj2Met),
  "uj-3": les("uj-3", uj3Scenario, uj3Met),
  "ingen-bedre": les("ingen-bedre", ingenBedreScenario, ingenBedreMet),
} as const satisfies Record<string, Testscenario>;
