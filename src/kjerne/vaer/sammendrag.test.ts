import { describe, expect, it } from "vitest";
import rutegeometriJson from "../../../data/rutegeometri.geojson";
import turerJson from "../../../testdata/turer.json";
import { anbefal } from "../anbefaling";
import { soltider } from "../sol";
import type { Sok } from "../sok";
import { osloTilUtc, TIME_MS } from "../tid";
import { lagTurkort } from "../turkort";
import { RutegeometriSkjema } from "../turdata/rutegeometri";
import { TurdatasettSkjema } from "../turdata/skjema";
import { VaerSkjema } from "../visning/skjema";
import { HOYDEMERKNAD, klasseTekst, lagVaerVurdert, oppsummerTidsvindu, vaersymbol } from "./sammendrag";
import { VAERTERSKLER } from "./terskler";
import { TESTSCENARIOER } from "./testscenarioer";
import type { Vaerklasse, Vaermelding, Vaertime } from "./typer";
import { klasseForTidsvindu } from "./vaerklasse";

// Værsammendraget og Værsymbolet (story 2.7, FR-10) mot Værscenarioene og håndlagde Værmeldinger.

const MINUTT_MS = 60_000;

/** Tidsvinduet for et Søk: fra Starttidspunktet og hele Tilgjengelig tid. */
const vindu = (dato: string, start: string, tilgjengeligMin: number) => {
  const startUtc = osloTilUtc(dato, start);
  return { startUtc, sluttUtc: startUtc + tilgjengeligMin * MINUTT_MS };
};

const UJ1 = { melding: TESTSCENARIOER["uj-1"].vaermelding, ...vindu("2026-11-09", "13:30", 120) };
const UJ2 = { melding: TESTSCENARIOER["uj-2"].vaermelding, ...vindu("2026-11-09", "10:00", 180) };
const UJ3 = { melding: TESTSCENARIOER["uj-3"].vaermelding, ...vindu("2026-11-14", "10:00", 120) };

/** Verdier som gir hver Værklasse med tersklene i data/vaerterskler.json. */
const VERDIER: Record<Vaerklasse, Pick<Vaertime, "nedborMmT" | "vindMs" | "tempC">> = {
  god: { nedborMmT: 0, vindMs: 2, tempC: 3 },
  middels: { nedborMmT: 1, vindMs: 2, tempC: 3 },
  darlig: { nedborMmT: 3, vindMs: 2, tempC: 3 },
  fraradet: { nedborMmT: 12, vindMs: 2, tempC: 3 },
};

const START = osloTilUtc("2026-11-09", "13:00");

/** En Værmelding med én time per rad fra 13:00, i rekkefølge. */
function melding(rader: Partial<Vaertime>[]): Vaermelding {
  return {
    timer: rader.map((rad, i) => ({
      ...VERDIER.god,
      symbolKode: "clearsky_day",
      ...rad,
      startUtc: START + i * TIME_MS,
    })),
  };
}

function vurdert(input: Parameters<typeof lagVaerVurdert>[0]) {
  const svar = lagVaerVurdert(input);
  if (svar === null) throw new Error("Ventet vurdert vær.");
  return svar;
}

describe("UJ-1", () => {
  it("9. nov. 13:30–15:30 er god, «oppholdsvær og lite vind» og «3–5 °C»", () => {
    const { vaer, grunnlag } = vurdert(UJ1);
    // Tallet i de committede dataene: høyeste middelvind er 4,5 m/s (kl. 14).
    expect(oppsummerTidsvindu(UJ1.melding, UJ1.startUtc, UJ1.sluttUtc)?.maksVindMs).toBe(4.5);
    expect(grunnlag).toEqual({
      type: "vurdert",
      klasse: "god",
      vaerord: "oppholdsvær og lite vind",
      temperatur: "3–5 °C",
    });
    expect(vaer).toEqual({
      type: "vurdert",
      klasse: "god",
      klasseTekst: "Værklasse god",
      symbol: { ord: "klarvær", ikonSti: "/vaerikoner/clearsky_day.svg" },
      sammendrag: "klarvær · 3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s",
      tidsvindu: "13:30–15:30",
      hoydemerknad: "Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.",
    });
  });
});

