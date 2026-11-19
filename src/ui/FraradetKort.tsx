import { useId } from "react";
import type { Utfall, Vaer } from "@/kjerne/visning/skjema";
import stil from "./FraradetKort.module.css";
import { MOLDEMARKA } from "./kart-data";
import { KartLaster } from "./KartLaster";
import { Kartmerke } from "./Kartutsnitt";
import { Kriterierad } from "./Kriterierad";
import { Nummerstempel } from "./Nummerstempel";
import skjult from "./skjult.module.css";
import { DERFOR_INGEN_TUR, INGEN_TURFORSLAG, MET_FAREVARSLER, NY_FANE } from "./tekster";
import turkort from "./Turkort.module.css";

// Frarådet-kortet (FR-12, UX-DR21, DESIGN.md › Frarådet-kort): formet som et Turkort. Øverst står et
// statisk kart over Moldemarka uten ruter (story 3.2), med vindstreker over, der Kartutsnittet ellers står.
// Kartet har ingen knapp og tar ikke imot trykk. Det står ved alle bredder, med «© Kartverket» som lenke
// nede til høyre. Deretter stempelet «!»
// med «Ingen Turforslag», «Værklasse frarådet» i rust, verdiene og meldingen. Under perforeringen står
// overlinjen DERFOR INGEN TUR med radene Vær og Tid, og nederst lenken til MET sine farevarsler, som
// åpner i ny fane. Kortet er ikke interaktivt utenom lenkene. Det er én artikkel med «Ingen Turforslag» og
// Værklassen som navn.

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;
type Fraradet = Extract<Utfall, { type: "fraradet" }>;

type Props = { vaer: VaerVurdert; utfall: Fraradet };

/** Vindstrekene over kartet, i en flate på 400 × 120 som strekkes til kortet. */
const VINDSTREKER = [
  "M24,22 C90,12 150,30 190,24",
  "M70,40 C150,30 230,44 300,34",
  "M30,56 C120,46 220,62 320,52",
  "M90,72 C160,64 220,78 270,70",
  "M44,90 C130,80 210,96 280,86",
  "M120,104 C200,96 300,112 370,100",
] as const;

/** Kartet over Moldemarka har ingen ruter. */
const INGEN_KORT = [] as const;

export function FraradetKort({ vaer, utfall }: Props) {
  const ingenId = useId();
  const tittelId = useId();
  const [vaerRad, tidRad] = utfall.kriterier;
  return (
    <article className={stil.kort} aria-labelledby={`${ingenId} ${tittelId}`} data-testid="fraradet-kort">
      <div className={stil.vindflate} data-testid="vindflate">
        <div className={stil.kart} aria-hidden="true">
          <KartLaster kort={INGEN_KORT} valgt={0} statisk omrade={MOLDEMARKA} />
        </div>
        <svg
          className={stil.vindstreker}
          viewBox="0 0 400 120"
          preserveAspectRatio="none"
          focusable="false"
          aria-hidden="true"
          data-testid="vindstreker"
        >
          {/* Hver vindstrek har en papirhalo under, så den synes på bakgrunnskartet. */}
          {VINDSTREKER.map((d) => (
            <path key={`halo-${d}`} className={stil.vindhalo} d={d} />
          ))}
          {VINDSTREKER.map((d) => (
            <path key={d} className={stil.vind} d={d} />
          ))}
        </svg>
        <Kartmerke rute={false} />
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
