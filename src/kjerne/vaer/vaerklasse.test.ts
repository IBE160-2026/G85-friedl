import { describe, expect, it } from "vitest";
import { z } from "zod";
import fasitJson from "../../../testdata/vaerklasse-fasit.json";
import { TIME_MS, timerITidsvindu } from "../tid";
import { lesVaerterskler, VAERTERSKLER, type Vaerterskler } from "./terskler";
import type { Vaermelding } from "./typer";
import { klasseForTidsvindu, klasseForTime } from "./vaerklasse";

// Fasiten i testdata/vaerklasse-fasit.json er språknøytral: Vitest kjører den her,
// og scripts/kalibrering_vaerlogg.py --selvtest skal kjøre den samme (story 2.2).
// Fasiten bruker ASCII-navnene (`fraradet`, `darlig`). Skriptets `frarådet` og `dårlig`
// må oversettes til dem i story 2.2.

const Klasse = z.enum(["god", "middels", "darlig", "fraradet"]);
const Iso = z.iso.datetime({ offset: true });
const Verdier = { nedborMmT: z.number(), vindMs: z.number(), tempC: z.number() };

const FasitSkjema = z
  .object({
    timer: z.array(
      z.object({ beskrivelse: z.string(), ...Verdier, klasse: Klasse }).strict(),
    ),
    tidsvinduer: z.array(
      z
        .object({
          beskrivelse: z.string(),
          start: Iso,
          slutt: Iso,
          timer: z.array(z.object({ start: Iso, ...Verdier }).strict()),
          klasse: z.union([Klasse, z.literal("mangler")]),
        })
        .strict(),
    ),
  })
  .strict();

const fasit = FasitSkjema.parse(fasitJson);
type Vindu = (typeof fasit.tidsvinduer)[number];

const ms = (iso: string) => Date.parse(iso);

const melding = (vindu: Vindu): Vaermelding => ({
  timer: vindu.timer.map((t) => ({
    startUtc: ms(t.start),
    nedborMmT: t.nedborMmT,
    vindMs: t.vindMs,
    tempC: t.tempC,
    symbolKode: null,
  })),
});

const vinduKlasse = (vindu: Vindu, terskler?: Vaerterskler) =>
  klasseForTidsvindu(melding(vindu), ms(vindu.start), ms(vindu.slutt), terskler);

describe("timerITidsvindu", () => {
  const t = (iso: string) => ms(iso);

  it("tar med timene som overlapper vinduet (13:30–15:30 gir 13, 14 og 15)", () => {
    expect(timerITidsvindu(t("2026-11-09T13:30:00+01:00"), t("2026-11-09T15:30:00+01:00"))).toEqual([
      t("2026-11-09T13:00:00+01:00"),
      t("2026-11-09T14:00:00+01:00"),
      t("2026-11-09T15:00:00+01:00"),
    ]);
  });

  it("tar ikke med timen som starter når vinduet slutter (10:00–12:00 gir 10 og 11)", () => {
    expect(timerITidsvindu(t("2026-11-09T10:00:00+01:00"), t("2026-11-09T12:00:00+01:00"))).toEqual([
      t("2026-11-09T10:00:00+01:00"),
      t("2026-11-09T11:00:00+01:00"),
    ]);
  });

  it("går over midnatt (22:00 med 5 t gir 22–02)", () => {
    const timer = timerITidsvindu(t("2026-11-09T22:00:00+01:00"), t("2026-11-10T03:00:00+01:00"));
    expect(timer).toHaveLength(5);
    expect(timer[4]).toBe(t("2026-11-10T02:00:00+01:00"));
  });

  it("gir én time for et kort vindu inne i timen og ingen for et tomt vindu", () => {
    expect(timerITidsvindu(t("2026-11-09T13:15:00+01:00"), t("2026-11-09T13:30:00+01:00"))).toEqual([
      t("2026-11-09T13:00:00+01:00"),
    ]);
    expect(timerITidsvindu(t("2026-11-09T13:30:00+01:00"), t("2026-11-09T13:30:00+01:00"))).toEqual([]);
    expect(timerITidsvindu(t("2026-11-09T14:00:00+01:00"), t("2026-11-09T13:00:00+01:00"))).toEqual([]);
  });

  it("gir hele timer i UTC", () => {
    const timer = timerITidsvindu(t("2026-03-29T00:30:00+01:00"), t("2026-03-29T05:00:00+02:00"));
    expect(timer).toHaveLength(4);
    for (const time of timer) {
      expect(time % TIME_MS).toBe(0);
    }
  });
});

