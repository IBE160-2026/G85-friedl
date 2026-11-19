import type { Sidedata } from "@/kjerne/visning/sidedata";
import { Side } from "./Side";
import { SokFlate } from "./SokFlate";
import { ToppfeltHandlingKilde } from "./ToppfeltHandling";

// Siden: Søk med forklaringen øverst og Skjemakortet under, og Resultatet etter «Finn tur».
// SokFlate eier byttet mellom de to flatene. På PC står kartet over Moldemarka ved siden av Skjemakortet,
// med Startpunktene og telleteksten fra sidedataene (story 3.3). ToppfeltHandlingKilde lar Resultatet
// sette «Endre søk» i toppfeltet.

export function SokSide({ sidedata }: { sidedata: Sidedata }) {
  return (
    <ToppfeltHandlingKilde>
      <Side demo={sidedata.demo}>
        <SokFlate
          skjema={sidedata.skjema}
          startpunkter={sidedata.startpunkter}
          telletekst={sidedata.telletekst}
          demoId={sidedata.demo?.id ?? null}
          sprakmodell={sidedata.sprakmodell}
        />
      </Side>
    </ToppfeltHandlingKilde>
  );
}
