# Story 4.2: Begrunnelse-endepunktet og den falske språkmodellen

## 2026-11-19 kl. 21:15 — Simon Friedl

### Oppgave
Kjør story 4.2 med `bmad-build` under målet «kjør alle stories ferdig». `POST /api/begrunnelse` skal finnes, og en falsk språkmodell skal brukes i Demomodus. Klienten skal bytte inn Språkmodellteksten innen 5 s og bare i samme Resultat (FR-22, AD-12). Ikke bedt om push.

### Plan
- Dispatch-ruten med spec: [spec-4-2-begrunnelse-endepunktet-og-den-falske-sprakmodellen.md](../../_bmad-output/implementation-artifacts/spec-4-2-begrunnelse-endepunktet-og-den-falske-sprakmodellen.md).
- Implementert av en subagent og gjennomgått i tre lag.

### Resultat
- **Serveren:**
  - Endepunktet regner ut Regelteksten og fakta selv og kontrollerer svaret med `kontrollerSprakmodelltekst`.
  - Det gir `{ tekst: null }` for den korteste Turen, ved frarådet, for en ukjent `turId`, uten modell og når Søket må justeres.
  - Frist og avbrudd gjelder også på serveren.
- **Den falske modellen** gir «Kort fortalt: {Regeltekst}.». En test viser at den består kontrollen i alle demoscenarioene.
- **Klienten:**
  - Kroken `useBegrunnelser` er nøklet på `resultatId` og har en frist på 5 s.
  - Klienten sender ingenting når Sidedata sier at det ikke finnes noen modell.
  - Kortene endres bare i Begrunnelse-boksen.
- **Gjennomgangen** ga 12 rettelser, 1 utsatt og 2 avviste funn. De viktigste:
  - Avbrudd og frist til modellen.
  - Et Resultat som er regnet ut på nytt, kunne være et annet enn det klienten viser.
  - Feilmeldingen kunne lekke prompten til loggen.
  - Det manglet en e2e-test for gamle Resultater.
- **Verifisering:** Vitest gir 1695/1695, lint og `npx tsc --noEmit` er rene, og Playwright gir 226/226 i CI-modus. I implementeringens kjøring var `vaer.spec.ts:73` ustabil én gang (ikonet var ikke ferdig lastet). Den var grønn i min kjøring.
- **Status:** committet i `13e1520` og ikke pushet. Sprint-status er `review`.

### Åpne punkter
- Walkthrough av 4.2 gjenstår.
- `/api/begrunnelse` har ingen grense for antall forespørsler. Med Claude (4.3) er det den lave utgiftsgrensen i Anthropic-konsollen som begrenser misbruk (AR-23).
- `e2e/vaer.spec.ts:73` (lastingen av værikonet) kan være ustabil. Den bør vente på at bildet er lastet.
