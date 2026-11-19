import { describe, expect, it } from "vitest";
import turerJson from "../../testdata/turer.json";
import { anbefal, erLavtliggende, kortesteTur, rangerTurer, velgTurforslag, type Anbefaling } from "./anbefaling";
import { filtrerTurer, type TurMedTid } from "./filtrering";
import type { Soltider } from "./morke";
import type { Sok } from "./sok";
import { osloTilUtc } from "./tid";
import { TurdatasettSkjema, type Tur } from "./turdata/skjema";
import type { VindusKlasse } from "./vaer/typer";

// FR-15–FR-18 mot testdata/turer.json med faste soltider (NFR-2, AD-16).

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
    expect(forslag(anbefal(turer, sok({ utsikt: true }), SOLTIDER, "god"))).toEqual([
      { id: "tusenarsvarden-fra-damefallet", morke: null },
      { id: "storlihytta-fra-museet", morke: null },
      { id: "skihytta-fra-damefallet", morke: null },
    ]);
  });

  it("UJ-1 kl. 15:00 med 1 t: Storlihytta fra Vardeveien uten Mørkevarsel, så Skihytta og Bergsvatnet med", () => {
    const s = sok({ start: "15:00", tilgjengeligMin: 60, utsikt: true });
    expect(forslag(anbefal(turer, s, SOLTIDER, "god"))).toEqual([
      { id: "storlihytta-fra-vardeveien", morke: null },
      { id: "skihytta-fra-damefallet", morke: "15:59" },
      { id: "bergsvatnet", morke: "15:59" },
    ]);
  });

  it("UJ-2: 14:00, 3 t, Krevende, utsikt gir Storlihytta, Skihytta og Bergsvatnet", () => {
    const s = sok({ start: "14:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true });
    expect(forslag(anbefal(turer, s, SOLTIDER, "god"))).toEqual([
      { id: "storlihytta-fra-museet", morke: null },
      { id: "skihytta-fra-damefallet", morke: null },
      { id: "bergsvatnet", morke: null },
    ]);
  });

  it("UJ-2: Mørkevarselet fjerner ingen Turer, men Turer med varsel står nederst i rangeringen", () => {
    const s = sok({ start: "14:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true });
    const passer = filtrerTurer(turer, s);
    const rangert = rangerTurer(passer, s, SOLTIDER, "god");
    expect(rangert).toHaveLength(passer.length);
    const forsteMedVarsel = rangert.findIndex((r) => r.morkevarsel !== null);
    expect(forsteMedVarsel).toBeGreaterThan(0);
    expect(rangert.slice(forsteMedVarsel).every((r) => r.morkevarsel !== null)).toBe(true);
    // Tusenårsvarden fra Damefallet ender 15:32, etter grensen 15:29.
    expect(rangert.find((r) => r.tur.id === "tusenarsvarden-fra-damefallet")?.morkevarsel?.klokkeslett).toBe("15:59");
  });

  it("variasjon: 10:00, 2 t 30 min, Krevende, utsikt og vann gir Tusenårsvarden fra Grua, Varden og Moldevatnet", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 150, vanskelighetsgrad: "R", utsikt: true, vann: true });
    expect(forslag(anbefal(turer, s, SOLTIDER, "god"))).toEqual([
      { id: "tusenarsvarden-fra-grua", morke: null },
      { id: "varden-fra-sentrum", morke: null },
      { id: "moldevatnet-fra-jensgurilia", morke: null },
    ]);
    // Uten variasjonsregelen ville alle tre gått til Tusenårsvarden.
    const rangert = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER, "god");
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
      "god",
    );
    expect(rangert.map((r) => r.tur.id)).toEqual(["a-lang", "b-lang", "c-kort", "d-uten-treff", "e-morke"]);
  });

  it("treff teller bare Opplevelsespreferanser brukeren har valgt", () => {
    const tur = (utsikt: boolean, vann: boolean): TurMedTid => ({ tur: { ...turer[0], utsikt, vann }, turtidMin: 30 });
    const treff = (t: TurMedTid, utsikt: boolean, vann: boolean) =>
      rangerTurer([t], sok({ utsikt, vann }), SOLTIDER, "god")[0].treff;
    expect(treff(tur(true, true), false, false)).toBe(0);
    expect(treff(tur(true, true), false, true)).toBe(1);
    expect(treff(tur(true, true), true, false)).toBe(1);
    expect(treff(tur(true, true), true, true)).toBe(2);
    expect(treff(tur(false, true), true, false)).toBe(0);
  });

  it("start før soloppgang: alle Turer får Mørkevarsel, og treff avgjør rekkefølgen", () => {
    const s = sok({ start: "07:00", tilgjengeligMin: 60, vanskelighetsgrad: "G", vann: true });
    const rangert = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER, "god");
    expect(rangert.every((r) => r.morkevarsel?.arsak === "soloppgang")).toBe(true);
    expect(rangert.map((r) => r.tur.id)).toEqual([
      "bergsvatnet",
      "midtveishuken",
      "skihytta-fra-damefallet",
      "storlihytta-fra-vardeveien",
    ]);
  });

  it("passer bare én Tur, gir anbefal ett Turforslag og fyller ikke på", () => {
    expect(forslag(anbefal(turer, sok({ tilgjengeligMin: 30, vanskelighetsgrad: "G" }), SOLTIDER, "god"))).toEqual([
      { id: "storlihytta-fra-vardeveien", morke: null },
    ]);
  });

  it("stokket input gir samme rekkefølge hver gang", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 300, vanskelighetsgrad: "R", utsikt: true, vann: true });
    const fasit = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER, "god").map((r) => r.tur.id);
    for (const frø of [1, 2, 3, 42, 2026]) {
      const stokket = stokk(turer, frø);
      expect(rangerTurer(filtrerTurer(stokket, s), s, SOLTIDER, "god").map((r) => r.tur.id)).toEqual(fasit);
      expect(anbefal(stokket, s, SOLTIDER, "god")).toEqual(anbefal(turer, s, SOLTIDER, "god"));
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
    const anbefaling = anbefal(turer, sok({ tilgjengeligMin: 15 }), SOLTIDER, "mangler");
    expect(anbefaling).toMatchObject({
      type: "kortesteTur",
      alternativ: { tur: { id: "storlihytta-fra-vardeveien" }, turtidMin: 16, trengerMerMin: 1, morkevarsel: null },
    });
  });

  it("Mørkevarsel gjelder Alternativet etter samme regel", () => {
    // 15:15 + 16 min = 15:31, etter grensen 15:29.
    const anbefaling = anbefal(turer, sok({ start: "15:15", tilgjengeligMin: 15 }), SOLTIDER, "mangler");
    if (anbefaling.type !== "kortesteTur") throw new Error("Ventet Alternativ.");
    expect(anbefaling.alternativ.morkevarsel?.klokkeslett).toBe("15:59");
    const tidlig = anbefal(turer, sok({ start: "07:00", tilgjengeligMin: 15 }), SOLTIDER, "mangler");
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

describe("rangering i dårlig vær (FR-15, FR-16)", () => {
  type Egenskaper = { turtid?: number; moh?: number; egnet?: boolean | null; utsikt?: boolean; vann?: boolean };

  /** En syntetisk Tur der bare feltene rangeringen ser på, varierer. */
  const t = (id: string, { turtid = 60, moh = 300, egnet = null, utsikt = false, vann = false }: Egenskaper = {}) =>
    ({
      tur: { ...turer[0], id, mal: id, hoyeste_punkt_moh: moh, egnet_darlig_vaer: egnet, utsikt, vann },
      turtidMin: turtid,
    }) satisfies TurMedTid;
  const ider = (passer: TurMedTid[], s: Sok, vaerklasse: VindusKlasse) =>
    rangerTurer(passer, s, SOLTIDER, vaerklasse).map((r) => r.tur.id);
  const s120 = sok({ start: "10:00", tilgjengeligMin: 120 });

  it("UJ-2 dårlig: 10:00, 3 t, Krevende, utsikt gir Moldevatnet fra Jensgurilia som Turforslag 1", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "R", utsikt: true });
    const anbefaling = anbefal(turer, s, SOLTIDER, "darlig");
    if (anbefaling.type !== "turforslag") throw new Error("Ventet Turforslag.");
    expect(anbefaling.forslag[0]).toMatchObject({
      tur: { id: "moldevatnet-fra-jensgurilia" },
      morkevarsel: null,
      lavtliggende: true,
      egnetDarligVaer: true,
      treff: 0,
    });
    expect(forslag(anbefaling)).toEqual([
      { id: "moldevatnet-fra-jensgurilia", morke: null },
      { id: "storlihytta-fra-museet", morke: null },
      { id: "skihytta-fra-damefallet", morke: null },
    ]);
    // I godt vær står den ikke øverst, fordi den ikke har utsikt.
    expect(forslag(anbefal(turer, s, SOLTIDER, "god"))[0].id).not.toBe("moldevatnet-fra-jensgurilia");
  });

  it("egnet før ukjent: Moldevatnet fra Jensgurilia over Bergsvatnet, begge lave og uten Mørkevarsel", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 180, vanskelighetsgrad: "B" });
    const paret = ["moldevatnet-fra-jensgurilia", "bergsvatnet"];
    const begge = filtrerTurer(turer, s).filter((p) => paret.includes(p.tur.id));
    expect(begge).toHaveLength(2);
    const rangert = rangerTurer(begge, s, SOLTIDER, "darlig");
    expect(rangert.map((r) => [r.tur.id, r.lavtliggende, r.egnetDarligVaer, r.morkevarsel])).toEqual([
      ["moldevatnet-fra-jensgurilia", true, true, null],
      ["bergsvatnet", true, null, null],
    ]);
    // På ekte data gir Turtiden samme rekkefølge. Her favoriserer Turtid og ID den ukjente Turen,
    // så bare regelen om Egnet i dårlig vær setter den egnede først.
    expect(ider([t("a-ukjent", { turtid: 110 }), t("b-ja", { turtid: 30, egnet: true })], s120, "darlig")).toEqual([
      "b-ja",
      "a-ukjent",
    ]);
  });

  it("Egnet i dårlig vær: ja før ukjent før nei, foran Turtid og ID", () => {
    const passer = [
      t("a-nei", { turtid: 120, egnet: false }),
      t("b-ukjent", { turtid: 90 }),
      t("c-ja", { turtid: 30, egnet: true }),
    ];
    expect(ider(passer, s120, "darlig")).toEqual(["c-ja", "b-ukjent", "a-nei"]);
    expect(ider(passer, s120, "god")).toEqual(["a-nei", "b-ukjent", "c-ja"]);
  });

  it("lav før høy, foran Egnet i dårlig vær, Turtid og ID", () => {
    const passer = [t("a-hoy", { turtid: 120, moh: 500, egnet: true }), t("b-lav", { turtid: 30, egnet: false })];
    expect(ider(passer, s120, "darlig")).toEqual(["b-lav", "a-hoy"]);
    expect(ider(passer, s120, "god")).toEqual(["a-hoy", "b-lav"]);
    // Lavtliggende slår Egnet i dårlig vær: en høy egnet Tur mot en lav uegnet, ellers like.
    expect(ider([t("a-hoy-ja", { moh: 500, egnet: true }), t("b-lav-nei", { egnet: false })], s120, "darlig")).toEqual([
      "b-lav-nei",
      "a-hoy-ja",
    ]);
  });

  it("vann teller etter Lavtliggende og Egnet i dårlig vær", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 120, vann: true });
    expect(ider([t("a-hoy-vann", { moh: 500, vann: true }), t("b-lav")], s, "darlig")).toEqual(["b-lav", "a-hoy-vann"]);
    expect(ider([t("a-nei-vann", { egnet: false, vann: true }), t("b-ukjent")], s, "darlig")).toEqual([
      "b-ukjent",
      "a-nei-vann",
    ]);
  });

  it("Mørkevarsel først: en høy Tur uten varsel står over en lav med", () => {
    // 13:00 + 150 min = 15:30, etter grensen 15:29.
    const s = sok({ start: "13:00", tilgjengeligMin: 150 });
    const passer = [t("a-lav-morke", { turtid: 150, moh: 200, egnet: true }), t("b-hoy", { moh: 600, egnet: false })];
    const rangert = rangerTurer(passer, s, SOLTIDER, "darlig");
    expect(rangert.map((r) => [r.tur.id, r.morkevarsel?.klokkeslett ?? null])).toEqual([
      ["b-hoy", null],
      ["a-lav-morke", "15:59"],
    ]);
  });

  it("har alle Turer Mørkevarsel, står den lave likevel først", () => {
    // 13:00 + 150 min = 15:30, etter grensen 15:29, for begge.
    const s = sok({ start: "13:00", tilgjengeligMin: 150 });
    const passer = [t("a-hoy", { turtid: 150, moh: 500 }), t("b-lav", { turtid: 150 })];
    const rangert = rangerTurer(passer, s, SOLTIDER, "darlig");
    expect(rangert.every((r) => r.morkevarsel !== null)).toBe(true);
    expect(rangert.map((r) => r.tur.id)).toEqual(["b-lav", "a-hoy"]);
    expect(ider(passer, s, "god")).toEqual(["a-hoy", "b-lav"]);
  });

  it("den korteste Turen er den samme i dårlig og godt vær", () => {
    const s = sok({ tilgjengeligMin: 15 });
    const darlig = anbefal(turer, s, SOLTIDER, "darlig");
    expect(darlig.type).toBe("kortesteTur");
    expect(darlig).toEqual(anbefal(turer, s, SOLTIDER, "god"));
  });

  it("utsikt teller ikke: rekkefølgen avgjøres av Turtid og ID", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 120, utsikt: true });
    const passer = [t("a-utsikt", { turtid: 60, utsikt: true }), t("b-uten", { turtid: 110 })];
    expect(ider(passer, s, "darlig")).toEqual(["b-uten", "a-utsikt"]);
    expect(ider(passer, s, "god")).toEqual(["a-utsikt", "b-uten"]);
    // Lik Turtid: ID avgjør, ikke utsikt.
    expect(ider([t("b-utsikt", { utsikt: true }), t("a-uten")], s, "darlig")).toEqual(["a-uten", "b-utsikt"]);
    // `treff` er fortsatt med utsikt, fordi Turkortet viser det.
    expect(rangerTurer(passer, s, SOLTIDER, "darlig").map((r) => r.treff)).toEqual([0, 1]);
  });

  it("vann teller: Turen med vann først, men bare når brukeren har valgt vann", () => {
    const passer = [t("a-utsikt", { turtid: 110, utsikt: true }), t("b-vann", { turtid: 60, vann: true })];
    const medVann = sok({ start: "10:00", tilgjengeligMin: 120, utsikt: true, vann: true });
    expect(ider(passer, medVann, "darlig")).toEqual(["b-vann", "a-utsikt"]);
    expect(ider(passer, { ...medVann, vann: false }, "darlig")).toEqual(["a-utsikt", "b-vann"]);
  });

  it("grense: 399 moh er lavtliggende, 400 moh er ikke", () => {
    expect(erLavtliggende({ hoyeste_punkt_moh: 399 })).toBe(true);
    expect(erLavtliggende({ hoyeste_punkt_moh: 400 })).toBe(false);
    const rangert = rangerTurer([t("a-400", { moh: 400 }), t("b-399", { moh: 399 })], s120, SOLTIDER, "darlig");
    expect(rangert.map((r) => [r.tur.id, r.lavtliggende])).toEqual([
      ["b-399", true],
      ["a-400", false],
    ]);
  });

  it("frarådet rangeres som dårlig", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 300, vanskelighetsgrad: "R", utsikt: true, vann: true });
    const passer = filtrerTurer(turer, s);
    expect(ider(passer, s, "fraradet")).toEqual(ider(passer, s, "darlig"));
    expect(ider(passer, s, "fraradet")).not.toEqual(ider(passer, s, "god"));
  });

  it("god, middels og mangler gir samme rangering og samme Turforslag", () => {
    const uj1 = sok({ utsikt: true });
    expect(anbefal(turer, uj1, SOLTIDER, "middels")).toEqual(anbefal(turer, uj1, SOLTIDER, "god"));
    expect(anbefal(turer, uj1, SOLTIDER, "mangler")).toEqual(anbefal(turer, uj1, SOLTIDER, "god"));
    for (const start of ["07:00", "10:00", "13:30", "15:00"]) {
      for (const tilgjengeligMin of [30, 60, 120, 180, 300]) {
        for (const [utsikt, vann] of [[false, false], [true, false], [false, true], [true, true]]) {
          const s = sok({ start, tilgjengeligMin, vanskelighetsgrad: "R", utsikt, vann });
          const passer = filtrerTurer(turer, s);
          const god = ider(passer, s, "god");
          expect(ider(passer, s, "middels")).toEqual(god);
          expect(ider(passer, s, "mangler")).toEqual(god);
        }
      }
    }
  });

  it("ingen Turer fjernes: rangerTurer gir like mange Turer som filtrerTurer", () => {
    for (const tilgjengeligMin of [30, 120, 180, 300]) {
      const s = sok({ start: "10:00", tilgjengeligMin, vanskelighetsgrad: "R", utsikt: true });
      const passer = filtrerTurer(turer, s);
      expect(rangerTurer(passer, s, SOLTIDER, "darlig")).toHaveLength(passer.length);
    }
  });

  it("stokket input gir samme rekkefølge i dårlig vær", () => {
    const s = sok({ start: "10:00", tilgjengeligMin: 300, vanskelighetsgrad: "R", utsikt: true, vann: true });
    const fasit = rangerTurer(filtrerTurer(turer, s), s, SOLTIDER, "darlig").map((r) => r.tur.id);
    for (const frø of [1, 2, 3, 42, 2026]) {
      const stokket = stokk(turer, frø);
      expect(rangerTurer(filtrerTurer(stokket, s), s, SOLTIDER, "darlig").map((r) => r.tur.id)).toEqual(fasit);
      expect(anbefal(stokket, s, SOLTIDER, "darlig")).toEqual(anbefal(turer, s, SOLTIDER, "darlig"));
    }
  });
});
