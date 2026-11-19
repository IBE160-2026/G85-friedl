---
title: 'Story 3.2: Kartutsnitt i kortene'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '362d1f589cab12ce212d7eef101882e670a68424'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-1-kartet-viser-turforslagene.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** På mobil og nettbrett må brukeren rulle ned til kartet for å se hvor en Tur går. Kortene har ikke noe kart (Story 3.2, UX-DR21, UX-DR28, UX-DR38).

**Approach:**
- Kartkomponenten fra 3.1 får en statisk modus, Kartutsnittet, som står øverst i Turkortet og Alternativkortet under 1200 px.
- Frarådet-kortet bytter papirflaten med et Kartutsnitt av Moldemarka med vindstreker over.
- Et trykk på Kartutsnittet ruller til kartet.

## Decisions

- **Statisk modus:**
  - `Kart` får `statisk?: boolean`. Da er dragging, zoom (alle former), tastatur og zoomknapper av, og det har ingen tegnforklaring.
  - Kartet viser bare `kort` det får, med `valgt` 0.
  - Krediteringen er en del av merket nederst: «omtrentlig rute · © Kartverket», der «© Kartverket» er en lenke (ny fane).
  - Lastes via `KartLaster` med samme feilgrense.
- **`src/ui/Kartutsnitt.tsx`:**
  - En `button` (`data-testid="kartutsnitt"`) med tilgjengelig navn «Vis på kartet».
  - Den inneholder det statiske kartet (`aria-hidden`) og merket «Turforslag N av M» (eller «Alternativ» for Alternativkortet) øverst til venstre.
  - Lenken «© Kartverket» står utenfor knappen, så det ikke blir en lenke i en knapp.
  - Høyde: `--spacing-map-snippet-height` (104 px) på mobil, og 160 px fra 768 px.
  - Kortet har avrundede hjørner øverst, som i skissen mob-2.
- **Trykk:** `onVisPaKartet()` ruller til kartet i Resultatet (`scrollIntoView`, `behavior` følger `prefers-reduced-motion` som andre steder i `Resultat.tsx`). Valget av kort er allerede det kortet Stokken viser. Koblingen til valget kommer i 3.5.
- **Plassering:**
  - Kartutsnittet står øverst i `Turkort` (i Stokken) og i Alternativkortet.
  - CSS skjuler det fra 1200 px, og det har ikke Kartutsnitt på PC.
  - Det rendres bare når kortet vises under 1200 px (for eksempel med `matchMedia` i en liten hook). Da lager PC ingen skjulte Leaflet-instanser og henter ingen fliser til dem.
- **Frarådet-kortet:**
  - Papirflaten (`vindflate`) byttes med et statisk kart over Moldemarka uten ruter. Området er en konstant `MOLDEMARKA` (grenser) i `src/ui/kart-data.ts`, laget fra Startpunktene i Turdatasettet. Dokumenter tallene.
  - Vindstrekene (inline-SVG) står over kartet. Høydene er de samme som før.
  - Kartet har ingen knapp og ingen trykk.
  - Det vises ved alle bredder, som papirflaten gjør i dag.

## Boundaries & Constraints

**Always:**
- Ingen test kaller Kartverket. Fixturen stubber flisene. E2e bruker alltid `?demo=` og har ingen Turnavn.
- SM-4 ved 360, 768 og 1440 px: trykkflater på minst 44 px og ingen horisontal rulling.
- Kartutsnittet i en knapp har ingen fokuserbare elementer inni.

**Never:**
- Ingen nye npm-avhengigheter.
- Ingen Kartinfoboks og ingen valg fra kartet (3.5). Ingen tilstand for `tileerror` (3.4).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Mobil | `?demo=uten-vaer`, 360 px | det synlige kortet i Stokken har `kartutsnitt` øverst, 104 px høyt, med «Turforslag 1 av 3», «omtrentlig rute · © Kartverket», én rute og ett Startpunkt |
| Neste | «Neste Turforslag» | det synlige kortet har «Turforslag 2 av 3» |
| Nettbrett | 768 px | `kartutsnitt` er 160 px høyt |
| PC | 1440 px | ingen synlig `kartutsnitt`, og ingen Leaflet-instans i kortene |
| Trykk | trykk på Kartutsnittet ved 360 px | `kart` er i visningsområdet |
| Alternativ | 15 min, 360 px | `kartutsnitt` med «Alternativ» |
| Frarådet | `uj-3`, 360 og 1440 px | Frarådet-kortet har et kart uten ruter med vindstreker over, og ingen `kartutsnitt`-knapp |
| Tastatur | Tab gjennom kortet på mobil | Kartutsnittet er én tabulatorstopp med navnet «Vis på kartet», og «© Kartverket» er en egen lenke |

