import { describe, expect, it } from "vitest";
import turerJson from "../../testdata/turer.json";
import { anbefal, kortesteTur, rangerTurer, velgTurforslag, type Anbefaling } from "./anbefaling";
import { filtrerTurer, type TurMedTid } from "./filtrering";
import type { Soltider } from "./morke";
import type { Sok } from "./sok";
import { osloTilUtc } from "./tid";
import { TurdatasettSkjema, type Tur } from "./turdata/skjema";

// FR-16–FR-18 mot testdata/turer.json med faste soltider (NFR-2, AD-16).

const { turer } = TurdatasettSkjema.parse(turerJson);
const DATO = "2026-11-09";
const SOLTIDER: Soltider = { [DATO]: { oppUtc: osloTilUtc(DATO, "08:30"), nedUtc: osloTilUtc(DATO, "15:59") } };

const sok = (overstyr: Partial<Sok>): Sok => ({
  dato: DATO,
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
  ...overstyr,
});

function forslag(anbefaling: Anbefaling) {
  if (anbefaling.type !== "turforslag") throw new Error(`Ventet Turforslag, fikk ${anbefaling.type}.`);
  return anbefaling.forslag.map((f) => ({ id: f.tur.id, morke: f.morkevarsel?.klokkeslett ?? null }));
}

/**
 * Deterministisk stokking (Fisher–Yates med Park–Miller-generatoren), så testen er lik hver gang.
 * 48271 × (2^31 − 1) er under 2^53, så regningen er eksakt i flyttall.
 */
function stokk<T>(liste: readonly T[], frø: number): T[] {
  const ut = [...liste];
  let s = frø;
  for (let i = ut.length - 1; i > 0; i--) {
    s = (s * 48271) % 2147483647;
    const j = s % (i + 1);
    [ut[i], ut[j]] = [ut[j], ut[i]];
  }
  return ut;
}

