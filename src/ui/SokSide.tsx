import type { Sidedata } from "@/kjerne/visning/sidedata";
import { Side } from "./Side";
import { SokFlate } from "./SokFlate";
import { ToppfeltHandlingKilde } from "./ToppfeltHandling";

// Siden: Søk med forklaringen øverst og Skjemakortet under, og Resultatet etter «Finn tur».
// SokFlate eier byttet mellom de to flatene. Kartet over Moldemarka kommer i Epic 3, så til da bruker
// PC nettbrettoppsettet på Søk. ToppfeltHandlingKilde lar Resultatet sette «Endre søk» i toppfeltet.

export function SokSide({ sidedata }: { sidedata: Sidedata }) {
  return (
    <ToppfeltHandlingKilde>
      <Side demo={sidedata.demo}>
        <SokFlate skjema={sidedata.skjema} />
      </Side>
    </ToppfeltHandlingKilde>
  );
}
