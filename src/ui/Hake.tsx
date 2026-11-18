import { Fragment, type ReactNode } from "react";
import stil from "./Hake.module.css";
import skjult from "./skjult.module.css";
import { HAKE_TEKST } from "./tekster";

// Haken (✓) som SVG-ikon, fordi Nunito Sans mangler tegnet (DESIGN.md › Ikoner). Inne i en tekstlinje
// er ikonet like høyt som en stor bokstav og har tekstens farge. Skjermlesere får «: ja».

/** `mellomrom`: teksten hadde et mellomrom foran ✓, som blir en marg på ikonet. */
export function Hake({ mellomrom = true }: { mellomrom?: boolean }) {
  return (
    <>
      <svg
        className={mellomrom ? `${stil.hake} ${stil.mellomrom}` : stil.hake}
        viewBox="0 0 12 12"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M1.6,6.6 L4.7,9.6 L10.4,2.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={skjult.skjult}>{HAKE_TEKST}</span>
    </>
  );
}

/**
 * ✓ med eller uten mellomrom foran, eller «–» som står alene (for et ønske som ikke treffer, som i
 * «vann –»). Tankestrek mellom tall, som i «3–5 °C», står urørt.
 */
const TEGN = /( ?✓)|((?<=^|\s)–(?=\s|$))/g;

/**
 * Teksten fra kjernen med hvert ✓ byttet ut med ikonet, for eksempel «utsikt ✓ · vann –». En «–» som
 * står alene, skjules for skjermlesere, fordi ordet foran allerede sier at ønsket ikke treffer.
 */
export function medHake(tekst: string): ReactNode {
  const deler: ReactNode[] = [];
  let forrige = 0;
  for (const treff of tekst.matchAll(TEGN)) {
    const tegn = treff[1] ? (
      <Hake mellomrom={treff[1].startsWith(" ")} />
    ) : (
      <span aria-hidden="true">–</span>
    );
    deler.push(
      <Fragment key={treff.index}>
        {tekst.slice(forrige, treff.index)}
        {tegn}
      </Fragment>,
    );
    forrige = treff.index + treff[0].length;
  }
  if (deler.length === 0) return tekst;
  return [...deler, tekst.slice(forrige)];
}
