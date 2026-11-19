import type { Sprakmodell } from "./typer";

// Den falske språkmodellen for Demomodus (AD-12). Deterministisk: samme Regeltekst gir samme tekst.
// Den legger ikke til tall eller ord som kan gjøre at kontrollen avviser teksten.

export const falsk: Sprakmodell = async ({ regeltekst }) => `Kort fortalt: ${regeltekst}.`;
