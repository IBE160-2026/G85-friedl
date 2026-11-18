// Tid i kjernen (AD-7). Øyeblikk er epoke-ms i UTC.
// Story 1.3 bygger videre på denne fila med Oslo-logikken (Turdag, kvarter).

/** Én time i millisekunder. */
export const TIME_MS = 60 * 60 * 1000;

/**
 * Starten på hver hele time som overlapper det halvåpne intervallet [startUtc, sluttUtc).
 * 13:30–15:30 gir timene som starter 13, 14 og 15, og 10:00–12:00 gir 10 og 11.
 *
 * Ren UTC-aritmetikk er nok: Norge har hele timers forskyvning fra UTC,
 * så hele UTC-timer er hele timer i norsk tid.
 */
export function timerITidsvindu(startUtc: number, sluttUtc: number): number[] {
  const timer: number[] = [];
  if (!(sluttUtc > startUtc)) return timer;
  for (let t = Math.floor(startUtc / TIME_MS) * TIME_MS; t < sluttUtc; t += TIME_MS) {
    timer.push(t);
  }
  return timer;
}
