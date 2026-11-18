"use client";

import { useEffect, useRef, useState } from "react";
import type { DittSok as DittSokData, Resultatvisning } from "@/kjerne/visning/skjema";
import { Ansvarsmerknad } from "./Ansvarsmerknad";
import { DittSok } from "./DittSok";
import { DittSokLinje } from "./DittSokLinje";
import { Knapp } from "./Knapp";
import { Kontaktfeil } from "./Kontaktfeil";
import { Plassholderstokk } from "./Plassholderstokk";
import stil from "./Resultat.module.css";
import { Stokk } from "./Stokk";
import { Stokkoversikt } from "./Stokkoversikt";
import { ENDRE_SOK, ENDRE_TILGJENGELIG_TID, RESULTAT_KOMMER } from "./tekster";
import { useEndreSokIToppfelt } from "./ToppfeltHandling";
import { Turkort } from "./Turkort";
import { Vaermangel } from "./Vaermangel";

// Resultat-flaten (EXPERIENCE.md › Information Architecture og State Patterns). Demomodus-merket står i
// toppfeltet og Krediteringen i bunnen (Side). Alt innhold kommer ferdig fra Resultatvisningen.
//
// Tilstandene:
// - Venter: Ditt søk og Plassholderstokken der kortene ellers står.
// - Resultat med Turforslag. PC (fra 1200 px): Ditt søk som panel, Værmangel-linjen, overskriften,
//   Turkortene side om side og Ansvarsmerknaden. Mobil og nettbrett: Ditt søk som én linje med «Endre
//   søk» i toppfeltet, Værmangel-linjen, overskriften, Stokken med Stokknavigasjon, Stokkoversikten og
//   Ansvarsmerknaden. Begge oppsettene står i DOM-en, og CSS viser ett av dem ved 1200 px.
// - Resultat med Alternativ: som over, men med Alternativkortet, «Endre Tilgjengelig tid», teksten
//   under og Ansvarsmerknaden. Ingen Stokk og ingen Stokkoversikt, og kortet står likt ved alle bredder.
// - Kontaktfeil: Ditt søk og Kontaktfeil-kortet. Ingen kart, Ansvarsmerknad eller Stokkoversikt.
//
// Valgt kort er én tilstand her (indeks, kort 1 fra start). Stokken viser det valgte kortet, og kartet
// kobles til samme tilstand i story 3.5. Et nytt Søk (ny `resultatId`) setter det tilbake til kort 1.
//
// Komponenten står alltid i treet, også på Søk, slik at det høflige live-området overlever byttet
// mellom flatene. I live-området står overskriften, Plassholderstokken med «Finner turer …» eller
// Kontaktfeil-kortet, så de meldes når de settes inn. Hver ny tilstand flytter fokus: til overskriften,
// til tittelen på Kontaktfeil-kortet, eller til Plassholderstokken, og siden ruller dit.
//
// Frarådet får en plassholder til story 2.10. Værsammendrag og Værvarsling kommer i story 2.9.

export type Resultattilstand =
  /** Søket er sendt, og svaret venter. `dittSok` er Søket som ble sendt. */
  | { type: "venter"; id: string; dittSok: DittSokData }
  | { type: "resultat"; visning: Resultatvisning }
  /** Ingen kontakt, eller feil fra serveren. `dittSok` er Søket som Kontaktfeil gjelder for. */
  /** `kanProveIgjen` er false når serveren avviste Søket (400): samme Søk ville gitt samme feil. */
  | { type: "kontaktfeil"; id: string; dittSok: DittSokData; kanProveIgjen: boolean };

type Props = {
  /** Tilstanden som vises, eller `null` på Søk. */
  tilstand: Resultattilstand | null;
  onEndreSok: () => void;
  onEndreTilgjengeligTid: () => void;
  onProvIgjen: () => void;
};

const tilstandId = (t: Resultattilstand | null) => (t === null ? null : t.type === "resultat" ? t.visning.resultatId : t.id);

