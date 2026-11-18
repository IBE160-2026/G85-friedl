import { describe, expect, it } from "vitest";
import {
  klokkeTekst,
  kvarterOpp,
  leggTilDager,
  OSLO,
  osloDato,
  osloKlokke,
  osloTilUtc,
  TIME_MS,
  timerITidsvindu,
} from "./tid";

// Oslo-hjelperne (AD-7). Forventningene står som UTC-øyeblikk, så testene ikke bruker
// koden de tester. November er vintertid (UTC+1), juni er sommertid (UTC+2).

const MIN_MS = 60_000;

describe("OSLO", () => {
  it("er Europe/Oslo", () => {
    expect(OSLO).toBe("Europe/Oslo");
  });
});

describe("osloDato og osloKlokke", () => {
  it("leser vintertid", () => {
    const utc = Date.UTC(2026, 10, 9, 12, 22); // 13:22 i Oslo
    expect(osloDato(utc)).toBe("2026-11-09");
    expect(osloKlokke(utc)).toBe(13 * 60 + 22);
  });

  it("leser sommertid", () => {
    const utc = Date.UTC(2026, 5, 15, 11, 0); // 13:00 i Oslo
    expect(osloDato(utc)).toBe("2026-06-15");
    expect(osloKlokke(utc)).toBe(13 * 60);
  });

  it("bytter dato ved midnatt i Oslo, ikke i UTC", () => {
    expect(osloDato(Date.UTC(2026, 10, 9, 22, 59, 59))).toBe("2026-11-09");
    expect(osloDato(Date.UTC(2026, 10, 9, 23, 0))).toBe("2026-11-10");
    expect(osloKlokke(Date.UTC(2026, 10, 9, 23, 0))).toBe(0);
  });

  it("tar med sekunder som brøkdel av et minutt", () => {
    const utc = Date.UTC(2026, 10, 9, 12, 30, 1); // 13:30:01
    expect(osloKlokke(utc)).toBeGreaterThan(13 * 60 + 30);
    expect(osloKlokke(utc)).toBeLessThan(13 * 60 + 31);
  });

  it("tar med millisekunder som brøkdel av et minutt", () => {
    expect(osloKlokke(Date.UTC(2026, 10, 9, 12, 30, 0, 500))).toBeGreaterThan(13 * 60 + 30);
  });
});

describe("osloTilUtc", () => {
  it("gjør Oslo-veggklokke om til UTC", () => {
    expect(osloTilUtc("2026-11-09", "13:00")).toBe(Date.UTC(2026, 10, 9, 12, 0));
    expect(osloTilUtc("2026-06-15", "13:00")).toBe(Date.UTC(2026, 5, 15, 11, 0));
  });

  it("gir riktig øyeblikk på dagen sommertiden starter (29. mars 2026)", () => {
    expect(osloTilUtc("2026-03-28", "06:00")).toBe(Date.UTC(2026, 2, 28, 5, 0));
    expect(osloTilUtc("2026-03-29", "06:00")).toBe(Date.UTC(2026, 2, 29, 4, 0));
    expect(osloTilUtc("2026-03-29", "22:00")).toBe(Date.UTC(2026, 2, 29, 20, 0));
  });

  it("gir riktig øyeblikk på dagen sommertiden slutter (25. oktober 2026)", () => {
    expect(osloTilUtc("2026-10-24", "06:00")).toBe(Date.UTC(2026, 9, 24, 4, 0));
    expect(osloTilUtc("2026-10-25", "06:00")).toBe(Date.UTC(2026, 9, 25, 5, 0));
    expect(osloTilUtc("2026-10-25", "22:00")).toBe(Date.UTC(2026, 9, 25, 21, 0));
  });

  it("er omvendt av osloDato og osloKlokke", () => {
    const utc = osloTilUtc("2026-03-29", "10:15");
    expect(osloDato(utc)).toBe("2026-03-29");
    expect(osloKlokke(utc)).toBe(10 * 60 + 15);
  });

  it("avviser ugyldig format", () => {
    expect(() => osloTilUtc("9.11.2026", "13:00")).toThrow();
    expect(() => osloTilUtc("2026-11-09", "1300")).toThrow();
  });
});

describe("leggTilDager", () => {
  it.each([
    ["2026-11-09", 1, "2026-11-10"],
    ["2026-11-09", -1, "2026-11-08"],
    ["2026-11-09", 3, "2026-11-12"],
    ["2026-11-30", 1, "2026-12-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-03-28", 1, "2026-03-29"],
    ["2026-03-29", 1, "2026-03-30"],
    ["2026-10-25", 1, "2026-10-26"],
  ])("%s + %i dager er %s", (dato, n, forventet) => {
    expect(leggTilDager(dato, n)).toBe(forventet);
  });
});

describe("kvarterOpp", () => {
  it.each([
    [0, 0],
    [13 * 60 + 22, 13 * 60 + 30],
    [13 * 60 + 30, 13 * 60 + 30],
    [13 * 60 + 30 + 1 / 60, 13 * 60 + 45],
    [21 * 60 + 50, 22 * 60],
    [22 * 60 + 1 / 60, 22 * 60 + 15],
    [23 * 60 + 50, 24 * 60],
  ])("%f minutter blir %i", (minutter, forventet) => {
    expect(kvarterOpp(minutter)).toBe(forventet);
  });
});

describe("klokkeTekst", () => {
  it.each([
    [0, "00:00"],
    [6 * 60, "06:00"],
    [13 * 60 + 45, "13:45"],
    [22 * 60, "22:00"],
  ])("%i minutter er %s", (minutter, forventet) => {
    expect(klokkeTekst(minutter)).toBe(forventet);
  });

  it("avviser minutter utenfor døgnet og brøkdeler", () => {
    expect(() => klokkeTekst(24 * 60)).toThrow();
    expect(() => klokkeTekst(-15)).toThrow();
    expect(() => klokkeTekst(810.5)).toThrow();
  });
});

describe("timerITidsvindu med Oslo-tid", () => {
  const oslotimer = (timer: number[]) => timer.map((t) => `${osloDato(t)} ${klokkeTekst(osloKlokke(t))}`);

  it("går over midnatt: 22:00 + 300 min gir 22, 23, 00, 01 og 02", () => {
    const start = osloTilUtc("2026-11-09", "22:00");
    expect(oslotimer(timerITidsvindu(start, start + 300 * MIN_MS))).toEqual([
      "2026-11-09 22:00",
      "2026-11-09 23:00",
      "2026-11-10 00:00",
      "2026-11-10 01:00",
      "2026-11-10 02:00",
    ]);
  });

  it("legger varigheten til i UTC, så natta sommertiden starter gir fem timer", () => {
    const start = osloTilUtc("2026-03-28", "22:00");
    const timer = timerITidsvindu(start, start + 300 * MIN_MS);
    expect(timer).toHaveLength(5);
    expect(timer[4] - timer[0]).toBe(4 * TIME_MS);
    expect(oslotimer(timer)).toEqual([
      "2026-03-28 22:00",
      "2026-03-28 23:00",
      "2026-03-29 00:00",
      "2026-03-29 01:00",
      "2026-03-29 03:00",
    ]);
  });
});
