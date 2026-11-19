import { useSyncExternalStore } from "react";

// Brytepunktet for PC (1200 px) som hooks, for det som bare skal monteres på én side av det: Kartutsnittet
// i kortene under 1200 px (story 3.2) og Søk-kartet fra 1200 px (story 3.3). Begge er usanne på serveren og
// under hydreringen, så kartene monteres bare på klienten.

/** Samme grense som CSS bruker for PC-oppsettet. */
const PC = "(min-width: 1200px)";

function abonner(varsle: () => void) {
  const medie = window.matchMedia(PC);
  medie.addEventListener("change", varsle);
  return () => medie.removeEventListener("change", varsle);
}

/** Sann under 1200 px (mobil og nettbrett). Usann på serveren, så kartet monteres bare på klienten. */
export function useUnderPc(): boolean {
  return useSyncExternalStore(
    abonner,
    () => !window.matchMedia(PC).matches,
    () => false,
  );
}

/**
 * Sann fra 1200 px (PC), altså `useUnderPc` invertert. Usann på serveren og under hydreringen, så Søk-kartet
 * (story 3.3) bare monteres på klienten, og mobil og nettbrett aldri lager det.
 */
export function usePc(): boolean {
  return useSyncExternalStore(
    abonner,
    () => window.matchMedia(PC).matches,
    () => false,
  );
}
