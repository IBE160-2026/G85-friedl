import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lagTurfakta } from "@/kjerne/begrunnelse/fakta";
import type { Sok } from "@/kjerne/sok";
import { UgyldigSokFeilSkjema } from "@/kjerne/visning/feil";
import type { Turkort } from "@/kjerne/visning/skjema";
import { svarPaBegrunnelse } from "@/server/begrunnelse";
import { TURER } from "@/server/data";
import { lagMiljo, type Miljo } from "@/server/miljo";
import { svarPaSok } from "@/server/sok";
import type { Sprakmodell } from "@/server/sprakmodell/typer";
import { DEMO_IDER } from "@/server/vaer/scenarioer";
import { POST } from "./route";

// Kontrakttesten for POST /api/begrunnelse (story 4.2, AD-12): hver rad i I/O-matrisen, med handleren
// kalt direkte. Ingen test kaller MET eller Anthropic: den globale `fetch` er byttet ut i hver test, og
// språkmodellen er den falske eller en stub.

const kast = vi.hoisted(() => ({ pa: false }));

vi.mock("@/kjerne/anbefaling", async (importOriginal) => {
  const ekte = await importOriginal<typeof import("@/kjerne/anbefaling")>();
  return {
    ...ekte,
    anbefal: (...args: Parameters<typeof ekte.anbefal>) => {
      if (kast.pa) throw new Error("Kjernen kastet (test).");
      return ekte.anbefal(...args);
    },
  };
});

let fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>;

beforeEach(() => {
  fetch = vi.fn<typeof globalThis.fetch>(async () => {
    throw new TypeError("fetch failed (test)");
  });
  vi.stubGlobal("fetch", fetch);
});

