"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Sok } from "@/kjerne/sok";
import type { Sidedata } from "@/kjerne/visning/sidedata";
import { sendSok, type SokSvar } from "./api";
import { Preferansebrikke } from "./Preferansebrikke";
import { Resultat } from "./Resultat";
import { Segmentvelger } from "./Segmentvelger";
import { Skjemakort } from "./Skjemakort";
import stil from "./SokFlate.module.css";
import {
  ETIKETT,
  HJELPETEKST,
  NA,
  PREFERANSE,
  SOK_INGRESS,
  SOK_OVERSKRIFT,
  VANSKELIGHETSGRAD,
} from "./tekster";
import { Trinnvelger } from "./Trinnvelger";

// Søk-flaten (FR-1–FR-6) og byttet til Resultat. Søket og Resultatvisningen holdes bare i React-state,
// aldri i URL-en eller lagring. Valg, låser, etiketter og standard-Søket kommer ferdige fra
// sidedataene (AD-18), så flaten regner ikke ut tider og leser aldri klokka.
// Etter «Finn tur» viser flaten Resultatet. «Endre søk» går tilbake til Søk med Søket fra Resultatet
// i skjemaet, og en `justering` står som hjelpetekst under Starttidspunkt (UX-DR12). Historikk og
// nettleserens Tilbake kommer i story 1.14.

/** Starttidspunktet når «I morgen» velges (FR-2, EXPERIENCE.md › Segmentvelger). */
const I_MORGEN_START = "10:00";

const VANSKELIGHETSGRADER = (["G", "B", "R"] as const).map((verdi) => ({
  verdi,
  etikett: VANSKELIGHETSGRAD[verdi],
}));

type Props = { skjema: Sidedata["skjema"] };

