import { z } from "zod";
import { lagTurfakta } from "@/kjerne/begrunnelse/fakta";
import { BEGRUNNELSE_FRIST_MS } from "@/kjerne/begrunnelse/frist";
import { kontrollerSprakmodelltekst } from "@/kjerne/begrunnelse/kontroll";
import { type Sok, SokSkjema } from "@/kjerne/sok";
import type { UgyldigSokFeil } from "@/kjerne/visning/feil";
import { TURER } from "./data";
import type { Miljo } from "./miljo";
import { svarPaSok } from "./sok";

// Begrunnelsen skrevet av språkmodellen (story 4.2, FR-22, AD-12). Klienten sender bare Søket og
// `turId`. Serveren lager Resultatvisningen på nytt, finner Turforslaget og gir modellen Regelteksten og
// fakta om Turen. Svaret brukes bare når kontrollen i kjernen godkjenner det. Ellers er teksten `null`,
// og klienten beholder Regelteksten. Rangeringen og utvalget endres aldri her.
//
// Klienten sender det normaliserte Søket fra Resultatvisningen. Måtte serveren justere det på nytt (for
// eksempel fordi Starttidspunktet har passert siden), er det et annet Resultat, og svaret er `null`.
// Gjenstående risiko: uten demo kan MET-cachen ha fått en ny Værmelding mellom /api/sok og dette kallet.
// Da lages Regelteksten av det nye været og kan avvike fra den klienten viser for samme `turId`.

export type Begrunnelsesvar = { tekst: string | null };

const ForesporselSkjema = z.strictObject({ sok: SokSkjema, turId: z.string() });

/** Forespørselen `{ sok, turId }`, validert strengt, eller `UgyldigSokFeil` som i `lesSok`. */
export function lesBegrunnelseForesporsel(data: unknown): { sok: Sok; turId: string } | UgyldigSokFeil {
  const svar = ForesporselSkjema.safeParse(data);
  if (svar.success) return svar.data;
  return {
    feil: "ugyldig-sok",
    detaljer: svar.error.issues.map((issue) => ({ sti: issue.path.map(String).join("."), melding: issue.message })),
  };
}

const INGEN: Begrunnelsesvar = { tekst: null };

/** Navnet på feilen, og `status` når den finnes. Aldri meldingen, som kan gjenta innholdet i forespørselen. */
function feilnavn(feil: unknown): string {
  if (!(feil instanceof Error)) return typeof feil;
  const status = (feil as { status?: unknown }).status;
  return typeof status === "number" ? `${feil.name} (status ${status})` : feil.name;
}

/** Avvises med `signal.reason` når `signal` avbrytes, også når modellen selv ikke lytter på signalet. */
function avbrutt(signal: AbortSignal): Promise<never> {
  return new Promise((_, avvis) => {
    if (signal.aborted) avvis(signal.reason);
    else signal.addEventListener("abort", () => avvis(signal.reason), { once: true });
  });
}

/**
 * Språkmodellteksten for Turforslaget `turId` i Resultatet for `sok`, eller `{ tekst: null }` når det
 * ikke er et Turforslag (den korteste Turen, frarådet eller en ukjent `turId`), når Søket måtte justeres,
 * når miljøet ikke har språkmodell, når modellen gir `null`, kaster eller ikke svarer innen
 * `BEGRUNNELSE_FRIST_MS`, når `signal` avbrytes, og når kontrollen avviser teksten. En feil fra modellen
 * logges bare med navn og status (AR-24). Et avbrudd logges ikke.
 */
export async function svarPaBegrunnelse(
  sok: Sok,
  turId: string,
  miljo: Miljo,
  signal?: AbortSignal,
): Promise<Begrunnelsesvar> {
  const sprakmodell = miljo.sprakmodell;
  if (sprakmodell === null) return INGEN;

  const visning = await svarPaSok(sok, miljo);
  if (visning.justering !== undefined || visning.utfall.type !== "turforslag") return INGEN;
  const kort = visning.utfall.kort.find((k) => k.turId === turId);
  const tur = TURER.find((t) => t.id === turId);
  if (!kort || !tur) return INGEN;

  const regeltekst = kort.regeltekst;
  const fakta = lagTurfakta(tur);
  const frist = AbortSignal.timeout(BEGRUNNELSE_FRIST_MS);
  const avbryt = signal ? AbortSignal.any([signal, frist]) : frist;
  // Avvisningen etter fristen kommer også når modellen alt har svart, så den fanges her.
  const vakt = avbrutt(avbryt);
  vakt.catch(() => {});
  let svar: string | null;
  try {
    svar = await Promise.race([sprakmodell({ regeltekst, fakta }, avbryt), vakt]);
  } catch (feil) {
    if (!avbryt.aborted) console.error("Språkmodellen feilet:", feilnavn(feil));
    return INGEN;
  }
  if (avbryt.aborted) return INGEN;
  if (svar === null) return INGEN;

  const tekst = svar.trim();
  if (tekst === "") return INGEN;
  return kontrollerSprakmodelltekst(tekst, regeltekst, fakta).godkjent ? { tekst } : INGEN;
}
