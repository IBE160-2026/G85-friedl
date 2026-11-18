"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Sok } from "@/kjerne/sok";
import type { Sidedata } from "@/kjerne/visning/sidedata";
import { sendSok, type SokSvar } from "./api";
import { Preferansebrikke } from "./Preferansebrikke";
import { Segmentvelger } from "./Segmentvelger";
import { Skjemakort } from "./Skjemakort";
import stil from "./SokFlate.module.css";
import { ETIKETT, HJELPETEKST, NA, PREFERANSE, VANSKELIGHETSGRAD } from "./tekster";
import { Trinnvelger } from "./Trinnvelger";

// Søk-flaten (FR-1–FR-6). Søket holdes bare i React-state, aldri i URL-en eller lagring.
// Valg, låser, etiketter og standard-Søket kommer ferdige fra sidedataene (AD-18), så flaten regner
// ikke ut tider og leser aldri klokka. Resultatet vises fra story 1.12. Til da står overskriften i et
// høflig live-område, og en `justering` står som hjelpetekst under Starttidspunkt.

/** Starttidspunktet når «I morgen» velges (FR-2, EXPERIENCE.md › Segmentvelger). */
const I_MORGEN_START = "10:00";

const VANSKELIGHETSGRADER = (["G", "B", "R"] as const).map((verdi) => ({
  verdi,
  etikett: VANSKELIGHETSGRAD[verdi],
}));

type Props = { skjema: Sidedata["skjema"] };

const likeSok = (a: Sok, b: Sok) =>
  a.dato === b.dato &&
  a.start === b.start &&
  a.tilgjengeligMin === b.tilgjengeligMin &&
  a.vanskelighetsgrad === b.vanskelighetsgrad &&
  a.utsikt === b.utsikt &&
  a.vann === b.vann;

export function SokFlate({ skjema }: Props) {
  const { turdager, tilgjengeligTid, standardSok } = skjema;
  const [iDag] = turdager;

  const [sok, settSok] = useState<Sok>(standardSok);
  const [justering, settJustering] = useState<string | null>(null);
  // Svaret på siste Søk. Visningen av Resultatet og Kontaktfeil kommer i story 1.12–1.14.
  const [svar, settSvar] = useState<SokSvar | null>(null);
  // Søket slik det står nå, for å se om brukeren har endret noe mens kallet pågikk.
  const gjeldendeSok = useRef(sok);
  useEffect(() => {
    gjeldendeSok.current = sok;
  }, [sok]);
  // Kallet som pågår. Et nytt Søk avbryter det.
  const pagaendeKall = useRef<AbortController | null>(null);
  const preferanseId = useId();

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
    const sendt = sok;

    const nyttSvar = await sendSok(sendt, kall.signal);
    if (pagaendeKall.current !== kall) return;
    pagaendeKall.current = null;
    settSvar(nyttSvar);
    if (nyttSvar.type !== "resultat") return;

    // Søket fra serveren (og justeringen) brukes bare når brukeren ikke har endret skjemaet imens,
    // og når skjemaet kan vise det. Ellers står skjemaet urørt, uten justering.
    const nytt = nyttSvar.visning.sok;
    if (likeSok(gjeldendeSok.current, sendt) && kanVises(nytt)) {
      settSok(nytt);
      settJustering(nyttSvar.visning.justering ?? null);
    } else {
      settJustering(null);
    }
  }

  const visning = svar?.type === "resultat" ? svar.visning : null;

  return (
    <>
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

      <div aria-live="polite" className={stil.resultat}>
        {visning && (
          <h2 key={visning.resultatId} className={stil.overskrift}>
            {visning.overskrift}
          </h2>
        )}
      </div>
    </>
  );
}