describe("UJ-2 og UJ-3", () => {
  it("UJ-2, 9. nov. 10:00–13:00, er dårlig med værordene fra dataene", () => {
    const { vaer, grunnlag } = vurdert(UJ2);
    expect(vaer).toMatchObject({ klasse: "darlig", klasseTekst: "Værklasse dårlig", tidsvindu: "10:00–13:00" });
    // De committede dataene gir 3,4 mm/t (EXPERIENCE-eksempelet har 3,5) og høyeste vind 9,2 m/s.
    expect(grunnlag).toEqual({
      type: "vurdert",
      klasse: "darlig",
      vaerord: "nedbør opptil 3,4 mm/t og frisk vind",
      temperatur: "5–7 °C",
    });
    expect(vaer.sammendrag).toBe("regn · 5–7 °C · nedbør 3,4 mm/t · vind opptil 9,2 m/s");
  });

  it("UJ-2 hele veien: Moldevatnet fra Jensgurilia får Regelteksten med del 3 og 4", () => {
    const { turer } = TurdatasettSkjema.parse(turerJson);
    const sok: Sok = {
      dato: "2026-11-09",
      start: "10:00",
      tilgjengeligMin: 180,
      vanskelighetsgrad: "R",
      utsikt: true,
      vann: false,
    };
    const sol = { "2026-11-09": soltider("2026-11-09") };
    const { grunnlag } = vurdert(UJ2);
    const anbefaling = anbefal(turer, sok, sol, grunnlag.type === "vurdert" ? grunnlag.klasse : "mangler");
    if (anbefaling.type !== "turforslag") throw new Error("Ventet Turforslag.");
    const [forste] = anbefaling.forslag;
    expect(forste.tur.id).toBe("moldevatnet-fra-jensgurilia");
    const geometri = RutegeometriSkjema.parse(rutegeometriJson);
    const kort = lagTurkort(forste, { sok, soltider: sol, geometri, nummer: 1, antall: 3, vaer: grunnlag });
    expect(kort.regeltekst).toBe(
      "passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,4 mm/t og frisk vind, lavtliggende tur (340 moh), " +
        "egnet i dårlig vær",
    );
  });

  it("UJ-3, 14. nov. 10:00–12:00, er frarådet med «sterk kuling, vind opp mot 19 m/s»", () => {
    const { vaer, grunnlag } = vurdert(UJ3);
    expect(vaer).toMatchObject({ klasse: "fraradet", klasseTekst: "Værklasse frarådet", tidsvindu: "10:00–12:00" });
    expect(grunnlag).toMatchObject({ type: "vurdert", klasse: "fraradet" });
    if (grunnlag.type !== "vurdert") throw new Error("Ventet vurdert.");
    expect(grunnlag.vaerord.endsWith("sterk kuling, vind opp mot 19 m/s")).toBe(true);
    expect(vaer.sammendrag).toContain("vind opptil 19 m/s");
  });

  it.each([
    ["uj-1", UJ1],
    ["uj-2", UJ2],
    ["uj-3", UJ3],
  ])("%s består vurdert-grenen av VaerSkjema", (_id, input) => {
    expect(VaerSkjema.parse(vurdert(input).vaer)).toEqual(vurdert(input).vaer);
  });

  it.each([
    ["uj-1", UJ1],
    ["uj-2", UJ2],
    ["uj-3", UJ3],
  ])("%s: Værklassen er den samme som klasseForTidsvindu", (_id, { melding: m, startUtc, sluttUtc }) => {
    expect(oppsummerTidsvindu(m, startUtc, sluttUtc)?.klasse).toBe(klasseForTidsvindu(m, startUtc, sluttUtc));
  });
});

