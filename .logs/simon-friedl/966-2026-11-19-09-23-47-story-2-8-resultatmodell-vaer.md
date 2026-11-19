# Story 2.8: Resultatmodell for dårlig og frarådet vær

## 2026-11-19 kl. 09:23 — Simon Friedl

### Oppgave
Kjør story 2.8 med `bmad-build`. Delene fra 2.4–2.7 skal kobles sammen, så Resultatet følger tabellen under FR-6: god, dårlig, frarådet og manglende vær (FR-6, FR-11, FR-12, FR-13, SM-C1). Ikke bedt om push.

### Plan
- Dispatch-ruten med spec: [spec-2-8-resultatmodell-for-darlig-og-fraradet-vaer.md](../../_bmad-output/implementation-artifacts/spec-2-8-resultatmodell-for-darlig-og-fraradet-vaer.md). Specen ble skrevet ut fra epicen, EXPERIENCE og skissene. Den ble godkjent ut fra Simons mål om å kjøre alle storyene ferdig.
- Implementert av en subagent og gjennomgått i tre lag.

### Resultat
- **`lagMiljo(null)`** bruker MET-adapteren, som én instans på modulnivå. `fetch` kalles indirekte, så testene kan bytte den ut.
- **`lagResultatvisning`** i kjernen har hele flyten:
  - Værklassen bestemmes én gang
  - `anbefal` kalles ikke ved frarådet
  - `finnBedreTidsvindu`
  - Værvarsling med den utløsende verdien først
  - Frarådet-utfallet med melding og radene Vær og Tid
  - overskriftene etter State Patterns
- **`svarPaSok`** henter været og faller tilbake til `mangler` hvis værkilden kaster.
- **Eksemplene:**
  - UJ-1 er god, med «Tre Turforslag som passer nå».
  - UJ-2 gir «Tre Turforslag i dårlig vær», med Moldevatnet fra Jensgurilia først og Bedre tidsvindu 14:00 med 5 Turer.
  - UJ-3 er frarådet, med «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).» og «Ingen Turforslag».
  - UJ-3 med 15 min, etter at Bedre tidsvindu er tatt i bruk, gir den korteste Turen på 16 min.
- **Gjennomgangen** ga 11 rettelser, 1 utsatt sak og 3 avviste funn. Den største rettelsen var at flyten ble flyttet til kjernen, med én Værklasse og samme `terskler` gjennom hele flyten.
- **Verifisering:** Vitest gir 1334/1334, lint og `npx tsc --noEmit` er rene, og Playwright gir 93/93 i CI-modus. Ingen test kaller MET.
- **Status:** committet i `344329f` og ikke pushet. Sprint-status er `review`, fordi walkthrough ikke er hoppet over.

### Åpne punkter
- **Walkthrough av 2.8 gjenstår.** Etterpå settes 2.8 til `done`.
- **Ikke push 2.8 alene til Production.** UI-et viser ikke Værsammendraget, Værvarslingen eller Frarådet-kortet før 2.9 og 2.10. Uten demo forsvinner Værmangel-linjen, og ved frarådet står bare overskriften.
- Ingenting tvinger e2e-testene til å bruke `?demo` (se `deferred-work.md`).
