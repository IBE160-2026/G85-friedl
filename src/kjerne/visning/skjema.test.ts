import { describe, expect, it } from "vitest";
import type { Sok } from "../sok";
import {
  type Kriterium,
  type Resultatvisning,
  ResultatvisningSkjema,
  type Turkort,
  type Utfall,
  type Vaer,
} from "./skjema";

// Visningskontrakten (AD-3) og matrisen til story 1.4. Eksempeltekstene er fra EXPERIENCE.md.

const SOK: Sok = {
  dato: "2026-11-09",
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: true,
  vann: false,
};

const tid: Kriterium & { rad: "tid" } = {
  rad: "tid",
  merke: "ok",
  tekst: "1 t 32 min av 2 t",
  detalj: ["gangtid, uten pauser"],
};

const vaerGod: Kriterium & { rad: "vaer" } = {
  rad: "vaer",
  merke: "ok",
  tekst: "Værklasse god",
  detalj: ["oppholdsvær og lite vind · 3–5 °C"],
};

const onsker: Kriterium & { rad: "onsker" } = {
  rad: "onsker",
  merke: "ok",
  tekst: "utsikt ✓",
  detalj: [],
};

const morke: Kriterium & { rad: "morke" } = {
  rad: "morke",
  merke: "ok",
  tekst: "tilbake 15:02",
  detalj: ["sola går ned 15:59"],
};

const kort = (nummer: number, endring: Partial<Turkort> = {}): Turkort => ({
  turId: `tur-${nummer}`,
  mal: "Tusenårsvarden",
  fra: "fra Damefallet",
  startpunktTekst: "Startpunkt: Parkering ved Damefallet, Vardeveien",
  faktalinje: "4,2 km · 380 høydemeter · Middels",
  kriterier: [tid, vaerGod, onsker, morke],
  tidsstolpe: { fyll: 92 / 120, overGrense: 0 },
  dagslysstolpe: {
    startTekst: "13:30",
    slutt: { andel: 0.85, tekst: "tilbake 15:02" },
    skumring: 0.93,
    solNed: { andel: 0.88, tekst: "sol ned 15:59" },
    solOpp: null,
  },
  regeltekst: "passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt",
  kartinfoboks: {
    navn: "Tusenårsvarden fra Damefallet",
    tekst: "4,2 km · Middels · Startpunkt: Parkering ved Damefallet, Vardeveien",
  },
  stokkoversiktRad: "1 t 32 min uten pauser · tilbake 15:02",
  lesetekst: "Turforslag 1 av 3: Tusenårsvarden fra Damefallet.",
  kilde: { navn: "morotur.no", url: "https://www.morotur.no/tur/tusenarsvarden" },
  kart: {
    rute: {
      type: "Feature",
      geometry: {
        type: "MultiLineString",
        coordinates: [
          [
            [7.15, 62.74],
            [7.16, 62.75],
          ],
        ],
      },
      properties: {},
    },
    startpunkt: { lat: 62.74, lon: 7.15 },
    nummer,
    malpunkt: { lat: 62.75, lon: 7.16 },
  },
  ...endring,
});

const alternativkort: Turkort = kort(1, {
  mal: "Storlihytta",
  fra: "fra Vardeveien",
  kriterier: [
    { rad: "tid", merke: "se-opp", tekst: "16 min av 15 min", detalj: ["trenger 1 min mer, uten pauser"] },
    { rad: "vaer", merke: "ingen", tekst: "ikke vurdert", detalj: ["Værmeldingen fra MET mangler"] },
    { rad: "onsker", merke: "ingen", tekst: "ingen valgt", detalj: [] },
    {
      rad: "morke",
      merke: "se-opp",
      tekst: "Mørkevarsel: tilbake ca. 15:32",
      detalj: [
        "Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.",
        "Lurt å ta med hodelykt.",
      ],
    },
  ],
  tidsstolpe: { fyll: 15 / 16, overGrense: 1 / 16 },
  regeltekst: "passer ikke tiden din: trenger 1 min mer (16 min av 15 min), værdata mangler",
});

