import { anbefal, type Anbefaling } from "../anbefaling";
import { finnBedreTidsvindu } from "../bedre-tidsvindu";
import { dag, tall, tallord, temperaturTekst, varighet } from "../format";
import type { Soltider } from "../morke";
import { OPPLEVELSESPREFERANSER, type VaerGrunnlag } from "../regeltekst";
import type { NormalisertSok, Sok } from "../sok";
import { kvarterOpp, leggTilDager, osloDato, osloTilUtc } from "../tid";
import { lagTurkort } from "../turkort";
import { GRADERINGSTEKST, type Tur } from "../turdata/skjema";
import type { Rutegeometri } from "../turdata/rutegeometri";
import { klasseTekst, lagVaerVurdert, type Tidsvinduoppsummering, type VaerVurdert } from "../vaer/sammendrag";
import { type KlasseTerskel, VAERTERSKLER, type Vaerterskler } from "../vaer/terskler";
import type { Vaerklasse, Vaermelding } from "../vaer/typer";
import { nedborOrd, vindOrd } from "../vaerord";
import type { BedreTidsvindu, DittSok, Kriterium, Resultatvisning, Utfall, Vaer } from "./skjema";

// Resultatvisningen (AD-3, FR-6, FR-11–FR-13): overskrift, Ditt søk, live-tekst, været, utfallet og
// Bedre tidsvindu, laget av Søket, Anbefalingen, soltidene og Værklassen for Tidsvinduet.
// Rent og deterministisk: `resultatId`, «nå» og Værmeldingen kommer fra skallet.
// `lagResultatvisning` setter det hele sammen for ett Søk og en Værmelding: Værklassen avgjøres én gang,
// og de samme Værtersklene brukes overalt.
// Tabellen i FR-6: god og middels gir Værsammendraget, dårlig gir også Værvarslingen og Bedre
// tidsvindu, frarådet gir Frarådet-utfallet og Bedre tidsvindu, og mangler gir oppførselen fra Epic 1.
// `liveTekst` er overskriften, og ved dårlig vær også tittelen på Værvarslingen, så den meldes (UX-DR19).

/** Været for Tidsvinduet slik visningen får det fra skallet. */
export type VisningVaer =
  | { type: "mangler" }
  | {
      type: "vurdert";
      /** Værsammendraget fra `lagVaerVurdert`. */
      vaer: VaerVurdert;
      /** Grunnlaget for Turkortene og Regelteksten fra `lagVaerVurdert`. */
      grunnlag: VaerGrunnlag;
      /** Oppsummeringen av Tidsvinduet. Værvarslingen og Frarådet-meldingen trenger verdiene. */
      oppsummering: Tidsvinduoppsummering;
    };

export type VisningInput = {
  resultatId: string;
  /** Søket etter `normaliserSok`, med `justering` når det ble endret. */
  normalisert: NormalisertSok;
  /** «Nå» som epoke-ms i UTC. Avgjør om Turdagen er i dag eller i morgen. */
  na: number;
  /** Anbefalingen, eller `null` ved Værklasse frarådet, der ingen Turforslag lages. */
  anbefaling: Anbefaling | null;
  soltider: Soltider;
  geometri: Rutegeometri;
  vaer: VisningVaer;
  /** Bedre tidsvindu fra `finnBedreTidsvindu`, eller `null`. */
  bedreTidsvindu: BedreTidsvindu | null;
  terskler?: Vaerterskler;
};

const VAER_MANGLER_TEKST = "Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.";

const storForbokstav = (tekst: string) => tekst.charAt(0).toUpperCase() + tekst.slice(1);

/**
 * «I dag, man. 9. nov.» eller «I morgen, tir. 10. nov.». Kaster for andre datoer, som
 * normaliserSok allerede har satt tilbake til standard.
 */
function turdagTekst(dato: string, na: number): string {
  const iDag = osloDato(na);
  if (dato === iDag) return `I dag, ${dag(dato)}`;
  if (dato === leggTilDager(iDag, 1)) return `I morgen, ${dag(dato)}`;
  throw new Error(`Turdagen ${dato} er verken i dag eller i morgen. Søket er ikke normalisert.`);
}

function dittSok(sok: Sok, na: number): DittSok {
  return {
    turdag: turdagTekst(sok.dato, na),
    starttidspunkt: sok.start,
    tilgjengeligTid: varighet(sok.tilgjengeligMin),
    vanskelighetsgrad: GRADERINGSTEKST[sok.vanskelighetsgrad],
    opplevelsespreferanser: OPPLEVELSESPREFERANSER.filter((p) => sok[p]),
  };
}

const INGEN_TURFORSLAG = "Ingen Turforslag";
const FRARADET_TID_DETALJ = "Frarådet går foran tid og ønsker.";

/**
 * Overskriften etter State Patterns i EXPERIENCE.md: «Ingen Turforslag» ved frarådet, «Ingen Tur passer
 * 15 min.» med den korteste Turen, og ellers «Tre Turforslag» med «som passer nå» (god og middels),
 * «i dårlig vær» (dårlig) eller «som passer tiden din» (mangler).
 */
