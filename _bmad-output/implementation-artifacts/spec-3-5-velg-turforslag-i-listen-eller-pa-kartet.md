---
title: 'Story 3.5: Velg Turforslag i listen eller på kartet'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '19c36f01b965136fa0330d4103b797dfea4c08a8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-4-nar-bakgrunnskartet-ikke-laster.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:**
- Kartet følger bare det valgte kortet i Stokken. På PC kan brukeren ikke velge et kort, og et trykk på kartet velger ingenting.
- Kartinfoboksen mangler.

(Story 3.5, FR-24, UX-DR35, UX-DR37, UX-DR43, UX-DR44)

**Approach:** Valget i `Resultat.tsx` (`valgt`) blir den ene sannheten for kortene på PC, Stokken, Stokkoversikten, Kartutsnittet, hovedkartet og Kartinfoboksen. Kortene og kartet kan begge endre valget.

## Decisions

- **PC-kortene** (≥ 1200 px):
  - Et trykk på kortet, eller Enter eller mellomrom når kortet har fokus, velger det.
  - Kortet (`article`) får `tabIndex={0}` og `aria-current="true"` når det er valgt.
  - Interaktive barn (kildelenken og knappen) velger ikke kortet to ganger og stopper ikke sin egen handling.
  - Valgt kort har skoggrønn kant og fot (`--components-turkort-*` for valgt, som finnes).
- **Foten på PC** (DESIGN › Turkort punkt 10):
  - Knappen «Vis på kartet» (sekundær) velger kortet og ruller kartet inn hvis det er utenfor visningsområdet.
  - Når kortet er valgt, står «Vises på kartet», tonet med haken (SVG-ikonet som finnes). Da er knappen `aria-pressed="true"` eller `disabled`. Velg det som passer mønsteret i koden.
  - Foten finnes bare på PC.
- **Kartet:**
  - Rutene (linjen, eller en bredere usynlig trefflinje) og Startpunkt-markørene blir interaktive. Et trykk velger det tilhørende kortet.
  - Delte Startpunkter velger det første nummeret i gruppen som ikke er valgt fra før. Gjentatte trykk går rundt i gruppen. Dokumenter dette.
  - På mobil blar Stokken til kortet som ble valgt.
  - Valgt rute tegnes øverst og stiplet. Kartet zoomer ikke på nytt når valget endres.
- **Tastatur og skjermleser på kartet** (UX-DR44):
  - Startpunkt-markørene er fokuserbare knapper (`role="button"`, `tabIndex={0}`) med navnet «Turforslag N: {mal} fra {fra}», laget av kortdata i UI-et.
  - Enter og mellomrom velger. De har fokusringen.
  - Kartlaget er ikke lenger helt `aria-hidden`. Bare dekor (fliser og etiketter) er skjult, og markørene er tilgjengelige.
  - Rutene trenger ikke egen tabulatorstopp. Markøren dekker samme valg.
- **Kartinfoboksen** (`src/ui/Kartinfoboks.tsx`, UX-DR37):
  - Et papirfelt med skoggrønn kant og et lite Nummerstempel (`sizeSmall`).
  - Innholdet er `kort.kartinfoboks.navn` og `kort.kartinfoboks.tekst` fra modellen.
  - Den står øverst til høyre i hovedkartet på PC, og over kartet på mobil.
  - Den er ikke interaktiv, og den har `aria-live="polite"`, så valget meldes.
  - Ved Alternativet viser den den korteste Turen.
- **Mobil:**
  - Bla i Stokken, et trykk på en rad i Stokkoversikten og et trykk på et Kartutsnitt velger kortet og uthever ruten. Det gjør de allerede gjennom `valgt`.
  - Et trykk på en rute eller et Startpunkt i hovedkartet blar Stokken til kortet.
- **Nytt Søk** (ny `resultatId`) setter valget tilbake til kort 1, som før.

## Boundaries & Constraints

**Always:**
- Ingen test kaller Kartverket. E2e bruker alltid `?demo=` og har ingen Turnavn (bruk nummer og `aria-current`).
- Bare ett kort er valgt om gangen. Kort 1 er valgt fra start.
- SM-4 ved 360, 768 og 1440 px: trykkflater på 44 px (også for markørene) og fokusring.

**Never:**
- Ingen nye npm-avhengigheter. Ingen ny Kartinfoboks på Søk-kartet.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Start PC | `?demo=uten-vaer`, 1440 px | kort 1 har `aria-current` og «Vises på kartet», Kartinfoboksen har kort 1, og rute 1 er valgt |
| Kort til kart PC | trykk på kort 3 | kort 3 er valgt, Kartinfoboksen har kort 3, rute 3 er valgt, og kort 1 har ikke lenger `aria-current` |
| Tastatur PC | Tab til kort 2, så Enter | kort 2 er valgt |
| Vis på kartet | trykk «Vis på kartet» på kort 2 | kort 2 er valgt |
| Kart til kort PC | trykk på Startpunkt-markør 2 eller rute 2 | kort 2 er valgt |
| Markør med tastatur | Tab til markør 3, så Enter | kort 3 er valgt, og markøren har fokusring |
| Mobil kart til kort | 360 px, trykk på markør 2 i hovedkartet | Stokken viser kort 2, og Kartinfoboksen har kort 2 |
| Mobil kort til kart | «Neste Turforslag», eller en rad i Stokkoversikten | rute og Kartinfoboks følger |
| Delt Startpunkt | `uj-1` med utsikt (kort 1 og 3 deler Startpunkt), trykk på den delte markøren | velger det første ikke-valgte kortet i gruppen, og neste trykk går videre |
| Alternativ | 15 min | Kartinfoboksen har den korteste Turen |
| Nytt søk | «Endre søk» og «Finn tur» | kort 1 er valgt |