const vurdert = (klasse: "god" | "middels" | "darlig" | "fraradet", varsling = false): Vaer => ({
  type: "vurdert",
  klasse,
  klasseTekst: `Værklasse ${klasse}`,
  symbol: { ord: "lettskyet", ikonSti: "/vaerikoner/fair_day.svg" },
  sammendrag: "lettskyet · 3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s",
  verdier: "3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s",
  tidsvindu: "13:30–15:30",
  hoydemerknad: "Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.",
  ...(varsling
    ? {
        vaervarsling: {
          tittel: "Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00",
          tekst: "Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.",
        },
      }
    : {}),
});

const MANGLER: Vaer = { type: "mangler", tekst: "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET." };

const FUNNET = {
  type: "funnet",
  nyttSok: { ...SOK, dato: "2026-11-10", start: "11:00" },
  tekst: "I morgen fra kl. 11:00 er Værklassen god.",
  dag: "I morgen, tir. 10. nov.",
  detalj: "fra kl. 11:00 · samme 2 t, Middels",
  antallTekst: "5 Turer passer før mørket.",
  knappTekst: "Bruk i morgen 11:00",
} as const;

const INGEN = {
  type: "ingen",
  tekst: "Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.",
} as const;

const visning = (endring: Partial<Resultatvisning> = {}): Resultatvisning => ({
  resultatId: "r-1",
  sok: SOK,
  overskrift: "Tre Turforslag som passer nå",
  dittSok: {
    turdag: "I dag",
    starttidspunkt: "13:30",
    tilgjengeligTid: "2 t",
    vanskelighetsgrad: "Middels",
    opplevelsespreferanser: ["utsikt"],
  },
  liveTekst: "Tre Turforslag som passer nå",
  vaer: vurdert("god"),
  utfall: { type: "turforslag", kort: [kort(1), kort(2), kort(3)] },
  ...endring,
});

const FRARADET_UTFALL: Extract<Utfall, { type: "fraradet" }> = {
  type: "fraradet",
  melding: "Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).",
  kriterier: [
    { rad: "vaer", merke: "se-opp", tekst: "Værklasse frarådet", detalj: ["sterk kuling, vind opp mot 19 m/s"] },
    { rad: "tid", merke: "ingen", tekst: "ikke vurdert", detalj: ["Frarådet går foran tid og ønsker."] },
  ],
};

/** Morgentur: start før soloppgang, ingen skumring eller solnedgang på stolpen, og ingen malpunkt. */
const morgenkort = (): Turkort => {
  const k = kort(1, {
    dagslysstolpe: {
      startTekst: "07:00",
      slutt: { andel: 1, tekst: "tilbake 09:00" },
      skumring: null,
      solNed: null,
      solOpp: { andel: 0.75, tekst: "sol opp 08:30" },
    },
  });
  delete k.kart.malpunkt;
  return k;
};

const GYLDIGE: Record<string, Resultatvisning> = {
  "god, turforslag med 3 kort": visning(),
  "god, turforslag med 1 kort, justering": visning({
    overskrift: "Ett Turforslag som passer nå",
    justering: "Flyttet til 14:15, fordi 13:30 har passert.",
    utfall: { type: "turforslag", kort: [kort(1)] },
  }),
  "middels, turforslag": visning({ vaer: vurdert("middels") }),
  "god, morgentur uten malpunkt og uten Opplevelsespreferanser": visning({
    dittSok: { ...visning().dittSok, opplevelsespreferanser: [] },
    utfall: { type: "turforslag", kort: [morgenkort()] },
  }),
  "god, symbol ukjent": visning({ vaer: { ...vurdert("god"), symbol: null } as Vaer }),
  "mangler, turforslag": visning({ vaer: MANGLER, overskrift: "Tre Turforslag som passer tiden din" }),
  "mangler, kortesteTur": visning({
    vaer: MANGLER,
    overskrift: "Ingen Tur passer 15 min.",
    utfall: { type: "kortesteTur", kort: alternativkort, passerMedTekst: "Med 30 min eller mer passer minst én Tur." },
  }),
  "dårlig, turforslag, funnet": visning({
    vaer: vurdert("darlig", true),
    overskrift: "Tre Turforslag i dårlig vær",
    bedreTidsvindu: FUNNET,
  }),
  "dårlig, kortesteTur, ingen": visning({
    vaer: vurdert("darlig", true),
    utfall: { type: "kortesteTur", kort: alternativkort, passerMedTekst: "Med 30 min eller mer passer minst én Tur." },
    bedreTidsvindu: INGEN,
  }),
  "frarådet, funnet": visning({ vaer: vurdert("fraradet"), utfall: FRARADET_UTFALL, bedreTidsvindu: FUNNET }),
  "frarådet, ingen": visning({ vaer: vurdert("fraradet"), utfall: FRARADET_UTFALL, bedreTidsvindu: INGEN }),
};

