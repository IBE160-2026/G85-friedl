import type { Soltid } from "./sol";
import type { Sok } from "./sok";
import { klokke } from "./format";
import { osloTilUtc } from "./tid";

// Mørkevarsel (FR-21): ender Turen senere enn 30 min før solnedgang, eller starter den før
// soloppgang, får den et Mørkevarsel med klokkeslettet og tipset. Marginen veier opp for at
// Turtid er uten pauser. Mørkevarselet fjerner aldri Turer (FR-15); rangeringen bruker det (FR-16).

/** Sol opp og ned per Oslo-dato 'YYYY-MM-DD' (AD-11). Orkestreringen bygger objektet. */
export type Soltider = Record<string, Soltid>;

export type Morkevarsel = {
  arsak: "solnedgang" | "soloppgang";
  /** Solnedgangen eller soloppgangen varselet gjelder. */
  tidspunktUtc: number;
  /** Klokkeslettet for `tidspunktUtc` i Oslo, 'HH:MM'. */
  klokkeslett: string;
  tips: typeof TIPS;
};

export const TIPS = "Lurt å ta med hodelykt.";

/** Turen må være ferdig så lenge før solnedgang. */
export const MARGIN_FOR_SOLNEDGANG_MIN = 30;

const MINUTT_MS = 60_000;

/**
 * Mørkevarselet for en Tur som starter ved Søkets Starttidspunkt og varer `turtidMin` minutter,
 * eller `null`. Soltidene for Turdagen (`sok.dato`) gjelder, også når Turen ender etter midnatt.
 * Kaster når Turdagen mangler i `soltider`. Slår begge reglene inn, gjelder solnedgang.
 */
export function vurderMorke(
  sok: Pick<Sok, "dato" | "start">,
  turtidMin: number,
  soltider: Soltider,
): Morkevarsel | null {
  const sol = soltider[sok.dato];
  if (!sol) throw new Error(`Soltidene mangler for Turdagen ${sok.dato}.`);

  const startUtc = osloTilUtc(sok.dato, sok.start);
  const sluttUtc = startUtc + turtidMin * MINUTT_MS;

  if (sluttUtc > sol.nedUtc - MARGIN_FOR_SOLNEDGANG_MIN * MINUTT_MS) return varsel("solnedgang", sol.nedUtc);
  if (startUtc < sol.oppUtc) return varsel("soloppgang", sol.oppUtc);
  return null;
}

function varsel(arsak: Morkevarsel["arsak"], tidspunktUtc: number): Morkevarsel {
  // format.klokke avkorter til hele minutter, som en klokke viser det. Soltidene fra sol.ts er alt hele minutter.
  return { arsak, tidspunktUtc, klokkeslett: klokke(tidspunktUtc), tips: TIPS };
}
