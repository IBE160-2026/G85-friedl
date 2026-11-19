import { erLavtliggende, type Alternativ, type RangertTur } from "./anbefaling";
import { klokke, km, meter, varighet } from "./format";
import { MARGIN_FOR_SOLNEDGANG_MIN, type Morkevarsel, type Soltider } from "./morke";
import {
  darligVaerDeler,
  lagRegeltekst,
  OPPLEVELSESPREFERANSER,
  type Opplevelsespreferanse,
  tidAvTilgjengelig,
  type VaerGrunnlag,
} from "./regeltekst";
import type { Sok } from "./sok";
import { osloTilUtc } from "./tid";
import type { Tur } from "./turdata/skjema";
import { type Linje, type Rutegeometri, rutesegmentNokkel } from "./turdata/rutegeometri";
import { KLASSEORD, klasseTekst } from "./vaer/sammendrag";
import type { Kriterium, Turkort } from "./visning/skjema";

// Innholdet i Turkortet og Alternativkortet (FR-20, UX-DR23–UX-DR26, UX-DR43, UX-DR47).
// Rent og deterministisk: samme kandidat og samme input gir samme kort. Alle tall i tekst er laget
// av format.ts. Kandidaten bærer Mørkevarselet fra rangeringen, så det regnes ikke på nytt her.
// Vær-raden viser Værklassen, værordene og temperaturen, og ved dårlig vær «Øverst fordi: …» med
// bare reglene som slo inn. Alternativkortet får ikke «Øverst fordi», fordi den korteste Turen ikke
// er valgt av rangeringen for dårlig vær. Mangler Værmeldingen, er Vær-raden «ikke vurdert».

const MINUTT_MS = 60_000;

export type KortInput = {
  sok: Pick<Sok, "dato" | "start" | "tilgjengeligMin" | "utsikt" | "vann">;
  soltider: Soltider;
  geometri: Rutegeometri;
  /** Plassen i Resultatet og nummeret på kartet, 1–3. Alternativet har 1. */
  nummer: number;
  /** Antall Turforslag i Resultatet. Brukes bare i lesetekst for Turforslag. */
  antall: number;
  vaer: VaerGrunnlag;
};

export type Kandidat = RangertTur | Alternativ;

const erAlternativ = (k: Kandidat): k is Alternativ => "trengerMerMin" in k;

type Rad<R extends Kriterium["rad"]> = Kriterium & { rad: R };

// --- Tekst om Turen ---

/**
 * «fra …»: resten av navnet når Målet er tatt bort fra starten («fra Damefallet», «via Den grønne
 * korridor»). Målet tas bare bort når navnet er Målet eller fortsetter med mellomrom etter det.
 * Er resten tom, eller starter ikke navnet med Målet, brukes «fra {Startpunkt}».
 */
export function fraTekst(tur: Pick<Tur, "navn" | "mal" | "startpunkt">): string {
  const medMal = tur.navn === tur.mal || tur.navn.startsWith(`${tur.mal} `);
  const resten = medMal ? tur.navn.slice(tur.mal.length).trim() : "";
  return resten.length > 0 ? resten : `fra ${tur.startpunkt.navn}`;
}

/** «Startpunkt: Parkering ved Romsdalsmuseet (Adkomst ca. 500 m)». */
function startpunktTekst(tur: Tur): string {
  const adkomst = tur.adkomst ? ` (Adkomst ca. ${meter(tur.adkomst.lengde_m)} m)` : "";
  return `Startpunkt: ${tur.startpunkt.navn}${adkomst}`;
}

/** «5,0 km · 318 høydemeter · høyeste punkt 527 moh · Middels». */
function faktalinje(tur: Tur): string {
  return [
    km(tur.lengde_km_totalt),
    `${meter(tur.hoydemeter)} høydemeter`,
    `høyeste punkt ${meter(tur.hoyeste_punkt_moh)} moh`,
    tur.gradering_tekst,
  ].join(" · ");
}

/** Lenketeksten til kilden etter vertsnavnet. */
function kildenavn(url: string): string {
  const vert = new URL(url).hostname.replace(/^www\./, "");
  if (vert === "morotur.no" || vert.endsWith(".morotur.no")) return "morotur.no";
  if (vert === "fjordnorway.com" || vert.endsWith(".fjordnorway.com")) return "Fjord Norway";
  return vert;
}

// --- Kartet ---

/** Rutesegmentene i geometrien etter nøkkel, laget én gang per geometri. */
const segmenterEtterGeometri = new WeakMap<Rutegeometri, Map<string, readonly Linje[]>>();

