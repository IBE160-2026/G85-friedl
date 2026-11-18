import type { Tur } from "./turdata/skjema";

// Turtid (FR-14): Naismiths regel uten pauser. Lengde totalt ÷ 5 km/t + høydemeter ÷ 600 m/t,
// rundet til nærmeste hele minutt. Halve minutter rundes opp.

const KM_PER_TIME = 5;
const HOYDEMETER_PER_TIME = 600;

/**
 * Minuttene rundes til så mange desimaler før avrundingen til helt minutt, så flyttallsstøy
 * (6,4999999…) ikke avgjør. Det forutsetter at den sanne verdien har få desimaler. Lengde med
 * to desimaler og hele høydemeter gir minutter i hele hundredeler, som i Turdatasettet.
 */
const PRESISJON = 1e6;

/** Turtid i hele minutter for en Tur. */
export function turtidMin(tur: Pick<Tur, "lengde_km_totalt" | "hoydemeter">): number {
  const minutter = (tur.lengde_km_totalt / KM_PER_TIME) * 60 + (tur.hoydemeter / HOYDEMETER_PER_TIME) * 60;
  return Math.round(Math.round(minutter * PRESISJON) / PRESISJON);
}
