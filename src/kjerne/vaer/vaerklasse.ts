import { timerITidsvindu } from "../tid";
import { VAERTERSKLER, type Vaerterskler } from "./terskler";
import type { Vaerklasse, Vaermelding, Vaertime, VindusKlasse } from "./typer";

// Værklassen per time (FR-8) og for et Tidsvindu (FR-9, AR-6).
// Tersklene kommer som parameter, med data/vaerterskler.json som standard (NFR-10).

const RANG: Record<Vaerklasse, number> = { god: 0, middels: 1, darlig: 2, fraradet: 3 };

/** Den dårligste av to Værklasser. */
export function darligsteKlasse(a: Vaerklasse, b: Vaerklasse): Vaerklasse {
  return RANG[b] > RANG[a] ? b : a;
}

const minst = (verdi: number, grense: number | null) => grense !== null && verdi >= grense;
const under = (verdi: number, grense: number | null) => grense !== null && verdi < grense;

/**
 * Værklassen for én time. Strengeste klasse vinner, og det holder at én verdi når grensen:
 * `>=` for nedbør og vind, `<` for temperatur.
 */
export function klasseForTime(
  time: Pick<Vaertime, "nedborMmT" | "vindMs" | "tempC">,
  terskler: Vaerterskler = VAERTERSKLER,
): Vaerklasse {
  for (const t of terskler.klasser) {
    if (
      minst(time.nedborMmT, t.nedbor_mm_t_minst) ||
      minst(time.vindMs, t.vind_ms_minst) ||
      under(time.tempC, t.temp_c_under)
    ) {
      return t.klasse;
    }
  }
  return "god";
}

/**
 * Værklassen for Tidsvinduet [startUtc, sluttUtc): klassen til den dårligste timen blant
 * timene som overlapper vinduet. Mangler en av timene i Værmeldingen, blir klassen `mangler`.
 * Et tomt vindu har ingen timer å vurdere og gir også `mangler`.
 */
export function klasseForTidsvindu(
  melding: Vaermelding,
  startUtc: number,
  sluttUtc: number,
  terskler: Vaerterskler = VAERTERSKLER,
): VindusKlasse {
  const timer = timerITidsvindu(startUtc, sluttUtc);
  if (timer.length === 0) return "mangler";

  const klassePerTime = new Map<number, Vaerklasse>();
  for (const time of melding.timer) {
    const klasse = klasseForTime(time, terskler);
    const forrige = klassePerTime.get(time.startUtc);
    klassePerTime.set(time.startUtc, forrige ? darligsteKlasse(forrige, klasse) : klasse);
  }

  let resultat: Vaerklasse = "god";
  for (const start of timer) {
    const klasse = klassePerTime.get(start);
    if (klasse === undefined) return "mangler";
    resultat = darligsteKlasse(resultat, klasse);
  }
  return resultat;
}
