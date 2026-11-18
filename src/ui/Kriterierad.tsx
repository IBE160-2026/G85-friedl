import type { ReactNode } from "react";
import type { Kriterium } from "@/kjerne/visning/skjema";
import { medHake } from "./Hake";
import stil from "./Kriterierad.module.css";
import { Kriteriemerke } from "./Kriteriemerke";
import { RADETIKETT, RADNAVN } from "./tekster";

// Kriterieraden (DESIGN.md › Kriterierad): Kriteriemerke, den korte etiketten, verdien og
// detaljlinjene. Verdien er i rust ved «se opp». Raden har PRD-begrepet som tilgjengelig navn
// («Turtid»), så den korte etiketten («Tid») er skjult for skjermlesere. Teksten kommer ferdig fra
// serveren. ✓ i teksten blir SVG-ikonet, og «–» for et ønske som ikke treffer er skjult for skjermlesere.

type Props = { kriterium: Kriterium; children?: ReactNode };

export function Kriterierad({ kriterium, children }: Props) {
  const { rad, merke, tekst, detalj } = kriterium;
  return (
    <div className={stil.rad} role="group" aria-label={RADNAVN[rad]} data-rad={rad}>
      <Kriteriemerke merke={merke} />
      <span className={stil.etikett} aria-hidden="true">
        {RADETIKETT[rad]}
      </span>
      <div className={stil.innhold}>
        <p className={merke === "se-opp" ? `${stil.verdi} ${stil.varsel}` : stil.verdi}>{medHake(tekst)}</p>
        {detalj.map((linje, i) => (
          <p key={i} className={stil.detalj}>
            {medHake(linje)}
          </p>
        ))}
        {children}
      </div>
    </div>
  );
}
