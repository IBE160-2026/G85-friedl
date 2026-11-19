import { anbefal } from "@/kjerne/anbefaling";
import type { Soltider } from "@/kjerne/morke";
import type { VaerGrunnlag } from "@/kjerne/regeltekst";
import { normaliserSok, type Sok, SokSkjema } from "@/kjerne/sok";
import { soltider } from "@/kjerne/sol";
import { leggTilDager } from "@/kjerne/tid";
import type { UgyldigSokFeil } from "@/kjerne/visning/feil";
import { lagVisning } from "@/kjerne/visning/lag-visning";
import { type Resultatvisning, ResultatvisningSkjema } from "@/kjerne/visning/skjema";
import { GEOMETRI, TURER } from "./data";
import type { Miljo } from "./miljo";

// Ett Søk (AR-3, AD-2): validering, justering, soltider, Anbefaling og Resultatvisning.
// Skallet gjør bare det kjernen ikke kan: henter været, lager resultatId og validerer svaret.

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

/** Resultatvisningen for et gyldig Søk i miljøet `miljo`, validert mot `ResultatvisningSkjema`. */
export async function svarPaSok(sok: Sok, miljo: Miljo): Promise<Resultatvisning> {
  const normalisert = normaliserSok(sok, miljo.na);
  const sol = soltiderFor(normalisert.sok.dato);

  // Værscenarioene (story 2.3) har en Værmelding, men værkilden kalles ikke ennå: story 2.8 kobler inn
  // Værklassen. Til da følger Resultatet FR-13 («Været er ikke vurdert.») også i demoene.
  const vaer: VaerGrunnlag = { type: "mangler" };

  const visning = lagVisning({
    resultatId: crypto.randomUUID(),
    normalisert,
    na: miljo.na,
    anbefaling: anbefal(TURER, normalisert.sok, sol),
    soltider: sol,
    geometri: GEOMETRI,
    vaer,
  });
  return ResultatvisningSkjema.parse(visning);
}