describe("fasiten: Værklasse per time (FR-8)", () => {
  it.each(fasit.timer)("$beskrivelse", (rad) => {
    expect(klasseForTime(rad)).toBe(rad.klasse);
  });
});

describe("fasiten: Værklasse for Tidsvinduet (FR-9)", () => {
  it.each(fasit.tidsvinduer)("$beskrivelse", (vindu) => {
    expect(vinduKlasse(vindu)).toBe(vindu.klasse);
  });
});

describe("klasseForTidsvindu", () => {
  it("lar den dårligste vinne når samme time står to ganger", () => {
    const start = ms("2026-11-09T13:00:00+01:00");
    const time = { startUtc: start, tempC: 5, vindMs: 3, symbolKode: null };
    const dobbel: Vaermelding = {
      timer: [
        { ...time, nedborMmT: 0 },
        { ...time, nedborMmT: 2.5 },
      ],
    };
    expect(klasseForTidsvindu(dobbel, start, start + TIME_MS)).toBe("darlig");
    const speilet: Vaermelding = { timer: [...dobbel.timer].reverse() };
    expect(klasseForTidsvindu(speilet, start, start + TIME_MS)).toBe("darlig");
  });

  it("gir mangler for en tom Værmelding", () => {
    const start = ms("2026-11-09T13:00:00+01:00");
    expect(klasseForTidsvindu({ timer: [] }, start, start + TIME_MS)).toBe("mangler");
  });

  it("gir mangler for et tomt eller omvendt vindu", () => {
    const start = ms("2026-11-09T13:00:00+01:00");
    const time = { startUtc: start, nedborMmT: 0, vindMs: 3, tempC: 5, symbolKode: null };
    const godMelding: Vaermelding = { timer: [time] };
    expect(klasseForTidsvindu(godMelding, start, start)).toBe("mangler");
    expect(klasseForTidsvindu(godMelding, start + TIME_MS, start)).toBe("mangler");
  });
});

describe("NFR-10: en endret grense krever ingen kodeendring", () => {
  // En kopi av tersklene der grensen for dårlig nedbør er 3,0 i stedet for 2,0.
  const endret = lesVaerterskler({
    ...VAERTERSKLER,
    klasser: VAERTERSKLER.klasser.map((k) =>
      k.klasse === "darlig" ? { ...k, nedbor_mm_t_minst: 3.0 } : k,
    ),
  });
  // Ser bare på nedbøren. Det forutsetter at ingen rad i fasiten med nedbør i [2,0, 3,0)
  // også blir dårlig av vind eller temperatur.
  const iOmradet = (nedbor: number) => nedbor >= 2.0 && nedbor < 3.0;

  it("endrer bare timene med nedbør i [2,0, 3,0)", () => {
    const endrede = fasit.timer.filter((rad) => klasseForTime(rad, endret) !== rad.klasse);
    expect(endrede.length).toBeGreaterThan(0);
    for (const rad of fasit.timer) {
      const ny = klasseForTime(rad, endret);
      expect(ny !== rad.klasse, rad.beskrivelse).toBe(iOmradet(rad.nedborMmT));
    }
  });

  it("endrer bare Tidsvinduene med en time med nedbør i [2,0, 3,0)", () => {
    const endrede = fasit.tidsvinduer.filter((vindu) => vinduKlasse(vindu, endret) !== vindu.klasse);
    expect(endrede.length).toBeGreaterThan(0);
    for (const vindu of fasit.tidsvinduer) {
      const ventetEndring = vindu.timer.some((t) => iOmradet(t.nedborMmT));
      expect(vinduKlasse(vindu, endret) !== vindu.klasse, vindu.beskrivelse).toBe(ventetEndring);
    }
  });

  it("2,5 mm/t er dårlig med fila og middels med kopien", () => {
    const time = { nedborMmT: 2.5, vindMs: 3, tempC: 5 };
    expect(klasseForTime(time)).toBe("darlig");
    expect(klasseForTime(time, endret)).toBe("middels");
  });

  it("null betyr ingen grense: uten vindgrense for dårlig gir 10,8 m/s middels", () => {
    const utenVind = lesVaerterskler({
      ...VAERTERSKLER,
      klasser: VAERTERSKLER.klasser.map((k) =>
        k.klasse === "darlig" ? { ...k, vind_ms_minst: null } : k,
      ),
    });
    const time = { nedborMmT: 0, vindMs: 10.8, tempC: 5 };
    expect(klasseForTime(time)).toBe("darlig");
    expect(klasseForTime(time, utenVind)).toBe("middels");
  });
});
