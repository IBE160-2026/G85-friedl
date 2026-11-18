import { describe, expect, it } from "vitest";
import { lagStandardSok, normaliserSok, type Sok, SokSkjema } from "./sok";

// Søk-kontrakten (AD-17) og eksemplene i matrisen til story 1.3.
// «Nå» er 9. november 2026 i Oslo (vintertid, UTC+1) hvis ikke annet står.

const I_DAG = "2026-11-09";
const I_MORGEN = "2026-11-10";

/** Oslo-klokka 9. november 2026 som epoke-ms i UTC. */
const na = (timer: number, minutter: number, sekunder = 0) =>
  Date.UTC(2026, 10, 9, timer - 1, minutter, sekunder);

const sok = (endring: Partial<Sok> = {}): Sok => ({
  dato: I_DAG,
  start: "13:00",
  tilgjengeligMin: 90,
  vanskelighetsgrad: "R",
  utsikt: true,
  vann: false,
  ...endring,
});

const standard = (dato: string, start: string): Sok => ({
  dato,
  start,
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
});

const ETTER_22 = "Flyttet til i morgen kl. 10:00, fordi klokka har passert 22:00.";
const UKJENT_DATO = "Turdagen er ikke i dag eller i morgen, så Søket er satt tilbake til standard.";

describe("SokSkjema", () => {
  it("godtar et gyldig Søk", () => {
    expect(SokSkjema.parse(sok())).toEqual(sok());
  });

  it.each([
    ["06:00"],
    ["13:45"],
    ["21:45"],
    ["22:00"],
  ])("godtar start %s", (start) => {
    expect(SokSkjema.safeParse(sok({ start })).success).toBe(true);
  });

  it.each([15, 120, 300])("godtar tilgjengeligMin %i", (tilgjengeligMin) => {
    expect(SokSkjema.safeParse(sok({ tilgjengeligMin })).success).toBe(true);
  });

  it.each([
    ["start 13:10", { start: "13:10" }],
    ["start 05:45", { start: "05:45" }],
    ["start 22:15", { start: "22:15" }],
    ["start 6:00", { start: "6:00" }],
    ["10 min", { tilgjengeligMin: 10 }],
    ["310 min", { tilgjengeligMin: 310 }],
    ["20 min", { tilgjengeligMin: 20 }],
    ["15,5 min", { tilgjengeligMin: 15.5 }],
    ["vanskelighetsgrad 'X'", { vanskelighetsgrad: "X" }],
    ["dato 2026-02-30", { dato: "2026-02-30" }],
    ["dato 9.11.2026", { dato: "9.11.2026" }],
    ["utsikt som streng", { utsikt: "ja" }],
    ["ekstra felt", { ekstra: 1 }],
  ])("avviser %s", (_navn, endring) => {
    expect(SokSkjema.safeParse({ ...sok(), ...endring }).success).toBe(false);
  });

  it("avviser et Søk som mangler et felt", () => {
    const utenVann: Partial<Sok> = sok();
    delete utenVann.vann;
    expect(SokSkjema.safeParse(utenVann).success).toBe(false);
  });
});

describe("lagStandardSok", () => {
  it.each([
    ["05:10", na(5, 10), standard(I_DAG, "06:00")],
    ["13:22", na(13, 22), standard(I_DAG, "13:30")],
    ["13:30:00", na(13, 30), standard(I_DAG, "13:30")],
    ["13:30:01", na(13, 30, 1), standard(I_DAG, "13:45")],
    ["21:50", na(21, 50), standard(I_DAG, "22:00")],
    ["22:00:00", na(22, 0), standard(I_DAG, "22:00")],
    ["22:00:01", na(22, 0, 1), standard(I_MORGEN, "10:00")],
    ["22:10", na(22, 10), standard(I_MORGEN, "10:00")],
    ["00:10", na(0, 10), standard(I_DAG, "06:00")],
    ["23:55", na(23, 55), standard(I_MORGEN, "10:00")],
  ])("nå %s gir %o", (_navn, naUtc, forventet) => {
    expect(lagStandardSok(naUtc)).toEqual(forventet);
  });

  it("gir alltid et gyldig Søk", () => {
    for (let m = 0; m < 24 * 60; m += 5) {
      const resultat = lagStandardSok(na(0, m));
      expect(SokSkjema.safeParse(resultat).success, `minutt ${m}`).toBe(true);
    }
  });
});

