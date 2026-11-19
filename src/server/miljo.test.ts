import { readdirSync, readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { parseMetCompact } from "@/kjerne/vaer/met-compact";
import { TESTSCENARIOER } from "@/kjerne/vaer/testscenarioer";
import { lagMiljo, lesDemoId, type Miljo } from "./miljo";
import { DEMO_IDER, finnScenario, lesScenario, ScenarioSkjema } from "./vaer/scenarioer";

const MAPPE = new URL("../../data/vaerscenarioer/", import.meta.url);
const lesJson = (sti: string): unknown => JSON.parse(readFileSync(new URL(sti, MAPPE), "utf8"));

// Miljøet (story 1.10, AD-13): klokka og værkilden ut fra demo-ID-en.

afterEach(() => {
  vi.useRealTimers();
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

  it("uten demo: systemklokka og ingen Værmelding", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.UTC(2026, 10, 12, 8, 7));
    const miljo = lagMiljo(null) as Miljo;
    expect(miljo.na).toBe(Date.UTC(2026, 10, 12, 8, 7));
    expect(miljo.demo).toBeNull();
    await expect(miljo.vaerkilde()).resolves.toBeNull();
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
