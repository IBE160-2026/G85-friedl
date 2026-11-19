import { describe, expect, it } from "vitest";
import { VAERTERSKLER, type Vaerterskler } from "./vaer/terskler";
import { LITE_VIND_UNDER_MS, nedborOrd, OPPHOLD_UNDER_MM_T, vaerord, vindOrd } from "./vaerord";

// Værordene (story 2.7, FR-20) etter tabellen Værord i EXPERIENCE.md. Grensene fra middels og opp
// kommer fra data/vaerterskler.json, og egne terskler viser at de ikke står som tall i koden.

describe("nedborOrd", () => {
  it.each([
    [0, "oppholdsvær"],
    [0.09, "oppholdsvær"],
    [0.1, "lite nedbør"],
    [0.4, "lite nedbør"],
    [0.5, "noe nedbør"],
    [1.9, "noe nedbør"],
    [2, "nedbør opptil 2 mm/t"],
    [3.5, "nedbør opptil 3,5 mm/t"],
    [10, "nedbør opptil 10 mm/t"],
  ])("%s mm/t er «%s»", (mm, ord) => {
    expect(nedborOrd(mm)).toBe(ord);
  });
});

describe("vindOrd", () => {
  it.each([
    [0, "lite vind"],
    [5.4, "lite vind"],
    [5.5, "noe vind"],
    [7.9, "noe vind"],
    [8, "frisk vind"],
    [10.7, "frisk vind"],
    [10.8, "vind opp mot 10,8 m/s"],
    [17.1, "vind opp mot 17,1 m/s"],
    [17.2, "sterk kuling, vind opp mot 17,2 m/s"],
    [19, "sterk kuling, vind opp mot 19 m/s"],
  ])("%s m/s er «%s»", (ms, ord) => {
    expect(vindOrd(ms)).toBe(ord);
  });
});

describe("vaerord", () => {
  it("UJ-1: «oppholdsvær og lite vind»", () => {
    expect(vaerord(0, 4.5)).toBe("oppholdsvær og lite vind");
  });

  it("UJ-2-eksempelet: «nedbør opptil 3,5 mm/t og frisk vind»", () => {
    expect(vaerord(3.5, 9)).toBe("nedbør opptil 3,5 mm/t og frisk vind");
  });
});

describe("grensene", () => {
  it("under laveste terskel eies av vaerord.ts", () => {
    expect(OPPHOLD_UNDER_MM_T).toBe(0.1);
    expect(LITE_VIND_UNDER_MS).toBe(5.5);
  });

  it("grensene under laveste terskel er under middels i data/vaerterskler.json", () => {
    const middels = VAERTERSKLER.klasser.find((k) => k.klasse === "middels");
    expect(middels?.nedbor_mm_t_minst).not.toBeNull();
    expect(middels?.vind_ms_minst).not.toBeNull();
    expect(OPPHOLD_UNDER_MM_T).toBeLessThan(middels?.nedbor_mm_t_minst ?? Number.NaN);
    expect(LITE_VIND_UNDER_MS).toBeLessThan(middels?.vind_ms_minst ?? Number.NaN);
  });

  /** Tersklene i fila med én grense byttet ut. */
  function med(klasse: string, felt: "nedbor_mm_t_minst" | "vind_ms_minst", verdi: number | null): Vaerterskler {
    return {
      ...VAERTERSKLER,
      klasser: VAERTERSKLER.klasser.map((k) => (k.klasse === klasse ? { ...k, [felt]: verdi } : k)),
    };
  }

  it("egne terskler med middels på 1 mm/t gir «noe nedbør» fra 1", () => {
    const terskler = med("middels", "nedbor_mm_t_minst", 1);
    expect(nedborOrd(0.5, terskler)).toBe("lite nedbør");
    expect(nedborOrd(0.99, terskler)).toBe("lite nedbør");
    expect(nedborOrd(1, terskler)).toBe("noe nedbør");
    expect(vaerord(1, 0, terskler)).toBe("noe nedbør og lite vind");
  });

  it("dårlig og frarådet for vind følger tersklene", () => {
    expect(vindOrd(12, med("darlig", "vind_ms_minst", 12))).toBe("vind opp mot 12 m/s");
    expect(vindOrd(11.9, med("darlig", "vind_ms_minst", 12))).toBe("frisk vind");
    expect(vindOrd(16, med("fraradet", "vind_ms_minst", 16))).toBe("sterk kuling, vind opp mot 16 m/s");
  });

  it("dårlig for nedbør følger tersklene, og frarådet gir samme ord", () => {
    expect(nedborOrd(2.5, med("darlig", "nedbor_mm_t_minst", 3))).toBe("noe nedbør");
    expect(nedborOrd(12, med("darlig", "nedbor_mm_t_minst", null))).toBe("nedbør opptil 12 mm/t");
  });

  it("en grense som er null, gir ikke båndet", () => {
    expect(vindOrd(20, med("fraradet", "vind_ms_minst", null))).toBe("vind opp mot 20 m/s");
  });

  it("ingen ord inneholder «trygg» eller «trygt»", () => {
    const ord = [0, 0.1, 0.5, 2, 10, 25].map((mm) => nedborOrd(mm));
    ord.push(...[0, 5.5, 8, 10.8, 17.2, 30].map((ms) => vindOrd(ms)));
    expect(ord.filter((o) => /trygg|trygt/i.test(o))).toEqual([]);
  });
});