describe("normaliserSok", () => {
  it("passert i dag: 13:00 kl. 13:22 blir 13:30", () => {
    expect(normaliserSok(sok({ start: "13:00" }), na(13, 22))).toEqual({
      sok: sok({ start: "13:30" }),
      justering: "Flyttet til 13:30, fordi 13:00 har passert.",
    });
  });

  it("13:30 er ikke passert kl. 13:30:00", () => {
    expect(normaliserSok(sok({ start: "13:30" }), na(13, 30))).toEqual({ sok: sok({ start: "13:30" }) });
  });

  it("13:30 er passert kl. 13:30:01 og blir 13:45", () => {
    expect(normaliserSok(sok({ start: "13:30" }), na(13, 30, 1))).toEqual({
      sok: sok({ start: "13:45" }),
      justering: "Flyttet til 13:45, fordi 13:30 har passert.",
    });
  });

  it("13:30 er passert kl. 13:30:00,5 og blir 13:45", () => {
    expect(normaliserSok(sok({ start: "13:30" }), Date.UTC(2026, 10, 9, 12, 30, 0, 500))).toEqual({
      sok: sok({ start: "13:45" }),
      justering: "Flyttet til 13:45, fordi 13:30 har passert.",
    });
  });

  it("fremtid i dag: 14:00 kl. 13:22 er uendret og uten justering", () => {
    const resultat = normaliserSok(sok({ start: "14:00" }), na(13, 22));
    expect(resultat).toEqual({ sok: sok({ start: "14:00" }) });
    expect("justering" in resultat).toBe(false);
  });

  it("kl. 21:50 blir et passert Søk 22:00 i dag", () => {
    expect(normaliserSok(sok({ start: "21:00" }), na(21, 50))).toEqual({
      sok: sok({ start: "22:00" }),
      justering: "Flyttet til 22:00, fordi 21:00 har passert.",
    });
    expect(normaliserSok(sok({ start: "22:00" }), na(21, 50))).toEqual({ sok: sok({ start: "22:00" }) });
  });

  it("etter 22:00: 21:00 kl. 22:10 blir i morgen 10:00", () => {
    expect(normaliserSok(sok({ start: "21:00" }), na(22, 10))).toEqual({
      sok: sok({ dato: I_MORGEN, start: "10:00" }),
      justering: ETTER_22,
    });
  });

  it("etter 22:00 gjelder fra 22:00:01", () => {
    expect(normaliserSok(sok({ start: "22:00" }), na(22, 0))).toEqual({ sok: sok({ start: "22:00" }) });
    expect(normaliserSok(sok({ start: "22:00" }), na(22, 0, 1))).toEqual({
      sok: sok({ dato: I_MORGEN, start: "10:00" }),
      justering: ETTER_22,
    });
  });

  it("i morgen er uendret, også kl. 22:10 og med tidlig start", () => {
    expect(normaliserSok(sok({ dato: I_MORGEN, start: "07:00" }), na(22, 10))).toEqual({
      sok: sok({ dato: I_MORGEN, start: "07:00" }),
    });
    expect(normaliserSok(sok({ dato: I_MORGEN, start: "06:00" }), na(13, 22))).toEqual({
      sok: sok({ dato: I_MORGEN, start: "06:00" }),
    });
  });

  it.each([
    ["i går", "2026-11-08"],
    ["om to dager", "2026-11-11"],
    ["om tre dager", "2026-11-12"],
    ["et annet år", "2025-11-09"],
  ])("ukjent dato (%s) gir standard-Søket", (_navn, dato) => {
    expect(normaliserSok(sok({ dato }), na(13, 22))).toEqual({
      sok: standard(I_DAG, "13:30"),
      justering: UKJENT_DATO,
    });
  });

  it("ukjent dato etter 22:00 gir standard-Søket for i morgen", () => {
    expect(normaliserSok(sok({ dato: "2026-11-08" }), na(22, 10))).toEqual({
      sok: standard(I_MORGEN, "10:00"),
      justering: UKJENT_DATO,
    });
  });

  it("i dag og i morgen følger Oslo-datoen rett etter midnatt", () => {
    // 00:30 10. november i Oslo er 23:30 9. november i UTC.
    const etterMidnatt = Date.UTC(2026, 10, 9, 23, 30);
    expect(normaliserSok(sok({ dato: "2026-11-10", start: "08:00" }), etterMidnatt)).toEqual({
      sok: sok({ dato: "2026-11-10", start: "08:00" }),
    });
    expect(normaliserSok(sok({ dato: "2026-11-11", start: "08:00" }), etterMidnatt)).toEqual({
      sok: sok({ dato: "2026-11-11", start: "08:00" }),
    });
    expect(normaliserSok(sok({ dato: "2026-11-09" }), etterMidnatt).justering).toBe(UKJENT_DATO);
  });

  it("sommertid: passert tid på dagene tiden skifter", () => {
    // 29. mars 2026 kl. 13:22 i Oslo (UTC+2) og 25. oktober 2026 kl. 13:22 (UTC+1).
    expect(normaliserSok(sok({ dato: "2026-03-29" }), Date.UTC(2026, 2, 29, 11, 22))).toEqual({
      sok: sok({ dato: "2026-03-29", start: "13:30" }),
      justering: "Flyttet til 13:30, fordi 13:00 har passert.",
    });
    expect(normaliserSok(sok({ dato: "2026-10-25" }), Date.UTC(2026, 9, 25, 12, 22))).toEqual({
      sok: sok({ dato: "2026-10-25", start: "13:30" }),
      justering: "Flyttet til 13:30, fordi 13:00 har passert.",
    });
  });

  it("gir alltid et gyldig Søk", () => {
    for (let m = 0; m < 24 * 60; m += 5) {
      const { sok: resultat } = normaliserSok(sok({ start: "06:00" }), na(0, m));
      expect(SokSkjema.safeParse(resultat).success, `minutt ${m}`).toBe(true);
    }
  });
});
