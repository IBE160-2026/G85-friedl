import type { Vaer } from "@/kjerne/visning/skjema";
import { Kriteriemerke } from "./Kriteriemerke";
import skjult from "./skjult.module.css";
import { TIDSVINDU } from "./tekster";
import stil from "./Vaersammendrag.module.css";
import { Vaersymbol } from "./Vaersymbol";

// Værsammendraget (FR-10, UX-DR16, DESIGN.md › Værsammendrag): et papirpanel ved Værklasse god og
// middels. Kriteriemerket og «Værklasse god», Værsymbolet med ord, verdiene og Tidsvinduet helt til høyre,
// med Høydemerknaden under. På mobil og nettbrett står klassen og symbolet på én linje, og verdiene og
// Tidsvinduet på neste. Står der Værmangel-linjen ellers står. Klassen står i teksten, så merket er pynt.
// Uten symbol (ukjent kode) vises verken ikon eller ord. Verdiene er `verdier`, sammendraget uten
// symbolordet, fordi ordet står ved ikonet. Tidsvinduet har etiketten «Tidsvindu» for skjermlesere.

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;

export function Vaersammendrag({ vaer }: { vaer: VaerVurdert }) {
  return (
    <div className={stil.panel} data-testid="vaersammendrag">
      <div className={stil.linjene}>
        <p className={stil.forste}>
          <span className={stil.klasse}>
            <Kriteriemerke merke="ok" pynt />
            <strong data-testid="vaerklasse">{vaer.klasseTekst}</strong>
          </span>
          {vaer.symbol && <Vaersymbol symbol={vaer.symbol} className={stil.symbol} />}
        </p>
        <p className={stil.andre}>
          <span className={stil.verdier} data-testid="vaerverdier">
            {vaer.verdier}
          </span>
          <span className={stil.tidsvindu}>
            <span className={skjult.skjult}>{`${TIDSVINDU}: `}</span>
            <span data-testid="tidsvindu">{vaer.tidsvindu}</span>
          </span>
        </p>
      </div>
      <p className={stil.hoydemerknad} data-testid="hoydemerknad">
        {vaer.hoydemerknad}
      </p>
    </div>
  );
}
