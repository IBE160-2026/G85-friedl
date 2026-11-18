"use client";

import { useEffect, useRef, useState } from "react";
import type { Resultatvisning } from "@/kjerne/visning/skjema";
import { Ansvarsmerknad } from "./Ansvarsmerknad";
import { DittSok } from "./DittSok";
import { DittSokLinje } from "./DittSokLinje";
import { Knapp } from "./Knapp";
import stil from "./Resultat.module.css";
import { Stokk } from "./Stokk";
import { Stokkoversikt } from "./Stokkoversikt";
import { ENDRE_SOK, RESULTAT_KOMMER } from "./tekster";
import { useEndreSokIToppfelt } from "./ToppfeltHandling";
import { Turkort } from "./Turkort";
import { Vaermangel } from "./Vaermangel";

// Resultat-flaten (EXPERIENCE.md › Information Architecture). Demomodus-merket står i toppfeltet og
// Krediteringen i bunnen (Side). Alt innhold kommer ferdig fra Resultatvisningen.
//
// PC (fra 1200 px): Ditt søk som panel, Værmangel-linjen, overskriften, Turkortene side om side og
// Ansvarsmerknaden. Mobil og nettbrett: Ditt søk som én linje med «Endre søk» i toppfeltet,
// Værmangel-linjen, overskriften, Stokken med Stokknavigasjon, Stokkoversikten og Ansvarsmerknaden.
// Begge oppsettene står i DOM-en, og CSS viser ett av dem ved 1200 px (`display: none` på det andre),
// så det blir ingen forskjell mellom serveren og klienten.
//
// Valgt kort er én tilstand her (indeks, kort 1 fra start). Stokken viser det valgte kortet, og kartet
// kobles til samme tilstand i story 3.5. Et nytt Søk (ny `resultatId`) setter det tilbake til kort 1.
//
// Komponenten står alltid i treet, også på Søk, slik at det høflige live-området overlever byttet
// mellom flatene og meldes når overskriften settes inn. Et nytt Resultat erstatter det gamle helt, og
// fokus flyttes til overskriften, som siden ruller til.
//
// Alternativ og frarådet får en plassholder til story 1.14 og 2.10. Værsammendrag og Værvarsling
// kommer i story 2.9.

type Props = {
  /** Resultatet som vises, eller `null` på Søk. */
  visning: Resultatvisning | null;
  onEndreSok: () => void;
};

export function Resultat({ visning, onEndreSok }: Props) {
  const overskrift = useRef<HTMLHeadingElement>(null);
  const stokk = useRef<HTMLElement>(null);
  const resultatId = visning?.resultatId ?? null;

  // Valget gjelder Resultatet det ble gjort i. Et nytt Resultat starter på kort 1.
  const [valg, settValg] = useState<{ resultatId: string | null; indeks: number }>({ resultatId, indeks: 0 });
  const valgt = valg.resultatId === resultatId ? valg.indeks : 0;
  const velg = (indeks: number) => settValg({ resultatId, indeks });

  useEffect(() => {
    if (resultatId === null) return;
    const element = overskrift.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "start" });
  }, [resultatId]);

  const turforslag = visning?.utfall.type === "turforslag" ? visning.utfall.kort : null;

  // «Endre søk» står i toppfeltet på mobil og nettbrett når Ditt søk vises.
  useEndreSokIToppfelt(turforslag ? onEndreSok : null);

  /** Stokkoversikten: velg kortet, og gå tilbake til Stokken med fokus. */
  function velgFraOversikt(indeks: number) {
    velg(indeks);
    const element = stokk.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    const rolig = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollIntoView({ block: "start", behavior: rolig ? "auto" : "smooth" });
  }

  return (
    <div className={visning ? stil.resultat : undefined}>
      {visning && turforslag && (
        <div key={`topp-${visning.resultatId}`} className={stil.topp}>
          <div className={stil.pc}>
            <DittSok dittSok={visning.dittSok} onEndreSok={onEndreSok} />
          </div>
          <div className={stil.mobil}>
            <DittSokLinje dittSok={visning.dittSok} />
          </div>
          {visning.vaer.type === "mangler" && <Vaermangel />}
        </div>
      )}

      <div aria-live="polite">
        {visning && (
          <h1 key={visning.resultatId} ref={overskrift} tabIndex={-1} className={stil.overskrift}>
            {visning.overskrift}
          </h1>
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

      {visning && !turforslag && (
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
