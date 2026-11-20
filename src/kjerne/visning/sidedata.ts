import { z } from "zod";
import { SokSkjema } from "../sok";

// Sidedataene (AD-18, AR-5): alt siden trenger før det første Søket.
// lagSidedata(demoId) i src/server/side.ts er eneste kilde. Låste valg og etiketter kommer
// ferdige fra kjernen, så UI-et regner ikke ut tider eller formaterer varigheter (AD-7).

const Tekst = z.string().min(1);

/** Ett Starttidspunkt i velgeren. `last` er true når tiden har passert. */
const StartvalgSkjema = z.strictObject({
  verdi: SokSkjema.shape.start,
  last: z.boolean(),
});

/** En Turdag i Segmentvelgeren. «I dag» er låst etter 22:00. */
export const TurdagSkjema = z.strictObject({
  dato: SokSkjema.shape.dato,
  etikett: Tekst,
  last: z.boolean(),
  startvalg: z.array(StartvalgSkjema).min(1),
});

/** Ett valg i Tilgjengelig tid, med etiketten ferdig formatert («1 t 30 min»). */
const TilgjengeligTidValgSkjema = z.strictObject({
  verdi: SokSkjema.shape.tilgjengeligMin,
  etikett: Tekst,
});

const StartpunktSkjema = z.strictObject({
  navn: Tekst,
  /** Navnet ved prikken på Søk-kartet (story 3.3). */
  kortnavn: Tekst,
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
});

/**
 * Sidedataene. Roten sjekker at standard-Søket kan velges i skjemaet:
 * datoen er en Turdag som ikke er låst, Starttidspunktet er et startvalg som ikke er låst,
 * og Tilgjengelig tid er et av valgene.
 */
export const SidedataSkjema = z
  .strictObject({
    demo: z.strictObject({ id: Tekst, beskrivelse: Tekst, naTekst: Tekst }).nullable(),
    skjema: z.strictObject({
      /** [i dag, i morgen] */
      turdager: z.tuple([TurdagSkjema, TurdagSkjema]),
      tilgjengeligTid: z.array(TilgjengeligTidValgSkjema).min(1),
      standardSok: SokSkjema,
    }),
    startpunkter: z.array(StartpunktSkjema).min(1),
    telletekst: Tekst,
    /** Miljøet har en språkmodell (story 4.2). Uten den ber klienten ikke om Språkmodelltekster. */
    sprakmodell: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const { turdager, tilgjengeligTid, standardSok } = s.skjema;
    const sti = ["skjema", "standardSok"];

    const turdag = turdager.find((d) => d.dato === standardSok.dato);
    if (!turdag) {
      ctx.addIssue({
        code: "custom",
        path: [...sti, "dato"],
        message: "Standard-Søket har en dato som ingen Turdag har.",
      });
    } else if (turdag.last) {
      ctx.addIssue({
        code: "custom",
        path: [...sti, "dato"],
        message: "Standard-Søket står på en låst Turdag.",
      });
    } else {
      const valg = turdag.startvalg.find((v) => v.verdi === standardSok.start);
      if (!valg || valg.last) {
        ctx.addIssue({
          code: "custom",
          path: [...sti, "start"],
          message: "Standard-Søket har et Starttidspunkt som ikke kan velges.",
        });
      }
    }

    if (!tilgjengeligTid.some((t) => t.verdi === standardSok.tilgjengeligMin)) {
      ctx.addIssue({
        code: "custom",
        path: [...sti, "tilgjengeligMin"],
        message: "Standard-Søket har en Tilgjengelig tid som ikke er et valg.",
      });
    }
  });

export type Sidedata = z.infer<typeof SidedataSkjema>;
export type Turdag = z.infer<typeof TurdagSkjema>;
