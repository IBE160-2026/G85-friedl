import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anbefal } from "@/kjerne/anbefaling";
import { soltider } from "@/kjerne/sol";
import { lagStandardSok, type Sok } from "@/kjerne/sok";
import { ApiFeilSkjema, UgyldigSokFeilSkjema, UkjentDemoFeilSkjema } from "@/kjerne/visning/feil";
import { type Resultatvisning, ResultatvisningSkjema } from "@/kjerne/visning/skjema";
import { TURER } from "@/server/data";
import { lagMiljo, type Miljo } from "@/server/miljo";
import { svarPaSok } from "@/server/sok";
import { DEMO_IDER, finnScenario } from "@/server/vaer/scenarioer";
import { POST } from "./route";

// Kontrakttesten for POST /api/sok (story 1.10, AR-7, story 2.8): hver demo-ID og hver rad i
// I/O-matrisene, med handleren kalt direkte. Alle svar valideres mot skjemaene. Ingen test kaller MET
// eller Anthropic: den globale `fetch` er byttet ut i hver test, og uten demo svarer den falske.

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

/** Den globale `fetch` i hver test. Feiler som et nettverksbrudd, og ingen test når MET. */
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

type MetJson = { properties: { timeseries: { time: string }[] } };

const lesMet = (id: string): MetJson =>
  JSON.parse(readFileSync(new URL(`../../../../data/vaerscenarioer/${id}/met.json`, import.meta.url), "utf8"));

const UJ1_MET = lesMet("uj-1");

const UJ1: Sok = {
  dato: "2026-11-09",
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: true,
  vann: false,
};

const UJ2: Sok = { dato: "2026-11-09", start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true, vann: false };
const UJ3: Sok = { dato: "2026-11-14", start: "10:00", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: false, vann: false };

