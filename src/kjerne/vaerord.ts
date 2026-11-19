import { tall } from "./format";
import { VAERTERSKLER, type KlasseTerskel, type Vaerterskler } from "./vaer/terskler";

// Værordene (FR-20, Værord i EXPERIENCE.md). Fila eier bare grensene under laveste terskel.
// Grensene fra middels og opp hentes fra Værtersklene (AR-11, NFR-10), så en endret grense i
// data/vaerterskler.json endrer ordene uten annen kode. Grensene er `>=` som i Værtersklene, og
// `null` i tersklene betyr at båndet ikke finnes. Ordene sier alltid «nedbør», fordi Værmeldingen
// gir mengde og ikke type.

/** Under dette (mm/t) er det «oppholdsvær». */
export const OPPHOLD_UNDER_MM_T = 0.1;

/** Under dette (m/s) er det «lite vind». */
export const LITE_VIND_UNDER_MS = 5.5;

type Grensefelt = "nedbor_mm_t_minst" | "vind_ms_minst";

/** `verdi` når grensen for `klasse` i `felt`. En klasse uten grense (`null`) nås aldri. */
function nar(verdi: number, terskler: Vaerterskler, klasse: KlasseTerskel["klasse"], felt: Grensefelt) {
  const grense = terskler.klasser.find((k) => k.klasse === klasse)?.[felt] ?? null;
  return grense !== null && verdi >= grense;
}

/**
 * Nedbørsordet for høyeste nedbør i Tidsvinduet: «oppholdsvær», «lite nedbør», «noe nedbør» (middels)
 * eller «nedbør opptil X mm/t» (dårlig og frarådet).
 */
export function nedborOrd(maksMmT: number, terskler: Vaerterskler = VAERTERSKLER): string {
  const minst = (klasse: KlasseTerskel["klasse"]) => nar(maksMmT, terskler, klasse, "nedbor_mm_t_minst");
  if (minst("fraradet") || minst("darlig")) return `nedbør opptil ${tall(maksMmT)} mm/t`;
  if (minst("middels")) return "noe nedbør";
  if (maksMmT >= OPPHOLD_UNDER_MM_T) return "lite nedbør";
  return "oppholdsvær";
}

/**
 * Vindordet for høyeste middelvind i Tidsvinduet: «lite vind», «noe vind», «frisk vind» (middels),
 * «vind opp mot X m/s» (dårlig) eller «sterk kuling, vind opp mot X m/s» (frarådet).
 */
export function vindOrd(maksMs: number, terskler: Vaerterskler = VAERTERSKLER): string {
  const minst = (klasse: KlasseTerskel["klasse"]) => nar(maksMs, terskler, klasse, "vind_ms_minst");
  if (minst("fraradet")) return `sterk kuling, vind opp mot ${tall(maksMs)} m/s`;
  if (minst("darlig")) return `vind opp mot ${tall(maksMs)} m/s`;
  if (minst("middels")) return "frisk vind";
  if (maksMs >= LITE_VIND_UNDER_MS) return "noe vind";
  return "lite vind";
}

/** «{nedbørsord} og {vindord}», for eksempel «oppholdsvær og lite vind». */
export function vaerord(maksNedborMmT: number, maksVindMs: number, terskler: Vaerterskler = VAERTERSKLER): string {
  return `${nedborOrd(maksNedborMmT, terskler)} og ${vindOrd(maksVindMs, terskler)}`;
}