</frozen-after-approval>

## Code Map

- `src/ui/Kart.tsx`, `KartLaster.tsx` og `kart-data.ts` -- statisk modus og `MOLDEMARKA`.
- `src/ui/Turkort.tsx` og `Turkort.module.css` -- plassen øverst.
- `src/ui/FraradetKort.tsx` og `FraradetKort.module.css` -- vindflaten.
- `src/ui/Resultat.tsx` -- `onVisPaKartet` og ref til kartet.
- `src/ui/tekster.ts` -- «Vis på kartet», «Turforslag N av M», «omtrentlig rute».
- `e2e/kart.spec.ts` og `e2e/sluttsjekk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] Statisk modus i `Kart` og `MOLDEMARKA`.
- [x] `Kartutsnitt` i Turkortet og Alternativkortet, med trykk.
- [x] Frarådet-kortet med kart.
- [x] Tester: enhet og e2e for matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG). Jeg sjekket i tillegg selv et skjermbilde ved 360 px (SJ).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| SJ, VG1 | Ruten er ca. 36 px høy, Startpunktet står halvt under merket nederst, og geometrien er ikke testet | high | Bekreftet i skjermbildet. Skissen har merket øverst til høyre. Merkene gjøres kompakte, margen settes fra dem, og e2e sjekker geometrien. | patch |
| BH2, EC2 | Hvert skjulte kort i Stokken lager et Leaflet-kart og henter fliser | medium | Bekreftet. Skallet beholdes, men kartet lages bare for det synlige kortet. | patch |
| BH3, EC1, VG2 | Utsnittet dukker opp etter hydrering, fokus forsvinner ved 1200 px, og bytte av bredde er ikke testet | medium | Bekreftet. Skallet rendres alltid, og bare kartet styres av hooken. | patch |
| BH1 | «Vis på kartet» flytter ikke fokus | medium | Bekreftet. Kartet blir en fokuserbar region. | patch |
| BH4 | Statisk modus tegner Mål | low | Bekreftet (UX-DR38). | patch |
| BH5 | Frarådet-kortet bruker margene for merkene | low | Bekreftet. | patch |
| BH7 | Reflow ved 200 % | medium | Bekreftet. Merkene har `nowrap`. | patch |
| BH8 | Sveip som starter på utsnittet er ikke testet | low | Bekreftet. | patch |
| BH9 | Frarådet ved 768 px og trykkflaten til lenken er ikke testet | low | Bekreftet. | patch |
| BH12 | Testnavnene stemmer ikke | low | Bekreftet. | patch |
| BH6 | `zoomSnap 0.25` gir uskarpe fliser | low | Avveining. Utsnittet er lite og statisk, og hele trinn gir dårligere utsnitt. Tas i walkthrough. | avvist |
| BH11 | Bruddpunktet og 160 px står flere steder | low | DESIGN har ingen token for nettbretthøyden. Verdien står i UX-DR38. | avvist |
| BH13 | Diffen mangler specen | false | Med vilje. | avvist |

## Implementation Notes

- **Statisk modus i `Kart`:**
  - Ingen interaksjon, ingen kontroller og ingen Mål.
  - `tilpassStatisk` måler merkene (`data-pille`) og øker margen til ruten og Startpunktet står fritt.
  - `zoomSnap 0.25`.
- **`Kartutsnitt`:**
  - Skallet rendres for alle kort, men Leaflet lages bare for det synlige kortet under 1200 px (`useUnderPc`).
  - Kartverket-merket står nederst. De to merkene får ikke plass ved siden av hverandre ved 360 px: de krever 327 px, og knappen er 326 px bred.
- **«Vis på kartet»** flytter fokus til kartregionen («Kart») og ruller dit.
- **Frarådet-kortet** har et statisk kart over `MOLDEMARKA`, som er grensene for de 8 Startpunktene, med vindstreker over.
- **Til walkthrough:**
  - En rute som går nord–sør, blir liten ved 104 px.
  - Kartverket-merket står nederst, ikke øverst som i skissen.
  - Stempelet overlapper ikke utsnittet i Turkortet.
  - Ingen har sett utsnittet med ekte fliser.
