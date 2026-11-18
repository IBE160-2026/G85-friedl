---
title: 'Story 1.13: Stokken på mobil og nettbrett'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'e0f7e0fc023155f6951d8b7fef4bb714c4b14d60'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-12-resultat-med-turkort-pa-pc.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Under 1200 px står Turkortene fra 1.12 under hverandre. På mobil skal brukeren i stedet bla gjennom Turforslagene ett om gangen med tommelen (Story 1.13, UX-DR14, UX-DR27, UX-DR31–UX-DR34, UX-DR45, UX-DR46).

**Approach:** Bygg Stokken, Stokknavigasjonen og Stokkoversikten i `src/ui/` for 360–1199 px. De gjenbruker Turkort-komponenten fra 1.12. På mobil og nettbrett er Ditt søk én linje, og «Endre søk» står i toppfeltet. Nettbrett (768–1199 px) bruker mobiloppsettet med `spacing.margin-tablet` og `spacing.text-max-width`. PC (≥ 1200 px) er som i 1.12.

## Decisions

- **Valgt kort** er én tilstand i Resultatet (indeks, kort 1 fra start). Stokken viser det valgte kortet, og 3.5 kobler kartet til samme tilstand. Et nytt Søk setter den tilbake til kort 1.
- **Oppsettet byttes med CSS** (media queries ved 1200 px). Både PC-raden og Stokken kan stå i DOM-en, men bare én er synlig og i tilgjengelighetstreet (`display: none` på den andre). Det gir ingen hydreringsforskjell.
- **Ditt søk-linjen** settes sammen i UI-et av de ferdige feltene i `dittSok`, skilt med « · ». Opplevelsespreferansene skilles med « og », som i panelet fra 1.12, og leddet utelates når ingen er valgt. Eksempel: «I dag · 13:30 · 2 t · Middels · utsikt». Dette er sammensetning, ikke formatering.
- **Stokk-kanter:** én kant per kort bak det valgte, høyst to. Med ett Turforslag finnes ingen.
- **Stokken** er en `<section>` med `aria-label` «Turforslag N av M» og `tabIndex={0}`. ← og → blar når den har fokus. Kortet inni er fortsatt en `<article>` med `lesetekst` som navn.
- **Sveip:** pointer events med en terskel på 50 px vannrett, der vannrett bevegelse må være større enn loddrett. Sveip ut over første eller siste kort gjør ingenting.
- **Animasjon:** CSS-transition på ca. 250 ms, der kortet glir ut og det neste løftes. Under `prefers-reduced-motion: reduce` er den av.
- **Stokkoversikt-raden:** stempel (40 px), «{mal} {fra}», fire små Kriteriemerker med tekstalternativ og teksten `stokkoversiktRad`. Raden er en knapp med `aria-pressed` for valgt. Et trykk velger kortet og ruller til Stokken, og fokus flyttes til Stokken.
- **Begrunnelse på mobil:** én kursiv linje «Begrunnelse: «…»», med kildelenken under (UX-DR27). PC beholder boksen.

## Boundaries & Constraints

**Always:**
- Rekkefølgen for mobil og nettbrett følger UX-DR13, utenom kartet (Epic 3): Demomodus-merke, Ditt søk-linje, Værmangel-linjen, overskriften, Stokken med navigasjon, Stokkoversikt, Ansvarsmerknad og Kreditering.
- «Forrige Turforslag» er en rund knapp med pil og inaktiv på kort 1. «Neste Turforslag» er en primær pille med teksten «Neste tur» og inaktiv på siste kort. Inaktive knapper har `aria-disabled` og fokus, ikke `disabled`.
- Midten viser «N av M» med én prikk per kort. Prikkene er pynt (`aria-hidden`).
- Trykkflatene er minst 44 × 44 px, og det er ingen horisontal rulling ved 360 og 768 px, eller ved 200 % zoom på 360 px.
- Faste tekster («Alle tre i stokken», «Begge i stokken», «Neste tur», «Forrige Turforslag», «Neste Turforslag», «Begrunnelse:») står i `src/ui/tekster.ts`.

**Never:**
- Ingen kart eller Kartutsnitt (Epic 3).
- Ingen endring av PC-oppsettet fra 1.12, utover at valgt-tilstanden deles.
- Ingen karusell som blar av seg selv, og ingen hover-krav.
- Playwright-testene sjekker aldri Turnavn (AR-26).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Tre Turforslag, 390 px | `?demo=uten-vaer`, standard-Søk med utsikt | Ditt søk-linjen med «utsikt», «Endre søk» i toppfeltet, ett synlig kort, to stokk-kanter, «1 av 3», «Forrige Turforslag» inaktiv, «Alle tre i stokken» med 3 rader |
| Bla | «Neste tur» to ganger | «3 av 3», «Neste Turforslag» inaktiv, Stokken heter «Turforslag 3 av 3» |
| Tastatur | fokus på Stokken, → og ← | blar fram og tilbake, og stopper i endene |
| Sveip | dra 80 px mot venstre på kortet | neste kort |
| Stokkoversikt | trykk på rad 3 | kort 3 vises, raden er valgt (`aria-pressed`), og Stokken har fokus |
| To Turforslag | Søk som gir to (mocket svar) | «Begge i stokken», én stokk-kant og «1 av 2» |
| Ett Turforslag | Søk som gir ett (for eksempel 30 min, Enkel) | ingen stokk-kanter, ingen Stokknavigasjon og ingen Stokkoversikt |
| Ingen preferanse | standard-Søk | Ditt søk-linjen har fire ledd og ingen preferanse |
| Reduser bevegelse | `reducedMotion: 'reduce'` | ingen transition på kortet |
| Nettbrett | 768 px og 1199 px | mobiloppsettet, innholdet innenfor `text-max-width` og ingen horisontal rulling |
| PC | 1200 px | 1.12-oppsettet med tre kort side om side, og ingen Stokk synlig |

