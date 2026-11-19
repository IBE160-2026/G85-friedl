// Porten til språkmodellen (AD-12, FR-22). Modellen får bare Regelteksten og fakta om Turen, og gir en
// Språkmodelltekst eller `null`. Skallet kontrollerer svaret før det brukes. Demomodus bruker den falske
// modellen i falsk.ts, og ellers Claude i claude.ts når nøkkelen er satt.

export type SprakmodellInn = { regeltekst: string; fakta: readonly string[] };

export type Sprakmodell = (inn: SprakmodellInn, signal?: AbortSignal) => Promise<string | null>;
