import type { UkjentDemoFeil } from "@/kjerne/visning/feil";
import { lagClaudeKlient, lagClaudeSprakmodell } from "./sprakmodell/claude";
import { falsk } from "./sprakmodell/falsk";
import type { Sprakmodell } from "./sprakmodell/typer";
import { lagMetVaerkilde } from "./vaer/met";
import { DEMO_IDER, finnScenario, type Scenario } from "./vaer/scenarioer";
import type { Vaerkilde } from "./vaer/typer";

// Miljøet for én forespørsel (AD-13): klokka, værkilden, språkmodellen og Demomodus. Fila er eneste sted
// appen leser klokka. Med `?demo=` kommer «nå» og været fra scenarioet, ellers fra systemklokka og MET.
// Språkmodellen er den falske i Demomodus. Uten demo er den Claude når ANTHROPIC_API_KEY er satt og ikke
// tom (story 4.3), og ellers `null` (NFR-3).

export type Demo = { id: string; beskrivelse: string };

export type Miljo = {
  /** «Nå» som epoke-ms i UTC. */
  na: number;
  vaerkilde: Vaerkilde;
  /** Språkmodellen for Begrunnelsen, eller `null` når ingen er satt opp (NFR-3). */
  sprakmodell: Sprakmodell | null;
  demo: Demo | null;
};

/** Værkilden uten Værmelding (FR-13). */
const utenVaermelding: Vaerkilde = async () => null;

/**
 * MET-adapteren, én instans for hele prosessen, så cachen deles mellom forespørslene.
 * `fetch` slås opp i `globalThis` ved hvert kall, så testene kan bytte den ut.
 */
const metVaerkilde: Vaerkilde = lagMetVaerkilde({
  fetch: (url, init) => globalThis.fetch(url, init),
  klokke: () => Date.now(),
});

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

/**
 * Claude-modellen og nøkkelen den ble laget med. Én klient for prosessen så lenge nøkkelen er den samme.
 * Kunne ikke klienten lages, er modellen `null` til nøkkelen endres, så feilen logges én gang.
 */
let claude: { nokkel: string; sprakmodell: Sprakmodell | null } | null = null;

/** Språkmodellen uten Demomodus: Claude når `ANTHROPIC_API_KEY` er satt og ikke tom, ellers `null`. */
function sprakmodellUtenDemo(): Sprakmodell | null {
  const nokkel = process.env.ANTHROPIC_API_KEY?.trim();
  if (!nokkel) return null;
  if (claude?.nokkel !== nokkel) {
    const klient = lagClaudeKlient(nokkel);
    claude = { nokkel, sprakmodell: klient ? lagClaudeSprakmodell({ klient }) : null };
  }
  return claude.sprakmodell;
}

/** Demo-ID-en fra `?demo=`, eller `null` når parameteren mangler. En tom verdi er en ukjent demo-ID. */
export function lesDemoId(url: URL | string): string | null {
  return new URL(url).searchParams.get("demo");
}

/** Miljøet for demo-ID-en, eller `UkjentDemoFeil` med de gyldige ID-ene. */
export function lagMiljo(demoId: string | null): Miljo | UkjentDemoFeil {
  if (demoId === null) {
    return { na: Date.now(), vaerkilde: metVaerkilde, sprakmodell: sprakmodellUtenDemo(), demo: null };
  }

  const scenario = finnScenario(demoId);
  if (!scenario) return { feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] };

  return {
    na: Date.parse(scenario.na),
    vaerkilde: vaerkildeFor(scenario),
    sprakmodell: falsk,
    demo: { id: demoId, beskrivelse: scenario.beskrivelse },
  };
}

export const erUkjentDemo = (m: Miljo | UkjentDemoFeil): m is UkjentDemoFeil => "feil" in m;
