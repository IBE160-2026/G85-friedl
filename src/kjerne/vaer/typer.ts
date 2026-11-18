// Værmeldingen og Værklassen (AR-6, AD-19).

/** Værklassen for én time (FR-8). */
export type Vaerklasse = "god" | "middels" | "darlig" | "fraradet";

/** Værklassen for et Tidsvindu (FR-9). `mangler` når en av timene ikke finnes i Værmeldingen. */
export type VindusKlasse = Vaerklasse | "mangler";

/** Én time i Værmeldingen. `startUtc` er starten på timen som epoke-ms i UTC (AD-7). */
export type Vaertime = {
  startUtc: number;
  tempC: number;
  vindMs: number;
  nedborMmT: number;
  symbolKode: string | null;
};

/** Værmeldingen for Værpunktet, med timene i stigende rekkefølge (AD-19). */
export type Vaermelding = {
  timer: Vaertime[];
};
