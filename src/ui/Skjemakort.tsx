import type { FormEventHandler, ReactNode } from "react";
import { Knapp } from "./Knapp";
import stil from "./Skjemakort.module.css";
import { FINN_TUR } from "./tekster";

// Skjemakortet (DESIGN.md › Skjemakort): et papirkort med kortfot og to stokk-kanter bak på alle
// bredder, som et hint om at turkortene kommer derfra. «Finn tur» står nederst og er aldri låst.

type Props = {
  children: ReactNode;
  onFinnTur: () => void;
};

export function Skjemakort({ children, onFinnTur }: Props) {
  const send: FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    onFinnTur();
  };

  return (
    <div className={stil.stokk}>
      <form className={stil.kort} aria-label="Søk" noValidate onSubmit={send}>
        <div className={stil.felter}>{children}</div>
        <Knapp type="submit" stor className={stil.finnTur}>
          {FINN_TUR}
        </Knapp>
      </form>
    </div>
  );
}
