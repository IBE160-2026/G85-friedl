# Story 2.11: README og prøvekjøring for sensor

## 2026-11-19 kl. 11:06 — Simon Friedl

### Oppgave
Kjør story 2.11 under målet «kjør alle stories ferdig». README skal ha UJ-1–UJ-3 i Demomodus og kalibreringen. I tillegg skal tre ting sjekkes: SM-3 fra en ren klone, NFR-5 med ekte MET mot Production, og SM-4. Simon valgte å pushe 2.8–2.10 først, så Production kunne måles.

### Plan
- Gjort direkte uten subagent. Storyen er dokumentasjon og målinger.
- Resultatene står i [epic-2-sluttsjekk.md](../../_bmad-output/implementation-artifacts/epic-2-sluttsjekk.md).

### Resultat
- **README** (`b2edf2d`):
  - En tabell med lenker til `?demo=uj-1`, `uj-2` og `uj-3`, med «nå», Søk og hva du ser.
  - `uten-vaer` og `ingen-bedre` er med.
  - En ny seksjon om kalibreringen: 10.–17. nov., 1 avvik av 14, og tersklene er beholdt.
  - Setningene om at MET ikke er koblet til, er fjernet.
- **Prøvekjøring fra ren klone:** kjørt av Claude med Playwright. Den fant en feil: etter «Bruk 14:00» sa overskriften «… som passer nå».
- **Rettelse** (`1c6be47`): overskriften har nå Turdag og klokkeslett når Søket ikke gjelder nå, for eksempel «Tre Turforslag som passer i morgen fra kl. 14:00». Det følger EXPERIENCE › State Patterns. Fire nye Vitest-tester er sjekket med en mutasjon, og e2e sjekker overskriften etter begge «Bruk»-knappene. Prøven ble kjørt på nytt og er grønn.
- **NFR-5:** median 208 ms og maks 209 ms med ekte MET og «Fast 4G» mot Production på `8b7e674`.
- **SM-4:** 29 av 29.
- **Verifisering:** Vitest gir 1484/1484, lint og `npx tsc --noEmit` er rene, og Playwright gir 129/129 i CI-modus.
- **Status:** sluttsjekken er committet i `8739593`. 2.11 og rettelsen er ikke pushet. Sprint-status er `review`.

### Åpne punkter
- **SM-3:** en person utenfor gruppa må følge README på en ren klone uten hjelp, og resultatet må noteres i `epic-2-sluttsjekk.md`.
- **Walkthrough av 2.11 gjenstår.**
- **Production er ikke oppdatert:** den har fortsatt «… som passer nå» etter «Bruk 14:00», til `1c6be47` er pushet.