afterEach(() => {
  kast.pa = false;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const UJ1: Sok = { dato: "2026-11-09", start: "13:30", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: true, vann: false };
const UJ3: Sok = { dato: "2026-11-14", start: "10:00", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: false, vann: false };

function foresporsel(body: unknown, demo: string | null): Request {
  const url = `http://localhost/api/begrunnelse${demo === null ? "" : `?demo=${encodeURIComponent(demo)}`}`;
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** POST med `?demo=`. Uten demo (`null`) importeres ruten på nytt, så hver test får en ny MET-instans. */
async function post(body: unknown, demo: string | null = "uj-1"): Promise<Response> {
  if (demo !== null) return POST(foresporsel(body, demo));
  vi.resetModules();
  const { POST: ferskPost } = await import("./route");
  return ferskPost(foresporsel(body, null));
}

async function tekst(svar: Response): Promise<string | null> {
  expect(svar.status).toBe(200);
  const json = (await svar.json()) as { tekst: string | null };
  expect(Object.keys(json)).toEqual(["tekst"]);
  return json.tekst;
}

/** Turforslagene for `sok` i demoen `demo`. */
async function turforslag(sok: Sok, demo: string): Promise<Turkort[]> {
  const v = await svarPaSok(sok, lagMiljo(demo) as Miljo);
  if (v.utfall.type !== "turforslag") throw new Error(`Utfallet er ${v.utfall.type}.`);
  return v.utfall.kort;
}

/** Miljøet for uj-1 med språkmodellen `sprakmodell`. */
const medModell = (sprakmodell: Sprakmodell): Miljo => ({ ...(lagMiljo("uj-1") as Miljo), sprakmodell });

describe("I/O-matrisen (story 4.2)", () => {
  it("demo uj-1, UJ-1-Søket: «Kort fortalt: …» for hvert Turforslag, uten fetch", async () => {
    const kort = await turforslag(UJ1, "uj-1");
    expect(kort.length).toBeGreaterThan(0);
    for (const k of kort) {
      expect(await tekst(await post({ sok: UJ1, turId: k.turId }))).toBe(`Kort fortalt: ${k.regeltekst}.`);
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  // UJ-1-Søket i hver demo. I uj-3 er 9. november verken i dag eller i morgen, så Søket justeres, og
  // svaret er null.
  const FORVENTET: Record<(typeof DEMO_IDER)[number], "tekst" | "null"> = {
    "uj-1": "tekst",
    "uj-2": "tekst",
    "uj-3": "null",
    "ingen-bedre": "tekst",
    "uten-vaer": "tekst",
  };

  it.each(DEMO_IDER)("%s: første Turforslag i UJ-1-Søket", async (demo) => {
    // I uj-3 settes Søket tilbake til standard, som er frarådet, så turId-en hentes fra uj-1.
    const [k] = await turforslag(UJ1, FORVENTET[demo] === "tekst" ? demo : "uj-1");
    const svar = await tekst(await post({ sok: UJ1, turId: k.turId }, demo));
    expect(svar).toBe(FORVENTET[demo] === "tekst" ? `Kort fortalt: ${k.regeltekst}.` : null);
  });

  it("Søket må justeres (Starttidspunktet har passert): { tekst: null }, og modellen kalles ikke", async () => {
    const [k] = await turforslag(UJ1, "uj-1");
    const modell = vi.fn<Sprakmodell>(async ({ regeltekst }) => `Kort fortalt: ${regeltekst}.`);
    // «Nå» er 15:00, etter Starttidspunktet 13:30.
    const miljo: Miljo = { ...medModell(modell), na: Date.parse("2026-11-09T15:00:00+01:00") };
    expect(await svarPaBegrunnelse(UJ1, k.turId, miljo)).toEqual({ tekst: null });
    expect(modell).not.toHaveBeenCalled();
  });

  it("ukjent turId gir 200 { tekst: null }", async () => {
    expect(await tekst(await post({ sok: UJ1, turId: "finnes-ikke" }))).toBeNull();
    expect(await tekst(await post({ sok: UJ1, turId: "" }))).toBeNull();
  });

  it("den korteste Turen gir 200 { tekst: null }", async () => {
    const sok = { ...UJ1, tilgjengeligMin: 15 };
    const v = await svarPaSok(sok, lagMiljo("uten-vaer") as Miljo);
    if (v.utfall.type !== "kortesteTur") throw new Error("Forventet den korteste Turen.");
    expect(await tekst(await post({ sok, turId: v.utfall.kort.turId }, "uten-vaer"))).toBeNull();
  });

  it("frarådet gir 200 { tekst: null }, også for en Tur som ellers er et Turforslag", async () => {
    const v = await svarPaSok(UJ3, lagMiljo("uj-3") as Miljo);
    expect(v.utfall.type).toBe("fraradet");
    const [k] = await turforslag(UJ1, "uj-1");
    expect(await tekst(await post({ sok: UJ3, turId: k.turId }, "uj-3"))).toBeNull();
  });

  it("en Tur som ikke er blant Turforslagene gir { tekst: null }", async () => {
    const kort = await turforslag(UJ1, "uj-1");
    const { TURER } = await import("@/server/data");
    const utenfor = TURER.find((t) => !kort.some((k) => k.turId === t.id))!;
    expect(await tekst(await post({ sok: UJ1, turId: utenfor.id }))).toBeNull();
  });

  it.each([
    ["ugyldig Søk", { sok: { dato: "x" }, turId: "a" }, "sok"],
    ["uten turId", { sok: UJ1 }, "turId"],
    ["turId som tall", { sok: UJ1, turId: 1 }, "turId"],
    ["ekstra felt", { sok: UJ1, turId: "a", tekst: "x" }, "tekst"],
    ["ekstra felt i Søket", { sok: { ...UJ1, ekstra: 1 }, turId: "a" }, "ekstra"],
    ["ikke et objekt", [1, 2], ""],
  ])("%s gir 400 ugyldig-sok", async (_navn, body, forventet) => {
    const svar = await post(body);
    expect(svar.status).toBe(400);
    const feil = UgyldigSokFeilSkjema.parse(await svar.json());
    expect(feil.detaljer.length).toBeGreaterThan(0);
    if (forventet) expect(JSON.stringify(feil.detaljer)).toContain(forventet);
  });

  it("ugyldig JSON gir 400 ugyldig-sok", async () => {
    const svar = await post("{ikke json");
    expect(svar.status).toBe(400);
    expect(UgyldigSokFeilSkjema.parse(await svar.json()).detaljer).toHaveLength(1);
  });

  it.each(["finnes-ikke", ""])("ukjent demo «%s» gir 400 ukjent-demo", async (demo) => {
    const svar = await post({ sok: UJ1, turId: "a" }, demo);
    expect(svar.status).toBe(400);
    expect(await svar.json()).toEqual({ feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] });
  });

  it("uten demo og uten nøkkel: 200 { tekst: null }, uten å hente været", async () => {
    const [k] = await turforslag(UJ1, "uj-1");
    expect(await tekst(await post({ sok: UJ1, turId: k.turId }, null))).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uventet feil: kjernen kaster, og svaret er 500 med tom kropp", async () => {
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    kast.pa = true;
    const svar = await post({ sok: UJ1, turId: "a" });
    expect(svar.status).toBe(500);
    expect(await svar.text()).toBe("");
    expect(feillogg).toHaveBeenCalledTimes(1);
  });
});

describe("svarPaBegrunnelse med en stub-modell", () => {
  it("modellen får bare Regelteksten og fakta om Turen, og svaret trimmes", async () => {
    const [k] = await turforslag(UJ1, "uj-1");
    const modell = vi.fn<Sprakmodell>(async ({ regeltekst }) => `  Kort sagt ${regeltekst}.\n`);
    expect(await svarPaBegrunnelse(UJ1, k.turId, medModell(modell))).toEqual({ tekst: `Kort sagt ${k.regeltekst}.` });
    expect(modell).toHaveBeenCalledTimes(1);
    const [inn, signal] = modell.mock.calls[0];
    expect(inn).toEqual({ regeltekst: k.regeltekst, fakta: lagTurfakta(TURER.find((t) => t.id === k.turId)!) });
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it("avbrutt forespørsel: modellen ser avbruddet, svaret er { tekst: null }, og ingenting logges", async () => {
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    const [k] = await turforslag(UJ1, "uj-1");
    const avbryt = new AbortController();
    let sett: AbortSignal | undefined;
    const modell: Sprakmodell = (_inn, signal) =>
      new Promise((_, avvis) => {
        sett = signal;
        signal?.addEventListener("abort", () => avvis(new DOMException("avbrutt", "AbortError")));
      });
    const svar = svarPaBegrunnelse(UJ1, k.turId, medModell(modell), avbryt.signal);
    await vi.waitFor(() => expect(sett).toBeDefined());
    avbryt.abort();
    expect(await svar).toEqual({ tekst: null });
    expect(sett!.aborted).toBe(true);
    expect(feillogg).not.toHaveBeenCalled();
  });

  it("avbrutt forespørsel: { tekst: null } også når modellen ikke lytter på signalet", async () => {
    const [k] = await turforslag(UJ1, "uj-1");
    const avbryt = new AbortController();
    const modell = vi.fn<Sprakmodell>(() => new Promise(() => {}));
    const svar = svarPaBegrunnelse(UJ1, k.turId, medModell(modell), avbryt.signal);
    await vi.waitFor(() => expect(modell).toHaveBeenCalled());
    avbryt.abort();
    expect(await svar).toEqual({ tekst: null });
  });

  it.each([
    ["mangler en verdi", (r: string) => r.replace(/\d+ t( \d+ min)?/, "litt")],
    ["bruker trygt", (r: string) => `${r}, og det er trygt.`],
    ["har et ukjent tall", (r: string) => `${r}, og 7 km.`],
    ["er tom", () => "   "],
  ])("modellen %s: { tekst: null }", async (_navn, lag) => {
    const [k] = await turforslag(UJ1, "uj-1");
    expect(lag(k.regeltekst)).not.toBe(k.regeltekst);
    const svar = await svarPaBegrunnelse(UJ1, k.turId, medModell(async ({ regeltekst }) => lag(regeltekst)));
    expect(svar).toEqual({ tekst: null });
  });

  it("modellen gir null: { tekst: null }", async () => {
    const [k] = await turforslag(UJ1, "uj-1");
    expect(await svarPaBegrunnelse(UJ1, k.turId, medModell(async () => null))).toEqual({ tekst: null });
  });

  it("modellen kaster: { tekst: null }, og console.error én gang med bare navn og status", async () => {
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    const [k] = await turforslag(UJ1, "uj-1");
    const svar = await svarPaBegrunnelse(
      UJ1,
      k.turId,
      medModell(async () => {
        throw Object.assign(new Error(`Modellen kastet: ${k.regeltekst}`), { name: "ApiFeil", status: 529 });
      }),
    );
    expect(svar).toEqual({ tekst: null });
    expect(feillogg).toHaveBeenCalledTimes(1);
    const logget = JSON.stringify(feillogg.mock.calls[0]);
    expect(logget).toContain("ApiFeil (status 529)");
    expect(logget).not.toContain("Modellen kastet");
    expect(logget).not.toContain(k.regeltekst);
    expect(logget).not.toContain(UJ1.start);
  });

  it("modellen kalles ikke for den korteste Turen eller en ukjent turId", async () => {
    const modell = vi.fn<Sprakmodell>(async () => "x");
    await svarPaBegrunnelse({ ...UJ1, tilgjengeligMin: 15 }, "storlihytta-fra-vardeveien", medModell(modell));
    await svarPaBegrunnelse(UJ1, "finnes-ikke", medModell(modell));
    expect(modell).not.toHaveBeenCalled();
  });
});
