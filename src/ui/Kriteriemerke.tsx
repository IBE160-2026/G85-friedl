import type { Kriterium } from "@/kjerne/visning/skjema";
import stil from "./Kriteriemerke.module.css";
import { MERKENAVN } from "./tekster";

// Kriteriemerket (DESIGN.md › Kriteriemerke): ok er en skoggrønn sirkel med hvit hake, se opp en
// rustfarget sirkel med hvitt «!», og ingen en papirsirkel med kant i dempet tone og en vannrett strek.
// Merket har tekstalternativet «passer», «se opp» eller «ikke vurdert» (UX-DR24). Står det bare som
// pynt ved en tekst som sier det samme, er det skjult for skjermlesere (`pynt`).

type Props = { merke: Kriterium["merke"]; pynt?: boolean };

export function Kriteriemerke({ merke, pynt = false }: Props) {
  const tilgjengelig = pynt
    ? ({ "aria-hidden": true } as const)
    : ({ role: "img", "aria-label": MERKENAVN[merke] } as const);

  return (
    <svg className={`${stil.merke} ${stil[merke]}`} viewBox="0 0 26 26" focusable="false" {...tilgjengelig}>
      {merke === "ok" && (
        <>
          <circle cx="13" cy="13" r="13" className={stil.fyll} />
          <path d="M7.5,13.5 L11.2,17.2 L18.6,8.8" className={stil.ikon} strokeWidth="2.6" />
        </>
      )}
      {merke === "se-opp" && (
        <>
          <circle cx="13" cy="13" r="13" className={stil.fyll} />
          <path d="M13,7 V14.4" className={stil.ikon} strokeWidth="2.8" />
          <circle cx="13" cy="19" r="1.7" className={stil.prikk} />
        </>
      )}
      {merke === "ingen" && (
        <>
          <circle cx="13" cy="13" r="12.1" className={stil.ring} />
          <path d="M8.6,13 H17.4" className={stil.strek} strokeWidth="2.2" />
        </>
      )}
    </svg>
  );
}