/** Kopi som kan endres fritt i en test. */
const kopi = <T>(v: T): T => structuredClone(v);

const avvist = (v: unknown) => expect(ResultatvisningSkjema.safeParse(v).success).toBe(false);

describe("ResultatvisningSkjema: gyldige varianter", () => {
  it.each(Object.entries(GYLDIGE))("godtar %s", (_navn, v) => {
    const svar = ResultatvisningSkjema.safeParse(v);
    expect(svar.error?.issues).toBeUndefined();
    expect(svar.data).toEqual(v);
  });

  const GEOJSON = new Set(["type", "geometry", "coordinates", "properties"]);
  const CAMEL = /^[a-z][a-zA-Z0-9]*$/;

  function nokler(v: unknown, sti = ""): string[] {
    if (Array.isArray(v)) return v.flatMap((x, i) => nokler(x, `${sti}[${i}]`));
    if (v === null || typeof v !== "object") return [];
    return Object.entries(v).flatMap(([k, x]) => [
      ...(CAMEL.test(k) || GEOJSON.has(k) ? [] : [`${sti}.${k}`]),
      ...nokler(x, `${sti}.${k}`),
    ]);
  }

  it.each(Object.entries(GYLDIGE))("har bare camelCase- eller GeoJSON-nøkler: %s", (_navn, v) => {
    expect(nokler(v)).toEqual([]);
  });
});

describe("ResultatvisningSkjema: ekstra felt", () => {
  it("avviser ekstra felt i roten", () => {
    avvist({ ...visning(), ekstra: 1 });
  });

  it("avviser ekstra felt i et kort", () => {
    avvist(visning({ utfall: { type: "turforslag", kort: [{ ...kort(1), ekstra: 1 } as Turkort] } }));
  });

  it("avviser ekstra felt i en Kriterierad", () => {
    const k = kopi(kort(1));
    Object.assign(k.kriterier[0], { ekstra: 1 });
    avvist(visning({ utfall: { type: "turforslag", kort: [k] } }));
  });

  it("avviser ekstra felt i kart", () => {
    const k = kopi(kort(1));
    Object.assign(k.kart, { ekstra: 1 });
    avvist(visning({ utfall: { type: "turforslag", kort: [k] } }));
  });

  it("avviser ekstra felt i properties på ruten", () => {
    const k = kopi(kort(1));
    Object.assign(k.kart.rute.properties, { navn: "x" });
    avvist(visning({ utfall: { type: "turforslag", kort: [k] } }));
  });
});

describe("ResultatvisningSkjema: snake_case", () => {
  it("avviser hoyeste_punkt_moh i et kort", () => {
    avvist(visning({ utfall: { type: "turforslag", kort: [{ ...kort(1), hoyeste_punkt_moh: 340 } as Turkort] } }));
  });

  it("avviser tur_id i stedet for turId", () => {
    const { turId, ...resten } = kort(1);
    avvist(visning({ utfall: { type: "turforslag", kort: [{ ...resten, tur_id: turId } as unknown as Turkort] } }));
  });
});