function foresporsel(body: unknown, demo: string | null): Request {
  const url = demo === null ? "http://localhost/api/sok" : `http://localhost/api/sok?demo=${encodeURIComponent(demo)}`;
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/**
 * POST med `?demo=`. Uten demo (`null`) importeres ruten på nytt, så hver test får en ny MET-instans
 * i miljo.ts med tom cache.
 */
async function post(body: unknown, demo: string | null = "uten-vaer"): Promise<Response> {
  if (demo !== null) return POST(foresporsel(body, demo));
  vi.resetModules();
  const { POST: ferskPost } = await import("./route");
  return ferskPost(foresporsel(body, null));
}

/** Standard-Søket for scenarioet `demo`, med scenarioets «nå». */
function standardSok(demo: string): Sok {
  const scenario = finnScenario(demo);
  if (!scenario) throw new Error(`Ukjent demo ${demo}.`);
  return lagStandardSok(Date.parse(scenario.na));
}

/** Et 200-svar fra MET med `met` som kropp, gyldig til `expiresMs`. */
const metSvar = (met: unknown, expiresMs: number) =>
  Response.json(met, { status: 200, headers: { Expires: new Date(expiresMs).toUTCString() } });

async function resultat(svar: Response): Promise<Resultatvisning> {
  expect(svar.status).toBe(200);
  const json: unknown = await svar.json();
  const lest = ResultatvisningSkjema.safeParse(json);
  expect(lest.error?.issues).toBeUndefined();
  return lest.data as Resultatvisning;
}

/** Alle nøkler i et JSON-tre. */
function nokler(v: unknown): string[] {
  if (Array.isArray(v)) return v.flatMap(nokler);
  if (v === null || typeof v !== "object") return [];
  return Object.entries(v).flatMap(([k, x]) => [k, ...nokler(x)]);
}

describe("kontrakt: POST /api/sok for hver demo-ID", () => {
  it.each(DEMO_IDER)("%s gir en gyldig Resultatvisning uten snake_case for alle Søkene, uten fetch", async (demoId) => {
    for (const sok of [standardSok(demoId), UJ1, UJ2, UJ3, { ...UJ3, tilgjengeligMin: 15 }]) {
      const svar = await post(sok, demoId);
      const tekst = await svar.clone().text();
      await resultat(svar);
      expect(nokler(JSON.parse(tekst)).filter((k) => k.includes("_"))).toEqual([]);
    }
    const v = await resultat(await post(standardSok(demoId), demoId));
    expect(v.vaer.type).toBe(demoId === "uten-vaer" ? "mangler" : "vurdert");
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("I/O-matrisen (story 2.8)", () => {
  it("UJ-1: vurdert god, uten Værvarsling og Bedre tidsvindu, «… som passer nå» og Vær-raden «Værklasse god»", async () => {
    const v = await resultat(await post(UJ1, "uj-1"));
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "god" });
    expect(v.vaer).not.toHaveProperty("vaervarsling");
    expect(v.bedreTidsvindu).toBeUndefined();
    expect(v.overskrift).toBe("Tre Turforslag som passer nå");
    expect(v.liveTekst).toBe(v.overskrift);
    if (v.utfall.type !== "turforslag") throw new Error("Forventet Turforslag.");
    expect(v.utfall.kort.every((k) => k.kriterier[1].tekst === "Værklasse god")).toBe(true);
  });

  it("UJ-2: dårlig, Værvarsling, Bedre tidsvindu 14:00 med 5 Turer, og Moldevatnet fra Jensgurilia først", async () => {
    const v = await resultat(await post(UJ2, "uj-2"));
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "darlig", vaervarsling: { tekst: expect.any(String) } });
    expect(v.bedreTidsvindu).toMatchObject({
      type: "funnet",
      nyttSok: { ...UJ2, start: "14:00" },
      antallTekst: "5 Turer passer før mørket.",
    });
    expect(v.overskrift).toBe("Tre Turforslag i dårlig vær");
    if (v.utfall.type !== "turforslag") throw new Error("Forventet Turforslag.");
    expect(v.utfall.kort[0].turId).toBe("moldevatnet-fra-jensgurilia");
  });

  it("UJ-3: frarådet med meldingen, Vær og Tid, Bedre tidsvindu i morgen 11:00 og «Ingen Turforslag» (SM-C1)", async () => {
    const v = await resultat(await post(UJ3, "uj-3"));
    expect(v.utfall).toMatchObject({
      type: "fraradet",
      melding: "Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).",
      kriterier: [{ rad: "vaer" }, { rad: "tid" }],
    });
    expect(v.bedreTidsvindu).toMatchObject({ type: "funnet", nyttSok: { dato: "2026-11-15", start: "11:00" } });
    expect(v.overskrift).toBe("Ingen Turforslag");
    expect(v.liveTekst).toBe(v.overskrift);
  });

  it("UJ-3 med 15 min: frarådet uten korteste Tur. Bedre tidsvindu tatt i bruk gir 16 min, «trenger 1 min mer»", async () => {
    const v = await resultat(await post({ ...UJ3, tilgjengeligMin: 15 }, "uj-3"));
    expect(v.utfall.type).toBe("fraradet");
    if (v.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");

    const ny = await resultat(await post(v.bedreTidsvindu.nyttSok, "uj-3"));
    if (ny.utfall.type !== "kortesteTur") throw new Error("Forventet den korteste Turen.");
    expect(ny.utfall.kort.kriterier[0]).toMatchObject({ tekst: "16 min av 15 min", detalj: ["trenger 1 min mer, uten pauser"] });
  });

  it("ingen-bedre: standard-Søket gir Bedre tidsvindu «ingen»", async () => {
    const v = await resultat(await post(standardSok("ingen-bedre"), "ingen-bedre"));
    expect(v.bedreTidsvindu?.type).toBe("ingen");
  });

  it("uten demo, MET svarer: vurdert, med ett kall til den falske fetch", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T13:30:00+01:00"));
    fetch.mockImplementation(async () => metSvar(UJ1_MET, Date.now() + 30 * 60_000));
    const v = await resultat(await post(UJ1, null));
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "god" });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toMatch(/^https:\/\/api\.met\.no\//);
  });

  it("uten demo, MET svarer med frarådet vær: Frarådet-utfallet og Bedre tidsvindu", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T10:00:00+01:00"));
    fetch.mockImplementation(async () => metSvar(lesMet("uj-3"), Date.now() + 30 * 60_000));
    const v = await resultat(await post(UJ3, null));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(v.vaer).toMatchObject({ type: "vurdert", klasse: "fraradet" });
    expect(v.utfall).toMatchObject({ type: "fraradet", kriterier: [{ rad: "vaer" }, { rad: "tid" }] });
    expect(v.bedreTidsvindu).toMatchObject({ type: "funnet", nyttSok: { dato: "2026-11-15", start: "11:00" } });
  });

  it("uten demo, manglende time: Værmeldingen dekker ikke Tidsvinduet og gir mangler", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T13:30:00+01:00"));
    // Bare timene 12 og 13 UTC. Tidsvinduet 13:30–15:30 trenger også 14 UTC.
    const timer = new Set(["2026-11-09T12:00:00Z", "2026-11-09T13:00:00Z"]);
    const timeseries = UJ1_MET.properties.timeseries.filter((t) => timer.has(t.time));
    expect(timeseries).toHaveLength(2);
    const kort = { ...UJ1_MET, properties: { ...UJ1_MET.properties, timeseries } };
    fetch.mockImplementation(async () => metSvar(kort, Date.now() + 30 * 60_000));
    const v = await resultat(await post(UJ1, null));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(v.vaer.type).toBe("mangler");
    expect(v.overskrift).toBe("Tre Turforslag som passer tiden din");
    expect(v.bedreTidsvindu).toBeUndefined();
  });

  it("værkilden kaster: mangler i stedet for en feil, og en logglinje uten Søket", async () => {
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    const miljo: Miljo = {
      ...(lagMiljo("uj-1") as Miljo),
      vaerkilde: async () => {
        throw new Error("Værkilden kastet (test).");
      },
    };
    const v = ResultatvisningSkjema.parse(await svarPaSok(UJ1, miljo));
    expect(v.vaer.type).toBe("mangler");
    expect(v.utfall.type).toBe("turforslag");
    expect(feillogg).toHaveBeenCalledTimes(1);
    const logget = JSON.stringify(feillogg.mock.calls[0]);
    expect(logget).toContain("Værkilden kastet (test).");
    expect(logget).not.toContain(UJ1.dato);
    expect(logget).not.toContain(UJ1.start);
  });
});

