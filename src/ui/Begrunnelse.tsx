import stil from "./Begrunnelse.module.css";
import { BEGRUNNELSE, sitat } from "./tekster";

// Begrunnelse-boksen (DESIGN.md › Begrunnelse-boks): et felt i sidefarge med overlinjen BEGRUNNELSE
// og Regelteksten ordrett, i kursiv og i anførselstegn.

export function Begrunnelse({ tekst }: { tekst: string }) {
  return (
    <div className={stil.boks} data-testid="begrunnelse">
      <p className={stil.etikett}>{BEGRUNNELSE}</p>
      <p className={stil.tekst}>{sitat(tekst)}</p>
    </div>
  );
}
