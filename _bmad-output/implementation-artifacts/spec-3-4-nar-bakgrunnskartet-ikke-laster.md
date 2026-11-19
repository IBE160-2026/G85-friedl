---
title: 'Story 3.4: Når bakgrunnskartet ikke laster'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: 'b9df9e20c45dd7500e2740bccba6cea42cfc1a5a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-sok-kartet-pa-pc.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Feiler kartflisene fra Kartverket, står kartflatene grå og tomme med ødelagte fliser. Brukeren får ingen forklaring (Story 3.4, UX-DR39, AD-15).

**Approach:** Alle tre kartene (hovedkartet, Kartutsnittet med Frarådet-kortet, og Søk-kartet) lytter på `tileerror`. Ved feil blir flaten papirfarget. Rutene, Startpunktene og Mål tegnes fortsatt, og teksten «Bakgrunnskartet kunne ikke lastes.» står på kartet.

## Decisions

- **Deteksjon:**
  - `TileLayer` får `eventHandlers={{ tileerror, tileload }}`. Én feilende flis setter tilstanden `bakgrunnFeilet` for den kart-instansen.
  - En flis som laster etterpå (for eksempel etter panorering når nettet er tilbake), nullstiller ikke tilstanden. Den gjelder til kartet lages på nytt. Hold det enkelt og forutsigbart.
- **Visning ved feil:**
  - Flislaget skjules (`opacity: 0` på `.leaflet-tile-pane`, eller `TileLayer` fjernes), og flaten får papirfargen (`--colors-surface-card` eller tokenet DESIGN.md bruker for papir).
  - Ruter, halo, Startpunkter, Mål, etiketten, tegnforklaringen, zoomknappene og krediteringen står som før.
- **Teksten:**
  - «Bakgrunnskartet kunne ikke lastes.» (konstant i `tekster.ts`) står i en liten pille øverst i midten av det store kartet og Søk-kartet, med `role="status"`.
  - I Kartutsnittet og på Frarådet-kortet står den bare som skjult tekst for skjermlesere. Det er ikke plass til den på 104 px.
  - `data-testid="kart-bakgrunn-feil"` på det synlige elementet.
- **Fliser som ikke er bilder** (for eksempel et 404-svar med HTML) gir `tileerror` i Leaflet, og det holder.

## Boundaries & Constraints

**Always:**
- Ingen test kaller Kartverket. Feilen lages i e2e med en egen rute som svarer `route.abort()` eller 503 for `KARTFLISER_URL`, og som overstyrer fixturen for den testen.
- Kortene, Stokken, «Neste», Kartutsnittet («Vis på kartet») og knappene virker som før ved feil.
- SM-4 skal bestå.

**Never:**
- Ingen nye npm-avhengigheter. Ingen ny henting eller ny URL for fliser. Ingen endring av hva kartet viser når flisene laster.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Resultat PC | `?demo=uten-vaer`, fliser blokkert, 1440 px | `kart` har papirflate, tre ruter, Startpunkt-markører og «Bakgrunnskartet kunne ikke lastes.». Turkortene vises, og zoom virker. |
| Resultat mobil | samme ved 360 px | hovedkartet som over. Kartutsnittet har papirflate, rute og Startpunkt, og skjult tekst. «Neste Turforslag» blar, og «Vis på kartet» ruller. |
| Søk PC | `?demo=uten-vaer`, fliser blokkert, 1440 px | `sok-kart` har papirflate, 8 punkter og teksten |
| Frarådet | `uj-3`, fliser blokkert | Frarådet-kortet har papirflate med vindstreker, og «Bruk i morgen 11:00» virker |
| Fliser OK | vanlig fixtur | ingen `kart-bakgrunn-feil` |
| Enhet | `tileerror` på et kart | tilstanden settes, og teksten vises |

</frozen-after-approval>

## Code Map

- `src/ui/Kart.tsx` og `Kart.module.css` -- alle kartvariantene.
- `src/ui/Kartutsnitt.tsx` og `FraradetKort.tsx`.
- `src/ui/tekster.ts`.
- `e2e/fixtures.ts`, `e2e/kart.spec.ts` og `e2e/sluttsjekk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `tileerror` og feiltilstanden i alle kartvariantene.
- [x] Tester for matrisen.

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
| BH1, EC3 | Én feilende flis fjerner bakgrunnen for godt | medium | Bekreftet. Krever nå flere feil, eller feil før noen flis har lastet. Dette avviker bevisst fra «én flis» i Decisions. | patch |
| EC2 | Fliser som henger, gir aldri `tileerror` | medium | Bekreftet. Har nå en tidsfrist. | patch |
| BH2, EC1 | En sen feil nullstiller brukerens zoom på hovedkartet | medium | Bekreftet. | patch |
| BH3, EC4 | `--hjorne-hoyre` kan være foreldet eller ikke satt | low | Bekreftet. | patch |
| BH11 | Søk-kartet tar ikke pillen med i margen | low | Bekreftet. | patch |
| BH4, VG1 | Sjekken for overlapp tar ikke med ruter, etiketten og Mål | medium | Bekreftet. | patch |
| BH5 | 768 px og grensen 599/600 er ikke testet | low | Bekreftet. | patch |
| BH6 | Den skjulte teksten på Frarådet sjekkes ikke mot `aria-hidden` | low | Bekreftet. | patch |
| BH7, BH8, EC5, EC6 | Svakheter i sluttsjekken | low | Bekreftet. | patch |
| BH9 | Testen for fliser som laster, har en fast ventetid | low | Bekreftet. | patch |
| BH12 | Regexene i enhetstesten er skjøre | low | Bekreftet. | patch |
| BH11b | Uforklart omskriving av props | low | Bekreftet. | patch |
| VG2 | Opprydding av skjult tekst er ikke testet | low | Bekreftet. Liten endring. | patch |
| EC7 | Kartutsnittet og Frarådet viser ikke teksten synlig | low | Specen bestemte skjult tekst, fordi det ikke er plass ved 104 px. | avvist |
| BH10 | Rå verdier i `.feilpille` | low | Samme mønster som de andre pillene. | avvist |

## Implementation Notes

- **`flisvakt`** i `Bakgrunnsfeil.tsx` setter feiltilstanden i tre tilfeller: etter 3 feil, ved feil før noen flis har lastet, eller hvis ingen flis har lastet innen 8 s. Den nullstilles aldri.
- **Ved feil** fjernes `TileLayer`, og flaten blir papirfarget. Hovedkartet og Søk-kartet viser pillen «Bakgrunnskartet kunne ikke lastes.». Kartutsnittet og Frarådet-kortet har skjult tekst (`role="status"`).
- **`brukerStyrt`** i hovedkartet hindrer at en sen feil nullstiller brukerens zoom.
- **Rettet feil fra 3.3:** toppmargen i Søk-kartet målte bare høyden på `Omradeboks`. Nå måler den hele hjørnegruppen med zoomknappene (`sokflate` i `kart-data.ts`).
- **Til walkthrough:** plasseringen av pillen på Søk (til høyre for boksen) og på smale skjermer (til høyre for zoomknappene), og at skjermlesere kan få meldingen to ganger på mobil.
