import type { CSSProperties } from "react";
import type { Turkort } from "@/kjerne/visning/skjema";
import stil from "./Dagslysstolpe.module.css";

// Dagslysstolpen (DESIGN.md › Dagslysstolpe) går fra Starttidspunkt til den seneste av solnedgang og
// Turens slutt. Feltet etter mørkegrensen (solnedgang − 30 min) er mørkere, med en stiplet grenselinje.
// Fyllet går til Turens slutt og har et endepunkt. Starter Turen før soloppgang, er feltet fra start
// til soloppgang også mørkt. Alle andelene og tekstene kommer fra serveren. Stolpen er pynt for
// skjermlesere, fordi Mørke-raden sier det samme.

type Props = {
  stolpe: Turkort["dagslysstolpe"];
  /** Mørkevarsel: fyllet er rust. */
  varsel: boolean;
};

const andel = (verdi: number) => ({ "--andel": verdi }) as CSSProperties;
const felt = (fra: number, til: number) => ({ "--fra": fra, "--til": til }) as CSSProperties;

export function Dagslysstolpe({ stolpe, varsel }: Props) {
  const { startTekst, slutt, skumring, solNed, solOpp } = stolpe;
  const fyll = varsel ? `${stil.fyll} ${stil.varsel}` : stil.fyll;
  const endepunkt = varsel ? `${stil.endepunkt} ${stil.varsel}` : stil.endepunkt;
  return (
    <div className={stil.dagslys} aria-hidden="true" data-testid="dagslysstolpe">
      <div className={stil.spor} data-testid="dagslysstolpe-spor">
        {skumring !== null && (
          <div className={`${stil.morkt} ${stil.etterSkumring}`} style={felt(skumring, 1)} />
        )}
        <div className={fyll} style={andel(slutt.andel)} />
        {/* Feltet før soloppgang tegnes over fyllet, så det synes selv om Turen starter i mørket. */}
        {solOpp && (
          <div
            className={`${stil.morkt} ${stil.forSoloppgang}`}
            style={felt(0, solOpp.andel)}
            data-testid="dagslysstolpe-solopp"
          />
        )}
        {skumring !== null && (
          <div className={stil.grense} style={andel(skumring)} data-testid="dagslysstolpe-grense" />
        )}
        <div
          className={endepunkt}
          style={andel(slutt.andel)}
          data-testid="dagslysstolpe-slutt"
        />
      </div>
      <div className={stil.merker}>
        <span className={stil.start}>{startTekst}</span>
        {solOpp && (
          <span className={stil.merke} style={andel(solOpp.andel)}>
            {solOpp.tekst}
          </span>
        )}
        {solNed && (
          <span className={stil.merke} style={andel(solNed.andel)}>
            {solNed.tekst}
          </span>
        )}
      </div>
    </div>
  );
}
