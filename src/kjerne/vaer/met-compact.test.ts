import { describe, expect, it } from "vitest";
import { z } from "zod";
import uj1Met from "../../../data/vaerscenarioer/uj-1/met.json";
import { parseMetCompact } from "./met-compact";

// Parseren for MET `compact` (story 2.3, AR-6, AD-19).

const ms = (iso: string) => Date.parse(iso);

/** En rad med `next_1_hours`. */
function time(iso: string, { temp = 4, vind = 3, nedbor = 0, symbol = "cloudy" as string | undefined } = {}) {
  return {
    time: iso,
    data: {
      instant: { details: { air_temperature: temp, wind_speed: vind, relative_humidity: 80 } },
      next_1_hours: {
        summary: symbol === undefined ? {} : { symbol_code: symbol },
        details: { precipitation_amount: nedbor },
      },
      next_6_hours: { summary: { symbol_code: "rain" }, details: { precipitation_amount: 4 } },
    },
  };
}

/** En rad som bare har `next_6_hours`. */
function seksTimer(iso: string) {
  return {
    time: iso,
    data: {
      instant: { details: { air_temperature: 1, wind_speed: 2 } },
      next_6_hours: { summary: { symbol_code: "rain" }, details: { precipitation_amount: 4 } },
    },
  };
}

const svar = (timeseries: unknown[]) => ({
  type: "Feature",
  geometry: { type: "Point", coordinates: [7.1679, 62.7617, 400] },
  properties: { meta: { updated_at: "2026-11-09T12:00:00Z", units: {} }, timeseries },
});