export function Resultat({ tilstand, onEndreSok, onEndreTilgjengeligTid, onProvIgjen }: Props) {
  const overskrift = useRef<HTMLHeadingElement>(null);
  const plassholder = useRef<HTMLParagraphElement>(null);
  const stokk = useRef<HTMLElement>(null);
  const id = tilstandId(tilstand);
  const visning = tilstand?.type === "resultat" ? tilstand.visning : null;
  const resultatId = visning?.resultatId ?? null;

  // Valget gjelder Resultatet det ble gjort i. Et nytt Resultat starter på kort 1.
  const [valg, settValg] = useState<{ resultatId: string | null; indeks: number }>({ resultatId, indeks: 0 });
  const valgt = valg.resultatId === resultatId ? valg.indeks : 0;
  const velg = (indeks: number) => settValg({ resultatId, indeks });

  // Fokus og rulling ved hver ny tilstand. Overskriften i Resultatet og tittelen på Kontaktfeil-kortet
  // deler `overskrift`. Mens svaret venter, får «Finner turer …» fokus, og siden ruller til toppen av
  // Plassholderstokken.
  useEffect(() => {
    if (id === null) return;
    const element = overskrift.current ?? plassholder.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const rull = element === plassholder.current ? (element.parentElement ?? element) : element;
    rull.scrollIntoView({ block: "start" });
  }, [id]);

  const turforslag = visning?.utfall.type === "turforslag" ? visning.utfall.kort : null;
  const alternativ = visning?.utfall.type === "kortesteTur" ? visning.utfall : null;
  const harKort = turforslag !== null || alternativ !== null;

  // «Endre søk» står i toppfeltet på mobil og nettbrett når Resultatet har kort.
  useEndreSokIToppfelt(harKort ? onEndreSok : null);

  /** Stokkoversikten: velg kortet, og gå tilbake til Stokken med fokus. */
  function velgFraOversikt(indeks: number) {
    velg(indeks);
    const element = stokk.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "start", behavior: rolig ? "auto" : "smooth" });
  }

  // Ditt søk øverst: fra Resultatvisningen, eller Søket som ble sendt mens svaret venter og ved Kontaktfeil.
  // Bare Resultatet med kort har «Endre søk» i Ditt søk. Kontaktfeil-kortet har knappen selv.
  const dittSok = visning
    ? harKort
      ? visning.dittSok
      : null
    : tilstand && tilstand.type !== "resultat"
      ? tilstand.dittSok
      : null;

  return (
    <div className={tilstand ? stil.resultat : undefined}>
      {tilstand && dittSok && (
        <div key={`topp-${id}`} className={stil.topp}>
          <div className={stil.pc}>
            <DittSok dittSok={dittSok} onEndreSok={harKort ? onEndreSok : undefined} />
          </div>
          <div className={stil.mobil}>
            <DittSokLinje dittSok={dittSok} />
          </div>
          {visning?.vaer.type === "mangler" && <Vaermangel />}
        </div>
      )}

      <div aria-live="polite">
        {visning && (
          <h1 key={visning.resultatId} ref={overskrift} tabIndex={-1} className={stil.overskrift}>
            {visning.overskrift}
          </h1>
        )}
        {tilstand?.type === "venter" && <Plassholderstokk key={tilstand.id} tekstRef={plassholder} />}
        {tilstand?.type === "kontaktfeil" && (
          <Kontaktfeil
            key={tilstand.id}
            tittelRef={overskrift}
            onProvIgjen={tilstand.kanProveIgjen ? onProvIgjen : null}
            onEndreSok={onEndreSok}
          />
        )}
      </div>

      {visning && turforslag && (
        <div key={`bunn-${visning.resultatId}`} className={stil.bunn}>
          <div className={`${stil.pc} ${stil.kortene}`} data-testid="kortraden">
            {turforslag.map((kort) => (
              <Turkort key={kort.turId} kort={kort} antall={turforslag.length} />
            ))}
          </div>
          <div className={`${stil.mobil} ${stil.stokkdel}`}>
            <Stokk ref={stokk} kort={turforslag} valgt={valgt} onVelg={velg} />
            <Stokkoversikt kort={turforslag} valgt={valgt} onVelg={velgFraOversikt} />
          </div>
          <Ansvarsmerknad />
        </div>
      )}

      {visning && alternativ && (
        <div key={`bunn-${visning.resultatId}`} className={stil.bunn}>
          <div className={stil.alternativ}>
            <Turkort kort={alternativ.kort} antall={1} alternativ />
            <div className={stil.alternativHandling}>
              <Knapp className={stil.endreTid} onClick={onEndreTilgjengeligTid}>
                {ENDRE_TILGJENGELIG_TID}
              </Knapp>
              <p className={stil.passerMed} data-testid="passer-med">
                {alternativ.passerMedTekst}
              </p>
            </div>
          </div>
          <Ansvarsmerknad />
        </div>
      )}

      {visning && !harKort && (
        <div key={`plassholder-${visning.resultatId}`} className={stil.plassholder} data-testid="resultat-kommer">
          <p className={stil.plassholdertekst}>{RESULTAT_KOMMER}</p>
          <Knapp variant="sekundaer" onClick={onEndreSok}>
            {ENDRE_SOK}
          </Knapp>
        </div>
      )}
    </div>
  );
}
