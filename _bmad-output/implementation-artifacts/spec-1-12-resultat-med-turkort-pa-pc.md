---
title: 'Story 1.12: Resultat med Turkort på PC'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'c58c322638d0a72909c3dd6d14a4ff449bd71208'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-11-sok-flaten.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Etter «Finn tur» viser Søk-flaten (1.11) bare overskriften. Brukeren ser ikke Turforslagene og kan ikke sammenligne dem (Story 1.12, FR-6, FR-17, FR-29, UX-DR2–UX-DR4, UX-DR13–UX-DR15, UX-DR18, UX-DR23–UX-DR27, UX-DR35, UX-DR42, UX-DR43, UX-DR46).

**Approach:** Bygg Resultat-flaten i `src/ui/` for `utfall.type === 'turforslag'` og `vaer.type === 'mangler'` på PC (≥ 1200 px). Den viser Ditt søk, Værmangel-linjen, overskriften, Turkortene side om side, Ansvarsmerknaden og Krediteringen. Alt innhold kommer ferdig fra Resultatvisningen. UI-et regner og formaterer ingenting.

## Decisions

- **Ingen valg av kort ennå:** «Vis på kartet», valgt kant og trykk på kortet kommer med kartet i 3.5. Foten har bare «Kilde: …».
- **Under 1200 px** står kortene under hverandre, til Stokken kommer i 1.13. Det skal ikke gi horisontal rulling.
- **Andre utfall:** `kortesteTur` og `fraradet` vises med en enkel plassholder til 1.14 og 2.10. Den sier at visningen kommer, og har «Endre søk».
- **«Endre søk»** går tilbake til Søk-flaten med Søket fra `resultat.sok` i skjemaet. Historikk og Tilbake kommer i 1.14.
- **Nytt Søk** erstatter Resultatet helt, flytter fokus og ruller til overskriften (`tabIndex={-1}`).
- **Kriteriemerket** har tekstalternativene «passer», «se opp» og «ikke vurdert» (UX-DR24). Radene har de tilgjengelige navnene Turtid, Værklasse, Opplevelsespreferanser og Mørkevarsel.
- **Haken (✓)** i Ønsker-raden og merkene er SVG-ikoner (DESIGN.md › Ikoner). Teksten fra kjernen, for eksempel «utsikt ✓», vises med ✓ byttet ut med ikonet.

## Boundaries & Constraints

**Always:**
- Rekkefølgen følger UX-DR13 for PC.
- Formene og dybden følger tokenene: `rounded.card`, `rounded.md`, `rounded.panel` og `rounded.stamp`, kortfot på 6 px og hårstreker. Ingen uskarpe skygger, gradienter eller glass.
- Kildelenken har kildens navn som tekst, åpner i ny fane og har en trykkflate på minst 44 × 44 px.
- Hvert kort er en `<article>` med `aria-label` lik `lesetekst`. Overskriften meldes i et høflig live-område.
- Faste tekster (Ansvarsmerknad, «DITT SØK», «PASSER FORDI», «BEGRUNNELSE», Værmangel-linjen) står i `src/ui/tekster.ts`.

**Never:**
- Ingen kart eller Kartutsnitt (Epic 3).
- Ingen Stokk (1.13).
- Ingen Alternativkort, Kontaktfeil eller Plassholderstokk (1.14).
- Ingen vær-paneler for vurdert vær (2.9).
- Playwright-testene sjekker aldri Turnavn (AR-26).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-1 uten vær, PC | `?demo=uten-vaer`, standard-Søk med utsikt, 1440 px | Demomodus-merke, Ditt søk (5 felt, «utsikt»), Værmangel-linjen, «Tre Turforslag som passer tiden din», 3 kort side om side med like høyde, Ansvarsmerknad og Kreditering |
| Ingen preferanse | standard-Søk | Ditt søk viser «ingen» for Opplevelsespreferanser |
| Kortinnhold | hvert kort | stempel 1–3 med «N av 3», Mål, «fra …», faktalinje, Startpunkt, PASSER FORDI, 4 rader med merke, Begrunnelse og «Kilde: …» |
| Stolper | kort med `tidsstolpe.fyll` 0,77 | fyllet er 77 % av bredden, og Dagslysstolpen har merkene etter andelene |
| Endre søk | trykk «Endre søk» | Søk-flaten med verdiene fra Søket |
| Nytt Søk | Finn tur igjen | det nye Resultatet erstatter det gamle, og fokus står på overskriften |
| 1200 px og 1440 px | – | ingen horisontal rulling |

</frozen-after-approval>

## Implementation Notes

- **Nye komponenter i `src/ui/`:** Resultat, DittSok, Vaermangel, Turkort, Kriterierad, Kriteriemerke, Tidsstolpe, Dagslysstolpe, Nummerstempel, Begrunnelse, Ansvarsmerknad og Hake (`medHake`), og `skjult.module.css`.
- **`SokFlate`** bytter mellom Søk og Resultat. Resultat-komponenten står alltid i treet, så live-området finnes før byttet. Ny `resultatId` gir ny mount, fokus og rulling til h1. «Endre søk» legger `visning.sok` og justeringen i skjemaet bare når skjemaet kan vise dem.
- **Overskriftene:** overskriften i Resultatet er h1, og Mål på kortet er h2.
- **Ditt søk** skiller Opplevelsespreferansene med « og ».
- **«N av M»** tar N fra `kart.nummer`.
- **`likeSok` fra 1.11 er fjernet:** Resultatet viser Søket som ble sendt, og «Endre søk» gir det tilbake.
- **Bredden på 720 px** ligger nå i Søk og UkjentDemo, ikke i `Side`.
- **Kjente svakheter:** perforeringen står i ulik høyde når teksten over har ulik lengde, og under 1200 px står kortene under hverandre til 1.13.

