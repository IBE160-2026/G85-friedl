import { filtrerTurer, passerVanskelighetsgrad, type TurMedTid } from "./filtrering";
import { vurderMorke, type Morkevarsel, type Soltider } from "./morke";
import type { Sok } from "./sok";
import type { Tur } from "./turdata/skjema";
import { turtidMin } from "./turtid";
import type { VindusKlasse } from "./vaer/typer";
import { VAERPUNKT } from "./vaerpunkt";

// Anbefaling (FR-15–FR-18). Værklassen for Tidsvinduet avgjør bare rangeringen: ved dårlig eller
// frarådet vær rangeres lave og skjermede Turer øverst (FR-15). Ved god, middels og mangler er
// rangeringen den samme. Været fjerner aldri Turer, så filtreringen får ikke Værklassen.
// Alt er deterministisk: samme Søk, soltider og Turer gir samme svar, også i stokket rekkefølge.

/** Det rangeringen og Turkortet trenger om en Tur. */
export type RangertTur = TurMedTid & {
  morkevarsel: Morkevarsel | null;
  /** Antall av brukerens Opplevelsespreferanser Turen treffer, med utsikt. Det Turkortet viser. */
  treff: number;
  /** Høyeste punkt er under Værpunktets høyde (Lavtliggende tur). */
  lavtliggende: boolean;
  /** Egnet i dårlig vær fra Turdatasettet. `null` er ukjent. */
  egnetDarligVaer: boolean | null;
};

export type Alternativ = TurMedTid & {
  /** Hvor mange minutter mer Tilgjengelig tid Turen trenger. */
  trengerMerMin: number;
  morkevarsel: Morkevarsel | null;
};

export type Anbefaling =
  | { type: "turforslag"; forslag: RangertTur[] }
  | { type: "kortesteTur"; alternativ: Alternativ };

export const MAKS_TURFORSLAG = 3;

type SokForAnbefaling = Pick<Sok, "dato" | "start" | "tilgjengeligMin" | "vanskelighetsgrad" | "utsikt" | "vann">;

/** Sammenligner etter kodepunkt, uavhengig av språkinnstillinger. */
const etterId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function treff(tur: Tur, sok: Pick<Sok, "utsikt" | "vann">): number {
  return (sok.utsikt && tur.utsikt ? 1 : 0) + (sok.vann && tur.vann ? 1 : 0);
}

/** Treff uten utsikt, som rangeringen i dårlig vær bruker: bare vann teller. */
function treffUtenUtsikt(tur: Tur, sok: Pick<Sok, "vann">): number {
  return sok.vann && tur.vann ? 1 : 0;
}

/** Lavtliggende tur: høyeste punkt under `VAERPUNKT.hoydeMoh`, høyden Værmeldingen gjelder for. */
export function erLavtliggende(tur: Pick<Tur, "hoyeste_punkt_moh">): boolean {
  return tur.hoyeste_punkt_moh < VAERPUNKT.hoydeMoh;
}

/** Ved dårlig og frarådet vær brukes rangeringen for dårlig vær (FR-15). Kaster ved ukjent Værklasse. */
function erDarligVaer(vaerklasse: VindusKlasse): boolean {
  switch (vaerklasse) {
    case "darlig":
    case "fraradet":
      return true;
    case "god":
    case "middels":
    case "mangler":
      return false;
    default: {
      const ukjent: never = vaerklasse;
      throw new Error(`Ukjent Værklasse: ${String(ukjent)}`);
    }
  }
}

/** Egnet i dårlig vær: ja før ukjent før nei. */
const egnetRang = (egnet: boolean | null) => (egnet === true ? 0 : egnet === null ? 1 : 2);

/**
 * Rangerer Turene som passer (FR-15, FR-16). Ingen Turer fjernes. `passer` skal ha gått gjennom
 * `filtrerTurer`, så Turtid ≤ Tilgjengelig tid og «nærmest» betyr minst ledig tid.
 *
 * Ved god, middels og mangler: uten Mørkevarsel først, så flest treff på Opplevelsespreferanser,
 * så Turtid nærmest Tilgjengelig tid, og til slutt ID i kodepunktrekkefølge.
 *
 * Ved dårlig og frarådet: uten Mørkevarsel først, så Lavtliggende tur, så Egnet i dårlig vær
 * (ja, ukjent, nei), så flest treff uten utsikt, så Turtid nærmest Tilgjengelig tid, og til slutt ID.
 */
