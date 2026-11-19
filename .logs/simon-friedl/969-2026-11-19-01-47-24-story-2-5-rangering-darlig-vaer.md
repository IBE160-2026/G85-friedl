# Story 2.5: Rangering i dårlig vær

## 2026-11-19 kl. 01:47 — Simon Friedl

### Oppgave
Kjør story 2.5 med `bmad-build`, og hopp deretter over walkthrough og push. Ved dårlig vær skal lave og skjermede Turer stå øverst, uten at været fjerner Turer (FR-15, FR-16).

### Plan
- Dispatch-ruten med spec: [spec-2-5-rangering-i-darlig-vaer.md](../../_bmad-output/implementation-artifacts/spec-2-5-rangering-i-darlig-vaer.md). Specen ble skrevet ut fra epicen og godkjent ut fra Simons mål om å kjøre alle storyene ferdig.
- Implementert av en subagent og gjennomgått i tre lag.

### Resultat
- **`rangerTurer` og `anbefal`** (`src/kjerne/anbefaling.ts`) tar nå Værklassen som påkrevd parameter.
  - Ved `darlig` og `fraradet` er rekkefølgen:
    1. uten Mørkevarsel
    2. Lavtliggende tur (under `VAERPUNKT.hoydeMoh`)
    3. Egnet i dårlig vær (ja, ukjent, nei)
    4. treff på vann
    5. Turtid
    6. ID
  - God, middels og mangler gir samme rekkefølge som i 1.8.
- **`RangertTur`** har fått `lavtliggende` og `egnetDarligVaer`, som 2.7 trenger.
- **`sok.ts`** sender `"mangler\"` til 2.8. Ruten har en test som låser det.
- **UJ-2 i dårlig vær** gir Moldevatnet fra Jensgurilia, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet.
- **Gjennomgangen** ga 9 rettelser og 2 avviste funn. Rettelsene handlet mest om tester av rekkefølgen mellom kriteriene. Mutasjonene er nå fanget.
- **Verifisering:** Vitest gir 1156/1156, lint og `npx tsc --noEmit` er rene, og Playwright gir 90/90 i CI-modus.
- **Status:** committet i `c9d2128`. Sprint-status er `done` i `25070e5`, uten walkthrough etter Simons valg. Pushet til `main`.

### Åpne punkter
- Neste steg: story 2.6 (Bedre tidsvindu). Specen er skrevet.