describe("parseMetCompact", () => {
  it("uj-1/met.json: én time per rad med next_1_hours, stigende, uten radene med bare next_6_hours", () => {
    const rader = uj1Met.properties.timeseries;
    const medEnTime = rader.filter((r) => "next_1_hours" in r.data);
    expect(rader.length - medEnTime.length).toBe(3);

    const { timer } = parseMetCompact(uj1Met);
    expect(timer).toHaveLength(medEnTime.length);
    expect(timer.map((t) => t.startUtc)).toEqual(medEnTime.map((r) => ms(r.time)));
    for (let i = 1; i < timer.length; i++) expect(timer[i].startUtc).toBeGreaterThan(timer[i - 1].startUtc);

    // Første time: timen «nå» (13:30) ligger i. Siste: 23:00 dagen etter Turdagen.
    expect(timer[0].startUtc).toBe(ms("2026-11-09T13:00:00+01:00"));
    expect(timer.at(-1)!.startUtc).toBe(ms("2026-11-10T23:00:00+01:00"));

    const [forste] = medEnTime;
    expect(timer[0]).toEqual({
      startUtc: ms(forste.time),
      tempC: forste.data.instant.details.air_temperature,
      vindMs: forste.data.instant.details.wind_speed,
      nedborMmT: forste.data.next_1_hours!.details.precipitation_amount,
      symbolKode: forste.data.next_1_hours!.summary.symbol_code,
    });
  });

  it("leser verdiene og sorterer stigende på startUtc", () => {
    const melding = parseMetCompact(
      svar([
        time("2026-11-09T13:00:00Z", { temp: 2.5, vind: 6.1, nedbor: 0.4, symbol: "lightrain" }),
        seksTimer("2026-11-09T18:00:00Z"),
        time("2026-11-09T12:00:00Z", { temp: -1.2, vind: 11, nedbor: 2, symbol: "rain" }),
      ]),
    );
    expect(melding).toEqual({
      timer: [
        { startUtc: ms("2026-11-09T12:00:00Z"), tempC: -1.2, vindMs: 11, nedborMmT: 2, symbolKode: "rain" },
        { startUtc: ms("2026-11-09T13:00:00Z"), tempC: 2.5, vindMs: 6.1, nedborMmT: 0.4, symbolKode: "lightrain" },
      ],
    });
  });

  it("en tom timeseries gir en tom Værmelding", () => {
    expect(parseMetCompact(svar([]))).toEqual({ timer: [] });
  });

  it.each([
    ["uten summary", { summary: undefined }],
    ["uten symbol_code", { summary: {} }],
    ["med tom symbol_code", { summary: { symbol_code: "" } }],
  ])("symbolKode er null %s", (_navn, endring) => {
    const rad = time("2026-11-09T12:00:00Z");
    const neste: Record<string, unknown> = { ...rad.data.next_1_hours, ...endring };
    if (endring.summary === undefined) delete neste.summary;
    const { timer } = parseMetCompact(svar([{ ...rad, data: { ...rad.data, next_1_hours: neste } }]));
    expect(timer[0].symbolKode).toBeNull();
  });

  it.each([
    ["uten properties.timeseries", { properties: {} }],
    ["uten properties", { type: "Feature" }],
    ["timeseries er ikke en liste", { properties: { timeseries: {} } }],
    ["null", null],
  ])("kaster en feil som nevner timeseries: %s", (_navn, data) => {
    expect(() => parseMetCompact(data)).toThrow(/timeseries/);
  });

  it.each([
    ["wind_speed som tekst", (r: ReturnType<typeof time>) => ({ ...r, data: { ...r.data, instant: { details: { air_temperature: 4, wind_speed: "3" } } } })],
    ["uten air_temperature", (r: ReturnType<typeof time>) => ({ ...r, data: { ...r.data, instant: { details: { wind_speed: 3 } } } })],
    [
      "uten precipitation_amount",
      (r: ReturnType<typeof time>) => ({ ...r, data: { ...r.data, next_1_hours: { summary: { symbol_code: "rain" }, details: {} } } }),
    ],
    ["time uten tidssone", (r: ReturnType<typeof time>) => ({ ...r, time: "2026-11-09T12:00:00" })],
    ["uten time", (r: ReturnType<typeof time>) => ({ data: r.data })],
    ["negativ wind_speed", (r: ReturnType<typeof time>) => ({ ...r, data: { ...r.data, instant: { details: { air_temperature: 4, wind_speed: -0.1 } } } })],
    [
      "negativ precipitation_amount",
      (r: ReturnType<typeof time>) => ({ ...r, data: { ...r.data, next_1_hours: { details: { precipitation_amount: -0.1 } } } }),
    ],
  ])("feil i en rad gir en Zod-feil: %s", (_navn, endre) => {
    const data = svar([time("2026-11-09T11:00:00Z"), endre(time("2026-11-09T12:00:00Z"))]);
    expect(() => parseMetCompact(data)).toThrow(z.ZodError);
  });

  it("validerer ikke rader uten next_1_hours, så en 6-timersrad uten instant-felt godtas", () => {
    const uten = { time: "2026-11-09T18:00:00Z", data: { instant: { details: {} }, next_6_hours: {} } };
    const melding = parseMetCompact(svar([time("2026-11-09T12:00:00Z"), uten, { time: "x", data: {} }]));
    expect(melding.timer.map((t) => t.startUtc)).toEqual([ms("2026-11-09T12:00:00Z")]);
  });

  it("godtar vind og nedbør på 0", () => {
    const { timer } = parseMetCompact(svar([time("2026-11-09T12:00:00Z", { vind: 0, nedbor: 0 })]));
    expect(timer[0]).toMatchObject({ vindMs: 0, nedborMmT: 0 });
  });

  it.each(["2026-11-09T12:30:00Z", "2026-11-09T12:00:01Z", "2026-11-09T13:15:00+01:00"])(
    "kaster når en time ikke starter på en hel time: %s",
    (iso) => {
      expect(() => parseMetCompact(svar([time("2026-11-09T11:00:00Z"), time(iso)]))).toThrow(/hel time/);
    },
  );

  it("kaster når to rader har samme time, også med ulik skrivemåte", () => {
    expect(() => parseMetCompact(svar([time("2026-11-09T12:00:00Z"), time("2026-11-09T13:00:00+01:00")]))).toThrow(
      /to ganger/,
    );
  });

  it("godtar ukjente felt overalt", () => {
    const rad = time("2026-11-09T12:00:00Z");
    const data = {
      ...svar([{ ...rad, ny: 1, data: { ...rad.data, next_12_hours: { x: 1 }, instant: { details: { ...rad.data.instant.details, ny: "x" } } } }]),
      ekstra: true,
    };
    expect(parseMetCompact(data).timer).toHaveLength(1);
  });
});
