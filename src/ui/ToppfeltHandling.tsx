"use client";

import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Knapp } from "./Knapp";
import { ENDRE_SOK } from "./tekster";
import stil from "./ToppfeltHandling.module.css";

// «Endre søk» i toppfeltet på mobil og nettbrett (DESIGN.md › Ditt søk). Toppfeltet står i Side, utenfor
// SokFlate, så Resultatet melder handlingen hit gjennom en kontekst. Uten melding (Søk, ukjent demo)
// står det ingen knapp. På PC (fra 1200 px) står «Endre søk» i panelet Ditt søk, og knappen her er skjult.

type Handling = () => void;
type SettHandling = (handling: Handling | null) => void;

const HandlingKontekst = createContext<Handling | null>(null);
const SettHandlingKontekst = createContext<SettHandling | null>(null);

/** Omslutter Side, slik at Resultatet kan sette «Endre søk» i toppfeltet. */
export function ToppfeltHandlingKilde({ children }: { children: ReactNode }) {
  const [handling, settHandling] = useState<Handling | null>(null);
  // Funksjoner i state settes med en oppdaterer, ellers kaller React dem.
  const [sett] = useState<SettHandling>(() => (ny: Handling | null) => settHandling(() => ny));
  return (
    <SettHandlingKontekst.Provider value={sett}>
      <HandlingKontekst.Provider value={handling}>{children}</HandlingKontekst.Provider>
    </SettHandlingKontekst.Provider>
  );
}

/** Setter «Endre søk» i toppfeltet så lenge `handling` ikke er `null`. */
export function useEndreSokIToppfelt(handling: Handling | null) {
  const sett = useContext(SettHandlingKontekst);
  useEffect(() => {
    if (!sett || !handling) return;
    sett(handling);
    return () => sett(null);
  }, [sett, handling]);
}

/** Knappen i toppfeltet. Står bare når Resultatet har satt handlingen. */
export function EndreSokIToppfelt() {
  const handling = useContext(HandlingKontekst);
  if (!handling) return null;
  return (
    <Knapp variant="sekundaer" className={stil.endre} onClick={handling} data-testid="toppfelt-endre-sok">
      {ENDRE_SOK}
    </Knapp>
  );
}
