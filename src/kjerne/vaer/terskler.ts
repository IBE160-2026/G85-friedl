import { z } from "zod";
import vaertersklerJson from "../../../data/vaerterskler.json";

// Værtersklene har én kilde: data/vaerterskler.json (AD-8, AR-11, NFR-10).
// Fila valideres her ved import, så en ugyldig fil stopper appen og testene med en tydelig feil.

const FIL = "data/vaerterskler.json";

/** Klassene i fila, strengeste først. */
export const TERSKELKLASSER = ["fraradet", "darlig", "middels"] as const;

/** En grense der `null` betyr ingen grense. */
const Grense = z.number().nullable();

const KlasseTerskel = z
  .object({
    klasse: z.enum(TERSKELKLASSER),
    /** Nedbør i mm/t som gir klassen når verdien er minst dette (`>=`). */
    nedbor_mm_t_minst: Grense,
    /** Middelvind i m/s som gir klassen når verdien er minst dette (`>=`). */
    vind_ms_minst: Grense,
    /** Temperatur i °C som gir klassen når verdien er under dette (`<`). */
    temp_c_under: Grense,
  })
  .strict();

export const VaertersklerSkjema = z
  .object({
    versjon: z.literal(1),
    klasser: z.array(KlasseTerskel).superRefine((klasser, ctx) => {
      const faktisk = klasser.map((k) => k.klasse);
      if (faktisk.join() !== TERSKELKLASSER.join()) {
        ctx.addIssue({
          code: "custom",
          message: `klassene må stå med strengeste klasse først (${TERSKELKLASSER.join(", ")}), men står som (${faktisk.join(", ")})`,
        });
      }
    }),
  })
  .strict();

export type Vaerterskler = z.infer<typeof VaertersklerSkjema>;
export type KlasseTerskel = z.infer<typeof KlasseTerskel>;

/** Validerer innholdet i en terskelfil. Kaster en feil som nevner fila og hva som er galt. */
export function lesVaerterskler(data: unknown): Vaerterskler {
  const resultat = VaertersklerSkjema.safeParse(data);
  if (!resultat.success) {
    throw new Error(`${FIL} er ugyldig:\n${z.prettifyError(resultat.error)}`);
  }
  return resultat.data;
}

/** Tersklene appen bruker, lest fra data/vaerterskler.json. */
export const VAERTERSKLER: Vaerterskler = lesVaerterskler(vaertersklerJson);
