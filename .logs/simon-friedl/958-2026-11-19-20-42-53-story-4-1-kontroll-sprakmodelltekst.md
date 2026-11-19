# Story 4.1: Kontroll av Språkmodellteksten

## 2026-11-19 kl. 20:42 — Simon Friedl

### Oppgave
Kjør story 4.1 med `bmad-build` under målet «kjør alle stories ferdig». Den rene funksjonen `kontrollerSprakmodelltekst(tekst, regeltekst, fakta)` skal avgjøre om en Språkmodelltekst sier nøyaktig det samme som Regelteksten (FR-22, NFR-2). Ikke bedt om push.

### Plan
- Ny [epic-4-context.md](../../_bmad-output/implementation-artifacts/epic-4-context.md) og spec: [spec-4-1-kontroll-av-sprakmodellteksten.md](../../_bmad-output/implementation-artifacts/spec-4-1-kontroll-av-sprakmodellteksten.md).
- Implementert av en subagent parallelt med 3.5 (bare kjernen, uten Playwright), og gjennomgått i tre lag.

### Resultat
- **`src/kjerne/begrunnelse/fakta.ts`** (`lagTurfakta`) og **`kontroll.ts`** (`formaterteVerdier`, `kontrollerSprakmodelltekst`), med tester. Kontrollen har fire regler:
  1. Verdiene står ordrett og hele.
  2. Tall med enhet må finnes i Regelteksten eller i fakta.
  3. Ingen tall eller brøk skrevet med ord.
  4. Ingen former av «trygg».
- **Avvik fra specen:** grunnen heter `forbudt-ord`, ikke `trygg`, fordi `forbud.test.ts` forbyr ordet i strenger i kjernen.
- **Gjennomgangen** ga 12 rettelser og 1 avvist funn. De viktigste:
  - En verdi kunne treffe inne i en lengre verdi («16 min» i «1 t 16 min»).
  - Tall ble sjekket uten enhet («152 km» ble godkjent).
- **Verifisering:** Vitest for kjernen, forbud og lagregler gir 895/895, og ESLint og `npx tsc --noEmit` er rene. Ingen UI er endret, så Playwright er ikke kjørt.
- **Status:** committet i `1f63ee3` og ikke pushet. Sprint-status er `review`.
- **Godkjent av brukeren:** `@anthropic-ai/sdk` 1.3.0 til story 4.3.

### Åpne punkter
- Walkthrough av 4.1 gjenstår. Vurder om det er greit at «en min …» som eiendomsord avvises, og at en bindestrek foran et siffer tolkes som minus.
