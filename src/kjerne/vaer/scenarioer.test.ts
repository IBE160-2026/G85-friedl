import { describe, expect, it } from "vitest";
import { leggTilDager, osloTilUtc, TIME_MS } from "../tid";
import { TESTSCENARIOER } from "./testscenarioer";
import type { Vaermelding } from "./typer";
import { klasseForTidsvindu, klasseForTime } from "./vaerklasse";

// Værklassene i Værscenarioene (story 2.3, AD-13): de samme filene som Demomodus bruker.
// Testene sjekker at scenarioene gir brukerreisene UJ-1, UJ-2 og UJ-3 og `ingen-bedre`.

const { "uj-1": uj1, "uj-2": uj2, "uj-3": uj3, "ingen-bedre": ingenBedre } = TESTSCENARIOER;

/** Værklassen for Tidsvinduet `fra`–`til` (norsk tid) på `dato`. */
function klasse(melding: Vaermelding, dato: string, fra: string, til: string) {
  return klasseForTidsvindu(melding, osloTilUtc(dato, fra), osloTilUtc(dato, til));
}

/** Timene i Værmeldingen som overlapper `fra`–`til` på `dato`. */
function timer(melding: Vaermelding, dato: string, fra: string, til: string) {
  const start = osloTilUtc(dato, fra);
  const slutt = osloTilUtc(dato, til);
  return melding.timer.filter((t) => t.startUtc + TIME_MS > start && t.startUtc < slutt);
}

/** Hver time fra `fra` (inklusiv) til `til` (eksklusiv) på `dato`, som epoke-ms. */
function heleTimer(dato: string, fra: number, til: number) {
  return Array.from({ length: til - fra }, (_, i) => osloTilUtc(dato, `${String(fra + i).padStart(2, "0")}:00`));
}

describe("felles for scenarioene", () => {
  it.each(Object.entries(TESTSCENARIOER))("%s: én time per time uten hull, fra timen «nå» ligger i", (_id, s) => {
    const starter = s.vaermelding.timer.map((t) => t.startUtc);
    expect(starter[0]).toBe(Math.floor(s.na / TIME_MS) * TIME_MS);
    for (let i = 1; i < starter.length; i++) expect(starter[i] - starter[i - 1]).toBe(TIME_MS);
    for (const t of s.vaermelding.timer) expect(t.symbolKode).toMatch(/^[a-z]+(_day|_night)?$/);
  });
});

describe("UJ-1: god ettermiddag mandag 9. november", () => {
  it("13:30–15:30 og 15:00–16:00 er god", () => {
    expect(klasse(uj1.vaermelding, "2026-11-09", "13:30", "15:30")).toBe("god");
    expect(klasse(uj1.vaermelding, "2026-11-09", "15:00", "16:00")).toBe("god");
  });

  it("hele 9. og 10. november er oppholdsvær og lite vind, 3–5 °C", () => {
    expect(uj1.na).toBe(osloTilUtc("2026-11-09", "13:30"));
    expect(uj1.vaermelding.timer.at(-1)!.startUtc).toBe(osloTilUtc("2026-11-10", "23:00"));
    for (const t of uj1.vaermelding.timer) {
      expect(klasseForTime(t)).toBe("god");
      expect(t.nedborMmT).toBeLessThan(0.1);
      expect(t.vindMs).toBeLessThan(5.5);
      expect(t.tempC).toBeGreaterThanOrEqual(3);
      expect(t.tempC).toBeLessThanOrEqual(5);
    }
    const iVinduet = timer(uj1.vaermelding, "2026-11-09", "13:30", "15:30").map((t) => t.tempC);
    expect([Math.min(...iVinduet), Math.max(...iVinduet)]).toEqual([3, 5]);
  });
});

