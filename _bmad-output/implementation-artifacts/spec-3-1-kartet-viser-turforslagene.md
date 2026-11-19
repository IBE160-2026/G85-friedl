---
title: 'Story 3.1: Kartet viser Turforslagene'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '371823fde912683155f149b203c3980e2c09aae8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Resultatet har ikke noe kart. Modellen har `kart` per kort, men brukeren ser ikke hvor Turforslagene starter eller går (Story 3.1, FR-23, FR-25, FR-29, AR-19, AR-20, UX-DR13, UX-DR36).

**Approach:** Et Leaflet-kart, lastet på klienten, tegner ruten og Startpunktet for hvert kort i Resultatet. Bakgrunnen er Kartverkets gråtonekart. Kartet står på plassen UX-DR13 gir det. Playwright stubber kartflisene.

## Decisions

- **Lasting:**
  - `src/ui/KartLaster.tsx` (`"use client"`) bruker `next/dynamic(() => import("./Kart"), { ssr: false })`.
  - Mens kartet laster, vises en tom flate med samme høyde, så siden ikke hopper.
  - `leaflet/dist/leaflet.css` importeres i `KartLaster.tsx` (AR-19).
- **`src/ui/Kart.tsx`:**
  - Bruker `MapContainer`, `TileLayer` og `GeoJSON` fra react-leaflet.
  - Props: `kort: { turId: string; kart: Kart }[]` (typen fra kjernen) og `valgt: number`.
  - `attributionControl={false}`, og egen krediteringspille nede til høyre med «© Kartverket» som lenke (`https://www.kartverket.no/`, ny fane), fra `KREDITERING` i `tekster.ts`.
- **Ruter:** hver rute tegnes med `<GeoJSON>` to ganger: halo under og linje over. Stilen settes med `className` og CSS-regler som bruker `--components-kart-*`:
  - Den valgte ruten er skoggrønn og stiplet med `route-dash`.
  - De andre er `route-inactive-*`.
  - Valgt rute tegnes øverst.
- **Startpunkter:**
  - `L.divIcon` med nummerert sirkel (`start-pin-*`).
  - Kort med samme Startpunkt (like koordinater) får én markør med numrene side om side.
  - Mål (`malpunkt`) er en trekant (`goal-pin-color`).
- **Etiketten «omtrentlig rute»:** en permanent `Tooltip` eller `divIcon` i kursiv (`label-color`) ved midten av den valgte ruten.
- **Tegnforklaringen** står nede til venstre: Startpunkt, valgt rute («omtrentlig rute») og Mål bare når minst ett kort har `malpunkt`. Ingen Tur i dagens Turdatasett har `mal_punkt`, så Mål-delen testes med enhetstest.
- **Ren hjelpefil** `src/ui/kart-data.ts` med:
  - gruppering av Startpunkter
  - grenser for alle ruter og Startpunkter (`[[sør, vest], [nord, øst]]`)
  - punktet på midten av ruten for etiketten

  Den testes med Vitest.
- **Visning:** kartet zoomer til grensene med `fitBounds` og litt marg. Zoom og panorering med mus og berøring er på (FR-25), som Leaflet gjør som standard.
  - Zoomknappene er minst 44 × 44 px (SM-4).
  - Kartflaten har `--components-kart-rounded`.
- **Plassering** (UX-DR13), for Turforslag og for Alternativet (kortet med den korteste Turen):
  - På PC (≥ 1200 px) står kartet over kortene med `--spacing-map-height-desktop`.
  - På mobil og nettbrett står det etter Stokken og før Stokkoversikten med `--spacing-map-height-mobile`. Ved Alternativet står det etter Alternativkortet.
  - `valgt` er det valgte kortet i `Resultat.tsx`.
  - Ingen kart ved frarådet, Kontaktfeil eller mens svaret venter.
- **Testid:** `kart` på kartflaten.
- **E2e:**
  - Ny `e2e/fixtures.ts` eksporterer `test` og `expect`. `test` har en automatisk fixture som stubber `https://cache.kartverket.no/**` med en liten grå PNG.
  - Alle e2e-filer importerer fra den.
  - Sjekken av forespørsler i `e2e/vaer.spec.ts` godtar nå `cache.kartverket.no`.

## Boundaries & Constraints

**Always:**
- Ingen test kaller Kartverket. E2e bruker alltid `?demo=` og har ingen Turnavn (AR-26).
- Lagreglene: UI-et importerer bare typer fra kjernen.
- `CI=1 npx playwright test` og sluttsjekken (SM-4) skal bestå ved 360, 768 og 1440 px, uten horisontal rulling og med trykkflater på 44 px.
- `Resultat.test.tsx` med `renderToString` skal fortsatt virke. Kartet rendres ikke på serveren.

