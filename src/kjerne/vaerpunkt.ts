// Værpunktet (PRD §3): ett fast punkt midt i Moldemarka på 400 moh som representerer hele området.
// Brukes for sol opp og ned (FR-21) og senere for Værmeldingen fra MET (FR-13).

export type Punkt = { lat: number; lon: number };

/**
 * Høyden er for Værmeldingen (MET-kallet med `altitude=400`). Solberegningen bruker den med vilje
 * ikke: høydekorreksjon ville flyttet solnedgangen 9. november fra 15:59 til ca. 16:05 (addendum).
 */
export const VAERPUNKT = { lat: 62.7617, lon: 7.1679, hoydeMoh: 400 } as const;
