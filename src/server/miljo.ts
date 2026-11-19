import type { UkjentDemoFeil } from "@/kjerne/visning/feil";
import { DEMO_IDER, finnScenario, type Scenario } from "./vaer/scenarioer";
import type { Vaerkilde } from "./vaer/typer";

// Miljøet for én forespørsel (AD-13): klokka, værkilden og Demomodus. Fila er eneste sted
// appen leser klokka. Med `?demo=` kommer «nå» og været fra scenarioet, ellers fra systemklokka.

export type Demo = { id: string; beskrivelse: string };

export type Miljo = {
  /** «Nå» som epoke-ms i UTC. */
  na: number;
  vaerkilde: Vaerkilde;
  demo: Demo | null;
};

/** Værkilden uten Værmelding (FR-13). */
const utenVaermelding: Vaerkilde = async () => null;

/**
 * Værkilden for et scenario. `met` gir scenarioets Værmelding, parset fra met.json ved import.
 * MET-adapteren og cachen brukes aldri i Demomodus. En ny verdi i `vaer` kompilerer ikke før den er koblet hit.
 */
function vaerkildeFor(scenario: Scenario): Vaerkilde {
  switch (scenario.vaer) {
    case "mangler":
      return utenVaermelding;
    case "met": {
      const { vaermelding } = scenario;
      return async () => vaermelding;
    }
  }
}

/** Demo-ID-en fra `?demo=`, eller `null` når parameteren mangler. En tom verdi er en ukjent demo-ID. */
export function lesDemoId(url: URL | string): string | null {
  return new URL(url).searchParams.get("demo");
}

/** Miljøet for demo-ID-en, eller `UkjentDemoFeil` med de gyldige ID-ene. */
export function lagMiljo(demoId: string | null): Miljo | UkjentDemoFeil {
  if (demoId === null) {
    // MET-adapteren (src/server/vaer/met.ts) kobles inn her i story 2.8. Til da mangler
    // Værmeldingen uten demo også, og ingen kall går til MET.
    return { na: Date.now(), vaerkilde: utenVaermelding, demo: null };
  }

  const scenario = finnScenario(demoId);
  if (!scenario) return { feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] };

  return {
    na: Date.parse(scenario.na),
    vaerkilde: vaerkildeFor(scenario),
    demo: { id: demoId, beskrivelse: scenario.beskrivelse },
  };
}

export const erUkjentDemo = (m: Miljo | UkjentDemoFeil): m is UkjentDemoFeil => "feil" in m;
