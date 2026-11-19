import { useEffect, useRef, useState } from "react";
import type { Sok } from "@/kjerne/sok";
import type { Resultatvisning } from "@/kjerne/visning/skjema";
import { sendBegrunnelse } from "./api";

// Språkmodelltekstene for Begrunnelsen (story 4.2, FR-22, AD-12, UX-DR27). Turforslagene vises med en gang
// med Regelteksten. For hvert Turforslag sendes én forespørsel, og teksten byttes inn bare når den kommer
// innen 5 s etter at Resultatet ble vist, og bare i samme Resultat (`resultatId`). Den korteste Turen og
// frarådet gir ingen forespørsel. Feil gir ingen endring og ingen melding, og byttet kunngjøres ikke for
// skjermlesere. Bare Begrunnelse-boksen endres, aldri utvalget, rekkefølgen eller Kriterieradene.

/**
 * Fristen for Språkmodellteksten, fra Resultatet vises. Etter den blir Regelteksten stående. Samme verdi som
 * `BEGRUNNELSE_FRIST_MS` i src/kjerne/begrunnelse/frist.ts, som visningen bare kan importere typer fra.
 */
export const BEGRUNNELSE_FRIST_MS = 5000;

/** Språkmodelltekstene i ett Resultat, etter `turId`. */
export type Begrunnelser = ReadonlyMap<string, string>;

const INGEN: Begrunnelser = new Map();

/** `turId` for hvert Turforslag i `visning`. Tom for den korteste Turen og frarådet, som ikke får tekst. */
export function turforslagIder(visning: Resultatvisning): string[] {
  return visning.utfall.type === "turforslag" ? visning.utfall.kort.map((k) => k.turId) : [];
}

/**
 * Sender én forespørsel per `turId` med Søket `sok`, med én `AbortController` for hele Resultatet. Den
 * avbrytes etter `BEGRUNNELSE_FRIST_MS` og av funksjonen som returneres (nytt Resultat eller fjernet
 * komponent). `onTekst` kalles bare for en tekst som kom før kallet ble avbrutt, også når `fetch` ikke
 * rakk å avbryte.
 */
export function hentBegrunnelser(
  sok: Sok,
  turIder: readonly string[],
  demoId: string | null,
  onTekst: (turId: string, tekst: string) => void,
): () => void {
  if (turIder.length === 0) return () => {};
  const avbryt = new AbortController();
  const tidsur = setTimeout(() => avbryt.abort(), BEGRUNNELSE_FRIST_MS);
  for (const turId of turIder) {
    void sendBegrunnelse(sok, turId, demoId, avbryt.signal).then((tekst) => {
      if (tekst !== null && !avbryt.signal.aborted) onTekst(turId, tekst);
    });
  }
  return () => {
    clearTimeout(tidsur);
    avbryt.abort();
  };
}

/**
 * Språkmodelltekstene for Resultatet som vises (`visning`), etter `turId`. Tom uten tekster, og uten
 * forespørsler når miljøet ikke har språkmodell (`sprakmodell` fra sidedataene). Forespørslene følger
 * `resultatId`, ikke objektet `visning`, så samme Resultat ikke ber på nytt når det rendres igjen.
 */
export function useBegrunnelser(
  visning: Resultatvisning | null,
  demoId: string | null,
  sprakmodell: boolean,
): Begrunnelser {
  const [svar, settSvar] = useState<{ resultatId: string; tekster: Begrunnelser } | null>(null);
  const resultatId = visning?.resultatId ?? null;
  // Søket og Turforslagene hører til `resultatId`, så de leses fra Resultatet effekten startet for.
  const gjeldende = useRef(visning);
  useEffect(() => {
    gjeldende.current = visning;
  });

  useEffect(() => {
    const v = gjeldende.current;
    if (!sprakmodell || resultatId === null || v === null || v.resultatId !== resultatId) return;
    return hentBegrunnelser(v.sok, turforslagIder(v), demoId, (turId, tekst) =>
      settSvar((forrige) => ({
        resultatId,
        tekster: new Map(forrige?.resultatId === resultatId ? forrige.tekster : []).set(turId, tekst),
      })),
    );
  }, [resultatId, demoId, sprakmodell]);

  return svar !== null && svar.resultatId === resultatId ? svar.tekster : INGEN;
}
