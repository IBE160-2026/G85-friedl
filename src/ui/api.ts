import type { Sok } from "@/kjerne/sok";
import type { ApiFeil } from "@/kjerne/visning/feil";
import type { Resultatvisning } from "@/kjerne/visning/skjema";

// Alle kall fra UI-et til appens server går gjennom denne fila (AD-13).
// Demo-ID-en reiser bare som `?demo=`, kopiert fra sidens egen URL. Søket står aldri i URL-en.

/** Klientens tidsgrense (AR-7). Etter den gir kallet Kontaktfeil. */
export const TIDSGRENSE_MS = 10_000;

export type SokSvar =
  | { type: "resultat"; visning: Resultatvisning }
  | { type: "feil"; feil: ApiFeil }
  | { type: "kontaktfeil" };

/** `/api/sok`, med `?demo=` fra `search` (sidens `location.search`) når den finnes. */
export function sokUrl(search: string): string {
  const demo = new URLSearchParams(search).get("demo");
  return demo === null ? "/api/sok" : `/api/sok?${new URLSearchParams({ demo })}`;
}

const erObjekt = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

/**
 * En enkel formsjekk av Resultatvisningen. UI-et importerer bare typer fra kjernen, så Zod-skjemaet
 * brukes ikke her. Sjekken fanger svar som ellers ville feilet senere i flaten.
 */
const erResultatvisning = (data: unknown): data is Resultatvisning =>
  erObjekt(data) &&
  typeof data.resultatId === "string" &&
  typeof data.overskrift === "string" &&
  erObjekt(data.sok) &&
  typeof data.sok.dato === "string" &&
  typeof data.sok.start === "string" &&
  erObjekt(data.utfall) &&
  typeof data.utfall.type === "string" &&
  erObjekt(data.dittSok) &&
  Array.isArray(data.dittSok.opplevelsespreferanser) &&
  erObjekt(data.vaer) &&
  typeof data.vaer.type === "string";

const erApiFeil = (data: unknown): data is ApiFeil =>
  typeof data === "object" &&
  data !== null &&
  "feil" in data &&
  (data.feil === "ukjent-demo" || data.feil === "ugyldig-sok");

/**
 * Sender Søket til `POST /api/sok`. 200 gir Resultatvisningen, 400 gir feilen fra serveren, og alt
 * annet (500, nettverksfeil, ugyldig svar eller ikke svar innen 10 s) gir Kontaktfeil.
 * Tidsgrensen gjelder hele kallet, også lesingen av svaret. `signal` avbryter kallet utenfra, for
 * eksempel når et nytt Søk sendes. Et avbrutt kall gir også Kontaktfeil.
 */
export async function sendSok(sok: Sok, signal?: AbortSignal): Promise<SokSvar> {
  const avbryt = new AbortController();
  const tidsur = setTimeout(() => avbryt.abort(), TIDSGRENSE_MS);
  const avbrytUtenfra = () => avbryt.abort();
  if (signal?.aborted) avbryt.abort();
  signal?.addEventListener("abort", avbrytUtenfra);
  try {
    const svar = await fetch(sokUrl(location.search), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sok),
      signal: avbryt.signal,
    });
    if (svar.status === 200) {
      const data: unknown = await svar.json();
      return erResultatvisning(data) ? { type: "resultat", visning: data } : { type: "kontaktfeil" };
    }
    if (svar.status === 400) {
      const data: unknown = await svar.json();
      if (erApiFeil(data)) return { type: "feil", feil: data };
    }
    return { type: "kontaktfeil" };
  } catch {
    return { type: "kontaktfeil" };
  } finally {
    clearTimeout(tidsur);
    signal?.removeEventListener("abort", avbrytUtenfra);
  }
}
