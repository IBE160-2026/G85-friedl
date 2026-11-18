---
title: 'Story 1.11: Søk-flaten'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '78a3f5c1e979c945f7c2aa1747ee7a6578a31701'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Appen viser bare «Turplanlegger». Brukeren kan ikke fylle ut et Søk. Serveren fra 1.10 har `lagSidedata` og `POST /api/sok`, men ingen flate bruker dem (Story 1.11, UX-DR1–UX-DR12, UX-DR41, UX-DR44, NFR-1, NFR-9).

**Approach:** Bygg Søk-flaten som UI-komponenter i `src/ui/` med CSS Modules og tokens fra DESIGN.md. `page.tsx` henter sidedata med `lagSidedata(demoId)`, og en klientkomponent eier Søket i React-state og sender det gjennom `src/ui/api.ts`. UI-et regner ikke ut tider. Valg, låser, etiketter og standard-Søk kommer ferdige fra sidedataene (AD-3, AD-7, AD-18).

## Decisions

- **Etter «Finn tur»** holder klientkomponenten Søket og Resultatvisningen i state. Visningen av Resultatet kommer i 1.12. Til da viser flaten `overskrift` i et høflig live-område og `justering` som hjelpetekst under Starttidspunkt (UX-DR12).
- **«I dag» igjen:** når «I dag» velges på nytt, settes Starttidspunkt til `standardSok.start` fra sidedataene, som er «nå» rundet opp. Det første valget for i dag som ikke er låst, gjelder når standard-Søket står på i morgen.
- **«nå»** står under verdien i Trinnvelgeren når Starttidspunkt er lik `standardSok.start` og Turdag er i dag.
- **Ukjent demo-ID** gir et enkelt papirpanel: «Ukjent demo: «{id}». Gyldige demoer: {lenker}.» Ingen egen UX finnes, og bare den som skriver en ugyldig URL, ser det.
- **`tokens.css`** lages fra frontmatteren i DESIGN.md. En Vitest-test leser frontmatteren og sjekker at hver token finnes som CSS-variabel.
- **e2e:** `e2e/forside.spec.ts` skrives om for Søk-flaten. Overskriften er «Hvor lenge vil du gå?», ikke «Turplanlegger».

## Boundaries & Constraints

**Always:**
- Faste tekster står ordrett fra EXPERIENCE.md › Faste tekster i `src/ui/tekster.ts`.
- Komponentene bruker CSS Modules og CSS-variabler fra `src/ui/tokens.css`. Ikke Tailwind.
- UI-et importerer bare typer fra `src/kjerne/`, og bare `page.tsx` importerer `src/server/side`.
- Alle kall går gjennom `src/ui/api.ts`, som kopierer `demo` fra `location.search` og har en tidsgrense på 10 s.
- Tastatur, synlige etiketter, fokusring, trykkflater på minst 44 × 44 px og kontrast på minst 4,5:1.
- Ingen horisontal rulling ved 360, 768, 1200 og 1440 px.

**Never:**
- Ingen visning av Resultatet, kart, Plassholder eller Kontaktfeil (1.12–1.14, Epic 3).
- Ingen `new Date()` eller klokke i UI-et.
- Rust brukes aldri på knapper.
- Søket og Resultatet står aldri i URL-en.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Standard | `?demo=uten-vaer` («nå» man. 9. nov. 13:30) | I dag, 13:30 med «nå», 2 t, Middels, ingen preferanser. Demomodus-merket viser «DEMOMODUS · Værscenario: Værmeldingen mangler · «nå» = man. 9. nov. 13:30». |
| I morgen | velg «I morgen» | Starttidspunkt 10:00, ingen låste tider |
| Tilbake til i dag | velg «I dag» igjen | Starttidspunkt er standard «nå», og tider før det er låst |
| Etter 22:00 | sidedata der «I dag» er låst | «I dag» er låst med «Etter kl. 22 kan du bare velge i morgen.», og «I morgen» er valgt |
| Trinn | − på 06:00 eller + på 22:00, og tilsvarende på 15 min og 5 t | knappen gjør ingenting ved grensen, eller er `aria-disabled` |
| Finn tur | standardverdiene | POST `/api/sok?demo=uten-vaer` med Søket. Overskriften «Tre Turforslag som passer tiden din» meldes. Knappen er aldri låst. |
| Justering | svar med `justering` | teksten står under Starttidspunkt |
| Ukjent demo | `?demo=finnes-ikke` | panelet med gyldige demoer |

