import { useId } from "react";
import type { Turkort as TurkortData } from "@/kjerne/visning/skjema";
import { Kriteriemerke } from "./Kriteriemerke";
import { Nummerstempel } from "./Nummerstempel";
import skjult from "./skjult.module.css";
import stil from "./Stokkoversikt.module.css";
import { RADNAVN, STOKKOVERSIKT, stokkNavn } from "./tekster";

// Stokkoversikten under Stokken på mobil og nettbrett (DESIGN.md › Stokkoversikt): «Alle tre i stokken»
// (ved to kort «Begge i stokken») og én rad per kort med Nummerstempel, «Mål fra Startpunkt», fire små
// Kriteriemerker i radrekkefølge og «1 t 32 min uten pauser · tilbake 15:02». Hver rad er en knapp med
// `aria-pressed` for det valgte kortet. Et trykk velger kortet, og Resultatet ruller tilbake til Stokken.
// Ved ett kort vises ingen Stokkoversikt.

type Props = { kort: readonly TurkortData[]; valgt: number; onVelg: (indeks: number) => void };

export function Stokkoversikt({ kort, valgt, onVelg }: Props) {
  const id = useId();
  const antall = kort.length;
  if (antall !== 2 && antall !== 3) return null;

  return (
    <section className={stil.oversikt} aria-labelledby={id} data-testid="stokkoversikt">
      <h2 id={id} className={stil.overskrift}>
        {STOKKOVERSIKT[antall]}
      </h2>
      <ul className={stil.rader}>
        {kort.map((k, i) => (
          <li key={k.turId}>
            <button type="button" className={stil.rad} aria-pressed={i === valgt} onClick={() => onVelg(i)}>
              <Nummerstempel nummer={k.kart.nummer} className={stil.stempel} />
              <span className={stil.tekst}>
                <span className={skjult.skjult}>{`${stokkNavn(k.kart.nummer, antall)}: `}</span>
                <span className={stil.navn}>{`${k.mal} ${k.fra}`}</span>
                <span className={stil.linje}>
                  <span className={stil.merker}>
                    {k.kriterier.map((kriterium) => (
                      <Kriteriemerke
                        key={kriterium.rad}
                        merke={kriterium.merke}
                        rad={RADNAVN[kriterium.rad]}
                        className={stil.merke}
                      />
                    ))}
                  </span>
                  <span className={stil.tid}>{k.stokkoversiktRad}</span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
