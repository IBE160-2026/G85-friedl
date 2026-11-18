"use client";

import { useId } from "react";
import { okNavn, reduserNavn } from "./tekster";
import stil from "./Trinnvelger.module.css";

// Trinnvelger (DESIGN.md › trinnvelger): − / <select> / +. Knappene går ett valg ned eller opp og hopper
// over låste valg. Ved grensen er knappen aria-disabled og gjør ingenting, men kan fortsatt få fokus.
// Verdien i midten er en vanlig <select> med feltets etikett, så telefonen viser sin egen velger.

export type Trinnvalg = { verdi: string; etikett: string; last?: boolean };

type Props = {
  etikett: string;
  valg: readonly Trinnvalg[];
  verdi: string;
  onEndre: (verdi: string) => void;
  /** Liten tekst under verdien, for eksempel «nå». */
  under?: string;
  /** Hjelpetekster under feltet, i rekkefølge. */
  hjelpetekster?: readonly string[];
};

function Ikon({ pluss }: { pluss: boolean }) {
  return (
    <svg className={stil.ikon} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <line x1="1" y1="8" x2="15" y2="8" />
      {pluss && <line x1="8" y1="1" x2="8" y2="15" />}
    </svg>
  );
}

export function Trinnvelger({ etikett, valg, verdi, onEndre, under, hjelpetekster = [] }: Props) {
  const id = useId();
  const velgerId = `${id}-velger`;
  const underId = `${id}-under`;
  const hjelpIder = hjelpetekster.map((_, i) => `${id}-hjelp-${i}`);
  const beskrivelse = [under && underId, ...hjelpIder].filter(Boolean).join(" ") || undefined;

  const indeks = valg.findIndex((v) => v.verdi === verdi);
  const finn = (retning: -1 | 1) => {
    for (let i = indeks + retning; i >= 0 && i < valg.length; i += retning) {
      if (!valg[i].last) return valg[i].verdi;
    }
    return null;
  };
  const forrige = finn(-1);
  const neste = finn(1);

  const trinnknapp = (navn: string, mal: string | null, pluss: boolean) => (
    <button
      type="button"
      className={stil.trinn}
      aria-label={navn}
      aria-disabled={mal === null ? true : undefined}
      onClick={() => {
        if (mal !== null) onEndre(mal);
      }}
    >
      <Ikon pluss={pluss} />
    </button>
  );

  return (
    <div className={stil.felt}>
      <label htmlFor={velgerId} className={stil.etikett}>
        {etikett}
      </label>
      <div className={stil.velger}>
        {trinnknapp(reduserNavn(etikett), forrige, false)}
        <div className={stil.midt}>
          <select
            id={velgerId}
            className={under ? `${stil.verdi} ${stil.medUnder}` : stil.verdi}
            value={verdi}
            aria-describedby={beskrivelse}
            onChange={(e) => onEndre(e.target.value)}
          >
            {valg.map((v) => (
              <option key={v.verdi} value={v.verdi} disabled={v.last}>
                {v.etikett}
              </option>
            ))}
          </select>
          {under && (
            <span id={underId} className={stil.under}>
              {under}
            </span>
          )}
        </div>
        {trinnknapp(okNavn(etikett), neste, true)}
      </div>
      {hjelpetekster.map((tekst, i) => (
        <p key={hjelpIder[i]} id={hjelpIder[i]} className={stil.hjelpetekst}>
          {tekst}
        </p>
      ))}
    </div>
  );
}