describe("rangering og utvalg (FR-16, FR-17)", () => {
  it("UJ-1: 13:30, 2 t, Middels, utsikt gir Tusenårsvarden, Storlihytta og Skihytta uten Mørkevarsel", () => {
    expect(forslag(anbefal(turer, sok({ utsikt: true }), SOLTIDER))).toEqual([
      { id: "tusenarsvarden-fra-damefallet", morke: null },
      { id: "storlihytta-fra-museet", morke: null },
      { id: "skihytta-fra-damefallet", morke: null },
    ]);
  });

  it("UJ-1 kl. 15:00 med 1 t: Storlihytta fra Vardeveien uten Mørkevarsel, så Skihytta og Bergsvatnet med", () => {
    expect(forslag(anbefal(turer, sok({ start: "15:00", tilgjengeligMin: 60, utsikt: true }), SOLTIDER))).toEqual([
      { id: "storlihytta-fra-vardeveien", morke: null },
      { id: "skihytta-fra-damefallet", morke: "15:59" },
      { id: "bergsvatnet", morke: "15:59" },
    ]);
  });

  it("UJ-2: 14:00, 3 t, Krevende, utsikt gir Storlihytta, Skihytta og Bergsvatnet", () => {
    expect(
      forslag(anbefal(turer, sok({ start: "14:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true }), SOLTIDER)),
    ).toEqual([
      { id: "storlihytta-fra-museet", morke: null },
      { id: "skihytta-fra-damefallet", morke: null },
      { id: "bergsvatnet", morke: null },
    ]);
  });

  it("UJ-2: Mørkevarselet fjerner ingen Turer, men Turer med varsel står nederst i rangeringen", () => {
    const s = sok({ start: "14:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true });
    const passer = filtrerTurer(turer, s);
    const rangert = rangerTurer(passer, s, SOLTIDER);
    expect(rangert).toHaveLength(passer.length);
    const forsteMedVarsel = rangert.findIndex((r) => r.morkevarsel !== null);
    expect(forsteMedVarsel).toBeGreaterThan(0);
    expect(rangert.slice(forsteMedVarsel).every((r) => r.morkevarsel !== null)).toBe(true);
    // Tusenårsvarden fra Damefallet ender 15:32, etter grensen 15:29.
    expect(rangert.find((r) => r.tur.id === "tusenarsvarden-fra-damefallet")?.morkevarsel?.klokkeslett).toBe("15:59");
  });

  it("variasjon: 10:00, 2 t 30 min, Krevende, utsikt og vann gir Tusenårsvarden fra Grua, Varden og Moldevatnet", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 150, vanskelighetsgrad: "R", utsikt: true, vann: true });
    expect(forslag(anbefal(turer, s, SOLTIDER))).toEqual([
      { id: "tusenarsvarden-fra-grua", morke: null },
      { id: "varden-fra-sentrum", morke: null },
      { id: "moldevatnet-fra-jensgurilia", morke: null },
    ]);
    // Uten variasjonsregelen ville alle tre gått til Tusenårsvarden.
    const rangert = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER);
    expect(rangert.slice(0, 3).map((r) => r.tur.mal)).toEqual(["Tusenårsvarden", "Tusenårsvarden", "Tusenårsvarden"]);
  });

  it("rangeringskriteriene i rekkefølge: Mørkevarsel, treff, Turtid nærmest, ID", () => {
    const t = (id: string, turtid: number, utsikt = false): TurMedTid => ({
      tur: { ...turer[0], id, mal: id, utsikt, vann: false },
      turtidMin: turtid,
    });
    const s = sok({ start: "13:00", tilgjengeligMin: 150, utsikt: true });
    // Grensen er 15:29: 13:00 + 150 min = 15:30 gir Mørkevarsel.
    const rangert = rangerTurer(
      [t("e-morke", 150, true), t("d-uten-treff", 120), t("c-kort", 30, true), t("b-lang", 120, true), t("a-lang", 120, true)],
      s,
      SOLTIDER,
    );
    expect(rangert.map((r) => r.tur.id)).toEqual(["a-lang", "b-lang", "c-kort", "d-uten-treff", "e-morke"]);
  });

  it("treff teller bare Opplevelsespreferanser brukeren har valgt", () => {
    const tur = (utsikt: boolean, vann: boolean): TurMedTid => ({ tur: { ...turer[0], utsikt, vann }, turtidMin: 30 });
    const treff = (t: TurMedTid, utsikt: boolean, vann: boolean) =>
      rangerTurer([t], sok({ utsikt, vann }), SOLTIDER)[0].treff;
    expect(treff(tur(true, true), false, false)).toBe(0);
    expect(treff(tur(true, true), false, true)).toBe(1);
    expect(treff(tur(true, true), true, false)).toBe(1);
    expect(treff(tur(true, true), true, true)).toBe(2);
    expect(treff(tur(false, true), true, false)).toBe(0);
  });

  it("start før soloppgang: alle Turer får Mørkevarsel, og treff avgjør rekkefølgen", () => {
    const s = sok({ start: "07:00", tilgjengeligMin: 60, vanskelighetsgrad: "G", vann: true });
    const rangert = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER);
    expect(rangert.every((r) => r.morkevarsel?.arsak === "soloppgang")).toBe(true);
    expect(rangert.map((r) => r.tur.id)).toEqual([
      "bergsvatnet",
      "midtveishuken",
      "skihytta-fra-damefallet",
      "storlihytta-fra-vardeveien",
    ]);
  });

  it("passer bare én Tur, gir anbefal ett Turforslag og fyller ikke på", () => {
    expect(forslag(anbefal(turer, sok({ tilgjengeligMin: 30, vanskelighetsgrad: "G" }), SOLTIDER))).toEqual([
      { id: "storlihytta-fra-vardeveien", morke: null },
    ]);
  });

  it("stokket input gir samme rekkefølge hver gang", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 300, vanskelighetsgrad: "R", utsikt: true, vann: true });
    const fasit = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER).map((r) => r.tur.id);
    for (const frø of [1, 2, 3, 42, 2026]) {
      const stokket = stokk(turer, frø);
      expect(rangerTurer(filtrerTurer(stokket, s), s, SOLTIDER).map((r) => r.tur.id)).toEqual(fasit);
      expect(anbefal(stokket, s, SOLTIDER)).toEqual(anbefal(turer, s, SOLTIDER));
    }
  });
});

