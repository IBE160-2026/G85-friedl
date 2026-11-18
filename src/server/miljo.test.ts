import { afterEach, describe, expect, it, vi } from "vitest";
import { lagMiljo, lesDemoId, type Miljo } from "./miljo";
import { DEMO_IDER, finnScenario, ScenarioSkjema } from "./vaer/scenarioer";

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
  it("har bare uten-vaer i Epic 1, og hvert scenario validerer", () => {
    expect(DEMO_IDER).toEqual(["uten-vaer"]);
    for (const id of DEMO_IDER) expect(ScenarioSkjema.safeParse(finnScenario(id)).success).toBe(true);
  });

  it("avviser et scenario uten tidssone eller med ekstra felt", () => {
    const gyldig = { na: "2026-11-09T13:30:00+01:00", beskrivelse: "x", vaer: "mangler" };
    expect(ScenarioSkjema.safeParse(gyldig).success).toBe(true);
    expect(ScenarioSkjema.safeParse({ ...gyldig, na: "2026-11-09T13:30:00" }).success).toBe(false);
    expect(ScenarioSkjema.safeParse({ ...gyldig, ekstra: 1 }).success).toBe(false);
    expect(ScenarioSkjema.safeParse({ ...gyldig, vaer: "god" }).success).toBe(false);
  });
});
