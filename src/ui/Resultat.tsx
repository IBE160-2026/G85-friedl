"use client";

import { useEffect, useRef } from "react";
import type { Resultatvisning } from "@/kjerne/visning/skjema";
import { Ansvarsmerknad } from "./Ansvarsmerknad";
import { DittSok } from "./DittSok";
import { Knapp } from "./Knapp";
import stil from "./Resultat.module.css";
import { ENDRE_SOK, RESULTAT_KOMMER } from "./tekster";
import { Turkort } from "./Turkort";
import { Vaermangel } from "./Vaermangel";

// Resultat-flaten på PC (EXPERIENCE.md › Information Architecture): Ditt søk, Værmangel-linjen,
// overskriften, Turkortene side om side og Ansvarsmerknaden. Demomodus-merket står i toppfeltet og
// Krediteringen i bunnen (Side). Alt innhold kommer ferdig fra Resultatvisningen.
//
// Komponenten står alltid i treet, også på Søk, slik at det høflige live-området overlever byttet
// mellom flatene og meldes når overskriften settes inn. Et nytt Resultat (ny `resultatId`) erstatter
// det gamle helt, og fokus flyttes til overskriften, som siden ruller til.
//
// Under 1200 px står kortene under hverandre til Stokken kommer i story 1.13. Alternativ og frarådet
// får en plassholder til story 1.14 og 2.10. Værsammendrag og Værvarsling kommer i story 2.9.

type Props = {
  /** Resultatet som vises, eller `null` på Søk. */
  visning: Resultatvisning | null;
  onEndreSok: () => void;
};

export function Resultat({ visning, onEndreSok }: Props) {
  const overskrift = useRef<HTMLHeadingElement>(null);
  const resultatId = visning?.resultatId ?? null;

  useEffect(() => {
    if (resultatId === null) return;
    const element = overskrift.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "start" });
  }, [resultatId]);

  const turforslag = visning?.utfall.type === "turforslag" ? visning.utfall.kort : null;

  return (
    <div className={visning ? stil.resultat : undefined}>
      {visning && turforslag && (
        <div key={`topp-${visning.resultatId}`} className={stil.topp}>
          <DittSok dittSok={visning.dittSok} onEndreSok={onEndreSok} />
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
          <div className={stil.kortene}>
            {turforslag.map((kort) => (
              <Turkort key={kort.turId} kort={kort} antall={turforslag.length} />
            ))}
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
