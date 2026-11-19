import { useId } from "react";
import type { Sok } from "@/kjerne/sok";
import type { BedreTidsvindu } from "@/kjerne/visning/skjema";
import stil from "./BedreTidsvinduKort.module.css";
import { Knapp } from "./Knapp";
import { Nummerstempel } from "./Nummerstempel";
import { ALTERNATIV_BEDRE_TIDSVINDU } from "./tekster";

// Bedre tidsvindu-kortet (FR-19, UX-DR22, DESIGN.md › Bedre tidsvindu-kort): et frittstående kort med
// skoggrønn kant ved Frarådet-kortet, ved siden av på PC og under på mobil. Stempelet «→», overlinjen
// ALTERNATIV · BEDRE TIDSVINDU, dagen («I morgen, søn. 15. nov.»), detaljen («fra kl. 11:00 · samme 2 t,
// Middels»), antallslinjen og primærknappen («Bruk i morgen 11:00»), som sender `nyttSok` fra serveren.
// Uten Bedre tidsvindu (`ingen`) står bare teksten, uten knapp. Overlinjen er kortets overskrift (h2) i
// begge tilstandene, og knappen er beskrevet av dagen, detaljen og antallslinjen.

type Props = { bedreTidsvindu: BedreTidsvindu; onBruk: (sok: Sok) => void };

export function BedreTidsvinduKort({ bedreTidsvindu, onBruk }: Props) {
  const overlinjeId = useId();
  const dagId = useId();
  const detaljId = useId();
  const antallId = useId();
  const funnet = bedreTidsvindu.type === "funnet" ? bedreTidsvindu : null;
  return (
    <article
      className={stil.kort}
      aria-labelledby={funnet ? `${overlinjeId} ${dagId}` : overlinjeId}
      data-testid="bedre-tidsvindu-kort"
    >
      <div className={stil.hode}>
        <Nummerstempel pil />
        <h2 id={overlinjeId} className={stil.overlinje}>
          <span>{ALTERNATIV_BEDRE_TIDSVINDU.type}</span>
          <span aria-hidden="true">{" · "}</span>
          <span>{ALTERNATIV_BEDRE_TIDSVINDU.tekst}</span>
        </h2>
      </div>
      {funnet ? (
        <>
          <p id={dagId} className={stil.dag} data-testid="bedre-tidsvindu-dag">
            {funnet.dag}
          </p>
          <p id={detaljId} className={stil.detalj} data-testid="bedre-tidsvindu-detalj">
            {funnet.detalj}
          </p>
          <p id={antallId} className={stil.antall} data-testid="bedre-tidsvindu-antall">
            {funnet.antallTekst}
          </p>
          <Knapp
            className={stil.knapp}
            aria-describedby={`${dagId} ${detaljId} ${antallId}`}
            onClick={() => onBruk(funnet.nyttSok)}
          >
            {funnet.knappTekst}
          </Knapp>
        </>
      ) : (
        <p className={stil.tekst} data-testid="bedre-tidsvindu-tekst">
          {bedreTidsvindu.tekst}
        </p>
      )}
    </article>
  );
}
