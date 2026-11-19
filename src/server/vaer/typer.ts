import type { Vaermelding } from "@/kjerne/vaer/typer";

// Typer som skallet deler mellom miljo.ts og værkildene i src/server/vaer/. Egen fil, så
// met.ts og miljo.ts ikke importerer hverandre når 2.8 kobler MET-adapteren inn i lagMiljo.

/**
 * Henter Værmeldingen, eller gir `null` når den mangler. MET-adapteren `lagMetVaerkilde` i
 * src/server/vaer/met.ts gir en slik kilde, men kobles inn i `lagMiljo` først i story 2.8.
 */
export type Vaerkilde = () => Promise<Vaermelding | null>;
