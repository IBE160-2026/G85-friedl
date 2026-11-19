import { describe, expect, it } from "vitest";
import { dag, heltall, klokke, km, meter, tall, tallord, temperaturTekst, varighet } from "./format";

// Tall i tekst (AD-7, Voice and Tone). Forventningene for klokka står som UTC-øyeblikk, så testene
// ikke bruker koden de tester. November er vintertid (UTC+1), juni er sommertid (UTC+2).

describe("varighet", () => {
  it.each([
    [0, "0 min"],
    [1, "1 min"],
    [16, "16 min"],
    [59, "59 min"],
    [60, "1 t"],
    [62, "1 t 2 min"],
    [92, "1 t 32 min"],
    [120, "2 t"],
    [150, "2 t 30 min"],
    [300, "5 t"],
  ])("%s min er «%s»", (min, tekst) => {
    expect(varighet(min)).toBe(tekst);
  });

  it.each([-1, 1.5, Number.NaN])("kaster for %s", (min) => {
    expect(() => varighet(min)).toThrow();
  });
});

describe("klokke", () => {
  it("viser Oslo-tid i 24-timersformat", () => {
    expect(klokke(Date.UTC(2026, 10, 9, 14, 2))).toBe("15:02");
    expect(klokke(Date.UTC(2026, 10, 9, 0, 5))).toBe("01:05");
    expect(klokke(Date.UTC(2026, 5, 21, 20, 30))).toBe("22:30");
  });

  it("avkorter sekunder", () => {
    expect(klokke(Date.UTC(2026, 10, 9, 14, 58, 59, 999))).toBe("15:58");
  });

  it("følger sommertidsskiftet 29. mars og vintertidsskiftet 25. oktober 2026", () => {
    // 29. mars: 01:59 UTC+1, så 03:00 UTC+2.
    expect(klokke(Date.UTC(2026, 2, 29, 0, 59))).toBe("01:59");
    expect(klokke(Date.UTC(2026, 2, 29, 1, 0))).toBe("03:00");
    // 25. oktober: 02:59 UTC+2, så 02:00 UTC+1.
    expect(klokke(Date.UTC(2026, 9, 25, 0, 59))).toBe("02:59");
    expect(klokke(Date.UTC(2026, 9, 25, 1, 0))).toBe("02:00");
  });

  it("går over midnatt", () => {
    expect(klokke(Date.UTC(2026, 10, 9, 23, 0))).toBe("00:00");
  });
});

describe("tall", () => {
  it.each([
    [0, "0"],
    [4, "4"],
    [3.5, "3,5"],
    [10.8, "10,8"],
    [4.04, "4"],
    [4.05, "4,1"],
    [2.25, "2,3"],
    [-2, "−2"],
    [-2.25, "−2,3"],
    [-0.04, "0"],
    [0.05, "0,1"],
    [-0.05, "\u22120,1"],
    [19, "19"],
  ])("%s er «%s»", (x, tekst) => {
    expect(tall(x)).toBe(tekst);
  });

  it("kaster for tall som ikke er endelige", () => {
    expect(() => tall(Number.POSITIVE_INFINITY)).toThrow();
    expect(() => tall(Number.NaN)).toThrow();
  });
});

describe("temperaturTekst", () => {
  it.each([
    [2.6, 4.6, "3–5 °C"],
    [-2.4, 1.2, "\u22122 til 1 °C"],
    [4.2, 3.8, "4 °C"],
    [-0.4, -0.2, "0 °C"],
    [-0.4, 2, "0–2 °C"],
    [3, 5, "3–5 °C"],
    [-5.6, -2.5, "\u22126 til \u22123 °C"],
    [-0.5, 2, "\u22121 til 2 °C"],
    [0, 0, "0 °C"],
    [-3, -3, "\u22123 °C"],
  ])("(%s, %s) er «%s»", (min, maks, tekst) => {
    expect(temperaturTekst(min, maks)).toBe(tekst);
  });

  it("bruker tankestrek (U+2013) og minustegn (U+2212)", () => {
    expect(temperaturTekst(3, 5)).toContain("\u2013");
    expect(temperaturTekst(-2, 1).startsWith("\u2212")).toBe(true);
  });

  it("kaster for tall som ikke er endelige", () => {
    expect(() => temperaturTekst(Number.NaN, 2)).toThrow();
    expect(() => temperaturTekst(1, Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("heltall", () => {
  it.each([
    [0, "0"],
    [1, "1"],
    [12, "12"],
  ])("%s gir %s", (n, tekst) => {
    expect(heltall(n)).toBe(tekst);
  });

  it.each([-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("kaster for %s", (n) => {
    expect(() => heltall(n)).toThrow();
  });
});

describe("km", () => {
  it.each([
    [5, "5,0 km"],
    [3.46, "3,46 km"],
    [8.8, "8,8 km"],
    [3.06, "3,06 km"],
    [9.74, "9,74 km"],
    [1.005, "1,01 km"],
    [0, "0,0 km"],
  ])("%s er «%s»", (x, tekst) => {
    expect(km(x)).toBe(tekst);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("kaster for %s", (x) => {
    expect(() => km(x)).toThrow();
  });
});

describe("meter", () => {
  it.each([
    [500, "500"],
    [318, "318"],
    [1900, "1900"],
    [527.4, "527"],
    [0, "0"],
    [-3, "−3"],
  ])("%s er «%s»", (x, tekst) => {
    expect(meter(x)).toBe(tekst);
  });

  it.each([Number.NaN, Number.NEGATIVE_INFINITY])("kaster for %s", (x) => {
    expect(() => meter(x)).toThrow();
  });
});

describe("dag", () => {
  it.each([
    ["2026-11-09", "man. 9. nov."],
    ["2026-11-10", "tir. 10. nov."],
    ["2026-11-15", "søn. 15. nov."],
    ["2026-11-14", "lør. 14. nov."],
    ["2026-03-01", "søn. 1. mars"],
    ["2026-06-24", "ons. 24. juni"],
    ["2026-01-01", "tor. 1. jan."],
    ["2026-12-31", "tor. 31. des."],
    ["2026-03-29", "søn. 29. mars"],
  ])("%s er «%s»", (dato, tekst) => {
    expect(dag(dato)).toBe(tekst);
  });

  it.each(["2026-13-01", "2026-11-00", "2026-02-30", "2026-04-31", "2026-02-29", "9. nov.", ""])("kaster for «%s»", (dato) => {
    expect(() => dag(dato)).toThrow();
  });
});

describe("tallord", () => {
  it.each([
    [1, "ett"],
    [2, "to"],
    [3, "tre"],
    [10, "ti"],
  ])("%s er «%s»", (n, ord) => {
    expect(tallord(n)).toBe(ord);
  });

  it.each([0, -1, 1.5, 11, Number.NaN])("kaster for %s", (n) => {
    expect(() => tallord(n)).toThrow();
  });
});
