import Anthropic from "@anthropic-ai/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BEGRUNNELSE_FRIST_MS } from "@/kjerne/begrunnelse/frist";
import {
  CLAUDE_TIMEOUT_MS,
  type ClaudeKlient,
  lagBrukermelding,
  lagClaudeKlient,
  lagClaudeSprakmodell,
  SYSTEMPROMPT,
} from "./claude";

// Klassen i SDK-en byttes med en underklasse som husker valgene og kan kaste, så testen av
// `lagClaudeKlient` ikke leser interne felt i klienten. Feilklassene arves uendret.
const konstruktor = vi.hoisted(() => ({ valg: [] as unknown[], kast: false }));
vi.mock("@anthropic-ai/sdk", async (importOriginal) => {
  const ekte = await importOriginal<typeof import("@anthropic-ai/sdk")>();
  class Spion extends ekte.default {
    constructor(valg: ConstructorParameters<typeof ekte.default>[0]) {
      if (konstruktor.kast) throw new TypeError("kan ikke lage klienten");
      super(valg);
      konstruktor.valg.push(valg);
    }
  }
  return { ...ekte, default: Spion, Anthropic: Spion };
});

// Claude Haiku som språkmodell (story 4.3). Testene bruker en falsk klient, så ingen test kaller
// Anthropic (AR-26). Matrisen: vanlig svar, flere blokker, stop_reason utenom end_turn, tidsavbrudd,
// API-feil, avbrudd, tomt svar, parametrene i kallet og klienten fra `lagClaudeKlient`.

const INN = {
  regeltekst: "passer tiden din (1 t 32 min av 2 t), lite nedbør (0,4 mm/t)",
  fakta: ["Lengde totalt: 6,45 km", "Høyeste punkt: 340 moh"],
};

type Blokk = { type: string; text?: string; thinking?: string; signature?: string };

/** Et svar fra API-et med `content` og `stop_reason`. Bare feltene modellen leser, har betydning. */
function melding(content: Blokk[], stop_reason = "end_turn"): Anthropic.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content,
    stop_reason,
    stop_sequence: null,
  } as unknown as Anthropic.Message;
}

let create: ReturnType<typeof vi.fn>;
let feillogg: ReturnType<typeof vi.spyOn>;

/** Modellen med en falsk klient der `messages.create` gir `svar` eller kaster `svar` når det er en feil. */
function modell(svar: Anthropic.Message | Error) {
  create = vi.fn(async () => {
    if (svar instanceof Error) throw svar;
    return svar;
  });
  const klient = { messages: { create } } as unknown as ClaudeKlient;
  return lagClaudeSprakmodell({ klient });
}

beforeEach(() => {
  feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  konstruktor.valg = [];
  konstruktor.kast = false;
});

/** Ingen logglinje har Regelteksten, fakta, teksten fra modellen eller prompten (AR-24). */
function forventRenLogg() {
  const linjer = feillogg.mock.calls.flat().map(String).join("\n");
  for (const del of [INN.regeltekst, ...INN.fakta, "Kort sagt", SYSTEMPROMPT]) expect(linjer).not.toContain(del);
}

