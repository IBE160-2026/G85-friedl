import { afterAll, describe, expect, it } from "vitest";
import { lagStandardSok, normaliserSok, type Sok } from "./src/kjerne/sok";
import { osloDato, osloKlokke, osloTilUtc, timerITidsvindu } from "./src/kjerne/tid";

// All tid følger Europe/Oslo uansett tidssone på enheten eller serveren (AD-7).
// Testen bytter systemets tidssone og kjører de samme eksemplene i hver. Den ligger i roten,
// fordi kjernen ikke kan bruke process (lagregel AR-1).

const OPPRINNELIG_TZ = process.env.TZ;

afterAll(() => {
  if (OPPRINNELIG_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = OPPRINNELIG_TZ;
});

// 9. november 2026 er vintertid i Oslo (UTC+1). Ingen av sonene under er UTC+1.
const na = (timer: number, minutter: number, sekunder = 0) =>
  Date.UTC(2026, 10, 9, timer - 1, minutter, sekunder);

const sok = (endring: Partial<Sok> = {}): Sok => ({
  dato: "2026-11-09",
  start: "13:00",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
  ...endring,
});

describe.each([
  ["UTC", 0],
  ["America/New_York", 5 * 60],
  ["Asia/Tokyo", -9 * 60],
])("systemets tidssone er %s", (tz, forskyvning) => {
  it("forskyvningen har faktisk endret seg", () => {
    process.env.TZ = tz;
    expect(new Date(na(12, 0)).getTimezoneOffset()).toBe(forskyvning);
  });

  it("passert tid i dag", () => {
    process.env.TZ = tz;
    expect(normaliserSok(sok({ start: "13:00" }), na(13, 22))).toEqual({
      sok: sok({ start: "13:30" }),
      justering: "Flyttet til 13:30, fordi 13:00 har passert.",
    });
    expect(normaliserSok(sok({ start: "13:30" }), na(13, 30))).toEqual({ sok: sok({ start: "13:30" }) });
    expect(normaliserSok(sok({ start: "13:30" }), na(13, 30, 1)).sok.start).toBe("13:45");
  });

  it("etter 22:00", () => {
    process.env.TZ = tz;
    expect(normaliserSok(sok({ start: "21:00" }), na(22, 10))).toEqual({
      sok: sok({ dato: "2026-11-10", start: "10:00" }),
      justering: "Flyttet til i morgen kl. 10:00, fordi klokka har passert 22:00.",
    });
  });

  it("standard-Søket", () => {
    process.env.TZ = tz;
    expect(lagStandardSok(na(5, 10))).toEqual(sok({ start: "06:00" }));
    expect(lagStandardSok(na(13, 22))).toEqual(sok({ start: "13:30" }));
    expect(lagStandardSok(na(21, 50))).toEqual(sok({ start: "22:00" }));
    expect(lagStandardSok(na(22, 10))).toEqual(sok({ dato: "2026-11-10", start: "10:00" }));
  });

  it("Tidsvindu over midnatt", () => {
    process.env.TZ = tz;
    const start = osloTilUtc("2026-11-09", "22:00");
    expect(start).toBe(Date.UTC(2026, 10, 9, 21, 0));
    const timer = timerITidsvindu(start, start + 300 * 60_000).map((t) => [osloDato(t), osloKlokke(t) / 60]);
    expect(timer).toEqual([
      ["2026-11-09", 22],
      ["2026-11-09", 23],
      ["2026-11-10", 0],
      ["2026-11-10", 1],
      ["2026-11-10", 2],
    ]);
  });

  it("sommertid", () => {
    process.env.TZ = tz;
    expect(osloTilUtc("2026-03-29", "06:00")).toBe(Date.UTC(2026, 2, 29, 4, 0));
    expect(osloTilUtc("2026-10-25", "06:00")).toBe(Date.UTC(2026, 9, 25, 5, 0));
  });
});
