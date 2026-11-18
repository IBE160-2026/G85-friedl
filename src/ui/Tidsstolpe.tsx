import type { CSSProperties } from "react";
import type { Turkort } from "@/kjerne/visning/skjema";
import stil from "./Tidsstolpe.module.css";

// Tidsstolpen (DESIGN.md › Tidsstolpe): fyllet er Turtid ÷ Tilgjengelig tid. Er Turtiden lengre
// (Alternativkortet), stikker en rustfarget bit ut over grensen, med en loddrett strek ved grensen.
// Andelene kommer fra serveren. Stolpen er pynt for skjermlesere, fordi Tid-raden sier det samme.

const andel = (verdi: number) => ({ "--andel": verdi }) as CSSProperties;

export function Tidsstolpe({ stolpe }: { stolpe: Turkort["tidsstolpe"] }) {
  const { fyll, overGrense } = stolpe;
  return (
    <div className={stil.stolpe} aria-hidden="true" data-testid="tidsstolpe">
      <div className={stil.fyll} style={andel(fyll)} data-testid="tidsstolpe-fyll" />
      {overGrense > 0 && (
        <>
          <div className={stil.over} style={{ ...andel(overGrense), "--start": fyll } as CSSProperties} />
          <div className={stil.grense} style={andel(fyll)} />
        </>
      )}
    </div>
  );
}
