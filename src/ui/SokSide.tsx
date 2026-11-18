import type { Sidedata } from "@/kjerne/visning/sidedata";
import { Side } from "./Side";
import { SokFlate } from "./SokFlate";

// Siden: Søk med forklaringen øverst og Skjemakortet under, og Resultatet etter «Finn tur».
// SokFlate eier byttet mellom de to flatene. Kartet over Moldemarka kommer i Epic 3, så til da bruker
// PC nettbrettoppsettet på Søk.

export function SokSide({ sidedata }: { sidedata: Sidedata }) {
  return (
    <Side demo={sidedata.demo}>
      <SokFlate skjema={sidedata.skjema} />
    </Side>
  );
}