function segmenter(geometri: Rutegeometri): Map<string, readonly Linje[]> {
  let kart = segmenterEtterGeometri.get(geometri);
  if (!kart) {
    kart = new Map(geometri.features.map((f) => [rutesegmentNokkel(f.properties), f.geometry.coordinates]));
    segmenterEtterGeometri.set(geometri, kart);
  }
  return kart;
}

/** Turens Rutesegmenter slått sammen til én MultiLineString i [lon, lat]. */
function rute(tur: Tur, geometri: Rutegeometri): Turkort["kart"]["rute"] {
  const etterNokkel = segmenter(geometri);
  const coordinates = tur.rutesegmenter.flatMap((segment) => {
    const linjer = etterNokkel.get(rutesegmentNokkel(segment));
    if (!linjer) {
      throw new Error(`Rutesegmentet ${segment.rutenummer} ${segment.rutenavn} for ${tur.id} finnes ikke i rutegeometrien.`);
    }
    return linjer.map((linje) => linje.map(([lon, lat]): [number, number] => [lon, lat]));
  });
  return { type: "Feature", geometry: { type: "MultiLineString", coordinates }, properties: {} };
}

function kart(tur: Tur, geometri: Rutegeometri, nummer: number): Turkort["kart"] {
  return {
    rute: rute(tur, geometri),
    startpunkt: { lat: tur.startpunkt.lat, lon: tur.startpunkt.lon },
    nummer,
    ...(tur.mal_punkt ? { malpunkt: { lat: tur.mal_punkt.lat, lon: tur.mal_punkt.lon } } : {}),
  };
}

// --- Kriterieradene ---

function tidRad(kandidat: Kandidat, tilgjengeligMin: number): Rad<"tid"> {
  const tekst = tidAvTilgjengelig(kandidat.turtidMin, tilgjengeligMin);
  if (erAlternativ(kandidat)) {
    return {
      rad: "tid",
      merke: "se-opp",
      tekst,
      detalj: [`trenger ${varighet(kandidat.trengerMerMin)} mer, uten pauser`],
    };
  }
  return { rad: "tid", merke: "ok", tekst, detalj: ["gangtid, uten pauser"] };
}

/** Det Regelteksten og Vær-raden trenger om Turen ved dårlig vær. */
type DarligVaer = { hoyestePunktMoh: number; lavtliggende: boolean; egnetDarligVaer: boolean | null };

/** Alternativet er ikke rangert, så verdiene hentes fra Turen på samme måte som i rangeringen. */
function darligVaer(kandidat: Kandidat): DarligVaer {
  const { tur } = kandidat;
  const hoyestePunktMoh = tur.hoyeste_punkt_moh;
  if (erAlternativ(kandidat)) {
    return { hoyestePunktMoh, lavtliggende: erLavtliggende(tur), egnetDarligVaer: tur.egnet_darlig_vaer };
  }
  return { hoyestePunktMoh, lavtliggende: kandidat.lavtliggende, egnetDarligVaer: kandidat.egnetDarligVaer };
}

/** `turen` er `null` for Alternativkortet, som ikke har «Øverst fordi». */
function vaerRad(vaer: VaerGrunnlag, turen: DarligVaer | null): Rad<"vaer"> {
  switch (vaer.type) {
    case "mangler":
      return { rad: "vaer", merke: "ingen", tekst: "ikke vurdert", detalj: ["Værmeldingen fra MET mangler"] };
    case "vurdert": {
      const tekst = klasseTekst(vaer.klasse);
      const linje = `${vaer.vaerord} · ${vaer.temperatur}`;
      if (vaer.klasse === "god" || vaer.klasse === "middels") {
        return { rad: "vaer", merke: "ok", tekst, detalj: [linje] };
      }
      const deler = turen ? darligVaerDeler({ vaer, ...turen }) : [];
      const fordi = deler.length > 0 ? [`Øverst fordi: ${deler.join(", ")}`] : [];
      return { rad: "vaer", merke: "se-opp", tekst, detalj: [linje, ...fordi] };
    }
  }
}

type Preferanser = {
  valgt: Opplevelsespreferanse[];
  treff: Opplevelsespreferanse[];
  /** Det Turen har som ikke er valgt. */
  ikkeValgt: Opplevelsespreferanse[];
};

