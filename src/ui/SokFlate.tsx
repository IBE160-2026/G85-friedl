"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Sok } from "@/kjerne/sok";
import type { Sidedata } from "@/kjerne/visning/sidedata";
import type { DittSok, Resultatvisning } from "@/kjerne/visning/skjema";
import { sendSok } from "./api";
import { Preferansebrikke } from "./Preferansebrikke";
import { Resultat, type Resultattilstand } from "./Resultat";
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
import { Trinnvelger, type TrinnvelgerHandle } from "./Trinnvelger";

// Søk-flaten (FR-1–FR-6) og byttet til Resultat. Søket og Resultatvisningen holdes bare i React-state,
// aldri i URL-en eller lagring. Valg, låser, etiketter og standard-Søket kommer ferdige fra
// sidedataene (AD-18), så flaten regner ikke ut tider og leser aldri klokka.
//
// Flaten har fire tilstander: `sok`, `venter`, `resultat` og `kontaktfeil`. «Finn tur» og «Prøv igjen»
// går til `venter`, og svaret gir `resultat` eller `kontaktfeil`. Et `feil`-svar (400) gir også
// Kontaktfeil, fordi skjemaet ikke kan lage ugyldige Søk. Da står bare «Endre søk» på kortet, fordi
// samme Søk ville fått samme feil, og feilen fra serveren skrives til konsollen.
//
// Historikken (EXPERIENCE.md › Nettleserens Tilbake): første overgang fra Søk lager én oppføring med
// `pushState`, merket med `HISTORIKK`. Et nytt Søk mens oppføringen er den gjeldende, bruker
// `replaceState`. URL-en er alltid `location.pathname + location.search`, så `?demo` blir med og Søket
// aldri står i URL-en. «Endre søk» og «Endre Tilgjengelig tid» går tilbake med `history.back()` når
// oppføringen finnes, så historikken ikke vokser. `popstate` tilbake til Søk viser Søk med Søket fra
// det siste Resultatet, eller med Søket som ble sendt. `popstate` fram igjen viser svaret på det siste
// Søket. Finnes det ikke (svaret ble forkastet av Tilbake), går flaten tilbake igjen, så skjermen og
// historikken stemmer.
//
// Fokus: til «Finner turer …» i Plassholderstokken, til overskriften i Resultatet eller tittelen på
// Kontaktfeil-kortet (Resultat), og til overskriften på Søk, eller til Tilgjengelig tid etter «Endre
// Tilgjengelig tid».

/** Nøkkelen i `history.state` som merker oppføringen for Resultatet. */
const HISTORIKK = "turplanleggerResultat";

const erResultatoppforing = () => (window.history.state as Record<string, unknown> | null)?.[HISTORIKK] === true;
const sideUrl = () => location.pathname + location.search;

type Flate =
  | { type: "sok" }
  | { type: "venter"; id: string; sok: Sok }
  | { type: "resultat"; visning: Resultatvisning }
  /** `feil`: serveren svarte 400, så «Prøv igjen» ville gitt samme feil. */
  | { type: "kontaktfeil"; id: string; sok: Sok; feil: boolean };