describe("lagClaudeSprakmodell", () => {
  it("vanlig: teksten fra tekstblokken, trimmet", async () => {
    const tekst = await modell(melding([{ type: "text", text: "  Kort sagt passer turen.\n" }]))(INN);
    expect(tekst).toBe("Kort sagt passer turen.");
    expect(feillogg).not.toHaveBeenCalled();
  });

  it("flere blokker: tekstblokkene satt sammen, uten thinking-blokken", async () => {
    const svar = melding([
      { type: "thinking", thinking: "tenker", signature: "sig" },
      { type: "text", text: "Kort sagt passer turen " },
      { type: "text", text: "(1 t 32 min av 2 t)." },
    ]);
    expect(await modell(svar)(INN)).toBe("Kort sagt passer turen (1 t 32 min av 2 t).");
  });

  const STOPP = ["refusal", "max_tokens", "model_context_window_exceeded", "pause_turn", "stop_sequence", "tool_use"];

  it.each(STOPP)("%s: `null`, og stop_reason logges én gang (bare end_turn gir tekst)", async (stop) => {
    const tekst = await modell(melding([{ type: "text", text: "Kort sagt passer" }], stop))(INN);
    expect(tekst).toBeNull();
    expect(feillogg).toHaveBeenCalledTimes(1);
    expect(feillogg.mock.calls[0][1]).toBe(`stop_reason ${stop}`);
    forventRenLogg();
  });

  it.each([
    ["tidsavbrudd", new Anthropic.APIConnectionTimeoutError(), "APIConnectionTimeoutError"],
    [
      "RateLimitError",
      new Anthropic.RateLimitError(429, undefined, "Kort sagt", new Headers()),
      "RateLimitError (status 429)",
    ],
    [
      "InternalServerError",
      new Anthropic.InternalServerError(500, undefined, INN.regeltekst, new Headers()),
      "InternalServerError (status 500)",
    ],
    [
      "AuthenticationError",
      new Anthropic.AuthenticationError(401, undefined, "nøkkelen", new Headers()),
      "AuthenticationError (status 401)",
    ],
    ["APIConnectionError", new Anthropic.APIConnectionError({ message: INN.regeltekst }), "APIConnectionError"],
    ["APIError 529", new Anthropic.APIError(529, undefined, "overloaded", new Headers()), "APIError (status 529)"],
  ])("%s: `null`, og bare klassenavn og status logges", async (_navn, feil, logg) => {
    expect(await modell(feil)(INN)).toBeNull();
    expect(feillogg).toHaveBeenCalledTimes(1);
    expect(feillogg.mock.calls[0][1]).toBe(logg);
    forventRenLogg();
  });

  it("avbrutt: `null`, uten logg", async () => {
    const kontroller = new AbortController();
    kontroller.abort();
    expect(await modell(new Anthropic.APIUserAbortError())(INN, kontroller.signal)).toBeNull();
    expect(await modell(new Anthropic.APIUserAbortError())(INN)).toBeNull();
    expect(feillogg).not.toHaveBeenCalled();
  });

  it("avbrutt signal og tidsavbrudd samtidig: `null`, uten logg", async () => {
    const kontroller = new AbortController();
    kontroller.abort();
    expect(await modell(new Anthropic.APIConnectionTimeoutError())(INN, kontroller.signal)).toBeNull();
    expect(feillogg).not.toHaveBeenCalled();
  });

  it("en feil som ikke kommer fra SDK-en, kastes videre til skallet", async () => {
    const feil = new TypeError("noe annet");
    await expect(modell(feil)(INN)).rejects.toBe(feil);
    expect(feillogg).not.toHaveBeenCalled();
  });

  it.each([
    ["ingen blokker", []],
    ["bare thinking", [{ type: "thinking", thinking: "x", signature: "s" }]],
    ["bare mellomrom", [{ type: "text", text: "  \n " }]],
  ])("tom (%s): `null`", async (_navn, blokker) => {
    expect(await modell(melding(blokker))(INN)).toBeNull();
  });

  it("parametrene: modell, max_tokens, thinking og effort, uten sampling-felt, og signal som valg", async () => {
    const kontroller = new AbortController();
    await modell(melding([{ type: "text", text: "Kort sagt." }]))(INN, kontroller.signal);
    expect(create).toHaveBeenCalledTimes(1);
    const [parametre, valg] = create.mock.calls[0];
    expect(parametre).toEqual({
      model: "claude-haiku-5-5",
      max_tokens: 300,
      thinking: { type: "disabled" },
      output_config: { effort: "low" },
      system: SYSTEMPROMPT,
      messages: [{ role: "user", content: lagBrukermelding(INN) }],
    });
    for (const felt of ["temperature", "top_p", "top_k", "stream", "tools", "fallbacks"]) {
      expect(parametre).not.toHaveProperty(felt);
    }
    expect(valg).toEqual({ signal: kontroller.signal });

    const bruker = parametre.messages[0].content as string;
    expect(bruker).toContain(INN.regeltekst);
    for (const f of INN.fakta) expect(bruker).toContain(f);
  });

  it("prompten er fast: system uten tall, og brukermeldingen har bare Regelteksten og fakta", () => {
    expect(SYSTEMPROMPT).not.toMatch(/\d/);
    expect(SYSTEMPROMPT).not.toMatch(/trygg|trygt/i);
    expect(lagBrukermelding(INN)).toBe(
      `Regeltekst: ${INN.regeltekst}\n\nFakta om turen:\n- Lengde totalt: 6,45 km\n- Høyeste punkt: 340 moh`,
    );
    expect(lagBrukermelding({ regeltekst: "r", fakta: [] })).toBe("Regeltekst: r\n\nFakta om turen:\n- ingen");
  });
});

describe("lagClaudeKlient", () => {
  it("lager klienten med nøkkelen, tidsavbrudd før fristen, uten nye forsøk og uten logging", () => {
    expect(CLAUDE_TIMEOUT_MS).toBe(BEGRUNNELSE_FRIST_MS - 1000);
    // Ingen ekte nøkkel, og klienten kalles aldri.
    const klient = lagClaudeKlient("test-nokkel-ikke-ekte");
    expect(klient).toBeInstanceOf(Anthropic);
    expect(konstruktor.valg).toEqual([
      { apiKey: "test-nokkel-ikke-ekte", timeout: CLAUDE_TIMEOUT_MS, maxRetries: 0, logLevel: "off" },
    ]);
    expect(feillogg).not.toHaveBeenCalled();
  });

  it("kaster konstruktøren: `null`, og bare klassenavnet logges", () => {
    konstruktor.kast = true;
    expect(lagClaudeKlient("test-nokkel-ikke-ekte")).toBeNull();
    expect(feillogg).toHaveBeenCalledTimes(1);
    expect(feillogg.mock.calls[0][1]).toBe("TypeError");
    expect(feillogg.mock.calls.flat().map(String).join("\n")).not.toContain("test-nokkel");
  });
});
