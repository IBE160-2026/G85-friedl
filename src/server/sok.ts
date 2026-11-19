import type { Soltider } from "@/kjerne/morke";
import { normaliserSok, type Sok, SokSkjema } from "@/kjerne/sok";
import { soltider } from "@/kjerne/sol";
import { leggTilDager } from "@/kjerne/tid";
import type { Vaermelding } from "@/kjerne/vaer/typer";
import type { UgyldigSokFeil } from "@/kjerne/visning/feil";
import { lagResultatvisning } from "@/kjerne/visning/lag-visning";
import { type Resultatvisning, ResultatvisningSkjema } from "@/kjerne/visning/skjema";
import { GEOMETRI, TURER } from "./data";
import type { Miljo } from "./miljo";

// Ett Søk (AR-3, AD-2): validering, justering, soltider, Værklasse, Anbefaling, Bedre tidsvindu og
// Resultatvisning. Skallet gjør bare det kjernen ikke kan: henter været, lager resultatId og
// validerer svaret. Kjernen (`lagResultatvisning`) setter sammen resten.

/** Søket fra forespørselen, validert strengt mot `SokSkjema`, eller `UgyldigSokFeil`. */
export function lesSok(data: unknown): { sok: Sok } | UgyldigSokFeil {
  const svar = SokSkjema.safeParse(data);
  if (svar.success) return { sok: svar.data };
  return {
    feil: "ugyldig-sok",
    detaljer: svar.error.issues.map((issue) => ({ sti: issue.path.map(String).join("."), melding: issue.message })),
  };
}

/** Soltidene for Turdagen og dagen etter (AD-11). */
function soltiderFor(dato: string): Soltider {
  const dagenEtter = leggTilDager(dato, 1);
  return { [dato]: soltider(dato), [dagenEtter]: soltider(dagenEtter) };
}

/**
 * Værmeldingen fra værkilden, eller `null` når den mangler eller værkilden kaster (FR-13). Feilen
 * logges bare med navn og melding, aldri med noe fra forespørselen.
 */
async function hentVaermelding(miljo: Miljo): Promise<Vaermelding | null> {
  try {
    return await miljo.vaerkilde();
  } catch (feil) {
    console.error("Værkilden feilet:", feil instanceof Error ? `${feil.name}: ${feil.message}` : typeof feil);
    return null;
  }
}

/** Resultatvisningen for et gyldig Søk i miljøet `miljo`, validert mot `ResultatvisningSkjema`. */
export async function svarPaSok(sok: Sok, miljo: Miljo): Promise<Resultatvisning> {
  const normalisert = normaliserSok(sok, miljo.na);
  const visning = lagResultatvisning({
    resultatId: crypto.randomUUID(),
    normalisert,
    na: miljo.na,
    melding: await hentVaermelding(miljo),
    turer: TURER,
    soltider: soltiderFor(normalisert.sok.dato),
    geometri: GEOMETRI,
  });
  return ResultatvisningSkjema.parse(visning);
}