describe("I/O-matrisen (story 1.10)", () => {
  it("UJ-1 uten vær: tre Turforslag med kart.nummer 1–3 og Værmeldingen mangler", async () => {
    const v = await resultat(await post(UJ1));
    expect(v.overskrift).toBe("Tre Turforslag som passer tiden din");
    expect(v.liveTekst).toBe(v.overskrift);
    expect(v.justering).toBeUndefined();
    expect(v.sok).toEqual(UJ1);
    expect(v.vaer).toEqual({
      type: "mangler",
      tekst: "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.",
    });
    expect(v.dittSok).toEqual({
      turdag: "I dag, man. 9. nov.",
      starttidspunkt: "13:30",
      tilgjengeligTid: "2 t",
      vanskelighetsgrad: "Middels",
      opplevelsespreferanser: ["utsikt"],
    });
    expect(v.utfall.type).toBe("turforslag");
    if (v.utfall.type !== "turforslag") return;
    expect(v.utfall.kort.map((k) => k.kart.nummer)).toEqual([1, 2, 3]);
    expect(v.utfall.kort.every((k) => k.kriterier[1].tekst === "ikke vurdert")).toBe(true);
    // Uten Værklasse rangerer serveren som i godt vær. For UJ-1 gir dårlig vær en annen rekkefølge.
    const ider = (vaerklasse: "god" | "darlig") => {
      const a = anbefal(TURER, UJ1, { [UJ1.dato]: soltider(UJ1.dato) }, vaerklasse);
      return a.type === "turforslag" ? a.forslag.map((f) => f.tur.id) : [];
    };
    expect(v.utfall.kort.map((k) => k.turId)).toEqual(ider("god"));
    expect(ider("darlig")).not.toEqual(ider("god"));
    expect(v.resultatId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it("gir en ny resultatId for hvert Søk", async () => {
    const a = await resultat(await post(UJ1));
    const b = await resultat(await post(UJ1));
    expect(a.resultatId).not.toBe(b.resultatId);
    expect({ ...a, resultatId: "" }).toEqual({ ...b, resultatId: "" });
  });

  it("UJ-3: 15 min gir den korteste Turen som Alternativ", async () => {
    const v = await resultat(await post({ ...UJ1, tilgjengeligMin: 15 }));
    expect(v.overskrift).toBe("Ingen Tur passer 15 min.");
    expect(v.liveTekst).toBe(v.overskrift);
    expect(v.utfall.type).toBe("kortesteTur");
    if (v.utfall.type !== "kortesteTur") return;
    expect(v.utfall.kort.turId).toBe("storlihytta-fra-vardeveien");
    expect(v.utfall.kort.kart.nummer).toBe(1);
    expect(v.utfall.passerMedTekst).toBe("Med 30 min eller mer passer minst én Tur.");
    expect(v.dittSok.tilgjengeligTid).toBe("15 min");
  });

  it("passert tid: 12:00 flyttes til 13:30 med justering, ikke 400", async () => {
    const v = await resultat(await post({ ...UJ1, start: "12:00" }));
    expect(v.sok.start).toBe("13:30");
    expect(v.justering).toBe("Flyttet til 13:30, fordi 12:00 har passert.");
    expect(v.dittSok.starttidspunkt).toBe("13:30");
  });

  it("i morgen: Ditt søk sier «I morgen» med datoen", async () => {
    const v = await resultat(await post({ ...UJ1, dato: "2026-11-10", start: "10:00", vanskelighetsgrad: "R", vann: true }));
    expect(v.dittSok).toEqual({
      turdag: "I morgen, tir. 10. nov.",
      starttidspunkt: "10:00",
      tilgjengeligTid: "2 t",
      vanskelighetsgrad: "Krevende",
      opplevelsespreferanser: ["utsikt", "vann"],
    });
  });

  it.each([
    ["ekstra felt", { ...UJ1, ekstra: 1 }, "ekstra"],
    ["start 13:10", { ...UJ1, start: "13:10" }, "start"],
    ["snake_case-felt", { ...UJ1, tilgjengelig_min: 120 }, ""],
    ["Tilgjengelig tid utenfor steg", { ...UJ1, tilgjengeligMin: 100 }, "tilgjengeligMin"],
    ["manglende felt", { dato: "2026-11-09" }, "start"],
    ["ikke et objekt", [1, 2], ""],
  ])("ugyldig Søk (%s) gir 400 ugyldig-sok", async (_navn, body, forventet) => {
    const svar = await post(body);
    expect(svar.status).toBe(400);
    const json: unknown = await svar.json();
    expect(UgyldigSokFeilSkjema.safeParse(json).success).toBe(true);
    const feil = UgyldigSokFeilSkjema.parse(json);
    expect(feil.detaljer.length).toBeGreaterThan(0);
    // En ekstra nøkkel står på roten (sti ""), med nøkkelen i meldingen.
    if (forventet) expect(JSON.stringify(feil.detaljer)).toContain(forventet);
  });

  it("ugyldig JSON gir 400 ugyldig-sok", async () => {
    const svar = await post("{ikke json");
    expect(svar.status).toBe(400);
    expect(UgyldigSokFeilSkjema.parse(await svar.json()).detaljer).toEqual([
      { sti: "", melding: "Søket er ikke gyldig JSON." },
    ]);
  });

  it.each(["finnes-ikke", ""])("ukjent demo «%s» gir 400 ukjent-demo med de gyldige ID-ene", async (demo) => {
    const svar = await post(UJ1, demo);
    expect(svar.status).toBe(400);
    const json: unknown = await svar.json();
    expect(UkjentDemoFeilSkjema.safeParse(json).success).toBe(true);
    expect(json).toEqual({ feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] });
    expect(ApiFeilSkjema.safeParse(json).success).toBe(true);
  });

  it("uventet feil: kjernen kaster, og svaret er 500 med console.error", async () => {
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    kast.pa = true;
    const svar = await post(UJ1);
    expect(svar.status).toBe(500);
    // Tom kropp: feildetaljer lekker aldri ut til klienten.
    expect(await svar.text()).toBe("");
    expect(feillogg).toHaveBeenCalledTimes(1);
  });

  it("uten demo, MET feiler: systemklokka og Resultat etter FR-13", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T09:07:00+01:00"));
    const feillogg = vi.spyOn(console, "error").mockImplementation(() => {});
    const sok = { ...lagStandardSok(Date.now()), utsikt: true };
    expect(sok.start).toBe("09:15");

    const v = await resultat(await post(sok, null));
    // Den falske fetch kaster. MET-adapteren logger og gir null, og svaret er 200.
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(feillogg).toHaveBeenCalled();
    expect(v.sok).toEqual(sok);
    expect(v.justering).toBeUndefined();
    expect(v.dittSok.turdag).toBe("I dag, tor. 12. nov.");
    expect(v.vaer.type).toBe("mangler");
    expect(v.utfall.type).toBe("turforslag");
    expect(v.bedreTidsvindu).toBeUndefined();
  });

  it("uten demo: et Søk for scenarioets dag er ukjent dato og settes tilbake til standard", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T09:07:00+01:00"));
    const v = await resultat(await post(UJ1, null));
    expect(v.sok.dato).toBe("2026-11-12");
    expect(v.justering).toBe("Turdagen er ikke i dag eller i morgen, så Søket er satt tilbake til standard.");
  });
});