export function SokFlate({ skjema }: Props) {
  const { turdager, tilgjengeligTid, standardSok } = skjema;
  const [iDag] = turdager;

  const [sok, settSok] = useState<Sok>(standardSok);
  const [justering, settJustering] = useState<string | null>(null);
  // Svaret på siste Søk. Kontaktfeil og feil fra serveren vises fra story 1.14.
  const [svar, settSvar] = useState<SokSvar | null>(null);
  // Resultatet vises til «Endre søk» trykkes.
  const [visResultat, settVisResultat] = useState(false);
  // Kallet som pågår. Et nytt Søk avbryter det.
  const pagaendeKall = useRef<AbortController | null>(null);
  // Fokus går til overskriften på Søk når «Endre søk» bringer flaten tilbake.
  const sokOverskrift = useRef<HTMLHeadingElement>(null);
  const fraResultat = useRef(false);
  const preferanseId = useId();

  useEffect(() => {
    if (visResultat || !fraResultat.current) return;
    fraResultat.current = false;
    sokOverskrift.current?.focus();
  }, [visResultat]);

  const visning = svar?.type === "resultat" ? svar.visning : null;
  const turdag = turdager.find((d) => d.dato === sok.dato) ?? iDag;
  const erNa = sok.dato === iDag.dato && sok.start === standardSok.start;

  const endre = (endring: Partial<Sok>) => settSok((s) => ({ ...s, ...endring }));

  function velgTurdag(dato: string) {
    const ny = turdager.find((d) => d.dato === dato);
    if (!ny || ny.last || dato === sok.dato) return;
    let start = I_MORGEN_START;
    if (ny.dato === iDag.dato) {
      // «I dag» igjen: standard «nå», eller det første valget som ikke er låst når standard-Søket er i morgen.
      start =
        standardSok.dato === iDag.dato
          ? standardSok.start
          : (iDag.startvalg.find((v) => !v.last)?.verdi ?? sok.start);
    }
    settJustering(null);
    endre({ dato, start });
  }

  function velgStart(start: string) {
    settJustering(null);
    endre({ start });
  }

  /** Skjemaet kan vise Søket: Turdag og Starttidspunkt finnes som valg som ikke er låst. */
  function kanVises(nytt: Sok): boolean {
    const dag = turdager.find((d) => d.dato === nytt.dato);
    return (
      dag !== undefined &&
      !dag.last &&
      dag.startvalg.some((v) => v.verdi === nytt.start && !v.last) &&
      tilgjengeligTid.some((t) => t.verdi === nytt.tilgjengeligMin)
    );
  }

  async function finnTur() {
    // Et nytt Søk erstatter det forrige: det forrige kallet avbrytes, og svaret på det forkastes.
    pagaendeKall.current?.abort();
    const kall = new AbortController();
    pagaendeKall.current = kall;

    const nyttSvar = await sendSok(sok, kall.signal);
    if (pagaendeKall.current !== kall) return;
    pagaendeKall.current = null;
    settSvar(nyttSvar);
    if (nyttSvar.type === "resultat") settVisResultat(true);
  }

  /**
   * Tilbake til Søk med Søket fra Resultatet og justeringen under Starttidspunkt. Kan ikke skjemaet
   * vise Søket (for eksempel når siden har stått åpen over midnatt), står skjemaet urørt.
   */
  function endreSok() {
    if (visning && kanVises(visning.sok)) {
      settSok(visning.sok);
      settJustering(visning.justering ?? null);
    } else {
      settJustering(null);
    }
    fraResultat.current = true;
    settVisResultat(false);
  }

  // «Endre søk» får en stabil identitet, så toppfeltet ikke registrerer handlingen på nytt ved hver
  // rendring. Innpakningen kaller alltid den nyeste `endreSok`.
  const sisteEndreSok = useRef(endreSok);
  useEffect(() => {
    sisteEndreSok.current = endreSok;
  });
  const stabilEndreSok = useCallback(() => sisteEndreSok.current(), []);

  // Resultat står alltid på samme plass i treet, så live-området i den overlever byttet.
  return (
    <>
      {!visResultat && (
        <div className={stil.sok}>
          <h1 ref={sokOverskrift} tabIndex={-1} className={stil.sokOverskrift}>
            {SOK_OVERSKRIFT}
          </h1>
          <p className={stil.ingress}>{SOK_INGRESS}</p>
          <Skjemakort onFinnTur={finnTur}>
            <Segmentvelger
              etikett={ETIKETT.turdag}
              valg={turdager.map((d) => ({ verdi: d.dato, etikett: d.etikett, last: d.last }))}
              verdi={sok.dato}
              onVelg={velgTurdag}
              hjelpetekst={iDag.last ? HJELPETEKST.iDagLast : undefined}
            />

            <div className={stil.trinnrad}>
              <Trinnvelger
                etikett={ETIKETT.starttidspunkt}
                valg={turdag.startvalg.map((v) => ({ verdi: v.verdi, etikett: v.verdi, last: v.last }))}
                verdi={sok.start}
                onEndre={velgStart}
                under={erNa ? NA : undefined}
                hjelpetekster={justering ? [HJELPETEKST.starttidspunkt, justering] : [HJELPETEKST.starttidspunkt]}
              />
              <Trinnvelger
                etikett={ETIKETT.tilgjengeligTid}
                valg={tilgjengeligTid.map((t) => ({ verdi: String(t.verdi), etikett: t.etikett }))}
                verdi={String(sok.tilgjengeligMin)}
                onEndre={(verdi) => endre({ tilgjengeligMin: Number(verdi) })}
                hjelpetekster={[HJELPETEKST.tilgjengeligTid]}
              />
            </div>

            <Segmentvelger
              etikett={ETIKETT.vanskelighetsgrad}
              hint={HJELPETEKST.vanskelighetsgrad}
              valg={VANSKELIGHETSGRADER}
              verdi={sok.vanskelighetsgrad}
              onVelg={(vanskelighetsgrad) => endre({ vanskelighetsgrad })}
            />

            <div
              role="group"
              aria-labelledby={`${preferanseId}-etikett`}
              aria-describedby={`${preferanseId}-hint`}
            >
              <p className={stil.etikettlinje}>
                <span id={`${preferanseId}-etikett`} className={stil.etikett}>
                  {ETIKETT.opplevelsespreferanser}
                </span>
                <span id={`${preferanseId}-hint`} className={stil.hint}>
                  {HJELPETEKST.opplevelsespreferanser}
                </span>
              </p>
              <div className={stil.brikker}>
                <Preferansebrikke etikett={PREFERANSE.utsikt} pa={sok.utsikt} onEndre={(utsikt) => endre({ utsikt })} />
                <Preferansebrikke etikett={PREFERANSE.vann} pa={sok.vann} onEndre={(vann) => endre({ vann })} />
              </div>
            </div>
          </Skjemakort>
        </div>
      )}

      <Resultat visning={visResultat ? visning : null} onEndreSok={stabilEndreSok} />
    </>
  );
}