describe("ResultatvisningSkjema: andeler og koordinater", () => {
  const medKort = (endre: (k: Turkort) => void) => {
    const k = kopi(kort(1));
    endre(k);
    return visning({ utfall: { type: "turforslag", kort: [k] } });
  };

  it.each([-0.01, 1.01])("avviser %s i Tidsstolpen", (andel) => {
    avvist(medKort((k) => (k.tidsstolpe.fyll = andel)));
    avvist(medKort((k) => (k.tidsstolpe.overGrense = andel)));
  });

  it.each([-0.01, 1.01])("avviser %s i Dagslysstolpen", (andel) => {
    avvist(medKort((k) => (k.dagslysstolpe.slutt.andel = andel)));
    avvist(medKort((k) => (k.dagslysstolpe.skumring = andel)));
    avvist(medKort((k) => (k.dagslysstolpe.solNed = { andel, tekst: "sol ned 15:59" })));
    avvist(medKort((k) => (k.dagslysstolpe.solOpp = { andel, tekst: "sol opp 08:30" })));
  });

  it("avviser en Tidsstolpe der fyll + overGrense er over 1", () => {
    avvist(medKort((k) => (k.tidsstolpe = { fyll: 0.9, overGrense: 0.2 })));
  });

  it("avviser en lengdegrad over 180 og et punkt utenfor verdiområdet", () => {
    avvist(medKort((k) => (k.kart.rute.geometry.coordinates = [[[7.15, 62.74], [200, 62.75]]])));
    avvist(medKort((k) => (k.kart.startpunkt = { lat: 91, lon: 7.15 })));
  });

  it("leser posisjonene i ruten som [lon, lat]", () => {
    const rute: Turkort["kart"]["rute"]["geometry"]["coordinates"] = [
      [
        [120, 60],
        [121, 61],
      ],
    ];
    const svar = ResultatvisningSkjema.safeParse(medKort((k) => (k.kart.rute.geometry.coordinates = rute)));
    expect(svar.error?.issues).toBeUndefined();
    avvist(medKort((k) => (k.kart.rute.geometry.coordinates = [[[60, 120], [121, 61]]])));
    avvist(medKort((k) => (k.kart.rute.geometry.coordinates = [[[120, 60], [61, 121]]])));
  });

  it("avviser en rute uten linjer og en linje med én posisjon", () => {
    avvist(medKort((k) => (k.kart.rute.geometry.coordinates = [])));
    avvist(medKort((k) => (k.kart.rute.geometry.coordinates = [[[7.15, 62.74]]])));
  });

  it.each(["javascript:alert(1)", "ftp://www.morotur.no/tur"])("avviser kilde.url %s", (url) => {
    avvist(medKort((k) => (k.kilde.url = url)));
  });
});

describe("ResultatvisningSkjema: antall kort", () => {
  it.each([0, 4])("avviser %s Turforslag", (antall) => {
    const alle = Array.from({ length: antall }, (_, i) => kort(Math.min(i + 1, 3)));
    avvist(visning({ utfall: { type: "turforslag", kort: alle } }));
  });

  it("avviser Turforslag der kart.nummer ikke følger rekkefølgen", () => {
    avvist(visning({ utfall: { type: "turforslag", kort: [kort(2), kort(1)] } }));
  });
});

describe("ResultatvisningSkjema: Kriterierader", () => {
  it("avviser tre rader", () => {
    avvist(visning({ utfall: { type: "turforslag", kort: [kort(1, { kriterier: [tid, vaerGod, onsker] as unknown as Turkort["kriterier"] })] } }));
  });

  it("avviser Tid og Vær i byttet rekkefølge", () => {
    avvist(visning({ utfall: { type: "turforslag", kort: [kort(1, { kriterier: [vaerGod, tid, onsker, morke] as unknown as Turkort["kriterier"] })] } }));
  });

  it("avviser Frarådet-kortet med Tid før Vær", () => {
    const [v, t] = FRARADET_UTFALL.kriterier;
    avvist(visning({ vaer: vurdert("fraradet"), utfall: { ...FRARADET_UTFALL, kriterier: [t, v] } as never, bedreTidsvindu: FUNNET }));
  });
});

