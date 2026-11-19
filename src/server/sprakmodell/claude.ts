import Anthropic from "@anthropic-ai/sdk";
import { BEGRUNNELSE_FRIST_MS } from "@/kjerne/begrunnelse/frist";
import type { Sprakmodell, SprakmodellInn } from "./typer";

// Claude Haiku som språkmodell (story 4.3, FR-22, AD-12). Fila er eneste sted som bruker @anthropic-ai/sdk
// (ESLint-regelen AD-12, med unntak for testen av fila). miljo.ts lager den ene klienten for prosessen med
// `lagClaudeKlient`. Kallet er ett vanlig `messages.create`, uten strømming og uten verktøy. Kontrollen av
// teksten gjøres i `svarPaBegrunnelse`.
//
// Svaret er `null` for alle `stop_reason` utenom `end_turn`, uten tekst og ved feil fra SDK-en. Bare
// klassenavnet, status og `stop_reason` logges, aldri prompten, teksten eller nøkkelen (AR-24). Et avbrudd
// fra `signal` logges ikke, for det er fristen eller klienten som har gitt opp.

/** Klienten modellen trenger. Testene sender inn en falsk. */
export type ClaudeKlient = Pick<Anthropic, "messages">;

export const CLAUDE_MODELL = "claude-haiku-5-5";

// Klienten gir opp 1 s før fristen, så svaret rekker tilbake til nettleseren og et tidsavbrudd blir logget.
export const CLAUDE_TIMEOUT_MS = BEGRUNNELSE_FRIST_MS - 1000;

export const SYSTEMPROMPT = [
  "Du skriver begrunnelser for turforslag i en norsk turplanlegger.",
  "Du får en Regeltekst som forklarer hvorfor turen er foreslått, og en liste med fakta om turen.",
  "Skriv én eller to setninger på norsk bokmål som sier det samme som Regelteksten, med mer naturlig språk.",
  "Gjengi alle tall og verdier ordrett slik de står, med desimalkomma og enheter som i Regelteksten.",
  "Ikke legg til nye tall, og skriv aldri tall, tider eller mengder med ord.",
  "Ikke lov eller antyd at turen er fri for fare eller risiko.",
  "Bruk bare opplysningene i Regelteksten og faktalisten.",
  "Svar bare med teksten selv, som ren tekst uten anførselstegn, overskrift eller forklaring.",
].join("\n");

/** Brukermeldingen: bare Regelteksten og fakta om Turen. */
export function lagBrukermelding({ regeltekst, fakta }: SprakmodellInn): string {
  const liste = fakta.length > 0 ? fakta.map((f) => `- ${f}`).join("\n") : "- ingen";
  return `Regeltekst: ${regeltekst}\n\nFakta om turen:\n${liste}`;
}

/** Klassenavnet til en feil. SDK-feil sjekkes med `instanceof`, fordi navnene kan bli endret i bygget. */
function klassenavn(feil: unknown): string {
  if (!(feil instanceof Anthropic.AnthropicError)) return feil instanceof Error ? feil.name : typeof feil;
  if (feil instanceof Anthropic.APIConnectionTimeoutError) return "APIConnectionTimeoutError";
  if (feil instanceof Anthropic.APIConnectionError) return "APIConnectionError";
  if (feil instanceof Anthropic.RateLimitError) return "RateLimitError";
  if (feil instanceof Anthropic.InternalServerError) return "InternalServerError";
  if (feil instanceof Anthropic.AuthenticationError) return "AuthenticationError";
  if (feil instanceof Anthropic.PermissionDeniedError) return "PermissionDeniedError";
  if (feil instanceof Anthropic.BadRequestError) return "BadRequestError";
  if (feil instanceof Anthropic.NotFoundError) return "NotFoundError";
  if (feil instanceof Anthropic.APIError) return "APIError";
  return "AnthropicError";
}

/**
 * Den ekte klienten for `apiKey`, uten nye forsøk, med tidsavbrudd før fristen og uten SDK-ens logging
 * (så `ANTHROPIC_LOG` ikke kan skrive ut prompten). `null` når klienten ikke kan lages, og bare
 * klassenavnet logges.
 */
export function lagClaudeKlient(apiKey: string): ClaudeKlient | null {
  try {
    return new Anthropic({ apiKey, timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0, logLevel: "off" });
  } catch (feil) {
    console.error("Claude-klienten kunne ikke lages:", klassenavn(feil));
    return null;
  }
}

/**
 * Språkmodellen som kaller Claude Haiku med `klient`. Teksten er tekstblokkene satt sammen og trimmet,
 * eller `null`. Feil som ikke kommer fra SDK-en, kastes videre til `svarPaBegrunnelse`.
 */
export function lagClaudeSprakmodell({ klient }: { klient: ClaudeKlient }): Sprakmodell {
  return async (inn, signal) => {
    let svar: Anthropic.Message;
    try {
      svar = await klient.messages.create(
        {
          model: CLAUDE_MODELL,
          max_tokens: 300,
          thinking: { type: "disabled" },
          output_config: { effort: "low" },
          system: SYSTEMPROMPT,
          messages: [{ role: "user", content: lagBrukermelding(inn) }],
        },
        { signal },
      );
    } catch (feil) {
      if (!(feil instanceof Anthropic.AnthropicError)) throw feil;
      if (feil instanceof Anthropic.APIUserAbortError || signal?.aborted) return null;
      const status = feil instanceof Anthropic.APIError && feil.status !== undefined ? ` (status ${feil.status})` : "";
      console.error("Claude feilet:", `${klassenavn(feil)}${status}`);
      return null;
    }

    // Bare `end_turn` er et ferdig svar. Kallet har ingen stoppsekvenser og ingen verktøy.
    if (svar.stop_reason !== "end_turn") {
      console.error("Claude ga ingen tekst:", `stop_reason ${svar.stop_reason}`);
      return null;
    }
    const tekst = svar.content
      .flatMap((blokk) => (blokk.type === "text" ? [blokk.text] : []))
      .join("")
      .trim();
    return tekst === "" ? null : tekst;
  };
}
