import type { DittSok as DittSokData } from "@/kjerne/visning/skjema";
import stil from "./DittSokLinje.module.css";
import skjult from "./skjult.module.css";
import { DITT_SOK, dittSokLinje, preferanseliste } from "./tekster";

// Ditt søk på mobil og nettbrett (DESIGN.md › Ditt søk): én linje av de ferdige feltene, skilt med
// « · », for eksempel «I dag · 13:30 · 2 t · Middels · utsikt». Opplevelsespreferansene skilles med
// « og », som i panelet på PC, og leddet utelates når ingen er valgt. «Endre søk» står i toppfeltet.
// Dette er sammensetning av ferdige tekster, ikke formatering.

export function DittSokLinje({ dittSok }: { dittSok: DittSokData }) {
  const { opplevelsespreferanser } = dittSok;
  const ledd = [dittSok.turdag, dittSok.starttidspunkt, dittSok.tilgjengeligTid, dittSok.vanskelighetsgrad];
  if (opplevelsespreferanser.length > 0) ledd.push(preferanseliste(opplevelsespreferanser));

  return (
    <p className={stil.linje} data-testid="ditt-sok-linje">
      <span className={skjult.skjult}>{`${DITT_SOK}: `}</span>
      {dittSokLinje(ledd)}
    </p>
  );
}