</frozen-after-approval>

## Implementation Notes

- **Nye filer:** `src/ui/` med tokens, tekster, `api.ts`, komponentene (Knapp, Kreditering, Toppfelt, Segmentvelger, Trinnvelger, Preferansebrikke, Skjemakort, SokFlate, Side, SokSide og UkjentDemo) og CSS Modules. Endret: `page.tsx`, `layout.tsx` og `globals.css`.
- **`tokens.css`** følger frontmatteren i DESIGN.md (`--{gruppe}-{nøkkel}[-{egenskap}]`), og `tokens.test.ts` sjekker at de er like i begge retninger.
- **Komponenttestene** rendres med `react-dom/server`, fordi jsdom ikke er installert. Oppførselen i nettleseren testes i `e2e/sok.spec.ts`.
- **Oppsettet:**
  - PC bruker nettbrettoppsettet, med innholdet til venstre og høyst 720 px bredt, til kartet kommer.
  - På mobil står trinnvelgerne under hverandre.
  - Container queries holder siden uten horisontal rulling ved 200 % zoom.
- **Lenkene i krediteringen** går til forsidene https://www.met.no/ og https://www.kartverket.no/.

## Code Map

- `src/app/page.tsx` -- `force-dynamic` i dag. Skal lese `searchParams.demo`, kalle `lagSidedata` og rendre flaten.
- `src/app/layout.tsx`, `globals.css` -- har fonten Nunito Sans og `lang="nb"`. Importer `tokens.css` her.
- `src/server/side.ts` (1.10) -- `lagSidedata(demoId)` gir `Sidedata` eller `UkjentDemoFeil`.
- `src/kjerne/visning/sidedata.ts`, `skjema.ts`, `feil.ts` -- typene (`Sidedata`, `Resultatvisning`, `ApiFeil`). Importeres med `import type`.
- `src/kjerne/sok.ts` -- typen `Sok` for kallet.
- `eslint.config.mjs` -- lagreglene for `src/ui/` og `src/app/`. Visningen importerer bare typer fra kjernen.
- `_bmad-output/planning-artifacts/ux/DESIGN.md` -- frontmatteren gir tokens og komponenter. Gjelder Toppfelt, Skjemakort, Segmentvelger, Trinnvelger, Preferansebrikke, Kreditering og Demomodus-merke.
- `_bmad-output/planning-artifacts/ux/konsept-07-kortstokken/pc-1-sok.svg`, `mob-1-sok.svg` -- skissene. Avvikene står i EXPERIENCE.md › Kjente avvik.
- `e2e/forside.spec.ts`, `playwright.config.ts` -- e2e mot `next dev` lokalt og `next start` i CI.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/tokens.css` (+ `src/ui/tokens.test.ts`) -- alle tokens fra DESIGN.md som CSS-variabler, og en test av at hver token finnes.
- [x] `src/ui/tekster.ts` -- de faste tekstene ordrett.
- [x] `src/ui/api.ts` -- `sendSok(sok)` gir `{ type: 'resultat', visning } | { type: 'feil', feil } | { type: 'kontaktfeil' }`, med `?demo` fra `location.search` og tidsgrense 10 s.
- [x] `src/ui/` -- komponentene Toppfelt (med Demomodus-merke), Kreditering, Knapp, Segmentvelger, Trinnvelger, Preferansebrikke, Skjemakort og SokFlate (klient), med CSS Modules.
- [x] `src/app/page.tsx` og `layout.tsx` -- henter sidedata, rendrer flaten eller panelet for ukjent demo, og importerer tokens.
- [x] `e2e/sok.spec.ts` (og oppdatert `forside.spec.ts`) -- radene i matrisen som kan testes i nettleseren:
  - standard
  - i morgen og tilbake til i dag
  - Finn tur med overskrift
  - ukjent demo
  - navnene til trinnknappene
  - ingen horisontal rulling ved 360, 768, 1200 og 1440 px
  - tastaturet når alle felt

  Låsingen etter 22:00 testes som komponenttest eller e2e med sidedata.

**Acceptance Criteria:**
- Gitt `npm run build` og `npm run test:e2e`, når de kjøres, så er begge grønne.
- Gitt Søk-flaten, når den leses med skjermleser, så har Segmentvelgerne `radiogroup`, Preferansebrikkene `checkbox` og trinnknappene navn som «Reduser Starttidspunkt med 15 min» og «Øk Tilgjengelig tid med 15 min».

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `npm run build` -- forventet: grønn
- `npm run test:e2e` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC3 | Svaret fra serveren overskriver endringer brukeren gjorde mens Søket var på vei | medium | Bekreftet. `settSok(nytt)` bytter hele Søket. Serverens Søk brukes nå bare hvis skjemaet er uendret. | patch |
| BH2, EC4, VG-a | Justeringen settes selv om serverens Søk ble avvist | low | Bekreftet. Hjelpeteksten kan motsi feltet når siden har stått åpen over midnatt. | patch |
| BH3, EC1, EC2 | Et 200-svar brukes uten sjekk, og testen godtar `{ overskrift }` | medium | Bekreftet. Et svar uten `sok` gir TypeError i `finnTur`. Lagt til en enkel sjekk av formen, siden UI-et ikke kan importere Zod-skjemaet. | patch |
| BH5 | Et eldre kall avbrytes ikke | low | Bekreftet. Kallet går til tidsgrensen på 10 s. `AbortSignal` per kall. | patch |
| VG1 | Ingen test av at et gammelt svar forkastes | medium | Bekreftet. `sisteKall` kan fjernes uten at noen test feiler. | patch |
| VG2 | Ingen test av at justeringen fjernes ved endring | low | Bekreftet. | patch |
| VG3 | Ingen sjekk av at tokenene lastes, eller av trykkflater på 44 px | medium | Bekreftet. Fjernes importen, er testene fortsatt grønne. | patch |
| BH10 | 200 % zoom ved 360 px er ikke testet | low | Bekreftet mot Accessibility Floor. Ny test med 180 px bredde. | patch |
| BH7 | Utfyllingen på lenkene i krediteringen gir overlapp | low | Bekreftet. `padding-block` på inline `<a>`. | patch |
| BH8 | Lenker som åpner ny fane, sier ikke fra | low | Bekreftet. Skjult tekst «(åpnes i ny fane)». | patch |
| BH12 | `stil.tekst` finnes ikke i Preferansebrikke | low | Bekreftet. Død referanse. | patch |
| BH15 | Siden for ukjent demo har ingen h1 | low | Bekreftet. Har nå h1 «Ukjent demo». At den svarer 200, er avvist: bare en håndskrevet URL treffer siden. | patch |
| BH17 | To tester avhenger av rekkefølgen React skriver attributtene i | low | Bekreftet. Testene finner nå knappen først. | patch |
| VG4 | Gjentatt `?demo=` i `page.tsx` er ikke testet | low | Bare håndskrevne URL-er treffer dette, og koden følger `lesDemoId`. | defer |
| BH4 | «Finn tur» viser ikke venting eller Kontaktfeil | low | Specen legger Plassholder og Kontaktfeil til 1.14. | avvist |
| BH6 | Siden ruller ikke til overskriften | false | Beslutningen i 1.12 dekker det, sammen med Resultatet. | avvist |
| BH9 | Font-tokenene peker på «Nunito Sans», ikke på `var(--font-nunito-sans)` | low | Ingen komponent bruker font-tokenene. Fonten arves fra body. Merknaden er lagt i specen for 1.12. | avvist |
| BH11 | Grenen i `velgTurdag` for standard-Søk i morgen kan ikke nås | false | Følger beslutningen i specen og skader ingen. | avvist |
| BH13, BH14 | CSS for etikettene er kopiert, og `--side-marg` kobler to moduler | low | Kodestil uten at noen konkret kaller tar skade. | avvist |
| BH16 | `ANSVARSMERKNAD` er ubrukt | false | Brukes i 1.12, som kommer straks. | avvist |
| EC5, EC6, EC7 | Datoen ligger utenfor Turdagene, 10:00 er låst i morgen, eller Trinnvelgeren får indeks −1 | false | I morgen er aldri låst, og datoen er dekket av rettelsen for BH2. | avvist |
| EC8 | `lagSidedata` kaster på siden | low | Next viser feilsiden. Det ville vært en ny vakt. | avvist |
| EC9, EC10 | Lesingen av YAML i `tokens.test.ts` er skjør | low | DESIGN.md har LF og enkle verdier. En feil gir en feilende test, ikke stille drift. | avvist |
| EC11 | UI-et har 10:00 for «I morgen» skrevet inn i koden | low | Står ordrett i EXPERIENCE.md › Segmentvelger. Å flytte den til sidedataene krever at skjemaet endres. | avvist |
