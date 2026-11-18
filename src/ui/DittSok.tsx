import { useId } from "react";
import type { DittSok as DittSokData } from "@/kjerne/visning/skjema";
import stil from "./DittSok.module.css";
import { Knapp } from "./Knapp";
import { DITT_SOK, ENDRE_SOK, ETIKETT, INGEN_PREFERANSE, preferanseliste } from "./tekster";

// Ditt søk på PC (DESIGN.md › Ditt søk): overlinjen DITT SØK og fem felt med etikett og verdi, og
// «Endre søk» som sekundærknapp til høyre. Verdiene kommer ferdige fra serveren. Uten valgt
// Opplevelsespreferanse står «ingen». Ikke interaktivt bortsett fra «Endre søk».

type Props = { dittSok: DittSokData; onEndreSok: () => void };

export function DittSok({ dittSok, onEndreSok }: Props) {
  const id = useId();
  const { opplevelsespreferanser } = dittSok;
  const felt: [string, string][] = [
    [ETIKETT.turdag, dittSok.turdag],
    [ETIKETT.starttidspunkt, dittSok.starttidspunkt],
    [ETIKETT.tilgjengeligTid, dittSok.tilgjengeligTid],
    [ETIKETT.vanskelighetsgrad, dittSok.vanskelighetsgrad],
    [
      ETIKETT.opplevelsespreferanser,
      opplevelsespreferanser.length > 0 ? preferanseliste(opplevelsespreferanser) : INGEN_PREFERANSE,
    ],
  ];

  return (
    <section className={stil.panel} aria-labelledby={id} data-testid="ditt-sok">
      <div className={stil.sok}>
        <p id={id} className={stil.overlinje}>
          {DITT_SOK}
        </p>
        <dl className={stil.felter}>
          {felt.map(([etikett, verdi]) => (
            <div key={etikett} className={stil.felt}>
              <dt className={stil.etikett}>{etikett}</dt>
              <dd className={stil.verdi}>{verdi}</dd>
            </div>
          ))}
        </dl>
      </div>
      <Knapp variant="sekundaer" className={stil.endre} onClick={onEndreSok}>
        {ENDRE_SOK}
      </Knapp>
    </section>
  );
}
