import { Kriteriemerke } from "./Kriteriemerke";
import { VAERMANGEL } from "./tekster";
import stil from "./Vaermangel.module.css";

// Værmangel-linjen (FR-13): står der Værsammendraget ellers står, når Værmeldingen mangler.
// Et papirpanel med merket none. Teksten sier selv at været ikke er vurdert, så merket er pynt.

export function Vaermangel() {
  return (
    <p className={stil.linje} data-testid="vaermangel">
      <Kriteriemerke merke="ingen" pynt />
      <span>
        <strong className={stil.tittel}>{VAERMANGEL.tittel}</strong>
        {` ${VAERMANGEL.tekst}`}
      </span>
    </p>
  );
}
