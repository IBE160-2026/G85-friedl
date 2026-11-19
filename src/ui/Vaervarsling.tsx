import { useId } from "react";
import type { Sok } from "@/kjerne/sok";
import type { BedreTidsvindu, Vaer } from "@/kjerne/visning/skjema";
import { BedreTidsvinduBoks } from "./BedreTidsvinduBoks";
import { Kriteriemerke } from "./Kriteriemerke";
import { VAERVARSLING_FORKLARING } from "./tekster";
import stil from "./Vaervarsling.module.css";
import { Vaersymbol } from "./Vaersymbol";

// Værvarslingen (FR-11, UX-DR19, DESIGN.md › Værvarsling): et panel med `vaervarsling`-flate ved Værklasse
// dårlig. Merket se opp og tittelen i rust, verdiene med den utløsende først, Værsymbolet, forklaringen
// om rekkefølgen og Høydemerknaden. Står der Værmangel-linjen ellers står, over Turforslagene eller
// Alternativet. Panelet er en region med tittelen som navn, så det kan nås med landemerkenavigasjon.
// Tittelen sier at det er en varsling, så merket er pynt. Live-området melder tittelen.
// Bedre tidsvindu-boksen står til høyre på PC (fra 1200 px) og under på mobil (story 2.10).

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;

type Props = {
  vaer: VaerVurdert;
  /** Bedre tidsvindu fra Resultatvisningen. Skjemaet krever det ved dårlig vær. */
  bedreTidsvindu?: BedreTidsvindu;
  onBrukBedreTidsvindu: (sok: Sok) => void;
};

/** Værvarslingen for `vaer`. Uten `vaervarsling` (alle klasser utenom dårlig) vises ingenting. */
export function Vaervarsling({ vaer, bedreTidsvindu, onBrukBedreTidsvindu }: Props) {
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
      {bedreTidsvindu && (
        <div className={stil.bedre}>
          <BedreTidsvinduBoks bedreTidsvindu={bedreTidsvindu} onBruk={onBrukBedreTidsvindu} />
        </div>
      )}
    </section>
  );
}