/** Hvor fokus går når Søk vises igjen. */
type Fokusmal = "overskrift" | "tilgjengeligTid";

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
  const [flate, settFlate] = useState<Flate>({ type: "sok" });
  // Speiler `flate`, så `popstate` og «Endre søk» leser den gjeldende tilstanden.
  const flateRef = useRef<Flate>(flate);
  // Svaret på det siste Søket, som vises igjen når nettleseren går fram. Tømmes når et nytt Søk sendes.
  const sisteSvar = useRef<Flate | null>(null);
  // `history.back()` er kalt, og `popstate` har ikke kommet ennå. Hindrer at to trykk går to steg tilbake.
  const tilbakePagar = useRef(false);
  // Kallet som pågår. Et nytt Søk eller Tilbake til Søk avbryter det.
  const pagaendeKall = useRef<AbortController | null>(null);
  const teller = useRef(0);
  // Fokus går til overskriften på Søk, eller til Tilgjengelig tid, når flaten kommer tilbake.
  const sokOverskrift = useRef<HTMLHeadingElement>(null);
  const tilgjengeligTidFelt = useRef<TrinnvelgerHandle>(null);
  const fokusmal = useRef<Fokusmal | null>(null);
  const preferanseId = useId();

  function visFlate(ny: Flate) {
    flateRef.current = ny;
    settFlate(ny);
  }

  useEffect(() => {
    if (flate.type !== "sok" || !fokusmal.current) return;
    const mal = fokusmal.current;
    fokusmal.current = null;
    if (mal === "tilgjengeligTid") tilgjengeligTidFelt.current?.fokuser();
    else sokOverskrift.current?.focus();
  }, [flate]);

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

  /** Ditt søk mens svaret venter og ved Kontaktfeil, satt sammen av de ferdige etikettene i skjemaet. */
  function dittSokFor(sendt: Sok): DittSok {
    return {
      turdag: turdager.find((d) => d.dato === sendt.dato)?.etikett ?? sendt.dato,
      starttidspunkt: sendt.start,
      tilgjengeligTid:
        tilgjengeligTid.find((t) => t.verdi === sendt.tilgjengeligMin)?.etikett ?? String(sendt.tilgjengeligMin),
      vanskelighetsgrad: VANSKELIGHETSGRAD[sendt.vanskelighetsgrad],
      opplevelsespreferanser: (["utsikt", "vann"] as const).filter((p) => sendt[p]).map((p) => PREFERANSE[p]),
    };
  }

  /**
   * Sender `sendt` og viser Plassholderstokken til svaret kommer. Første overgang fra Søk lager én
   * historikkoppføring, og et nytt Søk fra Resultatet erstatter den.
   */
  async function send(sendt: Sok) {
    // Et nytt Søk erstatter det forrige: det forrige kallet avbrytes, og svaret på det forkastes.
    pagaendeKall.current?.abort();
    const kall = new AbortController();
    pagaendeKall.current = kall;

    // Nytt objekt hver gang: Next.js legger sine egne felt inn i objektet som gis til historikken.
    const oppforing = { [HISTORIKK]: true };
    if (erResultatoppforing()) window.history.replaceState(oppforing, "", sideUrl());
    else window.history.pushState(oppforing, "", sideUrl());

    sisteSvar.current = null;
    teller.current += 1;
    visFlate({ type: "venter", id: `venter-${teller.current}`, sok: sendt });

    const svar = await sendSok(sendt, kall.signal);
    if (pagaendeKall.current !== kall) return;
    pagaendeKall.current = null;
    teller.current += 1;
    if (svar.type === "feil") console.error("Serveren avviste Søket", svar.feil);
    const ny: Flate =
      svar.type === "resultat"
        ? { type: "resultat", visning: svar.visning }
        : { type: "kontaktfeil", id: `kontaktfeil-${teller.current}`, sok: sendt, feil: svar.type === "feil" };
    sisteSvar.current = ny;
    visFlate(ny);
  }

  /** «Prøv igjen» sender Søket som Kontaktfeil gjelder for, på nytt. */
  function provIgjen() {
    const naa = flateRef.current;
    if (naa.type === "kontaktfeil" && !naa.feil) void send(naa.sok);
  }

  /**
   * Viser Søk igjen. Fra Resultatet står Søket fra Resultatet i skjemaet, med justeringen under
   * Starttidspunkt. Kan ikke skjemaet vise Søket (for eksempel når siden har stått åpen over midnatt),
   * står skjemaet urørt. Mens svaret venter og ved Kontaktfeil settes Søket som ble sendt, inn i
   * skjemaet, også når skjemaet er endret etter Tilbake og flaten kom fram igjen.
   */
  function tilSok() {
    pagaendeKall.current?.abort();
    pagaendeKall.current = null;
    const naa = flateRef.current;
    if (naa.type === "sok") return;
    if (naa.type === "resultat") {
      if (kanVises(naa.visning.sok)) {
        settSok(naa.visning.sok);
        settJustering(naa.visning.justering ?? null);
      } else {
        settJustering(null);
      }
    } else if (kanVises(naa.sok)) {
      // Justeringen gjelder Starttidspunktet i skjemaet, så den står bare når det er det samme.
      if (naa.sok.dato !== sok.dato || naa.sok.start !== sok.start) settJustering(null);
      settSok(naa.sok);
    }
    fokusmal.current ??= "overskrift";
    visFlate({ type: "sok" });
  }

  /** «Endre søk» og «Endre Tilgjengelig tid»: tilbake i historikken når Resultatet har en oppføring. */
  function endreSok(mal: Fokusmal = "overskrift") {
    if (tilbakePagar.current) return;
    fokusmal.current = mal;
    if (erResultatoppforing()) {
      tilbakePagar.current = true;
      window.history.back();
    } else {
      tilSok();
    }
  }

  // Nettleserens Tilbake og Fram.
  const sistePopstate = useRef<(state: unknown) => void>(() => {});
  useEffect(() => {
    sistePopstate.current = (state) => {
      tilbakePagar.current = false;
      const tilResultat = (state as Record<string, unknown> | null)?.[HISTORIKK] === true;
      if (!tilResultat) {
        tilSok();
      } else if (flateRef.current.type === "sok") {
        // Uten svar å vise (Tilbake forkastet det) går flaten tilbake til oppføringen for Søk.
        if (sisteSvar.current) visFlate(sisteSvar.current);
        else window.history.back();
      }
    };
  });
  useEffect(() => {
    const vedPopstate = (e: PopStateEvent) => sistePopstate.current(e.state);
    window.addEventListener("popstate", vedPopstate);
    return () => window.removeEventListener("popstate", vedPopstate);
  }, []);

  // Handlingene i Resultatet får en stabil identitet, så toppfeltet ikke registrerer «Endre søk» på nytt
  // ved hver rendring. Innpakningene kaller alltid de nyeste funksjonene.
  const sisteHandlinger = useRef({ endreSok, provIgjen });
  useEffect(() => {
    sisteHandlinger.current = { endreSok, provIgjen };
  });
  const stabilEndreSok = useCallback(() => sisteHandlinger.current.endreSok("overskrift"), []);
  const stabilEndreTid = useCallback(() => sisteHandlinger.current.endreSok("tilgjengeligTid"), []);
  const stabilProvIgjen = useCallback(() => sisteHandlinger.current.provIgjen(), []);

  const tilstand: Resultattilstand | null =
    flate.type === "sok"
      ? null
      : flate.type === "resultat"
        ? flate
        : flate.type === "venter"
          ? { type: "venter", id: flate.id, dittSok: dittSokFor(flate.sok) }
          : { type: "kontaktfeil", id: flate.id, dittSok: dittSokFor(flate.sok), kanProveIgjen: !flate.feil };

  // Resultat står alltid på samme plass i treet, så live-området i den overlever byttet.
  return (
    <>
      {flate.type === "sok" && (
        <div className={stil.sok}>
          <h1 ref={sokOverskrift} tabIndex={-1} className={stil.sokOverskrift}>
            {SOK_OVERSKRIFT}
          </h1>
          <p className={stil.ingress}>{SOK_INGRESS}</p>
          <Skjemakort onFinnTur={() => void send(sok)}>
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
                ref={tilgjengeligTidFelt}
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

      <Resultat
        tilstand={tilstand}
        onEndreSok={stabilEndreSok}
        onEndreTilgjengeligTid={stabilEndreTid}
        onProvIgjen={stabilProvIgjen}
      />
    </>
  );
}