function preferanser(tur: Tur, sok: KortInput["sok"]): Preferanser {
  const valgt = OPPLEVELSESPREFERANSER.filter((p) => sok[p]);
  return {
    valgt,
    treff: valgt.filter((p) => tur[p]),
    ikkeValgt: OPPLEVELSESPREFERANSER.filter((p) => !sok[p] && tur[p]),
  };
}

function onskerRad({ valgt, treff, ikkeValgt }: Preferanser): Rad<"onsker"> {
  const detalj = ikkeValgt.length > 0 ? [`har ${ikkeValgt.join(" og ")} (ikke valgt)`] : [];
  if (valgt.length === 0) return { rad: "onsker", merke: "ingen", tekst: "ingen valgt", detalj };
  if (treff.length === 0) {
    return { rad: "onsker", merke: "ingen", tekst: valgt.map((p) => `ikke ${p} –`).join(" · "), detalj };
  }
  return {
    rad: "onsker",
    merke: "ok",
    tekst: valgt.map((p) => (treff.includes(p) ? `${p} ✓` : `${p} –`)).join(" · "),
    detalj,
  };
}

type Tider = { startUtc: number; sluttUtc: number; oppUtc: number; nedUtc: number };

function morkeRad(morkevarsel: Morkevarsel | null, t: Tider): Rad<"morke"> {
  const slutt = klokke(t.sluttUtc);
  if (morkevarsel === null) {
    return { rad: "morke", merke: "ok", tekst: `tilbake ${slutt}`, detalj: [`sola går ned ${klokke(t.nedUtc)}`] };
  }
  if (morkevarsel.arsak === "solnedgang") {
    return {
      rad: "morke",
      merke: "se-opp",
      tekst: `Mørkevarsel: tilbake ca. ${slutt}`,
      detalj: [
        `Sola går ned ${morkevarsel.klokkeslett}. Turen ender ca. ${slutt} uten pauser, etter grensen ${varighet(MARGIN_FOR_SOLNEDGANG_MIN)} før solnedgang.`,
        morkevarsel.tips,
      ],
    };
  }
  return {
    rad: "morke",
    merke: "se-opp",
    tekst: `Mørkevarsel: starter før soloppgang ${morkevarsel.klokkeslett}`,
    detalj: [morkevarsel.tips],
  };
}

// --- Stolpene ---

/** Turforslag: fyll = T ÷ A. Alternativ: fyll = A ÷ T og overGrense = (T − A) ÷ T. */
function tidsstolpe(turtidMin: number, tilgjengeligMin: number): Turkort["tidsstolpe"] {
  if (turtidMin <= tilgjengeligMin) return { fyll: turtidMin / tilgjengeligMin, overGrense: 0 };
  return { fyll: tilgjengeligMin / turtidMin, overGrense: (turtidMin - tilgjengeligMin) / turtidMin };
}

/**
 * Dagslysstolpen går fra start til den seneste av solnedgang og slutt. Merkene for solnedgang og
 * skumringen (solnedgang − 30 min) står alltid med, på 0 når de er før start. Merket for
 * soloppgang står bare når Turen starter før soloppgang.
 */
function dagslysstolpe(t: Tider): Turkort["dagslysstolpe"] {
  const lengde = Math.max(t.nedUtc, t.sluttUtc) - t.startUtc;
  const andel = (utc: number) => Math.min(1, Math.max(0, (utc - t.startUtc) / lengde));
  return {
    startTekst: klokke(t.startUtc),
    slutt: { andel: andel(t.sluttUtc), tekst: `tilbake ${klokke(t.sluttUtc)}` },
    skumring: andel(t.nedUtc - MARGIN_FOR_SOLNEDGANG_MIN * MINUTT_MS),
    solNed: { andel: andel(t.nedUtc), tekst: `sol ned ${klokke(t.nedUtc)}` },
    solOpp: t.startUtc < t.oppUtc ? { andel: andel(t.oppUtc), tekst: `sol opp ${klokke(t.oppUtc)}` } : null,
  };
}

// --- Lesetekst ---

/** «sola går ned 15:59» → «Sola går ned 15:59.» */
function setning(tekst: string): string {
  const stor = tekst.charAt(0).toUpperCase() + tekst.slice(1);
  return stor.endsWith(".") ? stor : `${stor}.`;
}

/**
 * Teksten skjermlesere leser for kortet (UX-DR43), med PRD-begrepene for radene:
 * «Turforslag 1 av 3: Tusenårsvarden fra Damefallet. Turtid: 1 t 32 min av 2 t, gangtid uten
 * pauser. Værklasse: ikke vurdert. …».
 */
