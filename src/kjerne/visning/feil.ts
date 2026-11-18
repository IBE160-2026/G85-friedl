import { z } from "zod";
import { SidedataSkjema } from "./sidedata";

// Feilformene (AR-7). 400 gir én av disse, og 500 gjelder alt annet.

/** Demo-ID-en finnes ikke. Svaret lister de gyldige. */
export const UkjentDemoFeilSkjema = z.strictObject({
  feil: z.literal("ukjent-demo"),
  gyldigeDemoIder: z.array(z.string().min(1)).min(1),
});

/** Søket bryter Søk-kontrakten. `detaljer` lages av `issues` fra zod, med minst ett element. */
export const UgyldigSokFeilSkjema = z.strictObject({
  feil: z.literal("ugyldig-sok"),
  detaljer: z
    .array(z.strictObject({ sti: z.string(), melding: z.string().min(1) }))
    .min(1),
});

/** Feilsvarene fra API-et, diskriminert på `feil`. */
export const ApiFeilSkjema = z.discriminatedUnion("feil", [
  UkjentDemoFeilSkjema,
  UgyldigSokFeilSkjema,
]);

/** Svaret fra lagSidedata: sidedata eller ukjent demo. */
export const SidedataSvarSkjema = z.union([SidedataSkjema, UkjentDemoFeilSkjema]);

export type UkjentDemoFeil = z.infer<typeof UkjentDemoFeilSkjema>;
export type UgyldigSokFeil = z.infer<typeof UgyldigSokFeilSkjema>;
export type ApiFeil = z.infer<typeof ApiFeilSkjema>;
export type SidedataSvar = z.infer<typeof SidedataSvarSkjema>;
