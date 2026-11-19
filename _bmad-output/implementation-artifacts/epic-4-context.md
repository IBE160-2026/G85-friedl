# Epic 4 Context: Begrunnelser skrevet av en språkmodell

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Er `ANTHROPIC_API_KEY` satt opp, bytter appen Regelteksten med en Språkmodelltekst. Teksten sier det samme i mer naturlig språk og må komme innen 5 s. Rangeringen endres aldri, og Regelteksten blir stående når modellteksten ikke består kontrollen. Demomodus bruker en falsk modell.

## Stories

- Story 4.1: Kontroll av Språkmodellteksten
- Story 4.2: Begrunnelse-endepunktet og den falske språkmodellen
- Story 4.3: Claude Haiku som språkmodell

## Requirements & Constraints

- **FR-22:**
  - Turforslagene vises med en gang med Regelteksten. Kommer Språkmodellteksten innen 5 s, erstatter den Regelteksten. Ellers blir Regelteksten stående.
  - Modellen får bare Regelteksten og fakta om Turen, og påvirker aldri utvalg eller rekkefølge.
  - Ferdig formaterte verdier fra Regelteksten skal gjengis ordrett. Det gjelder Turtid, Tilgjengelig tid og værverdier, for eksempel «1 t 32 min» og «3,5 mm/t».
  - Regelteksten blir stående hvis Språkmodellteksten:
    - mangler en ferdig formatert verdi
    - har et tall som verken står i Regelteksten eller i fakta om Turen
    - skriver tid eller mengde med ord, for eksempel «halvannen time» eller «to timer»
    - bruker «trygg» eller «trygt»
- **AD-12:**
  - Klienten sender `POST /api/begrunnelse?demo=…` med `{ sok, turId }` for hvert Turforslag, men ikke for den korteste Turen.
  - Serveren regner ut Regeltekst og fakta med en fast liste over felt. Klienten sender aldri tekst.
  - Svaret er `{ tekst: string | null }`.
  - Klienten bytter inn teksten bare hvis kortet med samme `resultatId` og `turId` fortsatt vises, og under 5 s etter at Resultatet ble vist (`AbortController`).
  - `src/server/sprakmodell/claude.ts` er det eneste stedet som kaller Anthropic, og `falsk.ts` lager en deterministisk omskriving.
  - Svaret godtas bare hvis den rene funksjonen `kontrollerSprakmodelltekst()` i `src/kjerne/begrunnelse/` godkjenner det.
- **NFR-2:** kjernen er ren, uten nettverk og uten klokke.
- **NFR-3:** uten nøkkel virker alt unntatt Språkmodellteksten. Svaret er da `{ tekst: null }`, uten HTTP-feil.
- **AR-23 og AR-24:** `ANTHROPIC_API_KEY` er valgfri. Bare feil fra adapteren logges, med `console.error`.
- **AR-26:** ingen test kaller Anthropic.
- **UX-DR27:** Begrunnelse-boksen kan bli høyere, men Kriterieradene, utvalget og rekkefølgen endres aldri.

## Technical Decisions

- **Lagreglene:** `src/kjerne` er ren, `src/server` er skallet, og klokka leses bare i `src/server/miljo.ts`. ESLint og `lagregler.test.ts` håndhever dem.
- **Tekster med tall** lages i `src/kjerne/format.ts` (`varighet`, `tall` og lignende).
- **Regelteksten** lages av `lagRegeltekst()` i `src/kjerne/regeltekst.ts`.
