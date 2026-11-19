import { readdirSync, readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseMetCompact } from "@/kjerne/vaer/met-compact";
import { TESTSCENARIOER } from "@/kjerne/vaer/testscenarioer";
import { lagMiljo, lesDemoId, type Miljo } from "./miljo";
import type { ClaudeKlient } from "./sprakmodell/claude";
import { falsk } from "./sprakmodell/falsk";
import { DEMO_IDER, finnScenario, lesScenario, ScenarioSkjema } from "./vaer/scenarioer";

// Klienten for Claude byttes med en falsk, og fabrikken for modellen pakkes inn i en spion, så testen ser
// hva Miljøet lager uten å lage en ekte klient. Ingen test kaller Anthropic (AR-26).
vi.mock("./sprakmodell/claude", async (importOriginal) => {
  const ekte = await importOriginal<typeof import("./sprakmodell/claude")>();
  return {
    ...ekte,
    lagClaudeKlient: vi.fn<typeof ekte.lagClaudeKlient>(() => ({ messages: {} }) as unknown as ClaudeKlient),
    lagClaudeSprakmodell: vi.fn(ekte.lagClaudeSprakmodell),
  };
});

const MAPPE = new URL("../../data/vaerscenarioer/", import.meta.url);
const lesJson = (sti: string): unknown => JSON.parse(readFileSync(new URL(sti, MAPPE), "utf8"));

// Miljøet (story 1.10, AD-13): klokka og værkilden ut fra demo-ID-en.

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("lesDemoId", () => {
  it.each([
    ["http://localhost/api/sok?demo=uten-vaer", "uten-vaer"],
    ["http://localhost/?demo=finnes-ikke&x=1", "finnes-ikke"],
    ["http://localhost/?demo=", ""],
    ["http://localhost/api/sok", null],
  ])("%s gir %j", (url, id) => {
    expect(lesDemoId(url)).toBe(id);
    expect(lesDemoId(new URL(url))).toBe(id);
  });
});

