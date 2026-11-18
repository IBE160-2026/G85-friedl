import stil from "./Ansvarsmerknad.module.css";
import { Kriteriemerke } from "./Kriteriemerke";
import { ANSVARSMERKNAD } from "./tekster";

// Ansvarsmerknaden (FR-17): et papirpanel med merket none og ansvarsteksten. Ikke interaktiv.

export function Ansvarsmerknad() {
  return (
    <p className={stil.panel} data-testid="ansvarsmerknad">
      <Kriteriemerke merke="ingen" pynt />
      <span>{ANSVARSMERKNAD}</span>
    </p>
  );
}
