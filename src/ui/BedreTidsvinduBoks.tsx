import { useId } from "react";
import type { Sok } from "@/kjerne/sok";
import type { BedreTidsvindu } from "@/kjerne/visning/skjema";
import stil from "./BedreTidsvinduBoks.module.css";
import { Knapp } from "./Knapp";
import { BEDRE_TIDSVINDU } from "./tekster";

// Bedre tidsvindu-boksen (FR-19, UX-DR20, DESIGN.md › Bedre tidsvindu-boks): et papirfelt med skoggrønn
// kant inne i Værvarslingen, til høyre på PC og under på mobil. Overlinjen BEDRE TIDSVINDU, teksten
// («I morgen fra kl. 14:00 er Værklassen god.»), antallslinjen og primærknappen («Bruk 14:00»). Knappen
// sender `nyttSok` fra serveren, så UI-et bygger aldri et Søk selv. Knappen vises også når antallet er
// null. Uten Bedre tidsvindu (`ingen`) står bare teksten, uten antallslinje og knapp.
// Boksen er ikke en egen region, fordi den står inne i Værvarslingen. Knappen er beskrevet av teksten og
// antallslinjen, så skjermlesere hører dagen og klokkeslettet sammen med «Bruk 14:00».

type Props = { bedreTidsvindu: BedreTidsvindu; onBruk: (sok: Sok) => void };

export function BedreTidsvinduBoks({ bedreTidsvindu, onBruk }: Props) {
  const tekstId = useId();
  const antallId = useId();
  return (
    <div className={stil.boks} data-testid="bedre-tidsvindu-boks">
      <p className={stil.overlinje}>{BEDRE_TIDSVINDU}</p>
      {bedreTidsvindu.type === "funnet" ? (
        <div className={stil.rad}>
          <div className={stil.tekster}>
            <p id={tekstId} className={stil.tekst} data-testid="bedre-tidsvindu-tekst">
              {bedreTidsvindu.tekst}
            </p>
            <p id={antallId} className={stil.antall} data-testid="bedre-tidsvindu-antall">
              {bedreTidsvindu.antallTekst}
            </p>
          </div>
          <Knapp
            className={stil.knapp}
            aria-describedby={`${tekstId} ${antallId}`}
            onClick={() => onBruk(bedreTidsvindu.nyttSok)}
          >
            {bedreTidsvindu.knappTekst}
          </Knapp>
        </div>
      ) : (
        <p className={stil.tekst} data-testid="bedre-tidsvindu-tekst">
          {bedreTidsvindu.tekst}
        </p>
      )}
    </div>
  );
}
