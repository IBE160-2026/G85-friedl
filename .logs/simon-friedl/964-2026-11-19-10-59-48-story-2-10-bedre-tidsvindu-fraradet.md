# Story 2.10: Bedre tidsvindu og Frarådet i Resultatet

## 2026-11-19 kl. 10:59 — Simon Friedl

### Oppgave
Kjør story 2.10 med `bmad-build` under målet «kjør alle stories ferdig». Bedre tidsvindu skal kunne tas i bruk med ett trykk, og frarådet vær skal vise Frarådet-kortet og Bedre tidsvindu-kortet (FR-6, FR-12, FR-19, UX-DR20–22). Ikke bedt om push.

### Plan
- Dispatch-ruten med spec: [spec-2-10-bedre-tidsvindu-og-fraradet-i-resultatet.md](../../_bmad-output/implementation-artifacts/spec-2-10-bedre-tidsvindu-og-fraradet-i-resultatet.md). Specen ble skrevet ut fra epicen, DESIGN, EXPERIENCE og skissene pc-3a og pc-4.
- Jeg sjekket at lenken til METs farevarsler, `met.no/vaer-og-klima/ekstremvaervarsler-og-andre-farevarsler`, svarer 200.
- Implementert av en subagent og gjennomgått i tre lag.

### Resultat
- **Modellen:** `dag` og `detalj` i Bedre tidsvindu, for eksempel «I morgen, søn. 15. nov.» og «fra kl. 11:00 · samme 2 t, Middels».
- **UI-et:**
  - `BedreTidsvinduBoks` i Værvarslingen, til høyre på PC og under på mobil.
  - `FraradetKort`, med vindflate, «!», «Ingen Turforslag», «Værklasse frarådet», meldingen, DERFOR INGEN TUR og lenken til METs farevarsler i ny fane.
  - `BedreTidsvinduKort`.
  - Ditt søk med «Endre søk» vises også ved frarådet.
- **Knappen «Bruk …»** sender `nyttSok` med `replaceState`. Den respekterer `kanVises` og venter hvis et Tilbake pågår.
- **Eksemplene:**
  - UJ-2 gir «Bruk 14:00» med 5 Turer.
  - UJ-3 gir «Bruk i morgen 11:00», som gir vanlige Turforslag.
  - UJ-3 med 15 min, etter at knappen er trykket, gir den korteste Turen på 16 min.
- **E2e:** `e2e/tilstander-vaer.spec.ts` dekker alle radene under FR-6. SM-4 dekker også `uj-3` og `ingen-bedre` ved 360, 768 og 1440 px.
- **`DESIGN.md`:** fem nye tokens for `bedre-tidsvindu-kort`, som peker på verdier som finnes fra før. `tokens.test.ts` krever dem.
- **Gjennomgangen** ga 11 rettelser og 3 avviste funn.
- **Verifisering:** Vitest gir 1480/1480, lint og `npx tsc --noEmit` er rene, og Playwright gir 129/129 i CI-modus.
- **Status:** committet i `ee33200` og ikke pushet. Sprint-status er `review`.

### Åpne punkter
- Walkthrough av 2.10 gjenstår, med designvalgene som er notert i specen:
  - knappen i boksen på mobil
  - stempelet over vindflaten
  - høyden på vindflaten
  - bredden på knappen fra 768 px
- Godkjenn eller rull tilbake de fem nye tokens i `DESIGN.md` (`components.bedre-tidsvindu-kort`).
- Epic 2 i UI-et er nå komplett. 2.8–2.10 kan pushes sammen når walkthrough er gjort.

## 2026-11-19 kl. 11:00 — Simon Friedl

### Oppgave
Simon valgte å pushe 2.8–2.10 til `main` uten walkthrough, så 2.11 kan måle NFR-5 mot Production.

### Plan
- Sett 2.8, 2.9 og 2.10 til `done` i sprint-status, og push.

### Resultat
- Sprint-status er `done` i `b19a287`. Pushet til `main`.

### Åpne punkter
- Ingen nye.

## 2026-11-19 kl. 11:17 — Simon Friedl

### Oppgave
Simon godkjente de fem nye tokens for `bedre-tidsvindu-kort` i `DESIGN.md`.

### Plan
- Lukk punktet i `issues.md`.

### Resultat
- Godkjent av Simon. Tokens står uendret i `DESIGN.md` og `tokens.css` (committet i `ee33200`): `background`, `baseColor`, `baseOffset`, `padding` og `paddingMobile`.

### Åpne punkter
- Ingen nye.