describe("velgTurforslag (FR-17)", () => {
  const t = (id: string, mal: string): TurMedTid => ({ tur: { ...turer[0], id, mal } as Tur, turtidMin: 30 });

  it("passer to Turer, vises to, og listen fylles ikke på", () => {
    const rangert = [t("a", "X"), t("b", "Y")];
    expect(velgTurforslag(rangert).map((v) => v.tur.id)).toEqual(["a", "b"]);
  });

  it("tre Turer der to har samme Mål: alle tre, med det andre Målet som nummer to", () => {
    const rangert = [t("a1", "A"), t("a2", "A"), t("b1", "B")];
    expect(velgTurforslag(rangert).map((v) => v.tur.id)).toEqual(["a1", "b1", "a2"]);
  });

  it("flere enn tre Mål: de tre første Målene i rangeringen", () => {
    const rangert = [t("a", "A"), t("b", "B"), t("b2", "B"), t("c", "C"), t("d", "D")];
    expect(velgTurforslag(rangert).map((v) => v.tur.id)).toEqual(["a", "b", "c"]);
  });

  it("variasjonsregelen gir aldri færre Turforslag enn rangeringen alene", () => {
    const rangert = [t("a1", "A"), t("a2", "A"), t("a3", "A"), t("a4", "A")];
    expect(velgTurforslag(rangert).map((v) => v.tur.id)).toEqual(["a1", "a2", "a3"]);
    expect(velgTurforslag([])).toEqual([]);
  });
});

describe("den korteste Turen (FR-18)", () => {
  it("15 min gir Storlihytta fra Vardeveien (16 min), som trenger 1 min mer", () => {
    const anbefaling = anbefal(turer, sok({ tilgjengeligMin: 15 }), SOLTIDER);
    expect(anbefaling).toMatchObject({
      type: "kortesteTur",
      alternativ: { tur: { id: "storlihytta-fra-vardeveien" }, turtidMin: 16, trengerMerMin: 1, morkevarsel: null },
    });
  });

  it("Mørkevarsel gjelder Alternativet etter samme regel", () => {
    // 15:15 + 16 min = 15:31, etter grensen 15:29.
    const anbefaling = anbefal(turer, sok({ start: "15:15", tilgjengeligMin: 15 }), SOLTIDER);
    if (anbefaling.type !== "kortesteTur") throw new Error("Ventet Alternativ.");
    expect(anbefaling.alternativ.morkevarsel?.klokkeslett).toBe("15:59");
    const tidlig = anbefal(turer, sok({ start: "07:00", tilgjengeligMin: 15 }), SOLTIDER);
    if (tidlig.type !== "kortesteTur") throw new Error("Ventet Alternativ.");
    expect(tidlig.alternativ.morkevarsel).toMatchObject({ arsak: "soloppgang", klokkeslett: "08:30" });
  });

  it("velger innenfor valgt Vanskelighetsgrad, og lik Turtid avgjøres på ID", () => {
    const kort = (id: string, gradering: Tur["gradering"], km: number): Tur => ({
      ...turer[0],
      id,
      gradering,
      lengde_km_totalt: km,
      hoydemeter: 0,
    });
    const liste = [kort("r-kortest", "R", 1), kort("b-lik", "B", 2), kort("a-lik", "B", 2)];
    expect(kortesteTur(liste, sok({ tilgjengeligMin: 15 }), SOLTIDER).tur.id).toBe("a-lik");
    expect(kortesteTur(liste, sok({ tilgjengeligMin: 15, vanskelighetsgrad: "R" }), SOLTIDER).tur.id).toBe("r-kortest");
  });

  it("kaster når ingen Tur har en Vanskelighetsgrad som passer", () => {
    const bareR = turer.filter((t) => t.gradering === "R");
    expect(() => kortesteTur(bareR, sok({ vanskelighetsgrad: "G" }), SOLTIDER)).toThrow(/Vanskelighetsgrad G/);
  });
});
