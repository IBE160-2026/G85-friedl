import { Fragment } from "react";
import { Side } from "./Side";
import { UKJENT_DEMO_OVERSKRIFT, ukjentDemoTekst } from "./tekster";
import stil from "./UkjentDemo.module.css";

// Ukjent demo-ID: et enkelt papirpanel med lenker til de gyldige demoene. Bare den som skriver en
// ugyldig URL, ser det, så det har ingen egen UX.

type Props = { id: string; gyldigeDemoIder: readonly string[] };

export function UkjentDemo({ id, gyldigeDemoIder }: Props) {
  return (
    <Side demo={null}>
      <h1 className={stil.overskrift}>{UKJENT_DEMO_OVERSKRIFT}</h1>
      <p className={stil.panel}>
        {ukjentDemoTekst(id)}
        {gyldigeDemoIder.map((gyldig, i) => (
          <Fragment key={gyldig}>
            {i > 0 && ", "}
            <a className={stil.lenke} href={`/?${new URLSearchParams({ demo: gyldig })}`}>
              {gyldig}
            </a>
          </Fragment>
        ))}
        .
      </p>
    </Side>
  );
}