function lesetekst(
  tur: Tur,
  kandidat: Kandidat,
  input: KortInput,
  rader: Turkort["kriterier"],
  pref: Preferanser,
): string {
  const [tid, vaer, , morke] = rader;
  const tittel = erAlternativ(kandidat)
    ? `Alternativ: ${tur.navn}.`
    : `Turforslag ${input.nummer} av ${input.antall}: ${tur.navn}.`;

  const turtid = erAlternativ(kandidat)
    ? `Turtid: ${tid.tekst}, trenger ${varighet(kandidat.trengerMerMin)} mer, uten pauser.`
    : `Turtid: ${tid.tekst}, gangtid uten pauser.`;

  // Skilletegnet «·» leses ikke godt, så det blir «, » i lesteksten.
  const klasse = input.vaer.type === "vurdert" ? KLASSEORD[input.vaer.klasse] : vaer.tekst;
  const vaerDetalj = vaer.detalj.map((d) => setning(d.replaceAll(" · ", ", ")));
  const vaerklasse = [`Værklasse: ${klasse}.`, ...vaerDetalj].join(" ");

  const valgtTekst =
    pref.valgt.length === 0
      ? "ingen valgt"
      : pref.valgt.map((p) => `${p}: ${pref.treff.includes(p) ? "ja" : "nei"}`).join(", ");
  const opplevelse = [
    `Opplevelsespreferanser: ${valgtTekst}.`,
    ...(pref.ikkeValgt.length > 0 ? [setning(`har ${pref.ikkeValgt.join(" og ")} (ikke valgt)`)] : []),
  ].join(" ");

  const morkevarsel =
    morke.merke === "ok"
      ? ["Mørkevarsel: ingen.", setning(morke.tekst), ...morke.detalj.map(setning)].join(" ")
      : [`Mørkevarsel: ${morke.tekst.replace(/^Mørkevarsel: /, "")}.`, ...morke.detalj.map(setning)].join(" ");

  return [tittel, turtid, vaerklasse, opplevelse, morkevarsel].join(" ");
}

// --- Kortet ---

/**
 * Turkortet for et Turforslag (`RangertTur`) eller Alternativkortet for den korteste Turen
 * (`Alternativ`). Kaster når soltidene for Turdagen mangler, eller når et Rutesegment ikke finnes
 * i rutegeometrien.
 */
export function lagTurkort(kandidat: Kandidat, input: KortInput): Turkort {
  const { tur, turtidMin } = kandidat;
  const { sok, soltider, geometri, nummer, vaer } = input;

  const sol = soltider[sok.dato];
  if (!sol) throw new Error(`Soltidene mangler for Turdagen ${sok.dato}.`);
  const startUtc = osloTilUtc(sok.dato, sok.start);
  const tider: Tider = {
    startUtc,
    sluttUtc: startUtc + turtidMin * MINUTT_MS,
    oppUtc: sol.oppUtc,
    nedUtc: sol.nedUtc,
  };

  const pref = preferanser(tur, sok);
  const turen = darligVaer(kandidat);
  const kriterier: Turkort["kriterier"] = [
    tidRad(kandidat, sok.tilgjengeligMin),
    vaerRad(vaer, erAlternativ(kandidat) ? null : turen),
    onskerRad(pref),
    morkeRad(kandidat.morkevarsel, tider),
  ];
  const startpunkt = startpunktTekst(tur);
  const tilbake = klokke(tider.sluttUtc);

  return {
    turId: tur.id,
    mal: tur.mal,
    fra: fraTekst(tur),
    startpunktTekst: startpunkt,
    faktalinje: faktalinje(tur),
    kriterier,
    tidsstolpe: tidsstolpe(turtidMin, sok.tilgjengeligMin),
    dagslysstolpe: dagslysstolpe(tider),
    regeltekst: lagRegeltekst({ turtidMin, tilgjengeligMin: sok.tilgjengeligMin, vaer, treff: pref.treff, ...turen }),
    kartinfoboks: {
      navn: tur.navn,
      tekst: `${km(tur.lengde_km_totalt)} · ${tur.gradering_tekst} · ${startpunkt}`,
    },
    stokkoversiktRad: `${varighet(turtidMin)} uten pauser · tilbake ${tilbake}`,
    lesetekst: lesetekst(tur, kandidat, input, kriterier, pref),
    kilde: { navn: kildenavn(tur.kilde), url: tur.kilde },
    kart: kart(tur, geometri, nummer),
  };
}
