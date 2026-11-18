import stil from "./Kreditering.module.css";
import { KREDITERING, NY_FANE } from "./tekster";

// Krediteringen (FR-29) står nederst i alle tilstander. Lenkene åpner i ny fane.
// På mobil og nettbrett står hver del på egen linje, på PC på én linje skilt med « · ».

export function Kreditering() {
  return (
    <p className={stil.kreditering}>
      {KREDITERING.map(({ etikett, tekst, lenke }, i) => (
        <span key={etikett} className={stil.del}>
          {i > 0 && <span className={stil.skille}> · </span>}
          {etikett}{" "}
          {lenke ? (
            <a className={stil.lenke} href={lenke} target="_blank" rel="noopener noreferrer">
              {tekst}
              <span className={stil.skjult}>{NY_FANE}</span>
            </a>
          ) : (
            tekst
          )}
        </span>
      ))}
    </p>
  );
}
