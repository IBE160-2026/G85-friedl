import stil from "./Nummerstempel.module.css";

// Nummerstempelet (DESIGN.md › Shapes): et avrundet kvadrat i skoggrønt med plassen i Resultatet.
// Alternativkortet har pila «→» på skoggrønt (`backgroundAlt`) i stedet for et tall. Pila er et
// SVG-ikon, fordi Nunito Sans mangler tegnet (DESIGN.md › Ikoner). Frarådet-kortet har «!» på rust
// (`components.fraradet-kort.stamp`, som peker på `backgroundWarn`).
// Stempelet er pynt for skjermlesere, fordi «1 av 3», «Alternativ» eller «Ingen Turforslag» står ved
// siden av og i kortets navn.

type Props = { className?: string } & (
  | { nummer: number; pil?: never; varsel?: never }
  | { pil: true; nummer?: never; varsel?: never }
  | { varsel: true; nummer?: never; pil?: never }
);

export function Nummerstempel({ nummer, pil, varsel, className }: Props) {
  const klasser = [stil.stempel, pil ? stil.alt : null, varsel ? stil.varsel : null, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span className={klasser} aria-hidden="true" data-testid="nummerstempel">
      {pil ? (
        <svg className={stil.pil} viewBox="0 0 20 20" focusable="false" data-testid="stempel-pil">
          <path
            d="M3.5,10 H16 M11,4.8 L16.2,10 L11,15.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : varsel ? (
        "!"
      ) : (
        nummer
      )}
    </span>
  );
}
