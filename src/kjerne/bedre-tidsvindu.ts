import { filtrerTurer } from "./filtrering";
import { heltall } from "./format";
import { MARGIN_FOR_SOLNEDGANG_MIN, vurderMorke, type Soltider } from "./morke";
import { erPassert, SENEST_MIN, TIDLIGST_MIN, type Sok } from "./sok";
import { klokkeTekst, leggTilDager, osloDato, osloTilUtc } from "./tid";
import type { Tur } from "./turdata/skjema";
import { VAERTERSKLER, type Vaerterskler } from "./vaer/terskler";
import type { Vaerklasse, Vaermelding, VindusKlasse } from "./vaer/typer";
import { erBedreKlasse, klasseForTidsvindu } from "./vaer/vaerklasse";
import type { BedreTidsvindu } from "./visning/skjema";

// Bedre tidsvindu (FR-19, UJ-2, UJ-3): ved dårlig eller frarådet vær leter appen etter det tidligste
// Starttidspunktet med en strengt bedre Værklasse, med samme Tilgjengelig tid. Kandidatene er hele
// timer fra soloppgang til 30 min før solnedgang, innenfor 06:00–22:00, på Turdagen og i morgen når
// Turdag er i dag. Passerte Starttidspunkter og vinduer med en manglende time hoppes over (AR-6).
// Første treff vinner: appen bytter ikke dag fordi en annen dag gir flere Turer.
// Ren og deterministisk: klokka, Værmeldingen og soltidene kommer inn som argumenter.

export type BedreTidsvinduInput = {
  /** Det normaliserte Søket. */
  sok: Sok;
  /** Værklassen for Søkets Tidsvindu. */
  klasse: VindusKlasse;
  /** «Nå» som epoke-ms i UTC. */
  na: number;
  melding: Vaermelding;
  /** Soltidene for Turdagen, og for dagen etter når Turdag er i dag. */
  soltider: Soltider;
  /** Hele Turdatasettet. */
  turer: readonly Tur[];
  terskler?: Vaerterskler;
};

const MINUTT_MS = 60_000;
const TIME_MIN = 60;

const KLASSEORD: Record<Vaerklasse, string> = {
  god: "god",
  middels: "middels",
  darlig: "dårlig",
  fraradet: "frarådet",
};

const INGEN_I_DAG = "Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.";
const INGEN_I_MORGEN = "Det finnes ikke noe bedre tidsvindu i dagslys i morgen.";
const INGEN_TUR = "Ingen Tur passer før mørket.";
const EN_TUR = "1 Tur passer før mørket.";
const flereTurer = (n: number) => `${heltall(n)} Turer passer før mørket.`;
const tekst = (dagord: string, start: string, klasse: Vaerklasse) =>
  `${dagord} fra kl. ${start} er Værklassen ${KLASSEORD[klasse]}.`;
const knappIDag = (start: string) => `Bruk ${start}`;
const knappIMorgen = (start: string) => `Bruk i morgen ${start}`;

function antallTekst(n: number): string {
  if (n === 0) return INGEN_TUR;
  if (n === 1) return EN_TUR;
  return flereTurer(n);
}

/** Hele timer på `dato` fra soloppgang til 30 min før solnedgang, innenfor 06:00–22:00, som 'HH:MM'. */
function kandidater(dato: string, soltider: Soltider): string[] {
  const sol = soltider[dato];
  if (!sol) throw new Error(`Soltidene mangler for ${dato}.`);
  const senestUtc = sol.nedUtc - MARGIN_FOR_SOLNEDGANG_MIN * MINUTT_MS;
  const ut: string[] = [];
  for (let min = TIDLIGST_MIN; min <= SENEST_MIN; min += TIME_MIN) {
    const start = klokkeTekst(min);
    const utc = osloTilUtc(dato, start);
    if (utc >= sol.oppUtc && utc <= senestUtc) ut.push(start);
  }
  return ut;
}

/**
 * Det tidligste Bedre tidsvinduet, eller `ingen` når det ikke finnes noe. Gir `null` ved `god`,
 * `middels` og `mangler`, fordi Bedre tidsvindu bare vises ved dårlig og frarådet vær.
 * Kaster når Søket ikke er normalisert (Turdag er verken i dag eller i morgen), og når soltidene
 * mangler for en av dagene som prøves.
 */
export function finnBedreTidsvindu({
  sok,
  klasse,
  na,
  melding,
  soltider,
  turer,
  terskler = VAERTERSKLER,
}: BedreTidsvinduInput): BedreTidsvindu | null {
  if (klasse !== "darlig" && klasse !== "fraradet") return null;

  const iDag = osloDato(na);
  const turdagErIDag = sok.dato === iDag;
  if (!turdagErIDag && sok.dato !== leggTilDager(iDag, 1)) {
    throw new Error(`Søket er ikke normalisert: Turdagen ${sok.dato} er verken i dag eller i morgen.`);
  }
  const dager = turdagErIDag ? [sok.dato, leggTilDager(sok.dato, 1)] : [sok.dato];

  for (const dato of dager) {
    for (const start of kandidater(dato, soltider)) {
      if (erPassert(dato, start, na)) continue;
      const startUtc = osloTilUtc(dato, start);
      const kandidat = klasseForTidsvindu(melding, startUtc, startUtc + sok.tilgjengeligMin * MINUTT_MS, terskler);
      if (kandidat === "mangler" || !erBedreKlasse(kandidat, klasse)) continue;

      const nyttSok: Sok = { ...sok, dato, start };
      const antall = filtrerTurer(turer, sok).filter(
        (t) => vurderMorke(nyttSok, t.turtidMin, soltider) === null,
      ).length;
      return {
        type: "funnet",
        nyttSok,
        tekst: tekst(dato === iDag ? "I dag" : "I morgen", start, kandidat),
        antallTekst: antallTekst(antall),
        knappTekst: dato === sok.dato ? knappIDag(start) : knappIMorgen(start),
      };
    }
  }

  return { type: "ingen", tekst: turdagErIDag ? INGEN_I_DAG : INGEN_I_MORGEN };
}