</frozen-after-approval>

## Code Map

- `src/ui/Resultat.tsx` -- `valgt` og `velg`.
- `src/ui/Turkort.tsx` og `Turkort.module.css` -- valg på PC og foten.
- `src/ui/Kart.tsx`, `kart-data.ts` og `Kart.module.css` -- interaktive markører og ruter, og `onVelg`.
- `src/ui/Stokk.tsx` og `Stokkoversikt.tsx`.
- `src/kjerne/visning/skjema.ts` -- `kartinfoboks` finnes.
- `src/ui/tekster.ts` -- «Vis på kartet» og «Vises på kartet».
- `e2e/kart.spec.ts`, `e2e/stokk.spec.ts` og `e2e/sluttsjekk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] Valg på PC-kortene med foten.
- [x] Interaktivt kart med `onVelg` og tilgjengelige markører.
- [x] `Kartinfoboks`.
- [x] Tester for matrisen på PC og mobil.

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
| EC1, EC2 | En markør med fokus kan ligge utenfor kartet eller under Kartinfoboksen | medium | Bekreftet. `panInside` med margen til boksen. | patch |
| EC3, BH14, VG2 | «Vis på kartet» ruller hver gang når kartet er høyere enn vinduet, og testen for at siden står stille mangler | low | Bekreftet. | patch |
| BH4 | `aria-pressed` på en knapp som ikke kan slås av | low | Bekreftet. Fjernet. `aria-current` på kortet viser tilstanden. | patch |
| BH6 | Flere `aria-live`-bokser, og samme endring kan leses opp to ganger | low | Bekreftet. | patch |
| BH7, EC4 | Startpunktet skilles ut ved å sammenligne tekst | low | Bekreftet. Modellen har nå eget felt for Startpunkt. | patch |
| BH3 | Kommentaren sier at Mål og etiketten er skjult, men de er ikke det | low | Bekreftet. | patch |
| BH8 | Faste tall i stedet for tokens | low | Bekreftet. | patch |
| VG1, BH10 | Plasseringen av Alternativ-kartet på PC er ikke testet | medium | Bekreftet. | patch |
| BH2 | Tastatur på delt Startpunkt er ikke testet | low | Bekreftet. EC bekrefter at Leaflet 1.9.4 ikke lager et ekstra klikk. Testen legges til. | patch |
| VG3 | Vaktene for merket tekst og Enter på lenken er ikke testet | low | Bekreftet. | patch |
| BH13 | 768 px og grensen ved 1200 px er ikke testet | low | Bekreftet. | patch |
| BH12, BH11 | Fast ventetid i testen og `liveOmrade` kopiert fem ganger | low | Bekreftet. | patch |
| BH9 | `dekketHoyre` og `marg` mangler enhetstester | low | Bekreftet. | patch |
| BH1 | Navnet på markøren kan bli gammelt | false | Kartet er nøklet på `resultatId` og monteres på nytt (EC). | avvist |
| BH5 | `article` kan få fokus uten å ha rollen knapp | low | Specen bestemte `tabIndex` og `aria-current`, og «Vis på kartet» gir samme handling. | avvist |
| BH15 | Ingen hover på kortene | low | Peker og fokusring er nok. Ingen mening ligger bare i `:hover` (forbud). | avvist |

## Implementation Notes

- **Kortene på PC** kan velges med trykk, Enter eller mellomrom (`tabIndex`, `aria-current`). Foten har knappen «Vis på kartet» / «Vises på kartet», uten `aria-pressed`.
- **Startpunkt-markørene** er knapper med navnet «Turforslag N: …». Et delt Startpunkt går gjennom kortene i gruppen med `velgIGruppe`. Rutene har usynlige treffstreker på 24 px.
- **Ved fokus** panoreres markøren inn i kartet, til venstre for Kartinfoboksen.
- **`Kartinfoboks`** er ny og bruker de nye modellfeltene `{ navn, tekst, startpunkt }`.
  - På PC ligger den over kartet oppe til høyre og er `aria-live` fra 1200 px.
  - På mobil og nettbrett står den over kartet og er ikke live, fordi Stokken allerede leser opp «N av M».
- **Rene hjelpere** i `kart-data.ts`: `kartmarg`, `dekketHoyre`, `velgIGruppe` og `markornavn`.
- **Til walkthrough:**
  - Animasjonen der det valgte kortet senkes ned på foten er ikke laget.
  - Etiketten «omtrentlig rute» kan overlappe en annen rute på mobil (fra 3.1).
  - Trykk på kartet på mobil ruller ikke opp til kortet.
