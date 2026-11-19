import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VAERPUNKT } from "../src/kjerne/vaerpunkt";
import { lagMetJson, lesNa, PUNKT, type Tabell, TABELLER } from "./lag-vaerscenarioer";

// Skriptet for Værscenarioene (story 2.3): de committede met.json-filene er det skriptet gir.

const MAPPE = new URL("../data/vaerscenarioer/", import.meta.url);
const IDER = Object.keys(TABELLER);

describe("lag-vaerscenarioer", () => {
  it("har en tabell for hvert scenario med met.json, og bare uten-vaer er uten", () => {
    const mapper = readdirSync(MAPPE, { withFileTypes: true })
      .filter((m) => m.isDirectory())
      .map((m) => m.name);
    expect(IDER).toEqual(["uj-1", "uj-2", "uj-3", "ingen-bedre"]);
    expect([...mapper].sort()).toEqual([...IDER, "uten-vaer"].sort());
  });

  it.each(IDER)("gir den committede data/vaerscenarioer/%s/met.json byte for byte", (id) => {
    const tekst = lagMetJson(id, lesNa(id));
    expect(tekst).toBe(readFileSync(new URL(`${id}/met.json`, MAPPE), "utf8"));
    expect(lagMetJson(id, lesNa(id))).toBe(tekst);
  });

  it("bruker Værpunktet fra vaerpunkt.ts, trunkert til fire desimaler", () => {
    const fire = (x: number) => Math.trunc(x * 1e4) / 1e4;
    expect(PUNKT).toEqual({ lat: fire(VAERPUNKT.lat), lon: fire(VAERPUNKT.lon), hoydeMoh: VAERPUNKT.hoydeMoh });
  });

  it("skriver alle værtall med én desimal", () => {
    const tekst = lagMetJson("uj-1", lesNa("uj-1"));
    const tall = [...tekst.matchAll(/"(air_temperature|wind_speed|precipitation_amount)":(-?[\d.]+)/g)].map((m) => m[2]);
    expect(tall.length).toBeGreaterThan(100);
    for (const t of tall) expect(t).toMatch(/^-?\d+\.\d$/);
  });

  it("kaster for et ukjent scenario, uten timer, eller når «nå» har en annen forskyvning", () => {
    expect(() => lagMetJson("finnes-ikke", "2026-11-09T13:30:00+01:00")).toThrow(/finnes-ikke/);
    expect(() => lagMetJson("uj-1", "2026-11-09T13:30:00+02:00")).toThrow(/forskyvningen/);
    expect(() => lagMetJson("uj-1", "2026-11-11T13:30:00+01:00")).toThrow(/ingen timer/);
    expect(() => lagMetJson("uj-1", "2026-13-45T13:30:00+01:00")).toThrow(/gyldig tidspunkt/);
  });

  const periode = { tempC: [3, 5], vindMs: [2, 4], nedborMmT: [0, 0], torr: "fair" } as const;
  const na = "2026-11-09T13:30:00+01:00";
  const tabell = (...til: string[]): Tabell => ({ turdag: "2026-11-09", perioder: til.map((t) => ({ ...periode, til: t })) });

  it("godtar en tabell som slutter ved midnatt to dager etter Turdagen", () => {
    expect(() => lagMetJson("x", na, tabell("2026-11-10T00:00", "2026-11-11T00:00"))).not.toThrow();
  });

  it("kaster når tabellen ikke dekker en time", () => {
    expect(() => lagMetJson("x", na, tabell("2026-11-10T00:00", "2026-11-10T20:00"))).toThrow(/dekker ikke timen/);
  });

  it("kaster når siste periode slutter etter timene", () => {
    expect(() => lagMetJson("x", na, tabell("2026-11-10T00:00", "2026-11-11T03:00"))).toThrow(/siste periode skal slutte/);
  });

  it("kaster når periodeslutten ikke er på hel time eller ikke stiger", () => {
    expect(() => lagMetJson("x", na, tabell("2026-11-10T00:30", "2026-11-11T00:00"))).toThrow(/hel time/);
    expect(() => lagMetJson("x", na, tabell("2026-11-10T00:00", "2026-11-10T00:00", "2026-11-11T00:00"))).toThrow(
      /kommer ikke etter/,
    );
    expect(() => lagMetJson("x", na, tabell("2026-11-11T00:00", "2026-11-10T00:00"))).toThrow(/kommer ikke etter/);
  });

  it("6-timersradene kommer rett etter siste time, uten hull", () => {
    const { timeseries } = (JSON.parse(lagMetJson("uj-2", lesNa("uj-2"))) as {
      properties: { timeseries: { time: string; data: Record<string, unknown> }[] };
    }).properties;
    const tider = timeseries.map((r) => Date.parse(r.time));
    const timer = timeseries.filter((r) => "next_1_hours" in r.data).length;
    expect(timeseries.at(timer - 1)!.time).toBe("2026-11-10T22:00:00Z");
    expect(tider.slice(timer - 1).map((t, i, a) => (i === 0 ? 0 : t - a[i - 1]))).toEqual([0, 1, 6, 6].map((h) => h * 3600_000));
  });
});