describe("oppsummerTidsvindu", () => {
  it("gir høyeste nedbør og vind og laveste og høyeste temperatur over timene i vinduet", () => {
    const m = melding([
      { nedborMmT: 0.2, vindMs: 3, tempC: 4.6 },
      { nedborMmT: 0.4, vindMs: 6.1, tempC: 2.6 },
      { nedborMmT: 0.1, vindMs: 5, tempC: 3 },
      // 16:00 er utenfor vinduet 13:30–15:30.
      { nedborMmT: 9, vindMs: 15, tempC: -8 },
    ]);
    expect(oppsummerTidsvindu(m, START + 30 * MINUTT_MS, START + 150 * MINUTT_MS)).toEqual({
      klasse: "god",
      maksNedborMmT: 0.4,
      maksVindMs: 6.1,
      minTempC: 2.6,
      maksTempC: 4.6,
      symbolKode: "clearsky_day",
    });
  });

  it("symbolet er fra den første av timene med dårligst Værklasse", () => {
    const m = melding([
      { ...VERDIER.god, symbolKode: "fair_day" },
      { ...VERDIER.darlig, symbolKode: "rain" },
      { ...VERDIER.darlig, symbolKode: "heavyrain" },
    ]);
    expect(oppsummerTidsvindu(m, START, START + 3 * TIME_MS)).toMatchObject({ klasse: "darlig", symbolKode: "rain" });
  });

  it("symbolet følger den dårligste timen også når den kommer sist", () => {
    const m = melding([
      { ...VERDIER.middels, symbolKode: "lightrain" },
      { ...VERDIER.middels, symbolKode: "rain" },
      { ...VERDIER.fraradet, symbolKode: "heavyrainandthunder" },
    ]);
    expect(oppsummerTidsvindu(m, START, START + 3 * TIME_MS)).toMatchObject({
      klasse: "fraradet",
      symbolKode: "heavyrainandthunder",
    });
  });

  it("et vindu over en time som mangler, gir null", () => {
    const m = melding([{}, {}, {}]);
    const uten = { timer: m.timer.filter((_, i) => i !== 1) };
    expect(oppsummerTidsvindu(uten, START, START + 3 * TIME_MS)).toBeNull();
    expect(lagVaerVurdert({ melding: uten, startUtc: START, sluttUtc: START + 3 * TIME_MS })).toBeNull();
  });

  it("et tomt vindu og en tom Værmelding gir null", () => {
    expect(oppsummerTidsvindu(melding([{}]), START, START)).toBeNull();
    expect(oppsummerTidsvindu({ timer: [] }, START, START + TIME_MS)).toBeNull();
  });

  it("bruker tersklene den får", () => {
    const m = melding([{ nedborMmT: 1 }]);
    const terskler = {
      ...VAERTERSKLER,
      klasser: VAERTERSKLER.klasser.map((k) => (k.klasse === "middels" ? { ...k, nedbor_mm_t_minst: 1.5 } : k)),
    };
    expect(oppsummerTidsvindu(m, START, START + TIME_MS)?.klasse).toBe("middels");
    expect(oppsummerTidsvindu(m, START, START + TIME_MS, terskler)?.klasse).toBe("god");
    expect(vurdert({ melding: m, startUtc: START, sluttUtc: START + TIME_MS, terskler }).grunnlag).toMatchObject({
      klasse: "god",
      vaerord: "lite nedbør og lite vind",
    });
  });
});

describe("vaersymbol", () => {
  it.each([
    ["clearsky_day", "klarvær"],
    ["fair_night", "lettskyet"],
    ["partlycloudy_polartwilight", "delvis skyet"],
    ["rainshowersandthunder_day", "regnbyger og torden"],
    ["heavysnow", "kraftig snø"],
    ["fog", "tåke"],
    ["lightsleetshowers_night", "lette sluddbyger"],
    ["heavyrainandthunder", "kraftig regn og torden"],
    ["lightssleetshowersandthunder_day", "lette sluddbyger og torden"],
    ["lightssnowshowersandthunder_night", "lette snøbyger og torden"],
  ])("%s er «%s»", (kode, ord) => {
    expect(vaersymbol(kode)).toEqual({ ord, ikonSti: `/vaerikoner/${kode}.svg` });
  });

  it.each(["ukjent", "andthunder", "clearsky_evening", "constructor", "toString", ""])("%s gir null", (kode) => {
    expect(vaersymbol(kode)).toBeNull();
  });

  it("null gir null", () => {
    expect(vaersymbol(null)).toBeNull();
  });
});