**Never:**
- Ingen nye npm-avhengigheter utover leaflet, react-leaflet og @types/leaflet.
- Ingen Kartinfoboks, ingen valg fra kartet (3.5), ingen Kartutsnitt (3.2), ingen tilstand for `tileerror` (3.4) og ingen Søk-kart (3.3).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Turforslag PC | `?demo=uten-vaer`, standard-Søk, 1440 px | `kart` står over kortene, er 340 px høyt og har tre ruter (seks stier med halo), Startpunkt-markører med numrene 1–3, «omtrentlig rute», tegnforklaring og «© Kartverket» som lenke med `target=_blank` |
| Turforslag mobil | samme ved 360 px | `kart` står etter Stokken og før Stokkoversikten, og er 250 px høyt |
| Delt Startpunkt | kort som deler koordinater | én markør med numrene side om side (enhetstest, og e2e hvis demoen har det) |
| Alternativ | 15 min | kartet viser én rute med nummer 1 |
| Frarådet / Kontaktfeil / venter | `uj-3` / blokkert API / forsinket API | ingen `kart` |
| Trafikk | uten-vaer og uj-1 | bare egen origin og `cache.kartverket.no`, og flisene er stubbet |
| Zoom | trykk på «+» | zoomnivået øker, og knappen er ≥ 44 px |
| Grenser | `kart-data` med ruter | grensene dekker alle koordinater og Startpunkter |

</frozen-after-approval>

## Code Map

- `src/kjerne/visning/skjema.ts` -- `Kart`-typen.
- `src/ui/Resultat.tsx` og `Resultat.module.css` -- plassering. `valgt` finnes allerede.
- `src/ui/tekster.ts` -- `KREDITERING`.
- `src/ui/tokens.css` -- `--components-kart-*`.
- `e2e/*.spec.ts`, `e2e/sluttsjekk.spec.ts` og `e2e/vaer.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/kart-data.ts` med test.
- [x] `src/ui/KartLaster.tsx`, `Kart.tsx` og `Kart.module.css`.
- [x] `Resultat.tsx` -- plassering.
- [x] `e2e/fixtures.ts`, importene og en ny `e2e/kart.spec.ts` med matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC2 | Leaflet gjør kartflaten til et tabulatorstopp uten navn | medium | Bekreftet. `keyboard` er på som standard. | patch |
| EC1 | En dynamisk import som feiler, tar ned hele Resultatet | medium | Bekreftet. Ingen feilgrense. | patch |
| BH2, BH3 | Alternativet på PC bruker `order: -1`, og bredden er ikke begrenset | low | Bekreftet. Rekkefølgen i DOM-en avviker fra det som vises. | patch |
| EC3, VG3 | Tegnforklaringen måles bare én gang | low | Bekreftet. Bruker nå `ResizeObserver`. | patch |
| EC4, EC5 | Margen i `fitBounds` er mindre enn markørgrupper og etiketten | low | Bekreftet. | patch |
| BH10 | Animasjonene ignorerer `prefers-reduced-motion` | low | Bekreftet. Zoom med musehjulet beholdes (FR-25). | patch |
| VG1, BH4 | Mål-markøren er aldri tegnet i noen test | medium | Bekreftet. Dekkes nå med en omskrevet API-respons. | patch |
| VG2, BH6, BH7, EC6 | «Zoom ut» og grensene er ikke testet, og zoomtesten er skjør | medium | Bekreftet. | patch |
| BH5 | Testene for tilstander uten kart sjekker ikke fliser | low | Bekreftet. | patch |
| BH8 | 768 px er ikke testet | low | Bekreftet. | patch |
| BH9 | URL-en til flisene er definert to steder | low | Bekreftet. | patch |
| BH11 | Kommentaren om `numre` er feil | low | Bekreftet. | patch |
| BH13 | README nevner ikke kontakten med Kartverket | low | Bekreftet. Kontakten er tillatt etter AR-20, men dokumenteres. | patch |
| BH12 | Diffen mangler `package.json` | false | Med vilje. Pakkene ble lagt til av meg etter godkjenning, med faste versjoner. | avvist |

## Implementation Notes

- **Pakkene** leaflet 1.9.4, react-leaflet 5.0.0 og @types/leaflet 1.9.22 er lagt til med faste versjoner etter godkjenning fra Simon.
- **Kartverket** har fliser til minst z18 over Molde (sjekket med curl), så maks zoom 17 er trygt.
- **`src/ui/kart-data.ts`** er en ren hjelpefil. Den har `KARTFLISER_URL`, grupperingen av Startpunkter, grensene, midtpunktet og plasseringen av etiketten.
- **`KartLaster.tsx`** laster kartet med `next/dynamic` og `ssr: false`, og har en feilgrense.
- **`Kart.tsx`:**
  - `keyboard={false}`, og kartlaget har `aria-hidden`.
  - Egne zoomknapper på 44 px, med «Zoom inn» og «Zoom ut».
  - `ResizeObserver` tilpasser kartet på nytt når tegnforklaringen eller flaten endrer størrelse.
  - Ingen animasjoner ved `prefers-reduced-motion`.
- **Alternativet** har to plasseringer av kartet (PC og mobil), så rekkefølgen i DOM-en stemmer med det som vises.
- **`e2e/fixtures.ts`** stubber kartflisene for alle e2e-filer.
- **Til walkthrough:**
  - tekstene «Zoom inn» og «Zoom ut», som ikke står i EXPERIENCE
  - inaktive ruter er også stiplet, som i skissene
  - tegnforklaringen går over to linjer på mobil
  - i Alternativ-demoen ligger etiketten over Startpunktet, fordi ruten går fram og tilbake
