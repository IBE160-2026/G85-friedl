import { z } from "zod";
import { klokkeTekst, kvarterOpp, leggTilDager, osloDato, osloKlokke, osloTilUtc } from "./tid";

// Søk-kontrakten (AD-17). Klienten, serveren og testene deler skjemaet.
// normaliserSok er den eneste justeringen av et gyldig Søk: passert tid, etter 22:00 og ukjent dato.

/** Tidligste og seneste Starttidspunkt, i minutter etter midnatt: 06:00 og 22:00. */
export const TIDLIGST_MIN = 6 * 60;
export const SENEST_MIN = 22 * 60;
/** Steget for Starttidspunkt og Tilgjengelig tid. */
export const KVARTER_MIN = 15;
/** Tilgjengelig tid: 15 min–5 t. */
export const MINST_TILGJENGELIG_MIN = 15;
export const MEST_TILGJENGELIG_MIN = 300;

/** Hele kvarter fra 06:00 til og med 22:00. */
const START = /^(?:(?:0[6-9]|1\d|2[01]):(?:00|15|30|45)|22:00)$/;

export const SokSkjema = z
  .object({
    dato: z.iso.date(),
    start: z.string().regex(START),
    tilgjengeligMin: z
      .number()
      .int()
      .min(MINST_TILGJENGELIG_MIN)
      .max(MEST_TILGJENGELIG_MIN)
      .multipleOf(KVARTER_MIN),
    vanskelighetsgrad: z.enum(["G", "B", "R"]),
    utsikt: z.boolean(),
    vann: z.boolean(),
  })
  .strict();

export type Sok = z.infer<typeof SokSkjema>;

export type NormalisertSok = { sok: Sok; justering?: string };

const I_MORGEN_START = "10:00";

const JUSTERING_ETTER_22 = "Flyttet til i morgen kl. 10:00, fordi klokka har passert 22:00.";
const JUSTERING_UKJENT_DATO =
  "Turdagen er ikke i dag eller i morgen, så Søket er satt tilbake til standard.";

/** «Nå» rundet opp til helt kvarter, i minutter etter midnatt i Oslo. */
const naRundet = (na: number) => kvarterOpp(osloKlokke(na));

/** «I dag» er låst når «nå» rundet opp til kvarter er senere enn 22:00 (FR-1). */
export const erIDagLast = (na: number): boolean => naRundet(na) > SENEST_MIN;

/** Starttidspunktet `start` på `dato` har passert ved `na`. Lik «nå» er ikke passert. */
export const erPassert = (dato: string, start: string, na: number): boolean => osloTilUtc(dato, start) < na;

/**
 * Standard-Søket for øyeblikket `na` (epoke-ms i UTC): i dag med «nå» rundet opp til kvarter
 * (tidligst 06:00), eller i morgen 10:00 når det rundede klokkeslettet er senere enn 22:00.
 * 120 min, Middels og ingen Opplevelsespreferanser.
 */
export function lagStandardSok(na: number): Sok {
  const iDag = osloDato(na);
  const rundet = naRundet(na);
  const etter22 = erIDagLast(na);
  return {
    dato: etter22 ? leggTilDager(iDag, 1) : iDag,
    start: etter22 ? I_MORGEN_START : klokkeTekst(Math.max(rundet, TIDLIGST_MIN)),
    tilgjengeligMin: 120,
    vanskelighetsgrad: "B",
    utsikt: false,
    vann: false,
  };
}

/**
 * Justerer et gyldig Søk mot `na` (epoke-ms i UTC):
 * - i morgen: uendret.
 * - i dag etter 22:00: flyttet til i morgen 10:00.
 * - i dag med passert Starttidspunkt: «nå» rundet opp til kvarter. Lik «nå» er ikke passert.
 * - annen dato: standard-Søket.
 * `justering` er med bare når Søket ble endret.
 */
export function normaliserSok(sok: Sok, na: number): NormalisertSok {
  const iDag = osloDato(na);
  const iMorgen = leggTilDager(iDag, 1);

  if (sok.dato === iMorgen) return { sok };

  if (sok.dato !== iDag) {
    return { sok: lagStandardSok(na), justering: JUSTERING_UKJENT_DATO };
  }

  if (erIDagLast(na)) {
    return {
      sok: { ...sok, dato: iMorgen, start: I_MORGEN_START },
      justering: JUSTERING_ETTER_22,
    };
  }

  if (erPassert(sok.dato, sok.start, na)) {
    const nyStart = klokkeTekst(Math.max(naRundet(na), TIDLIGST_MIN));
    return {
      sok: { ...sok, start: nyStart },
      justering: `Flyttet til ${nyStart}, fordi ${sok.start} har passert.`,
    };
  }

  return { sok };
}
