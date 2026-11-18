import stil from "./Nummerstempel.module.css";

// Nummerstempelet (DESIGN.md › Shapes): et avrundet kvadrat i skoggrønt med plassen i Resultatet.
// Det er pynt for skjermlesere, fordi «1 av 3» står ved siden av og i kortets lesetekst.

export function Nummerstempel({ nummer }: { nummer: number }) {
  return (
    <span className={stil.stempel} aria-hidden="true" data-testid="nummerstempel">
      {nummer}
    </span>
  );
}
