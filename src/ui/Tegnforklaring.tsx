import type { Ref } from "react";
import stil from "./Kart.module.css";
import { KART } from "./tekster";

// Tegnforklaringen nede til venstre i kartet (UX-DR36): Startpunkt, Mål bare når minst ett kort har Mål,
// og den stiplede «omtrentlig rute». Den står i egen fil uten Leaflet, så den kan testes på serveren.
// Kartet er pynt for skjermlesere, fordi alt det viser, står i kortene. Derfor er også forklaringen skjult.

/** Trekanten for Mål, rundt (0, 0). Brukes både i kartet og i tegnforklaringen. */
export const MAL_STI = "M0,-8 L7,5 L-7,5 Z";
export const MAL_VIEWBOX = "-8 -9 16 15";

export function Tegnforklaring({ harMal, ref }: { harMal: boolean; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={stil.forklaring} aria-hidden="true" data-testid="tegnforklaring">
      <span className={stil.forklaringsdel}>
        <span className={`${stil.pin} ${stil.pinValgt} ${stil.pinLiten}`}>1</span>
        {KART.startpunkt}
      </span>
      {harMal && (
        <span className={stil.forklaringsdel} data-testid="tegnforklaring-mal">
          <svg className={`${stil.forklaringsmal} ${stil.mal} ${stil.malValgt}`} viewBox={MAL_VIEWBOX}>
            <path d={MAL_STI} />
          </svg>
          {KART.mal}
        </span>
      )}
      <span className={stil.forklaringsdel}>
        <svg className={stil.strek} viewBox="0 0 28 8">
          <line x1="2" y1="4" x2="26" y2="4" />
        </svg>
        {KART.omtrentligRute}
      </span>
    </div>
  );
}