describe("UJ-2: søndag kveld, dårlig formiddag i morgen og bedre fra kl. 14", () => {
  it("formiddagen 10:00–13:00 er dårlig", () => {
    expect(klasse(uj2.vaermelding, "2026-11-09", "10:00", "13:00")).toBe("darlig");
  });

  it("14:00–17:00 er god, men 13:00–16:00 er dårlig", () => {
    expect(klasse(uj2.vaermelding, "2026-11-09", "14:00", "17:00")).toBe("god");
    expect(klasse(uj2.vaermelding, "2026-11-09", "13:00", "16:00")).toBe("darlig");
  });

  it("8. nov. er middels til midnatt, 9. nov. er dårlig til 14:00 og god resten av dagen", () => {
    expect(uj2.na).toBe(osloTilUtc("2026-11-08", "20:00"));
    for (const t of uj2.vaermelding.timer) {
      if (t.startUtc < osloTilUtc("2026-11-09", "00:00")) {
        expect(klasseForTime(t)).toBe("middels");
      } else if (t.startUtc < osloTilUtc("2026-11-09", "14:00")) {
        expect(klasseForTime(t)).toBe("darlig");
        const nedbor = t.nedborMmT >= 2 && t.nedborMmT <= 3.5;
        const vind = t.vindMs >= 10.8 && t.vindMs <= 13;
        expect(nedbor || vind).toBe(true);
      } else if (t.startUtc < osloTilUtc("2026-11-10", "00:00")) {
        expect(klasseForTime(t)).toBe("god");
      }
    }
    expect(uj2.vaermelding.timer.at(-1)!.startUtc).toBe(osloTilUtc("2026-11-10", "23:00"));
  });

  it("det tidligste vinduet på 2 t som er bedre enn dårlig, starter 14:00", () => {
    const forste = heleTimer("2026-11-09", 6, 23).find(
      (start) => klasseForTidsvindu(uj2.vaermelding, start, start + 2 * TIME_MS) !== "darlig",
    );
    expect(forste).toBe(osloTilUtc("2026-11-09", "14:00"));
  });
});

describe("UJ-3: lørdag formiddag med sterk kuling, bedre i morgen fra kl. 11", () => {
  it("14. nov. 10:00–12:00 er frarådet, med største vind 19,0 m/s", () => {
    expect(klasse(uj3.vaermelding, "2026-11-14", "10:00", "12:00")).toBe("fraradet");
    expect(Math.max(...timer(uj3.vaermelding, "2026-11-14", "10:00", "12:00").map((t) => t.vindMs))).toBe(19);
  });

  it("15. nov. 11:00–13:00 er god, og 10:00–12:00 er frarådet", () => {
    expect(klasse(uj3.vaermelding, "2026-11-15", "11:00", "13:00")).toBe("god");
    expect(klasse(uj3.vaermelding, "2026-11-15", "10:00", "12:00")).toBe("fraradet");
  });

  it("frarådet av vinden (17,2–19,0 m/s) fra «nå» til og med timen 10:00–11:00 i morgen, så god", () => {
    expect(uj3.na).toBe(osloTilUtc("2026-11-14", "10:00"));
    const bedre = osloTilUtc("2026-11-15", "11:00");
    for (const t of uj3.vaermelding.timer) {
      expect(t.vindMs).toBeLessThanOrEqual(19);
      if (t.startUtc < bedre) {
        expect(klasseForTime(t)).toBe("fraradet");
        expect(t.vindMs).toBeGreaterThanOrEqual(17.2);
      } else {
        expect(klasseForTime(t)).toBe("god");
      }
    }
  });
});

describe("ingen-bedre: dårlig vær i dag og i morgen", () => {
  it("hvert vindu på 2 t fra 06 til 22 den 9. og 10. nov. er dårlig, aldri bedre", () => {
    expect(ingenBedre.na).toBe(osloTilUtc("2026-11-09", "10:00"));
    let darlige = 0;
    for (const dato of ["2026-11-09", leggTilDager("2026-11-09", 1)]) {
      for (const start of heleTimer(dato, 6, 23)) {
        const k = klasseForTidsvindu(ingenBedre.vaermelding, start, start + 2 * TIME_MS);
        // Værmeldingen starter i timen «nå» ligger i, som MET. Passerte Starttidspunkter har ingen data.
        if (start < ingenBedre.na) {
          expect(k).toBe("mangler");
        } else {
          expect(k).toBe("darlig");
          darlige++;
        }
      }
    }
    expect(darlige).toBe(13 + 17);
  });

  it("ingen time er frarådet, og hver time er dårlig", () => {
    for (const t of ingenBedre.vaermelding.timer) expect(klasseForTime(t)).toBe("darlig");
  });
});