function overskrift(anbefaling: Anbefaling | null, sok: Sok, klasse: Vaerklasse | null): string {
  if (anbefaling === null) return INGEN_TURFORSLAG;
  if (anbefaling.type === "kortesteTur") return `Ingen Tur passer ${varighet(sok.tilgjengeligMin)}.`;
  const antall = storForbokstav(tallord(anbefaling.forslag.length));
  if (klasse === null) return `${antall} Turforslag som passer tiden din`;
  if (klasse === "darlig") return `${antall} Turforslag i dårlig vær`;
  return `${antall} Turforslag som passer nå`;
}

/** Grensene for `klasse` i Værtersklene. Kaster når klassen mangler i tersklene. */
function grenser(terskler: Vaerterskler, klasse: KlasseTerskel["klasse"]): KlasseTerskel {
  const funnet = terskler.klasser.find((k) => k.klasse === klasse);
  if (!funnet) throw new Error(`Værtersklene mangler klassen ${klasse}.`);
  return funnet;
}

const minst = (verdi: number, grense: number | null) => grense !== null && verdi >= grense;
const under = (verdi: number, grense: number | null) => grense !== null && verdi < grense;

type Vaervarsling = NonNullable<Extract<Vaer, { type: "vurdert" }>["vaervarsling"]>;

/**
 * Værvarslingen ved dårlig vær. Tittelen er «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00»,
 * og teksten er verdiene: «Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.». Verdiene som nådde
 * terskelen for dårlig, står først. Innenfor gruppene står de i rekkefølgen nedbør, vind, temperatur.
 */
function vaervarsling(o: Tidsvinduoppsummering, tidsvindu: string, terskler: Vaerterskler): Vaervarsling {
  const g = grenser(terskler, "darlig");
  const verdier = [
    { tekst: `nedbør opptil ${tall(o.maksNedborMmT)} mm/t`, utlost: minst(o.maksNedborMmT, g.nedbor_mm_t_minst) },
    { tekst: `vind opptil ${tall(o.maksVindMs)} m/s`, utlost: minst(o.maksVindMs, g.vind_ms_minst) },
    { tekst: temperaturTekst(o.minTempC, o.maksTempC), utlost: under(o.minTempC, g.temp_c_under) },
  ];
  const ordnet = [...verdier.filter((v) => v.utlost), ...verdier.filter((v) => !v.utlost)];
  return {
    tittel: `Værvarsling: ${klasseTekst("darlig")} i Tidsvinduet ${tidsvindu}`,
    tekst: `${storForbokstav(ordnet.map((v) => v.tekst).join(", "))}.`,
  };
}

/**
 * Værordene for verdiene som nådde terskelen for frarådet, i rekkefølgen vind, nedbør og temperatur,
 * bundet med « og »: «sterk kuling, vind opp mot 19 m/s» eller «temperatur ned mot −12 °C». Med
 * Værklasse frarådet fra de samme tersklene har minst én verdi nådd terskelen. Kaster ellers.
 */
function fraradetDeler(o: Tidsvinduoppsummering, terskler: Vaerterskler): string {
  const g = grenser(terskler, "fraradet");
  const deler = [
    ...(minst(o.maksVindMs, g.vind_ms_minst) ? [vindOrd(o.maksVindMs, terskler)] : []),
    ...(minst(o.maksNedborMmT, g.nedbor_mm_t_minst) ? [nedborOrd(o.maksNedborMmT, terskler)] : []),
    ...(under(o.minTempC, g.temp_c_under) ? [`temperatur ned mot ${temperaturTekst(o.minTempC, o.minTempC)}`] : []),
  ];
  if (deler.length === 0) throw new Error("Værklassen er frarådet, men ingen verdi nådde terskelen for frarådet.");
  return deler.join(" og ");
}

function vaer(input: VisningVaer, terskler: Vaerterskler): Vaer {
  switch (input.type) {
    case "mangler":
      return { type: "mangler", tekst: VAER_MANGLER_TEKST };
    case "vurdert": {
      const { vaer: vurdert, oppsummering } = input;
      if (vurdert.klasse !== "darlig") return vurdert;
      return { ...vurdert, vaervarsling: vaervarsling(oppsummering, vurdert.tidsvindu, terskler) };
    }
  }
}

/** Frarådet-utfallet: meldingen og radene Vær og Tid. */
function fraradet(input: Extract<VisningVaer, { type: "vurdert" }>, terskler: Vaerterskler): Utfall {
  const deler = fraradetDeler(input.oppsummering, terskler);
  const vaerRad: Kriterium & { rad: "vaer" } = {
    rad: "vaer",
    merke: "se-opp",
    tekst: klasseTekst("fraradet"),
    detalj: [deler],
  };
  const tidRad: Kriterium & { rad: "tid" } = {
    rad: "tid",
    merke: "ingen",
    tekst: "ikke vurdert",
    detalj: [FRARADET_TID_DETALJ],
  };
  return {
    type: "fraradet",
    melding: `Det er meldt ${deler} i Tidsvinduet ditt (${input.vaer.tidsvindu}).`,
    kriterier: [vaerRad, tidRad],
  };
}

