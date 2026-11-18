"use client";

import { useId } from "react";
import stil from "./Segmentvelger.module.css";

// Segmentvelger (DESIGN.md › segmentvelger): én radiogruppe med synlig etikett.
// Hvert valg er en ekte radioknapp som dekker hele segmentet, så piltastene og trykk virker som vanlig.

export type Segmentvalg<V extends string> = { verdi: V; etikett: string; last?: boolean };

type Props<V extends string> = {
  etikett: string;
  /** Kort hjelpetekst rett etter etiketten, for eksempel «høyeste du vil gå». */
  hint?: string;
  /** Hjelpetekst under feltet, for eksempel når «I dag» er låst. */
  hjelpetekst?: string;
  valg: readonly Segmentvalg<V>[];
  verdi: V;
  onVelg: (verdi: V) => void;
};

export function Segmentvelger<V extends string>({ etikett, hint, hjelpetekst, valg, verdi, onVelg }: Props<V>) {
  const id = useId();
  const etikettId = `${id}-etikett`;
  const hintId = `${id}-hint`;
  const hjelpId = `${id}-hjelp`;
  const beskrivelse = [hint && hintId, hjelpetekst && hjelpId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={stil.felt}>
      <p className={stil.etikettlinje}>
        <span id={etikettId} className={stil.etikett}>
          {etikett}
        </span>
        {hint && (
          <span id={hintId} className={stil.hint}>
            {hint}
          </span>
        )}
      </p>
      <div role="radiogroup" aria-labelledby={etikettId} aria-describedby={beskrivelse} className={stil.gruppe}>
        {valg.map((v) => (
          <label key={v.verdi} className={stil.valg}>
            <input
              type="radio"
              className={stil.radio}
              name={id}
              value={v.verdi}
              checked={v.verdi === verdi}
              disabled={v.last}
              onChange={() => onVelg(v.verdi)}
            />
            <span className={stil.tekst}>{v.etikett}</span>
          </label>
        ))}
      </div>
      {hjelpetekst && (
        <p id={hjelpId} className={stil.hjelpetekst}>
          {hjelpetekst}
        </p>
      )}
    </div>
  );
}
