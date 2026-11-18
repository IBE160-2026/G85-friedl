import { Knapp } from "./Knapp";
import stil from "./Stokknavigasjon.module.css";
import { FORRIGE_TURFORSLAG, NESTE_TUR, NESTE_TURFORSLAG, plassTekst } from "./tekster";

// Stokknavigasjonen under Stokken, i tommelsonen (DESIGN.md › Stokken og Stokknavigasjon). «Forrige
// Turforslag» er en rund knapp med pil, «Neste Turforslag» en primær pille med «Neste tur». I midten står
// «N av M» med én prikk per kort, og prikkene er pynt. En knapp som ikke kan brukes, er inaktiv med
// `aria-disabled` og beholder fokus, i stedet for `disabled`.

type Props = { valgt: number; antall: number; onVelg: (indeks: number) => void };

/** Pila (chevron) som SVG, fordi Nunito Sans mangler tegnet (DESIGN.md › Ikoner). */
function Pil({ retning }: { retning: "venstre" | "hoyre" }) {
  return (
    <svg className={stil.pil} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d={retning === "venstre" ? "M10,2.5 L4.5,8 L10,13.5" : "M6,2.5 L11.5,8 L6,13.5"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Stokknavigasjon({ valgt, antall, onVelg }: Props) {
  const forste = valgt === 0;
  const siste = valgt === antall - 1;

  return (
    <div className={stil.navigasjon} data-testid="stokknavigasjon">
      <button
        type="button"
        className={stil.forrige}
        aria-label={FORRIGE_TURFORSLAG}
        aria-disabled={forste || undefined}
        onClick={() => {
          if (!forste) onVelg(valgt - 1);
        }}
      >
        <Pil retning="venstre" />
      </button>

      <p className={stil.posisjon}>
        {/* Meldes høflig, så bytte med knappene eller sveip høres i skjermleseren. */}
        <span className={stil.av} data-testid="stokk-posisjon" aria-live="polite" aria-atomic="true">
          {plassTekst(valgt + 1, antall)}
        </span>
        <span className={stil.prikker} aria-hidden="true">
          {Array.from({ length: antall }, (_, i) => (
            <span key={i} className={i === valgt ? `${stil.prikk} ${stil.aktiv}` : stil.prikk} />
          ))}
        </span>
      </p>

      <Knapp
        className={stil.neste}
        aria-label={NESTE_TURFORSLAG}
        aria-disabled={siste || undefined}
        onClick={() => {
          if (!siste) onVelg(valgt + 1);
        }}
      >
        {NESTE_TUR}
        <Pil retning="hoyre" />
      </Knapp>
    </div>
  );
}
