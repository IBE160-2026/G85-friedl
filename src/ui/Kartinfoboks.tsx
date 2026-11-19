import type { Ref } from "react";
import type { Turkort as TurkortData } from "@/kjerne/visning/skjema";
import { usePc } from "./brytepunkt";
import stil from "./Kartinfoboks.module.css";
import { Nummerstempel } from "./Nummerstempel";
import skjult from "./skjult.module.css";
import { KARTUTSNITT, stokkNavn } from "./tekster";

// Kartinfoboksen (story 3.5, FR-24, UX-DR37, DESIGN.md › Kartinfoboks): et papirfelt med skoggrønn kant og et
// lite Nummerstempel (`sizeSmall`). Den viser navnet, «lengde · Vanskelighetsgrad» og Startpunktet på egen
// linje for det valgte kortet, ferdig fra modellen (`kartinfoboks`), som i skissen pc-2. Ved Alternativet
// viser den den korteste Turen, med stempelet «→».
//
// Boksen står i Resultatet, ikke i Leaflet-kartet, så den vises også mens kartet laster. På PC ligger den
// øverst til høyre over kartet, og på mobil og nettbrett over kartet (Kartinfoboks.module.css). Den er ikke
// interaktiv. Skjult står «Turforslag N av M:» eller «Alternativ:» foran navnet.
//
// Bare boksen ved hovedkartet kan endre seg (`live`), og den er et høflig live-område bare på PC, så et valg
// i kortraden eller i kartet meldes. Under 1200 px melder Stokknavigasjonen allerede «N av M» når valget
// endres, også ved et trykk i kartet, så boksen ville gitt en ekstra melding om samme endring. Live-området
// settes etter hydreringen (`usePc`), før brukeren kan velge noe.

type Props = {
  kort: TurkortData;
  /** Antall kort i Resultatet, til «Turforslag N av M». */
  antall: number;
  alternativ?: boolean;
  /** Boksen følger valget (hovedkartet), og meldes på PC. Kopiene ved Alternativet er faste. */
  live?: boolean;
  ref?: Ref<HTMLDivElement>;
};

export function Kartinfoboks({ kort, antall, alternativ = false, live = false, ref }: Props) {
  const pc = usePc();
  const { navn, tekst, startpunkt } = kort.kartinfoboks;
  const hvem = alternativ ? KARTUTSNITT.alternativ : stokkNavn(kort.kart.nummer, antall);
  return (
    <div
      ref={ref}
      className={stil.boks}
      aria-live={live && pc ? "polite" : undefined}
      aria-atomic={live && pc ? "true" : undefined}
      data-testid="kartinfoboks"
    >
      {alternativ ? (
        <Nummerstempel pil className={stil.stempel} />
      ) : (
        <Nummerstempel nummer={kort.kart.nummer} className={stil.stempel} />
      )}
      <div className={stil.tekst}>
        <p className={stil.navn}>
          <span className={skjult.skjult}>{`${hvem}: `}</span>
          {navn}
        </p>
        <p className={stil.fakta}>{tekst}</p>
        <p className={stil.startpunkt}>{startpunkt}</p>
      </div>
    </div>
  );
}