describe("ResultatvisningSkjema: FR-6", () => {
  it("avviser frarådet vær med turforslag", () => {
    avvist(visning({ vaer: vurdert("fraradet"), bedreTidsvindu: FUNNET }));
  });

  it("avviser fraradet-utfall uten frarådet vær", () => {
    avvist(visning({ vaer: vurdert("darlig", true), utfall: FRARADET_UTFALL, bedreTidsvindu: FUNNET }));
  });

  it("avviser dårlig vær uten bedreTidsvindu", () => {
    avvist(visning({ vaer: vurdert("darlig", true) }));
  });

  it("avviser dårlig vær uten vaervarsling", () => {
    avvist(visning({ vaer: vurdert("darlig"), bedreTidsvindu: FUNNET }));
  });

  it("avviser en Værvarsling uten tittel (story 2.9)", () => {
    const utenTittel = { ...vurdert("darlig"), vaervarsling: { tekst: "Nedbør opptil 3,4 mm/t." } };
    avvist({ ...visning({ vaer: vurdert("darlig", true), bedreTidsvindu: FUNNET }), vaer: utenTittel });
  });

  it("avviser mangler med bedreTidsvindu", () => {
    avvist(visning({ vaer: MANGLER, bedreTidsvindu: FUNNET }));
  });

  it("avviser god vær med vaervarsling", () => {
    avvist(visning({ vaer: vurdert("god", true) }));
  });

  it("avviser frarådet vær uten bedreTidsvindu", () => {
    avvist(visning({ vaer: vurdert("fraradet"), utfall: FRARADET_UTFALL }));
  });

  it("avviser frarådet vær med vaervarsling", () => {
    avvist(visning({ vaer: vurdert("fraradet", true), utfall: FRARADET_UTFALL, bedreTidsvindu: FUNNET }));
  });

  it("avviser middels vær med bedreTidsvindu", () => {
    avvist(visning({ vaer: vurdert("middels"), bedreTidsvindu: FUNNET }));
  });

  it("avviser frarådet vær med kortesteTur", () => {
    avvist(
      visning({
        vaer: vurdert("fraradet"),
        utfall: { type: "kortesteTur", kort: alternativkort, passerMedTekst: "Med 30 min eller mer passer minst én Tur." },
        bedreTidsvindu: FUNNET,
      }),
    );
  });

  it("peker på utfall.type når utfallet bryter FR-6", () => {
    const svar = ResultatvisningSkjema.safeParse(visning({ vaer: vurdert("fraradet"), bedreTidsvindu: FUNNET }));
    expect(svar.error?.issues.map((i) => i.path)).toEqual([["utfall", "type"]]);
  });

  it("peker på vaer.vaervarsling når Værvarslingen bryter FR-6", () => {
    const svar = ResultatvisningSkjema.safeParse(visning({ vaer: vurdert("god", true) }));
    expect(svar.error?.issues.map((i) => i.path)).toEqual([["vaer", "vaervarsling"]]);
  });

  it("peker på feltet som bryter FR-6", () => {
    const svar = ResultatvisningSkjema.safeParse(visning({ vaer: vurdert("darlig", true) }));
    expect(svar.error?.issues.map((i) => i.path)).toEqual([["bedreTidsvindu"]]);
  });
});

describe("ResultatvisningSkjema: tom tekst", () => {
  it("avviser tom overskrift", () => {
    avvist(visning({ overskrift: "" }));
  });
});

describe("ResultatvisningSkjema: Søket", () => {
  it("avviser et ugyldig Søk i sok og i bedreTidsvindu.nyttSok", () => {
    avvist(visning({ sok: { ...SOK, start: "13:10" } }));
    avvist(visning({ vaer: vurdert("darlig", true), bedreTidsvindu: { ...FUNNET, nyttSok: { ...SOK, ekstra: 1 } as Sok } }));
  });
});
