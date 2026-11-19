import type { Vaermelding } from "@/kjerne/vaer/typer";

// Typer som skallet deler mellom miljo.ts og værkildene i src/server/vaer/. Egen fil, så
// met.ts ikke importerer fra miljo.ts, som bruker MET-adapteren i lagMiljo.

/**
 * Henter Værmeldingen, eller gir `null` når den mangler. MET-adapteren `lagMetVaerkilde` i
 * src/server/vaer/met.ts gir en slik kilde, og `lagMiljo` bruker den uten demo.
 */
export type Vaerkilde = () => Promise<Vaermelding | null>;
