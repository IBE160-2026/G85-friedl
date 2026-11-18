import { type Ref, useId } from "react";
import { Knapp } from "./Knapp";
import stil from "./Kontaktfeil.module.css";
import { Kriteriemerke } from "./Kriteriemerke";
import { ENDRE_SOK, KONTAKTFEIL } from "./tekster";

// Kontaktfeil-kortet (DESIGN.md › Kontaktfeil-kort, EXPERIENCE.md › Får ikke kontakt): et papirkort uten
// kartutsnitt, med merket none, «Vi fikk ikke kontakt.» i page-title, «Søket ditt er tatt vare på.»,
// primærknappen «Prøv igjen» og sekundærknappen «Endre søk». Det står i live-området i Resultatet, så
// det meldes, og tittelen får fokus fra koden (`tabIndex={-1}`). Uten `onProvIgjen` (serveren avviste
// Søket) står bare «Endre søk».

type Props = {
  onProvIgjen: (() => void) | null;
  onEndreSok: () => void;
  tittelRef?: Ref<HTMLHeadingElement>;
};

export function Kontaktfeil({ onProvIgjen, onEndreSok, tittelRef }: Props) {
  const id = useId();
  return (
    <section className={stil.kort} aria-labelledby={id} data-testid="kontaktfeil">
      <div className={stil.hode}>
        <Kriteriemerke merke="ingen" pynt />
        <h1 id={id} ref={tittelRef} tabIndex={-1} className={stil.tittel}>
          {KONTAKTFEIL.tittel}
        </h1>
      </div>
      <p className={stil.tekst}>{KONTAKTFEIL.tekst}</p>
      <div className={stil.knapper}>
        {onProvIgjen && <Knapp onClick={onProvIgjen}>{KONTAKTFEIL.provIgjen}</Knapp>}
        <Knapp variant="sekundaer" onClick={onEndreSok}>
          {ENDRE_SOK}
        </Knapp>
      </div>
    </section>
  );
}
