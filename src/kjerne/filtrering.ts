import type { Sok } from "./sok";
import type { Tur } from "./turdata/skjema";
import { turtidMin } from "./turtid";

// Filtrering (FR-15): Turer med Turtid over Tilgjengelig tid fjernes (lik tid er med), og Turer
// som er vanskeligere enn valgt Vanskelighetsgrad, fjernes (G < B < R). Været og Mørkevarselet
// fjerner aldri Turer. Predikatene eksporteres, så den korteste Turen (FR-18) kan bruke bare
// Vanskelighetsgraden.

type Vanskelighetsgrad = Sok["vanskelighetsgrad"];

/** En Tur med Turtiden regnet ut, så senere regler slipper å regne den på nytt. */
export type TurMedTid = { tur: Tur; turtidMin: number };

const NIVA: Record<Vanskelighetsgrad, number> = { G: 1, B: 2, R: 3 };

/** Turtiden er innenfor Tilgjengelig tid. Lik tid er med. */
export function passerTid(turtidMin: number, tilgjengeligMin: number): boolean {
  return turtidMin <= tilgjengeligMin;
}

/** Turen er ikke vanskeligere enn valgt Vanskelighetsgrad (G < B < R). */
export function passerVanskelighetsgrad(gradering: Vanskelighetsgrad, valgt: Vanskelighetsgrad): boolean {
  return NIVA[gradering] <= NIVA[valgt];
}

/** Turene som passer både Tilgjengelig tid og Vanskelighetsgrad, i samme rekkefølge som `turer`. */
export function filtrerTurer(
  turer: readonly Tur[],
  sok: Pick<Sok, "tilgjengeligMin" | "vanskelighetsgrad">,
): TurMedTid[] {
  return turer
    .map((tur) => ({ tur, turtidMin: turtidMin(tur) }))
    .filter(
      ({ tur, turtidMin: tid }) =>
        passerVanskelighetsgrad(tur.gradering, sok.vanskelighetsgrad) && passerTid(tid, sok.tilgjengeligMin),
    );
}
