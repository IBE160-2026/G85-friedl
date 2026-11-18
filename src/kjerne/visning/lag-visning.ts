import type { Anbefaling } from "../anbefaling";
import { dag, tallord, varighet } from "../format";
import type { Soltider } from "../morke";
import { OPPLEVELSESPREFERANSER, type VaerGrunnlag } from "../regeltekst";
import type { NormalisertSok, Sok } from "../sok";
import { kvarterOpp, leggTilDager, osloDato } from "../tid";
import { lagTurkort } from "../turkort";
import { GRADERINGSTEKST } from "../turdata/skjema";
import type { Rutegeometri } from "../turdata/rutegeometri";
import type { DittSok, Resultatvisning, Utfall, Vaer } from "./skjema";

// Resultatvisningen (AD-3, FR-13): overskrift, Ditt søk, live-tekst, været og utfallet, laget av
// Søket, Anbefalingen og soltidene. Rent og deterministisk: `resultatId` og «nå» kommer fra skallet.
// Værklassen, Værvarsling og Bedre tidsvindu kommer i Epic 2. Til da mangler Værmeldingen alltid.

export type VisningInput = {
  resultatId: string;
  /** Søket etter `normaliserSok`, med `justering` når det ble endret. */
  normalisert: NormalisertSok;
  /** «Nå» som epoke-ms i UTC. Avgjør om Turdagen er i dag eller i morgen. */
  na: number;
  anbefaling: Anbefaling;
  soltider: Soltider;
  geometri: Rutegeometri;
  vaer: VaerGrunnlag;
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

/**
 * Overskriften etter State Patterns i EXPERIENCE.md, når Værmeldingen mangler:
 * «Tre Turforslag som passer tiden din», eller «Ingen Tur passer 15 min.».
 */
function overskrift(anbefaling: Anbefaling, sok: Sok): string {
  if (anbefaling.type === "kortesteTur") return `Ingen Tur passer ${varighet(sok.tilgjengeligMin)}.`;
  return `${storForbokstav(tallord(anbefaling.forslag.length))} Turforslag som passer tiden din`;
}

function vaer(grunnlag: VaerGrunnlag): Vaer {
  switch (grunnlag.type) {
    case "mangler":
      return { type: "mangler", tekst: VAER_MANGLER_TEKST };
  }
}

function utfall(input: VisningInput): Utfall {
  const { anbefaling, soltider, geometri, vaer: vaerGrunnlag } = input;
  const { sok } = input.normalisert;
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

/** Resultatvisningen for ett Søk. Skallet validerer den mot `ResultatvisningSkjema`. */
export function lagVisning(input: VisningInput): Resultatvisning {
  const { resultatId, normalisert, na, anbefaling } = input;
  const { sok, justering } = normalisert;
  const tittel = overskrift(anbefaling, sok);
  return {
    resultatId,
    sok,
    ...(justering !== undefined ? { justering } : {}),
    overskrift: tittel,
    dittSok: dittSok(sok, na),
    liveTekst: tittel,
    vaer: vaer(input.vaer),
    utfall: utfall(input),
  };
}
