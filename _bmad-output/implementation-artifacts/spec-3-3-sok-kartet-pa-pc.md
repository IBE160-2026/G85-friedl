---
title: 'Story 3.3: Søk-kartet på PC'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: 'fad8141ef43f8c687763229530a6ac4248c392c0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-2-kartutsnitt-i-kortene.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Søk-flaten på PC bruker nettbrettoppsettet og viser ikke hvor Turene starter (Story 3.3, UX-DR8, UX-DR40).

**Approach:** Fra 1200 px står Skjemakortet i 5/12 og et kart i 7/12. Kartet viser de 8 Startpunktene og telleteksten fra sidedataene. Under 1200 px er Søk som før.

## Decisions

- **Data:** `sidedata.startpunkter` (`{ navn, lat, lon }`) og `sidedata.telletekst` finnes allerede (AR-5). Send dem fra `SokSide` til `SokFlate`. Ingen tall eller tekster hardkodes i UI-et.
- **Kartet:**
  - `Kart` (eller en tynn variant gjennom `KartLaster`) får en modus for Startpunkter: markører uten numre, se skissen pc-1, ingen ruter og ingen etikett.
  - Det zoomer slik at alle Startpunktene synes, med zoom og panorering (FR-25), zoomknappene fra 3.1 og krediteringspillen «© Kartverket».
  - Telleteksten «12 Turer fra 8 Startpunkter» står på kartet som i pc-1, eller rett over det.
  - Tegnforklaringen viser bare Startpunkt.
  - Hver markør har navnet til Startpunktet som `title`-fri tooltip eller etikett ved hover eller fokus, hvis skissen har det. Ellers har den ingen etikett.
  - Kartflaten er en `region` med `aria-label` fra `KART` og `data-testid="sok-kart"`.
- **Oppsett:**
  - Fra 1200 px er Søk et rutenett på 12 kolonner, med Skjemakortet i 5 og kartet i 7. Overskriften og ingressen står som i pc-1.
  - Kartet fyller høyden ved siden av Skjemakortet (minst `--spacing-map-height-desktop`).
  - Under 1200 px rendres ikke kartet (`useUnderPc` fra 3.2, invertert). Det lages ingen Leaflet-instans og hentes ingen fliser.
- **Overgangen til Resultatet** er som før. Søk-kartet er borte i Resultatet.

## Boundaries & Constraints

**Always:**
- Ingen test kaller Kartverket. E2e bruker alltid `?demo=` og har ingen Turnavn.
- SM-4 for Søk ved 360, 768 og 1440 px skal bestå.
- Tastatur: Skjemakortet kommer før kartet i tabulatorrekkefølgen.

**Never:**
- Ingen nye npm-avhengigheter. Ingen valg av Tur fra Søk-kartet. Ingen tilstand for `tileerror` (3.4).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| PC | `?demo=uten-vaer`, 1440 px | `sok-kart` til høyre for Skjemakortet. Bredden er ca. 7/12 og Skjemakortet ca. 5/12 av innholdet. Det har 8 Startpunkt-markører og telleteksten fra sidedataene. |
| Telletekst | sidedata med en annen telletekst (enhetstest) | UI-et viser teksten fra dataene |
| Nettbrett/mobil | 768 og 360 px | ingen `sok-kart` og ingen `.leaflet-container` |
| Bytte bredde | 1440 → 768 → 1440 på Søk | kartet forsvinner og kommer tilbake, og skjemaet beholder verdiene |
| Til Resultat | «Finn tur» ved 1440 px | Resultatet med hovedkartet, uten `sok-kart` |
| Alle Startpunkter synes | 1440 px | alle 8 markørene ligger inne i kartflaten |

</frozen-after-approval>

## Code Map

- `src/ui/SokSide.tsx`, `SokFlate.tsx` og `SokFlate.module.css` -- oppsettet.
- `src/ui/Kart.tsx`, `KartLaster.tsx`, `kart-data.ts` og `Kartutsnitt.tsx` (`useUnderPc`).
- `src/kjerne/visning/sidedata.ts` -- typen.
- `e2e/kart.spec.ts`, `e2e/sok.spec.ts` og `e2e/sluttsjekk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] Startpunkt-modus i kartet.
- [x] Oppsettet på Søk fra 1200 px.
- [x] Tester for matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG). Jeg sjekket i tillegg selv et skjermbilde ved 1440 px (SJ).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| SJ | Punktene fyller bare midten av det høye kartet | low | Bekreftet. Kartet zoomer i hele trinn. Bruker nå `zoomSnap 0.5`. | patch |
| VG1, BH1, BH3 | Ingen test for overlapp mellom punktene og boksen, zoomknappene, tegnforklaringen og krediteringen. `sokMarg` ignorerer krediteringen. | medium | Bekreftet. | patch |
| BH2, EC1 | Klemmegrenen i `sokMarg` er ikke testet og kan gi negativ marg | low | Bekreftet. Er nå en ren funksjon med enhetstest. | patch |
| BH4, EC2 | Tilpasningen ved endret størrelse kaster brukerens panorering og zoom | medium | Bekreftet. | patch |
| VG2 | Redusert bevegelse er ikke testet for Søk-kartet | low | Bekreftet. | patch |
| BH5 | Publiseringstesten godtar alle forespørsler til flis-origin | low | Bekreftet. Krever nå `image`. | patch |
| BH6 | Ingen plassholder før hydrering på PC | medium | Bekreftet. Oppsettet hopper. | patch |
| BH7 | Tomme Startpunkter gir en tom region | low | Bekreftet. | patch |
| BH8, EC3 | Sluttsjekken lover mer enn den sjekker, og antar en fast vindusstørrelse | low | Bekreftet. | patch |
| BH10 | `usePc` ligger i `Kartutsnitt.tsx` | low | Bekreftet. Flyttes til en felles modul. | patch |
| BH11 | Testen av tabulatorrekkefølgen er skjør | low | Bekreftet. | patch |
| BH12 | To ulike tilpasninger ved start | low | Bekreftet. | patch |
| EC4 | Telleteksten i testen grupperer annerledes enn produksjonen | low | Bekreftet. | patch |
| BH9 | Rå størrelser i stedet for tokens | low | DESIGN har ingen tokens for disse. Kilden er skissen pc-1, og en kommentar sier det. | avvist |
| BH13 | `navn` brukes bare som nøkkel | low | Navnene vises bevisst ikke. Kommentar legges til. | avvist |

## Implementation Notes

- **`Startpunktkart`** (i `Kart.tsx`) viser de 8 Startpunktene uten numre og zoomer med halve trinn. `sokMarg` er en ren funksjon i `kart-data.ts`, og den holder punktene fri av `Omradeboks`, zoomknappene, tegnforklaringen og krediteringen.
- **`Omradeboks`** har «Moldemarka» og telleteksten fra sidedataene.
- **`src/ui/brytepunkt.ts`** har `usePc` og `useUnderPc`. Kolonnen for kartet rendres alltid, og Leaflet lages bare på PC.
- **Til walkthrough:**
  - Halve zoomtrinn gir svake linjer mellom de stubbede flisene. Rull tilbake til hele trinn hvis linjene også synes med ekte fliser.
  - Navnene på Startpunktene vises ikke.
  - Setningen fra pc-1 under kartet er ikke med.
  - Skjemakortet er smalere enn i pc-1.
