"use client";

import stil from "./Preferansebrikke.module.css";

// Preferansebrikke (DESIGN.md › preferansebrikke): en avkrysningsboks som ser ut som en pille.
// Avkrysningsboksen dekker hele brikken, så trykk og mellomrom virker som vanlig.
// Av: pluss i sirkel. På: skoggrønn brikke med hake. Haken er SVG, fordi Nunito Sans mangler ✓.

type Props = {
  etikett: string;
  pa: boolean;
  onEndre: (pa: boolean) => void;
};

function Ikon({ pa }: { pa: boolean }) {
  return (
    <svg className={stil.ikon} viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      {pa ? (
        <path d="M4.5 10.5 L8.5 14.5 L15.5 6" />
      ) : (
        <>
          <circle cx="10" cy="10" r="8.5" />
          <line x1="6" y1="10" x2="14" y2="10" />
          <line x1="10" y1="6" x2="10" y2="14" />
        </>
      )}
    </svg>
  );
}

export function Preferansebrikke({ etikett, pa, onEndre }: Props) {
  return (
    <label className={stil.brikke}>
      <input
        type="checkbox"
        className={stil.boks}
        checked={pa}
        onChange={(e) => onEndre(e.target.checked)}
      />
      <Ikon pa={pa} />
      <span>{etikett}</span>
    </label>
  );
}
