import type { Turkort as TurkortData } from "@/kjerne/visning/skjema";
import { Begrunnelse } from "./Begrunnelse";
import { Dagslysstolpe } from "./Dagslysstolpe";
import { Kriterierad } from "./Kriterierad";
import { Nummerstempel } from "./Nummerstempel";
import skjult from "./skjult.module.css";
import { ALTERNATIV, KILDE, NY_FANE, PASSER_FORDI, plassTekst, SLIK_STAR_DEN, TURFORSLAG } from "./tekster";
import { Tidsstolpe } from "./Tidsstolpe";
import stil from "./Turkort.module.css";

// Turkortet på PC (DESIGN.md › Turkort), ovenfra: Nummerstempel og «1 av 3», Mål og «fra …»,
// faktalinjen, Startpunkt, perforeringen, PASSER FORDI med de fire Kriterieradene, Begrunnelse-boksen
// og foten med kildelenken. Kartutsnittet og «Vis på kartet» kommer med kartet i Epic 3.
// Kortet er én artikkel med lesetekst fra serveren som navn (UX-DR43).
// I Stokken (`iStokken`, mobil og nettbrett) er Begrunnelsen én kursiv linje, med kildelenken under.
//
// Alternativkortet (`alternativ`, DESIGN.md › Alternativkort) er samme kort med stempelet «→»,
// «Alternativ · den korteste Turen» ved stempelet og overlinjen SLIK STÅR DEN MOT SØKET DITT i dempet
// tone. Tid-raden er warn, og Tidsstolpen har biten over grensen. Det rendres én gang for alle bredder,
// så begge formene av Begrunnelsen står i kortet, og CSS viser boksen fra 1200 px og linjen under.

type Props = { kort: TurkortData; antall: number; iStokken?: boolean; alternativ?: boolean };

export function Turkort({ kort, antall, iStokken = false, alternativ = false }: Props) {
  const [tid, vaer, onsker, morke] = kort.kriterier;
  // Plassen kommer fra serveren, så stempelet og «N av M» sier det samme som leseteksten.
  const { nummer } = kort.kart;
  return (
    <article
      className={alternativ ? `${stil.kort} ${stil.alternativ}` : stil.kort}
      aria-label={kort.lesetekst}
      data-testid={alternativ ? "alternativkort" : "turkort"}
    >
      <div className={stil.hode}>
        {alternativ ? <Nummerstempel pil /> : <Nummerstempel nummer={nummer} />}
        {alternativ ? (
          <p className={stil.plass} data-testid="alternativ-type">
            <span className={stil.av}>{ALTERNATIV.type}</span>
            <span className={stil.skille} aria-hidden="true">
              {" · "}
            </span>
            <span className={stil.type}>{ALTERNATIV.tekst}</span>
          </p>
        ) : (
          <p className={stil.plass}>
            <span className={stil.av}>{plassTekst(nummer, antall)}</span>
            <span className={stil.type}>{TURFORSLAG}</span>
          </p>
        )}
      </div>
      <h2 className={stil.mal}>{kort.mal}</h2>
      <p className={stil.fra} data-testid="fra">
        {kort.fra}
      </p>
      <p className={stil.fakta} data-testid="faktalinje">
        {kort.faktalinje}
      </p>
      <p className={stil.startpunkt} data-testid="startpunkt">
        {kort.startpunktTekst}
      </p>

      <div className={stil.perforering} aria-hidden="true">
        <svg className={stil.stiplet}>
          <line x1="0" y1="50%" x2="100%" y2="50%" />
        </svg>
      </div>

      <p className={stil.overlinje}>{alternativ ? SLIK_STAR_DEN : PASSER_FORDI}</p>
      <div className={stil.rader}>
        <Kriterierad kriterium={tid}>
          <Tidsstolpe stolpe={kort.tidsstolpe} />
        </Kriterierad>
        <Kriterierad kriterium={vaer} />
        <Kriterierad kriterium={onsker} />
        <Kriterierad kriterium={morke}>
          <Dagslysstolpe stolpe={kort.dagslysstolpe} varsel={morke.merke === "se-opp"} />
        </Kriterierad>
      </div>
      {alternativ ? (
        <>
          <div className={stil.barePc}>
            <Begrunnelse tekst={kort.regeltekst} />
          </div>
          <div className={stil.bareMobil}>
            <Begrunnelse tekst={kort.regeltekst} linje />
          </div>
        </>
      ) : (
        <Begrunnelse tekst={kort.regeltekst} linje={iStokken} />
      )}

      <div className={stil.fot}>
        <a className={stil.kilde} href={kort.kilde.url} target="_blank" rel="noopener noreferrer">
          {`${KILDE} ${kort.kilde.navn}`}
          <span className={skjult.skjult}>{NY_FANE}</span>
        </a>
      </div>
    </article>
  );
}
