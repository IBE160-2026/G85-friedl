import { useId } from "react";
import type { Vaer } from "@/kjerne/visning/skjema";
import { Kriteriemerke } from "./Kriteriemerke";
import { VAERVARSLING_FORKLARING } from "./tekster";
import stil from "./Vaervarsling.module.css";
import { Vaersymbol } from "./Vaersymbol";

// Værvarslingen (FR-11, UX-DR19, DESIGN.md › Værvarsling): et panel med `vaervarsling`-flate ved Værklasse
// dårlig. Merket se opp og tittelen i rust, verdiene med den utløsende først, Værsymbolet, forklaringen
// om rekkefølgen og Høydemerknaden. Står der Værmangel-linjen ellers står, over Turforslagene eller
// Alternativet. Panelet er en region med tittelen som navn, så det kan nås med landemerkenavigasjon.
// Tittelen sier at det er en varsling, så merket er pynt. Live-området melder tittelen.
// Bedre tidsvindu-boksen kommer til høyre på PC og under på mobil i story 2.10.

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;

/** Værvarslingen for `vaer`. Uten `vaervarsling` (alle klasser utenom dårlig) vises ingenting. */
export function Vaervarsling({ vaer }: { vaer: VaerVurdert }) {
  const tittelId = useId();
  const varsling = vaer.vaervarsling;
  if (!varsling) return null;
  return (
    <section className={stil.panel} aria-labelledby={tittelId} data-testid="vaervarsling">
      <div className={stil.innhold}>
        <p className={stil.tittel}>
          <Kriteriemerke merke="se-opp" pynt />
          <strong id={tittelId} data-testid="vaervarsling-tittel">
            {varsling.tittel}
          </strong>
        </p>
        <div className={stil.tekster}>
          <p className={stil.verdier} data-testid="vaervarsling-tekst">
            {varsling.tekst}
          </p>
          {vaer.symbol && (
            <p className={stil.symbol}>
              <Vaersymbol symbol={vaer.symbol} />
            </p>
          )}
          <p className={stil.forklaring}>{VAERVARSLING_FORKLARING}</p>
          <p className={stil.hoydemerknad} data-testid="hoydemerknad">
            {vaer.hoydemerknad}
          </p>
        </div>
      </div>
    </section>
  );
}
