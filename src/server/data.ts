import { validerTurdatasett } from "@/kjerne/turdata/valider";
import { type Rutegeometri, RutegeometriSkjema } from "@/kjerne/turdata/rutegeometri";
import { type Tur, TurdatasettSkjema } from "@/kjerne/turdata/skjema";
import rutegeometriJson from "../../data/rutegeometri.geojson";
import turerJson from "../../data/turer-moldemarka.json";

// Turdatasettet og rutegeometrien (AD-9, AD-10), importert statisk og validert én gang ved import.
// En ugyldig fil stopper serveren med en tydelig feil i stedet for å gi feil Turforslag.

function lesRutegeometri(): Rutegeometri {
  const svar = RutegeometriSkjema.safeParse(rutegeometriJson);
  if (!svar.success) throw new Error(`data/rutegeometri.geojson er ugyldig: ${svar.error.message}`);
  return svar.data;
}

function lesTurer(geometri: Rutegeometri): readonly Tur[] {
  const avvik = validerTurdatasett(turerJson, geometri);
  if (avvik.length > 0) {
    const linjer = avvik.map((a) => `- ${a.turId ? `${a.turId}: ` : ""}${a.melding}`).join("\n");
    throw new Error(`data/turer-moldemarka.json er ugyldig:\n${linjer}`);
  }
  return Object.freeze(TurdatasettSkjema.parse(turerJson).turer);
}

export const GEOMETRI: Rutegeometri = lesRutegeometri();
export const TURER: readonly Tur[] = lesTurer(GEOMETRI);
