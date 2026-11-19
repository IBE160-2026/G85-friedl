import { useId } from "react";
import type { Utfall, Vaer } from "@/kjerne/visning/skjema";
import stil from "./FraradetKort.module.css";
import { Kriterierad } from "./Kriterierad";
import { Nummerstempel } from "./Nummerstempel";
import skjult from "./skjult.module.css";
import { DERFOR_INGEN_TUR, INGEN_TURFORSLAG, MET_FAREVARSLER, NY_FANE } from "./tekster";
import turkort from "./Turkort.module.css";

// Frarådet-kortet (FR-12, UX-DR21, DESIGN.md › Frarådet-kort): formet som et Turkort. Øverst står en
// papirflate med vindstreker der Kartutsnittet ellers står (ikke et ekte kart). Deretter stempelet «!»
// med «Ingen Turforslag», «Værklasse frarådet» i rust, verdiene og meldingen. Under perforeringen står
// overlinjen DERFOR INGEN TUR med radene Vær og Tid, og nederst lenken til MET sine farevarsler, som
// åpner i ny fane. Kortet er ikke interaktivt utenom lenken. Det er én artikkel med «Ingen Turforslag» og
// Værklassen som navn.

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;
type Fraradet = Extract<Utfall, { type: "fraradet" }>;

type Props = { vaer: VaerVurdert; utfall: Fraradet };

export function FraradetKort({ vaer, utfall }: Props) {
  const ingenId = useId();
  const tittelId = useId();
  const [vaerRad, tidRad] = utfall.kriterier;
  return (
    <article className={stil.kort} aria-labelledby={`${ingenId} ${tittelId}`} data-testid="fraradet-kort">
      <div className={stil.vindflate} aria-hidden="true" data-testid="vindflate">
        <svg viewBox="0 0 400 120" preserveAspectRatio="none" focusable="false">
          <path className={stil.kote} d="M0,92 C60,70 90,104 150,86 S260,48 330,70 S390,96 400,84" />
          <path className={stil.kote} d="M40,120 C70,92 120,96 170,104 S250,120 280,120" />
          <path className={stil.kote} d="M210,0 C230,24 290,30 320,14 S380,4 400,18" />
          <path className={stil.vind} d="M24,22 C90,12 150,30 190,24" />
          <path className={stil.vind} d="M70,40 C150,30 230,44 300,34" />
          <path className={stil.vind} d="M30,56 C120,46 220,62 320,52" />
          <path className={stil.vind} d="M90,72 C160,64 220,78 270,70" />
          <path className={stil.vind} d="M44,90 C130,80 210,96 280,86" />
          <path className={stil.vind} d="M120,104 C200,96 300,112 370,100" />
        </svg>
      </div>

      <div className={stil.hode}>
        <Nummerstempel varsel />
        <p id={ingenId} className={stil.ingen}>
          {INGEN_TURFORSLAG}
        </p>
      </div>
      <h2 id={tittelId} className={stil.klasse} data-testid="fraradet-klasse">
        {vaer.klasseTekst}
      </h2>
      <p className={stil.verdier} data-testid="fraradet-verdier">
        {vaer.verdier}
      </p>
      <p className={stil.melding} data-testid="fraradet-melding">
        {utfall.melding}
      </p>

      <div className={turkort.perforering} aria-hidden="true">
        <svg className={turkort.stiplet}>
          <line x1="0" y1="50%" x2="100%" y2="50%" />
        </svg>
      </div>

      <p className={stil.overlinje}>{DERFOR_INGEN_TUR}</p>
      <div className={stil.rader}>
        <Kriterierad kriterium={vaerRad} />
        <Kriterierad kriterium={tidRad} />
      </div>

      <div className={stil.fot}>
        <a
          className={stil.lenke}
          href={MET_FAREVARSLER.lenke}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="met-farevarsler"
        >
          {MET_FAREVARSLER.tekst}
          <span className={skjult.skjult}>{NY_FANE}</span>
        </a>
      </div>
    </article>
  );
}
