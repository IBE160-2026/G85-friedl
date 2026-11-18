import { dag, klokke, varighet } from "../format";
import {
  erIDagLast,
  erPassert,
  KVARTER_MIN,
  lagStandardSok,
  MEST_TILGJENGELIG_MIN,
  MINST_TILGJENGELIG_MIN,
  SENEST_MIN,
  TIDLIGST_MIN,
} from "../sok";
import { klokkeTekst, leggTilDager, osloDato } from "../tid";
import type { Tur } from "../turdata/skjema";
import type { Sidedata, Turdag } from "./sidedata";

// Sidedataene (AD-18): Turdager med låste Starttidspunkter, valgene for Tilgjengelig tid,
// standard-Søket, Startpunktene og telleteksten. Rent: «nå» og Turene kommer fra skallet.
// Grensene og låsereglene kommer fra sok.ts, så skjemaet og normaliserSok ikke kan gli fra hverandre.

export type SidedataInput = {
  /** «Nå» som epoke-ms i UTC. */
  na: number;
  turer: readonly Tur[];
  demo: { id: string; beskrivelse: string } | null;
};

/** Starttidspunktene 06:00–22:00 hvert kvarter. */
const STARTTIDER: string[] = Array.from(
  { length: (SENEST_MIN - TIDLIGST_MIN) / KVARTER_MIN + 1 },
  (_, i) => klokkeTekst(TIDLIGST_MIN + i * KVARTER_MIN),
);

function turdag(dato: string, etikett: string, na: number, last: boolean): Turdag {
  return {
    dato,
    etikett,
    last,
    startvalg: STARTTIDER.map((verdi) => ({ verdi, last: erPassert(dato, verdi, na) })),
  };
}

function startpunkter(turer: readonly Tur[]): Sidedata["startpunkter"] {
  const etterNavn = new Map<string, Sidedata["startpunkter"][number]>();
  for (const { startpunkt } of turer) {
    if (!etterNavn.has(startpunkt.navn)) {
      etterNavn.set(startpunkt.navn, { navn: startpunkt.navn, lat: startpunkt.lat, lon: startpunkt.lon });
    }
  }
  return [...etterNavn.values()];
}

const flertall = (n: number, en: string, flere: string) => `${n} ${n === 1 ? en : flere}`;

/** Sidedataene for øyeblikket `na`. Skallet validerer dem mot `SidedataSkjema`. */
export function byggSidedata({ na, turer, demo }: SidedataInput): Sidedata {
  const iDag = osloDato(na);
  const iDagLast = erIDagLast(na);
  const punkter = startpunkter(turer);

  return {
    demo: demo === null ? null : { ...demo, naTekst: `${dag(iDag)} ${klokke(na)}` },
    skjema: {
      turdager: [turdag(iDag, "I dag", na, iDagLast), turdag(leggTilDager(iDag, 1), "I morgen", na, false)],
      tilgjengeligTid: Array.from(
        { length: (MEST_TILGJENGELIG_MIN - MINST_TILGJENGELIG_MIN) / KVARTER_MIN + 1 },
        (_, i) => {
          const verdi = MINST_TILGJENGELIG_MIN + i * KVARTER_MIN;
          return { verdi, etikett: varighet(verdi) };
        },
      ),
      standardSok: lagStandardSok(na),
    },
    startpunkter: punkter,
    telletekst: `${flertall(turer.length, "Tur", "Turer")} fra ${flertall(punkter.length, "Startpunkt", "Startpunkter")}`,
  };
}