describe("lagMiljo", () => {
  it("uten-vaer: fast «nå», ingen Værmelding og demoen", async () => {
    const miljo = lagMiljo("uten-vaer") as Miljo;
    expect(miljo.na).toBe(Date.UTC(2026, 10, 9, 12, 30));
    expect(miljo.demo).toEqual({ id: "uten-vaer", beskrivelse: "Værmeldingen mangler" });
    await expect(miljo.vaerkilde()).resolves.toBeNull();
  });

  it.each(DEMO_IDER)("%s: den falske språkmodellen (story 4.2)", (id) => {
    expect((lagMiljo(id) as Miljo).sprakmodell).toBe(falsk);
  });

  it("uj-1: «nå» fra scenarioet og en værkilde som gir Værmeldingen fra met.json", async () => {
    const miljo = lagMiljo("uj-1") as Miljo;
    expect(miljo.na).toBe(Date.UTC(2026, 10, 9, 12, 30));
    expect(miljo.demo).toEqual({ id: "uj-1", beskrivelse: "God ettermiddag, mandag 9. november" });
    const melding = await miljo.vaerkilde();
    expect(melding).toEqual(parseMetCompact(lesJson("uj-1/met.json")));
    expect(melding!.timer[0].startUtc).toBe(Date.UTC(2026, 10, 9, 12));
  });

  it.each([
    ["uj-2", Date.UTC(2026, 10, 8, 19)],
    ["uj-3", Date.UTC(2026, 10, 14, 9)],
    ["ingen-bedre", Date.UTC(2026, 10, 9, 9)],
  ])("%s: «nå» fra scenarioet og Værmeldingen fra met.json", async (id, na) => {
    const miljo = lagMiljo(id) as Miljo;
    expect(miljo.na).toBe(na);
    expect(await miljo.vaerkilde()).toEqual(parseMetCompact(lesJson(`${id}/met.json`)));
  });

  describe("uten demo", () => {
    const met = lesJson("uj-1/met.json");
    const NA = Date.UTC(2026, 10, 9, 12, 30);
    const EXPIRES = Date.UTC(2026, 10, 9, 13);
    let fetch: ReturnType<typeof vi.fn<(url: string, init: RequestInit) => Promise<Response>>>;

    /** `lagMiljo` fra en ny import av miljo.ts, så hver test får en ny MET-instans med tom cache. */
    async function ferskLagMiljo(): Promise<typeof lagMiljo> {
      vi.resetModules();
      return (await import("./miljo")).lagMiljo;
    }

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(NA);
      // Den globale fetch byttes ut, så ingen test kaller MET.
      fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
        Response.json(met, { status: 200, headers: { Expires: new Date(EXPIRES).toUTCString() } }),
      );
      vi.stubGlobal("fetch", fetch);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("systemklokka og MET-adapteren, med én instans og den globale fetch", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", undefined);
      const lag = await ferskLagMiljo();
      const miljo = lag(null) as Miljo;
      expect(miljo.na).toBe(NA);
      expect(miljo.demo).toBeNull();
      // Uten nøkkel er det ingen språkmodell (NFR-3).
      expect(miljo.sprakmodell).toBeNull();
      expect((lag(null) as Miljo).vaerkilde).toBe(miljo.vaerkilde);
      await expect(miljo.vaerkilde()).resolves.toEqual(parseMetCompact(met));
      expect(fetch).toHaveBeenCalledTimes(1);
      const [url, init] = fetch.mock.calls[0];
      expect(url).toMatch(/^https:\/\/api\.met\.no\/weatherapi\/locationforecast\/2\.0\/compact\?/);
      expect(init.headers).toMatchObject({ "User-Agent": expect.stringMatching(/^turplanlegger-ibe160\//) });
    });

    it("MET-instansen bruker systemklokka: cachen svarer innenfor Expires, og etter Expires kalles fetch igjen", async () => {
      const lag = await ferskLagMiljo();
      await (lag(null) as Miljo).vaerkilde();
      vi.setSystemTime(EXPIRES - 1);
      await (lag(null) as Miljo).vaerkilde();
      expect(fetch).toHaveBeenCalledTimes(1);

      vi.setSystemTime(EXPIRES + 1);
      await expect((lag(null) as Miljo).vaerkilde()).resolves.toEqual(parseMetCompact(met));
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("språkmodellen (story 4.3)", () => {
    // Ingen ekte nøkkel: verdiene er bare strenger, og modellen kalles aldri.
    const NOKKEL = "test-nokkel-ikke-ekte";

    /** `lagMiljo` og spionene fra en ny import, så klienten for prosessen lages på nytt. */
    async function fersk() {
      vi.resetModules();
      const { lagMiljo: lag } = await import("./miljo");
      const { lagClaudeKlient, lagClaudeSprakmodell } = await import("./sprakmodell/claude");
      const { falsk: nyFalsk } = await import("./sprakmodell/falsk");
      return { lag, falsk: nyFalsk, klient: vi.mocked(lagClaudeKlient), fabrikk: vi.mocked(lagClaudeSprakmodell) };
    }

    it("med nøkkel uten demo: Claude, med én klient for prosessen og nøkkelen trimmet", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", ` ${NOKKEL} `);
      const { lag, falsk: nyFalsk, klient, fabrikk } = await fersk();
      const miljo = lag(null) as Miljo;
      expect(klient.mock.calls).toEqual([[NOKKEL]]);
      expect(fabrikk).toHaveBeenCalledTimes(1);
      expect(fabrikk.mock.calls[0][0].klient).toBe(klient.mock.results[0].value);
      expect(miljo.sprakmodell).toBe(fabrikk.mock.results[0].value);
      expect(miljo.sprakmodell).not.toBe(nyFalsk);

      expect((lag(null) as Miljo).sprakmodell).toBe(miljo.sprakmodell);
      expect(klient).toHaveBeenCalledTimes(1);
    });

    it("ny nøkkel i samme prosess: ny klient. Samme nøkkel med mellomrom rundt: samme klient", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", `${NOKKEL}-a`);
      const { lag, klient } = await fersk();
      const forste = (lag(null) as Miljo).sprakmodell;

      vi.stubEnv("ANTHROPIC_API_KEY", `${NOKKEL}-b`);
      const andre = (lag(null) as Miljo).sprakmodell;
      expect(andre).not.toBeNull();
      expect(andre).not.toBe(forste);
      expect(klient.mock.calls).toEqual([[`${NOKKEL}-a`], [`${NOKKEL}-b`]]);

      vi.stubEnv("ANTHROPIC_API_KEY", `\t${NOKKEL}-b \n`);
      expect((lag(null) as Miljo).sprakmodell).toBe(andre);
      expect(klient).toHaveBeenCalledTimes(2);
    });

    it("klienten kan ikke lages: `null`, og den prøves ikke på nytt med samme nøkkel", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", NOKKEL);
      const { lag, klient, fabrikk } = await fersk();
      klient.mockReturnValueOnce(null);
      expect((lag(null) as Miljo).sprakmodell).toBeNull();
      expect((lag(null) as Miljo).sprakmodell).toBeNull();
      expect(klient).toHaveBeenCalledTimes(1);
      expect(fabrikk).not.toHaveBeenCalled();
    });

    it.each(DEMO_IDER)("med nøkkel og demo %s: den falske", async (id) => {
      vi.stubEnv("ANTHROPIC_API_KEY", NOKKEL);
      const { lag, falsk: nyFalsk, klient } = await fersk();
      expect((lag(id) as Miljo).sprakmodell).toBe(nyFalsk);
      expect(klient).not.toHaveBeenCalled();
    });

    it.each([
      ["tom", ""],
      ["bare mellomrom", "  \n"],
      ["ingen", undefined],
    ])("%s nøkkel uten demo: `null`", async (_navn, verdi) => {
      vi.stubEnv("ANTHROPIC_API_KEY", verdi);
      const { lag, klient } = await fersk();
      expect((lag(null) as Miljo).sprakmodell).toBeNull();
      expect(klient).not.toHaveBeenCalled();
    });
  });

  it.each(["finnes-ikke", "", "toString", "__proto__"])("ukjent demo «%s» gir UkjentDemoFeil", (id) => {
    expect(lagMiljo(id)).toEqual({ feil: "ukjent-demo", gyldigeDemoIder: [...DEMO_IDER] });
  });
});

describe("scenarioregisteret", () => {
  it("har scenarioene i fast rekkefølge, én mappe per scenario, og hver scenario.json validerer", () => {
    expect(DEMO_IDER).toEqual(["uj-1", "uj-2", "uj-3", "ingen-bedre", "uten-vaer"]);
    const mapper = readdirSync(MAPPE, { withFileTypes: true }).filter((m) => m.isDirectory()).map((m) => m.name);
    expect([...mapper].sort()).toEqual([...DEMO_IDER].sort());
    for (const id of DEMO_IDER) {
      const fil = ScenarioSkjema.parse(lesJson(`${id}/scenario.json`));
      const scenario = finnScenario(id)!;
      expect(scenario).toMatchObject(fil);
      const harMet = readdirSync(new URL(`${id}/`, MAPPE)).includes("met.json");
      expect(harMet).toBe(fil.vaer === "met");
      expect("vaermelding" in scenario).toBe(fil.vaer === "met");
    }
  });

  it("Værmeldingen er frosset helt ned til hver time", async () => {
    for (const id of DEMO_IDER) {
      const melding = await (lagMiljo(id) as Miljo).vaerkilde();
      if (melding === null) continue;
      expect(Object.isFrozen(melding), id).toBe(true);
      expect(Object.isFrozen(melding.timer), id).toBe(true);
      expect(melding.timer.every((t) => Object.isFrozen(t)), id).toBe(true);
      expect(() => melding.timer.push(melding.timer[0])).toThrow(TypeError);
    }
  });

  it("testscenarioene i kjernen er de samme som scenarioene med Værmelding i registeret", () => {
    expect(Object.keys(TESTSCENARIOER)).toEqual(DEMO_IDER.filter((id) => id !== "uten-vaer"));
    for (const [id, s] of Object.entries(TESTSCENARIOER)) {
      const scenario = finnScenario(id)!;
      expect(scenario.vaer).toBe("met");
      expect(s.na).toBe(Date.parse(scenario.na));
      if (scenario.vaer === "met") expect(s.vaermelding).toEqual(scenario.vaermelding);
    }
  });

  describe("lesScenario", () => {
    const mangler = { na: "2026-11-09T13:30:00+01:00", beskrivelse: "x", vaer: "mangler" };
    const met = { ...mangler, vaer: "met" };

    it("kaster når met.json finnes, men scenario.json sier «mangler»", () => {
      expect(() => lesScenario("a", mangler, lesJson("uj-1/met.json"))).toThrow(/a har met\.json.*«mangler»/);
    });

    it("kaster når met.json mangler, men scenario.json sier «met»", () => {
      expect(() => lesScenario("b", met)).toThrow(/b\/met\.json mangler.*«met»/);
    });

    it("kaster når met.json er ugyldig, med feilen fra parseren som cause", () => {
      let feil: unknown;
      try {
        lesScenario("c", met, { properties: {} });
      } catch (f) {
        feil = f;
      }
      expect(feil).toBeInstanceOf(Error);
      expect((feil as Error).message).toMatch(/c\/met\.json er ugyldig: .*timeseries/);
      expect((feil as Error).cause).toBeInstanceOf(Error);
      expect(((feil as Error).cause as Error).message).toMatch(/timeseries/);
    });

    it("kaster når scenario.json er ugyldig, og gir scenarioet ellers", () => {
      expect(() => lesScenario("d", { ...mangler, vaer: "god" })).toThrow(/d\/scenario\.json er ugyldig/);
      expect(lesScenario("e", mangler)).toEqual(mangler);
      expect(lesScenario("f", met, { properties: { timeseries: [] } })).toEqual({ ...met, vaermelding: { timer: [] } });
    });
  });

  it("avviser et scenario uten tidssone eller med ekstra felt", () => {
    const gyldig = { na: "2026-11-09T13:30:00+01:00", beskrivelse: "x", vaer: "mangler" };
    expect(ScenarioSkjema.safeParse(gyldig).success).toBe(true);
    expect(ScenarioSkjema.safeParse({ ...gyldig, na: "2026-11-09T13:30:00" }).success).toBe(false);
    expect(ScenarioSkjema.safeParse({ ...gyldig, ekstra: 1 }).success).toBe(false);
    expect(ScenarioSkjema.safeParse({ ...gyldig, vaer: "god" }).success).toBe(false);
    expect(ScenarioSkjema.safeParse({ ...gyldig, vaer: "met" }).success).toBe(true);
    expect(ScenarioSkjema.safeParse({ ...gyldig, vaer: "met", vaermelding: { timer: [] } }).success).toBe(false);
  });
});
