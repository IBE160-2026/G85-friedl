"use client";

import { useCallback, useMemo, useRef } from "react";
import { useUnderPc } from "./brytepunkt";
import type { Kartkort } from "./kart-data";
import { KartLaster } from "./KartLaster";
import stil from "./Kartutsnitt.module.css";
import skjult from "./skjult.module.css";
import { BAKGRUNNSKART, KART, KARTUTSNITT, NY_FANE } from "./tekster";

// Kartutsnittet øverst i Turkortet og Alternativkortet på mobil og nettbrett (story 3.2, UX-DR21, UX-DR28,
// UX-DR38, DESIGN.md › Kartutsnitt). Det er det statiske kartet med kortets egen rute og Startpunkt, fra
// kant til kant øverst i kortet: 104 px høyt på mobil og 160 px fra 768 px.
//
// Hele utsnittet er én knapp med navnet «Vis på kartet». Et trykk ruller til kartet i Resultatet
// (`onVisPaKartet`). Kartet i knappen er skjult for skjermlesere og har ingen fokuserbare elementer.
// Merket «Turforslag N av M» eller «Alternativ» står øverst til venstre i knappen. Merket nederst til
// høyre, «omtrentlig rute · © Kartverket», står utenfor knappen, så lenken «© Kartverket» ikke står i en
// knapp. Begge merkene får ikke plass ved siden av hverandre øverst ved 360 px, så det står nederst.
//
// Skallet (knappen, merkene og høyden) rendres alltid, så kortet ikke endrer høyde og knappen ikke
// forsvinner. CSS skjuler det fra 1200 px, og PC har ikke Kartutsnitt. Selve kartet monteres bare når
// `medKart` (kortet som vises i Stokken, eller Alternativkortet) og under 1200 px (`useUnderPc`). Ellers
// står den tomme kartflaten, og PC og kortene bak i Stokken lager ingen Leaflet-kart og henter ingen fliser.

type Props = {
  kort: Kartkort;
  /** Merket øverst til venstre: «Turforslag N av M» eller «Alternativ». */
  merke: string;
  onVisPaKartet: () => void;
  /** Monter kartet: kortet vises (det valgte i Stokken, eller Alternativkortet). */
  medKart: boolean;
};

export function Kartutsnitt({ kort, merke, onVisPaKartet, medKart }: Props) {
  const underPc = useUnderPc();
  const kortene = useMemo(() => [kort], [kort]);
  const rot = useRef<HTMLDivElement>(null);
  // Pillene kartet holder ruten og Startpunktet klar av.
  const merker = useCallback(() => [...(rot.current?.querySelectorAll("[data-pille]") ?? [])], []);

  return (
    <div ref={rot} className={stil.utsnitt}>
      <button
        type="button"
        className={stil.knapp}
        aria-label={KARTUTSNITT.visPaKartet}
        onClick={onVisPaKartet}
        data-testid="kartutsnitt"
      >
        <span className={stil.kart} aria-hidden="true">
          {medKart && underPc && <KartLaster kort={kortene} valgt={0} statisk merker={merker} />}
        </span>
        <span className={stil.merke} aria-hidden="true" data-pille data-testid="kartutsnitt-merke">
          {merke}
        </span>
      </button>
      <Kartmerke rute />
    </div>
  );
}

/**
 * Merket nederst til høyre på det statiske kartet: «omtrentlig rute · © Kartverket», eller bare
 * «© Kartverket» når kartet ikke har noen rute (Frarådet-kortet). «© Kartverket» er en lenke i ny fane
 * (FR-29) med trykkflate på 44 × 44 px. Bare lenken tar imot pekeren, så et trykk ved siden av den går
 * til kartet under. Pilledelene har `data-pille`, så kartet kan holde ruten klar av dem.
 */
export function Kartmerke({ rute }: { rute: boolean }) {
  return (
    <p className={stil.bunnmerke} data-testid="kartmerke">
      {rute && (
        <span className={stil.rutedel} aria-hidden="true" data-pille>
          <svg className={stil.strek} viewBox="0 0 20 8">
            <line x1="2" y1="4" x2="18" y2="4" />
          </svg>
          {KART.omtrentligRute}
          {KARTUTSNITT.skille}
        </span>
      )}
      <a
        className={stil.lenke}
        href={BAKGRUNNSKART.lenke}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="kartmerke-kreditering"
      >
        <span className={rute ? `${stil.lenkedel} ${stil.etterRute}` : stil.lenkedel} data-pille>
          {BAKGRUNNSKART.tekst}
        </span>
        <span className={skjult.skjult}>{NY_FANE}</span>
      </a>
    </p>
  );
}
