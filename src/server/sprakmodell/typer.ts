// Porten til språkmodellen (AD-12, FR-22). Modellen får bare Regelteksten og fakta om Turen, og gir en
// Språkmodelltekst eller `null`. Skallet kontrollerer svaret før det brukes. Demomodus bruker den falske
// modellen i falsk.ts, og Claude kobles til i story 4.3.

export type SprakmodellInn = { regeltekst: string; fakta: readonly string[] };

export type Sprakmodell = (inn: SprakmodellInn, signal?: AbortSignal) => Promise<string | null>;
