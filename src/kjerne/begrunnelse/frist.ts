// Fristen for Språkmodellteksten (FR-22, AD-12): 5 s. Serveren avbryter modellen etter fristen, og klienten
// bytter ikke inn en tekst som kommer senere. Visningen kan bare importere typer fra kjernen, så
// src/ui/begrunnelser.ts har sin egen kopi av verdien.

/** Fristen for Språkmodellteksten, i ms. */
export const BEGRUNNELSE_FRIST_MS = 5000;
