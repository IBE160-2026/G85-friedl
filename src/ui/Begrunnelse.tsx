import stil from "./Begrunnelse.module.css";
import { BEGRUNNELSE, BEGRUNNELSE_LINJE, sitat } from "./tekster";

// Begrunnelse-boksen (DESIGN.md › Begrunnelse-boks). På PC er det et felt i sidefarge med overlinjen
// BEGRUNNELSE og Regelteksten ordrett, i kursiv og i anførselstegn. I Stokken (mobil og nettbrett) er
// det én kursiv linje: «Begrunnelse: «…»» (UX-DR27).

type Props = { tekst: string; linje?: boolean };

export function Begrunnelse({ tekst, linje = false }: Props) {
  if (linje) {
    return (
      <p className={stil.linje} data-testid="begrunnelse">
        {`${BEGRUNNELSE_LINJE} ${sitat(tekst)}`}
      </p>
    );
  }
  return (
    <div className={stil.boks} data-testid="begrunnelse">
      <p className={stil.etikett}>{BEGRUNNELSE}</p>
      <p className={stil.tekst}>{sitat(tekst)}</p>
    </div>
  );
}