function utfall(input: VisningInput, terskler: Vaerterskler): Utfall {
  const { anbefaling, soltider, geometri } = input;
  const { sok } = input.normalisert;
  const vaerInput = input.vaer;
  const vedFraradet = vaerInput.type === "vurdert" && vaerInput.vaer.klasse === "fraradet" ? vaerInput : null;

  if (anbefaling === null) {
    if (vedFraradet === null) throw new Error("Anbefalingen mangler, men Værklassen er ikke frarådet.");
    return fraradet(vedFraradet, terskler);
  }
  if (vedFraradet !== null) throw new Error("Værklassen er frarådet, men Anbefalingen har Turer.");

  const vaerGrunnlag: VaerGrunnlag = vaerInput.type === "vurdert" ? vaerInput.grunnlag : { type: "mangler" };
  const felles = { sok, soltider, geometri, vaer: vaerGrunnlag };

  if (anbefaling.type === "kortesteTur") {
    const { alternativ } = anbefaling;
    return {
      type: "kortesteTur",
      kort: lagTurkort(alternativ, { ...felles, nummer: 1, antall: 1 }),
      passerMedTekst: `Med ${varighet(kvarterOpp(alternativ.turtidMin))} eller mer passer minst én Tur.`,
    };
  }

  const antall = anbefaling.forslag.length;
  return {
    type: "turforslag",
    kort: anbefaling.forslag.map((forslag, i) => lagTurkort(forslag, { ...felles, nummer: i + 1, antall })),
  };
}

/**
 * Resultatvisningen for ett Søk. Skallet validerer den mot `ResultatvisningSkjema`. Kaster når
 * `anbefaling` er `null` uten Værklasse frarådet, eller ikke er `null` med den.
 */
export function lagVisning(input: VisningInput): Resultatvisning {
  const { resultatId, normalisert, na, anbefaling, bedreTidsvindu, terskler = VAERTERSKLER } = input;
  const { sok, justering } = normalisert;
  const klasse = input.vaer.type === "vurdert" ? input.vaer.vaer.klasse : null;
  const tittel = overskrift(anbefaling, sok, klasse);
  const vaeret = vaer(input.vaer, terskler);
  const varsling = vaeret.type === "vurdert" ? vaeret.vaervarsling : undefined;
  return {
    resultatId,
    sok,
    ...(justering !== undefined ? { justering } : {}),
    overskrift: tittel,
    dittSok: dittSok(sok, na),
    liveTekst: varsling ? `${tittel.endsWith(".") ? tittel : `${tittel}.`} ${varsling.tittel}.` : tittel,
    vaer: vaeret,
    utfall: utfall(input, terskler),
    ...(bedreTidsvindu !== null ? { bedreTidsvindu } : {}),
  };
}

const MINUTT_MS = 60_000;

export type ResultatvisningInput = {
  resultatId: string;
  /** Søket etter `normaliserSok`, med `justering` når det ble endret. */
  normalisert: NormalisertSok;
  /** «Nå» som epoke-ms i UTC. */
  na: number;
  /** Værmeldingen, eller `null` når den mangler (FR-13). */
  melding: Vaermelding | null;
  /** Hele Turdatasettet. */
  turer: readonly Tur[];
  /** Soltidene for Turdagen og dagen etter. */
  soltider: Soltider;
  geometri: Rutegeometri;
  terskler?: Vaerterskler;
};

/**
 * Resultatvisningen for ett Søk og en Værmelding. Tidsvinduet er hele Tilgjengelig tid fra
 * Starttidspunktet (FR-9), og Værklassen kommer fra `lagVaerVurdert`, eller er `mangler` når
 * Værmeldingen mangler eller ikke dekker Tidsvinduet. Ved frarådet lages ingen Anbefaling (FR-6).
 */
export function lagResultatvisning({
  resultatId,
  normalisert,
  na,
  melding,
  turer,
  soltider,
  geometri,
  terskler = VAERTERSKLER,
}: ResultatvisningInput): Resultatvisning {
  const { sok } = normalisert;
  const startUtc = osloTilUtc(sok.dato, sok.start);
  const sluttUtc = startUtc + sok.tilgjengeligMin * MINUTT_MS;
  const vurdert = melding ? lagVaerVurdert({ melding, startUtc, sluttUtc, terskler }) : null;
  const klasse = vurdert ? vurdert.oppsummering.klasse : "mangler";

  return lagVisning({
    resultatId,
    normalisert,
    na,
    anbefaling: klasse === "fraradet" ? null : anbefal(turer, sok, soltider, klasse),
    soltider,
    geometri,
    vaer: vurdert ? { type: "vurdert", ...vurdert } : { type: "mangler" },
    bedreTidsvindu: melding ? finnBedreTidsvindu({ sok, klasse, na, melding, soltider, turer, terskler }) : null,
    terskler,
  });
}
