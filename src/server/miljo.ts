import type { Vaermelding } from "@/kjerne/vaer/typer";
import type { UkjentDemoFeil } from "@/kjerne/visning/feil";
import { DEMO_IDER, finnScenario, type Scenario } from "./vaer/scenarioer";

// Miljøet for én forespørsel (AD-13): klokka, værkilden og Demomodus. Fila er eneste sted
// appen leser klokka. Med `?demo=` kommer «nå» og været fra scenarioet, ellers fra systemklokka.

/** Henter Værmeldingen, eller gir `null` når den mangler. MET-adapteren kommer i story 2.4. */
export type Vaerkilde = () => Promise<Vaermelding | null>;

export type Demo = { id: string; beskrivelse: string };

export type Miljo = {
  /** «Nå» som epoke-ms i UTC. */
  na: number;
  vaerkilde: Vaerkilde;
  demo: Demo | null;
};

/** Værkilden uten Værmelding (FR-13). */
const utenVaermelding: Vaerkilde = async () => null;

/** Værkilden for et scenario. En ny verdi i `vaer` (story 2.3) kompilerer ikke før den er koblet hit. */
function vaerkildeFor(vaer: Scenario["vaer"]): Vaerkilde {
  switch (vaer) {
    case "mangler":
      return utenVaermelding;
  }
}

/** Demo-ID-en fra `?demo=`, eller `null` når parameteren mangler. En tom verdi er en ukjent demo-ID. */
export function lesDemoId(url: URL | string): string | null {
  return new URL(url).searchParams.get("demo");
}

/** Miljøet for demo-ID-en, eller `UkjentDemoFeil` med de gyldige ID-ene. */
export function lagMiljo(demoId: string | null): Miljo | UkjentDemoFeil {
  if (demoId === null) {
    // Ingen MET-adapter ennå (story 2.4): uten demo mangler Værmeldingen også.
    return { na: Date.now(), vaerkilde: utenVaermelding, demo: null };
  }

  const scenario = finnScenario(demoId);
  if (!scenario) return { feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] };

  return {
    na: Date.parse(scenario.na),
    vaerkilde: vaerkildeFor(scenario.vaer),
    demo: { id: demoId, beskrivelse: scenario.beskrivelse },
  };
}

export const erUkjentDemo = (m: Miljo | UkjentDemoFeil): m is UkjentDemoFeil => "feil" in m;