describe("lagVaerVurdert", () => {
  it("uten symbolord faller den første delen av sammendraget bort", () => {
    const m = melding([{ symbolKode: "ukjent", tempC: 4.2 }, { symbolKode: "ukjent", tempC: 3.8 }]);
    const { vaer } = vurdert({ melding: m, startUtc: START, sluttUtc: START + 2 * TIME_MS });
    expect(vaer.symbol).toBeNull();
    expect(vaer.sammendrag).toBe("4 °C · nedbør 0 mm/t · vind opptil 2 m/s");
  });

  it("minus og desimalkomma i sammendraget", () => {
    const m = melding([{ tempC: -2.4, nedborMmT: 0.6, vindMs: 8.3, symbolKode: "lightsnow" }, { tempC: 1.2 }]);
    const { vaer, grunnlag } = vurdert({ melding: m, startUtc: START, sluttUtc: START + 2 * TIME_MS });
    expect(vaer.sammendrag).toBe("lett snø · −2 til 1 °C · nedbør 0,6 mm/t · vind opptil 8,3 m/s");
    expect(grunnlag).toEqual({
      type: "vurdert",
      klasse: "middels",
      vaerord: "noe nedbør og frisk vind",
      temperatur: "−2 til 1 °C",
    });
  });

  it.each<Vaerklasse>(["god", "middels", "darlig", "fraradet"])("klasseTekst for %s", (klasse) => {
    const m = melding([VERDIER[klasse]]);
    const { vaer } = vurdert({ melding: m, startUtc: START, sluttUtc: START + TIME_MS });
    expect(vaer.klasseTekst).toBe(klasseTekst(klasse));
    expect(VaerSkjema.safeParse(vaer).success).toBe(true);
  });

  it("klasseTekst har ordene fra EXPERIENCE.md", () => {
    expect(["god", "middels", "darlig", "fraradet"].map((k) => klasseTekst(k as Vaerklasse))).toEqual([
      "Værklasse god",
      "Værklasse middels",
      "Værklasse dårlig",
      "Værklasse frarådet",
    ]);
  });

  it("Tidsvinduet over midnatt står i Oslo-tid", () => {
    const start = osloTilUtc("2026-11-09", "22:00");
    const m = { timer: [0, 1].map((i) => ({ ...VERDIER.god, symbolKode: null, startUtc: start + i * TIME_MS })) };
    const { vaer } = vurdert({ melding: m, startUtc: start, sluttUtc: start + 2 * TIME_MS });
    expect(vaer.tidsvindu).toBe("22:00–00:00");
  });

  it("samme input gir samme svar", () => {
    expect(lagVaerVurdert(UJ2)).toEqual(lagVaerVurdert(UJ2));
  });

  it("ingen tekst inneholder «trygg» eller «trygt»", () => {
    const koder = ["clearsky_day", "rainshowersandthunder_night", "heavysnow", "ukjent", null];
    const tekster = [HOYDEMERKNAD];
    for (const klasse of ["god", "middels", "darlig", "fraradet"] as const) {
      for (const symbolKode of koder) {
        const m = melding([{ ...VERDIER[klasse], symbolKode }]);
        const { vaer, grunnlag } = vurdert({ melding: m, startUtc: START, sluttUtc: START + TIME_MS });
        tekster.push(...Object.values(vaer).filter((v): v is string => typeof v === "string"));
        if (vaer.symbol) tekster.push(vaer.symbol.ord);
        if (grunnlag.type === "vurdert") tekster.push(grunnlag.vaerord, grunnlag.temperatur);
      }
    }
    for (const input of [UJ1, UJ2, UJ3]) {
      tekster.push(...Object.values(vurdert(input).vaer).filter((v): v is string => typeof v === "string"));
    }
    expect(tekster.filter((t) => /trygg|trygt/i.test(t))).toEqual([]);
  });
});