## Code Map

- `src/ui/` (1.11) -- tokens, tekster, `api.ts` og SokFlate med state for Søk og Resultatvisning. Bygg videre på disse, og lag ikke parallelle versjoner.
- `src/kjerne/visning/skjema.ts` -- `Resultatvisning`, `Turkort`, `Kriterium` og stolpene. Importeres som typer.
- `src/kjerne/turkort.ts` og `visning/lag-visning.ts` -- viser hvilke tekster kortene og overskriften har.
- `_bmad-output/planning-artifacts/ux/konsept-07-kortstokken/pc-2-godt-vaer.svg`, `pc-5-ingen-tur-uten-vaer.svg` -- skissene for PC. Avvikene står i EXPERIENCE.md.
- `e2e/` -- Playwright mot `?demo=uten-vaer`.
- `src/ui/tokens.css` -- tokenene `--typography-*-font-family` sier «'Nunito Sans'», mens `next/font` laster fonten under `var(--font-nunito-sans)`. Bruk ikke font-family-tokenene. Fonten arves fra `body`. Bruk bare størrelse, vekt og linjehøyde fra typografitokenene.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/` -- komponentene Resultat, DittSok, Vaermangel, Turkort, Kriterierad, Kriteriemerke, Tidsstolpe, Dagslysstolpe, Nummerstempel, Begrunnelse og Ansvarsmerknad, med CSS Modules.
- [x] `src/ui/` (SokFlate eller et skall over den) -- bytter mellom Søk og Resultat, med «Endre søk», live-område og fokus på overskriften.
- [x] `e2e/resultat.spec.ts` -- matrisen:
  - tilstand og rekkefølge
  - 3 kort med alle feltene
  - «ingen»
  - Endre søk
  - nytt Søk
  - like høye kort
  - ingen horisontal rulling

  Ingen Turnavn.

**Acceptance Criteria:**
- Gitt Resultatet, når det leses med skjermleser, så er hvert kort en artikkel med leseteksten som navn, og merkene har tekstalternativ.
- Gitt `npm run build` og `npm run test:e2e` i CI-modus, når de kjøres, så er begge grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| EC1 | `erResultatvisning` sjekker ikke `utfall`, `dittSok` eller `vaer` | medium | Bekreftet. Et svar som mangler en av dem, krasjer Resultat når det rendres. | patch |
| BH12, EC8 | «N av 3» regnes fra plassen i lista | low | Bekreftet. Bruker nå `kart.nummer` fra serveren. | patch |
| BH14, EC5 | `key={linje}` kan kollidere | low | Bekreftet. | patch |
| BH7, EC6 | «–» har ikke noe tekstalternativ, og ✓ i detaljlinjene får ikke ikonet | low | Bekreftet. «–» skjules for skjermleser, og `medHake` brukes også på detaljlinjene. | patch |
| EC4 | Fyllet skjuler det mørke feltet før soloppgang | medium | Bekreftet. UX-DR26 krever feltet. | patch |
| BH6 | Overlinjene står med store bokstaver i `tekster.ts` | low | Bekreftet. Det tilgjengelige navnet blir «DITT SØK». CSS gjør bokstavene store. | patch |
| BH13 | Snapshot-testen av live-området er skjør | low | Bekreftet. | patch |
| VG2 | Ingen test av at live-området finnes før byttet | medium | Bekreftet. Det kan flyttes inn i Resultatet uten at noen test feiler. | patch |
| BH11 | Ingen tester av Tidsstolpe over grensen eller kanttilfeller i `medHake` | low | Bekreftet. | patch |
| VG1 | Ingen test av «Endre søk» når skjemaet ikke kan vise serverens Søk | medium | Bekreftet. | patch |
| BH4 | `liveTekst` brukes ikke | low | Er lik overskriften i dag. Hører hjemme i 2.9, der Værvarslingen også skal meldes. | defer |
| BH10 | Ingen største bredde på brede skjermer | low | Ingen token for det, og skissene er tegnet ved 1440 px. | defer |
| EC2 | Vurdert vær rendres ikke | low | Ingen demo har vurdert vær før 2.9, som bygger panelene. | defer |
| EC3 | Etikettene i Dagslysstolpen kan overlappe | low | Skjer bare når andelene ligger tett. Følges opp når været og flere demoer kommer. | defer |
| BH1 | Rullingen til overskriften skjuler Ditt søk | false | Specen og UX-DR46 sier at siden ruller til overskriften. | avvist |
| BH2 | Overskriften kan leses to ganger | low | Specen krever både fokus og live-område. | avvist |
| BH3 | Værmangel-teksten kommer fra `tekster.ts` | false | Specen krever det. e2e sjekker at teksten er lik kjernens. | avvist |
| BH5 | `slutt.tekst` vises ikke i Dagslysstolpen | false | UX-DR26 har bare etikettene starttid og «sol ned». | avvist |
| BH8, EC7, VG-a | Endringer gjort mens Søket var på vei, går tapt | low | Resultatet viser Søket som ble sendt. «Endre søk» gir det Søket tilbake, som er riktig. | avvist |
| BH9 | Plassholderen for Alternativ er uferdig | false | Følger beslutningen i specen. 1.14 bygger Alternativkortet. | avvist |
| BH15 | Tilbake forlater appen | false | Hører til 1.14. | avvist |
| VG-b | `fraResultat` er ikke testet | low | Liten konsekvens. | avvist |