</frozen-after-approval>

## Implementation Notes

- **Nye filer i `src/ui/`:** Stokk, Stokknavigasjon, Stokkoversikt, DittSokLinje og ToppfeltHandling. ToppfeltHandling er en kontekst som lar Resultatet legge «Endre søk» i toppfeltet.
- **Stokken:**
  - Alle kortene står i én grid-celle, så høyden følger det høyeste kortet. Kortene som ikke er valgt, er `inert`.
  - Sveip skjer med pointer events. Pekeren fanges når den har flyttet seg 10 px, fordi fangst ved `pointerdown` stoppet klikk på kildelenken.
  - ← og → virker bare når seksjonen selv har fokus.
- **Stokk-kanter:** én kant per kort *etter* det valgte, høyst to. På siste kort er det ingen kanter.
- **Posisjonen «N av M»** er et høflig live-område. Derfor sikter e2e-testene på `div[aria-live]` for overskriften.
- **Ved 180 px** er Kriterieradene svært trange. Det tas i sjekklisten i 1.15.

## Code Map

- `src/ui/` (1.11 og 1.12) -- Resultat, Turkort, DittSok, Kriteriemerke, Nummerstempel, Begrunnelse, Toppfelt og tekster. Utvid dem, og lag ikke parallelle versjoner.
- `src/kjerne/visning/skjema.ts` -- `stokkoversiktRad`, `dittSok`, `utfall.kort` (1–3). Importeres som typer.
- `_bmad-output/planning-artifacts/ux/konsept-07-kortstokken/mob-2-godt-vaer.svg` og `mob-5-ingen-tur-uten-vaer.svg` -- skissene for mobil. Avvikene står i EXPERIENCE.md › Kjente avvik i skissene.
- `e2e/resultat.spec.ts` (1.12) -- utvid med en egen `describe` for mobil og nettbrett, eller lag `e2e/stokk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/` -- Stokk, Stokknavigasjon, Stokkoversikt og DittSokLinje, med CSS Modules. Turkort får en mobilvariant av Begrunnelsen.
- [x] `src/ui/` (Resultat og Toppfelt) -- valgt-tilstand, oppsettet byttes ved 1200 px, og «Endre søk» står i toppfeltet under 1200 px.
- [x] `e2e/` -- matrisen. To og ett Turforslag lages ved å mocke `/api/sok` med `page.route`, eller med et ekte Søk som gir få Turer.

**Acceptance Criteria:**
- Gitt Stokken, når den leses med skjermleser, så heter den «Turforslag N av M», kortet er en artikkel med leseteksten, og knappene har navnene i UX-DR32.
- Gitt `npm run build` og `CI=1 npx playwright test`, når de kjøres, så er begge grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC1 | ← og → inne i kortet bytter kort, og fokus forsvinner | medium | Bekreftet. Taster reagerer nå bare når seksjonen selv har fokus. | patch |
| BH2 | Skjermlesere hører ikke at kortet byttes | medium | Bekreftet. Posisjonen er nå et høflig live-område. | patch |
| BH3, EC2 | Sveip bruker ikke pointer capture | low | Bekreftet. Et gammelt startpunkt kan gi et sveip ingen har gjort. | patch |
| BH5 | `endreSok` lages på nytt ved hver rendering | low | Bekreftet. Toppfeltet rendres på nytt hver gang. | patch |
| BH6 | Høyden på Stokken hopper mellom kortene | medium | Bekreftet. «Neste tur» flytter seg under tommelen. Kortene står nå i én grid-celle. | patch |
| BH11 | PC-oppsettet avhenger av rekkefølgen i CSS-fila | low | Bekreftet. | patch |
| BH10 | Hjelperne som deler opp HTML-en i testene, kan feile uten å si fra | low | Bekreftet. | patch |
| BH8 | Mocken med to kort har `lesetekst` med «av 3» | low | Bekreftet. Data serveren aldri ville sendt. | patch |
| VG1 | Vakten på en inaktiv «Forrige» er ikke testet | medium | Bekreftet. Uten vakten blir Stokken tom. | patch |
| VG2, BH9 | `touch-action: pan-y` er ikke testet, og det er heller ikke piltaster inne i kortet | medium | Bekreftet. | patch |
| BH4 | Kortene rendres to ganger, for PC og for Stokken | low | Koster lite nå. Må løses når kartutsnittet kommer i Epic 3, slik at bilder ikke lastes to ganger. | defer |
| EC4 | Fokus kan gå tapt når bredden krysser 1200 px | low | Skjer bare ved rotasjon midt i bruk. | defer |
| BH7 | Størrelser er skrevet inn i px | low | DESIGN.md har ikke tokens for dem. Samme praksis som i 1.11. | avvist |
| EC3 | `useEndreSokIToppfelt` uten kontekst | low | `SokSide` gir alltid konteksten. | avvist |
