import type { Sidedata } from "@/kjerne/visning/sidedata";
import { EndreSokIToppfelt } from "./ToppfeltHandling";
import { APPNAVN, DEMOMODUS, naErTekst, OMRADE, VAERSCENARIO } from "./tekster";
import stil from "./Toppfelt.module.css";

// Toppfeltet med logo og ordmerke. Logoen er ikke en lenke (EXPERIENCE.md › Information Architecture).
// I Demomodus står Demomodus-merket som pille i toppfeltet på PC og som felt under det på mobil og nettbrett.
// På Resultat står «Endre søk» til høyre i toppfeltet på mobil og nettbrett (ToppfeltHandling).

function Logo() {
  return (
    <svg className={stil.logo} viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="7.875" fill="var(--colors-forest)" />
      <path
        d="M6.1,20.1 C10.5,20.1 9.6,13.1 14,13.1 S17.5,7.9 21.9,7.9"
        fill="none"
        stroke="var(--colors-on-forest)"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeDasharray="3.1 2.6"
      />
      <circle cx="21.9" cy="7.9" r="2.3" fill="var(--colors-on-forest)" />
    </svg>
  );
}

/** Demomodus-merket (NFR-11): «DEMOMODUS · Værscenario: … · «nå» = …». Ikke interaktivt. */
export function Demomodusmerke({ demo }: { demo: NonNullable<Sidedata["demo"]> }) {
  return (
    <p className={stil.demomodus} data-testid="demomodus">
      <span className={stil.demolinje}>
        <strong className={stil.demonavn}>{DEMOMODUS}</strong> · {VAERSCENARIO} {demo.beskrivelse}
      </span>
      <span className={stil.demoskille}> · </span>
      <span className={stil.demolinje}>{naErTekst(demo.naTekst)}</span>
    </p>
  );
}

export function Toppfelt({ demo }: { demo: Sidedata["demo"] }) {
  return (
    <header className={stil.toppfelt}>
      <div className={stil.merkevare}>
        <Logo />
        <span className={stil.appnavn}>{APPNAVN}</span>
        <span className={stil.omrade}>{OMRADE}</span>
      </div>
      <EndreSokIToppfelt />
      {demo && <Demomodusmerke demo={demo} />}
    </header>
  );
}
