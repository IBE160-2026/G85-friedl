import type { Ref } from "react";
import stil from "./Kart.module.css";
import { OMRADE } from "./tekster";

// Boksen øverst til venstre på Søk-kartet (story 3.3, UX-DR40, skissen pc-1): «Moldemarka» og telleteksten
// «12 Turer fra 8 Startpunkter» fra sidedataene. Den står i egen fil uten Leaflet, så den kan testes på
// serveren. Telleteksten står ikke andre steder på Søk, så boksen er ikke skjult for skjermlesere.

export function Omradeboks({ telletekst, ref }: { telletekst: string; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} className={stil.omradeboks} data-testid="omradeboks">
      <p className={stil.omradenavn}>{OMRADE}</p>
      <p className={stil.telletekst} data-testid="telletekst">
        {telletekst}
      </p>
    </div>
  );
}