export function rangerTurer(
  passer: readonly TurMedTid[],
  sok: SokForAnbefaling,
  soltider: Soltider,
  vaerklasse: VindusKlasse,
): RangertTur[] {
  const darlig = erDarligVaer(vaerklasse);
  return passer
    .map((t) => ({
      ...t,
      morkevarsel: vurderMorke(sok, t.turtidMin, soltider),
      treff: treff(t.tur, sok),
      lavtliggende: erLavtliggende(t.tur),
      egnetDarligVaer: t.tur.egnet_darlig_vaer,
    }))
    .sort(
      (a, b) =>
        Number(a.morkevarsel !== null) - Number(b.morkevarsel !== null) ||
        (darlig
          ? Number(b.lavtliggende) - Number(a.lavtliggende) ||
            egnetRang(a.egnetDarligVaer) - egnetRang(b.egnetDarligVaer) ||
            treffUtenUtsikt(b.tur, sok) - treffUtenUtsikt(a.tur, sok)
          : b.treff - a.treff) ||
        Math.abs(sok.tilgjengeligMin - a.turtidMin) - Math.abs(sok.tilgjengeligMin - b.turtidMin) ||
        etterId(a.tur.id, b.tur.id),
    );
}

/**
 * Opptil tre Turforslag (FR-17). Først den høyest rangerte Turen per Mål, i rangeringsrekkefølge
 * (variasjonsregelen). Gir det færre enn tre, fylles listen med de neste Turene i rangeringen,
 * etter variasjonsvalgene. Listen fylles aldri med Turer som ikke er i `rangert`.
 */
export function velgTurforslag<T extends TurMedTid>(rangert: readonly T[]): T[] {
  const valgt: T[] = [];
  const maal = new Set<string>();
  for (const t of rangert) {
    if (valgt.length === MAKS_TURFORSLAG) break;
    if (!maal.has(t.tur.mal)) {
      maal.add(t.tur.mal);
      valgt.push(t);
    }
  }
  for (const t of rangert) {
    if (valgt.length === MAKS_TURFORSLAG) break;
    if (!valgt.includes(t)) valgt.push(t);
  }
  return valgt;
}

/**
 * Den korteste Turen innenfor valgt Vanskelighetsgrad som Alternativ (FR-18), med hvor mye mer tid
 * den trenger og Mørkevarsel etter samme regel (FR-21). Lik Turtid avgjøres på ID. Kaster når ingen
 * Tur har en Vanskelighetsgrad som passer, siden Resultatet aldri skal være tomt.
 */
export function kortesteTur(turer: readonly Tur[], sok: SokForAnbefaling, soltider: Soltider): Alternativ {
  const kandidater = turer
    .filter((tur) => passerVanskelighetsgrad(tur.gradering, sok.vanskelighetsgrad))
    .map((tur) => ({ tur, turtidMin: turtidMin(tur) }))
    .sort((a, b) => a.turtidMin - b.turtidMin || etterId(a.tur.id, b.tur.id));
  const [korteste] = kandidater;
  if (!korteste) throw new Error(`Ingen Tur har Vanskelighetsgrad ${sok.vanskelighetsgrad} eller lettere.`);
  return {
    ...korteste,
    trengerMerMin: Math.max(0, korteste.turtidMin - sok.tilgjengeligMin),
    morkevarsel: vurderMorke(sok, korteste.turtidMin, soltider),
  };
}

/**
 * Turforslagene, eller den korteste Turen som Alternativ når ingen Tur passer. `vaerklasse` er
 * Værklassen for Tidsvinduet og påvirker bare rangeringen.
 */
export function anbefal(
  turer: readonly Tur[],
  sok: SokForAnbefaling,
  soltider: Soltider,
  vaerklasse: VindusKlasse,
): Anbefaling {
  const passer = filtrerTurer(turer, sok);
  if (passer.length === 0) return { type: "kortesteTur", alternativ: kortesteTur(turer, sok, soltider) };
  return { type: "turforslag", forslag: velgTurforslag(rangerTurer(passer, sok, soltider, vaerklasse)) };
}
