import type { Turkort as TurkortData } from "@/kjerne/visning/skjema";
import { Begrunnelse } from "./Begrunnelse";
import { Dagslysstolpe } from "./Dagslysstolpe";
import { Kriterierad } from "./Kriterierad";
import { Nummerstempel } from "./Nummerstempel";
import skjult from "./skjult.module.css";
import { KILDE, NY_FANE, PASSER_FORDI, plassTekst, TURFORSLAG } from "./tekster";
import { Tidsstolpe } from "./Tidsstolpe";
import stil from "./Turkort.module.css";

// Turkortet på PC (DESIGN.md › Turkort), ovenfra: Nummerstempel og «1 av 3», Mål og «fra …»,
// faktalinjen, Startpunkt, perforeringen, PASSER FORDI med de fire Kriterieradene, Begrunnelse-boksen
// og foten med kildelenken. Kartutsnittet og «Vis på kartet» kommer med kartet i Epic 3.
// Kortet er én artikkel med lesetekst fra serveren som navn (UX-DR43).
// I Stokken (`iStokken`, mobil og nettbrett) er Begrunnelsen én kursiv linje, med kildelenken under.

type Props = { kort: TurkortData; antall: number; iStokken?: boolean };

export function Turkort({ kort, antall, iStokken = false }: Props) {
  const [tid, vaer, onsker, morke] = kort.kriterier;
  // Plassen kommer fra serveren, så stempelet og «N av M» sier det samme som leseteksten.
  const { nummer } = kort.kart;
  return (
    <article className={stil.kort} aria-label={kort.lesetekst} data-testid="turkort">
      <div className={stil.hode}>
        <Nummerstempel nummer={nummer} />
        <p className={stil.plass}>
          <span className={stil.av}>{plassTekst(nummer, antall)}</span>
          <span className={stil.type}>{TURFORSLAG}</span>
        </p>
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

      <p className={stil.overlinje}>{PASSER_FORDI}</p>
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
      <Begrunnelse tekst={kort.regeltekst} linje={iStokken} />

      <div className={stil.fot}>
        <a className={stil.kilde} href={kort.kilde.url} target="_blank" rel="noopener noreferrer">
          {`${KILDE} ${kort.kilde.navn}`}
          <span className={skjult.skjult}>{NY_FANE}</span>
        </a>
      </div>
    </article>
  );
}
