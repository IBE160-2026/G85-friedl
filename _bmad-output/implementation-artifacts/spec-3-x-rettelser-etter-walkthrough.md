---
title: 'Rettelser etter walkthrough av epic 3: trykk på kartet på mobil og navn på Startpunktene'
type: 'bugfix'
created: '2026-11-20'
status: 'done'
baseline_commit: 'ca4f3f4c5f23ae66ea2cf501eeb7268f02ea0cd4'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-3-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-5-velg-turforslag-i-listen-eller-pa-kartet.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-3-3-sok-kartet-pa-pc.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Brukeren avviste to avvik fra den manuelle sjekken 2026-11-20:
- **3.5:** Under 1200 px velger et trykk på en rute eller et Startpunkt i hovedkartet kortet, men siden ruller ikke opp til Stokken. Brukeren ser ikke kortet som ble valgt.
- **3.3:** Søk-kartet på PC viser Startpunktene som prikker uten navn. Skissen pc-1 har et fast navn ved hver prikk.

**Approach:**
- **3.5:** Velg fra hovedkartet under 1200 px gjør det samme som et valg i Stokkoversikten: velg kortet, flytt fokus til Stokken og rull den inn. På PC er alt som før.
- **3.3:** Hver prikk på Søk-kartet får en fast etikett med Startpunktets korte visningsnavn, i stilen fra pc-1. Etikettene overlapper ikke hverandre eller prikkene når det er plass.

## Decisions

- **Kortnavn (brukeren, 2026-11-20, valg B):** hvert Startpunkt i `data/turer-moldemarka.json` får et påkrevd felt `kortnavn` («Tusten skisenter», «Jensgurilia» osv., som i pc-1). Datasettvalideringen krever det. `sidedata.startpunkter` får `kortnavn`, og Søk-kartet viser det. Det fulle `navn` brukes som før alle andre steder.
- **Setningen under kartet i pc-1** («Kortene med Turforslag legges ut her …») bygges ikke. Den er en skissemerknad (EXPERIENCE.md linje 89), og brukeren valgte å droppe den.
- **Mobil:** valg fra kartet flytter fokus til Stokken, som valg i Stokkoversikten. Da leser skjermleseren opp «Turforslag N av M».

## Boundaries & Constraints

**Always:**
- Ingen test kaller Kartverket. E2e bruker `?demo=` og har ingen Turnavn (AR-26).
- Med redusert bevegelse er rullingen `auto`.
- Navnene kommer fra sidedataene og hardkodes ikke i UI-et.
- SM-4 ved 360, 768 og 1440 px består.
- Kartet er aldri eneste kilde. Navnene er også tilgjengelige for skjermlesere.

**Never:**
- Ingen nye npm-avhengigheter.
- Ingen andre endringer i kjernen eller datasettet enn `kortnavn`.
- PC-oppførselen fra 3.5 endres ikke. Ingen valg av Tur fra Søk-kartet.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Mobil, trykk på markør | 360 px, rull ned til kartet, trykk på Startpunkt-markør 2 | Stokken viser kort 2, er rullet inn og har fokus | N/A |
| Mobil, trykk på rute | 768 px, trykk på trefflinjen til rute 3 | Stokken viser kort 3 og er rullet inn | N/A |
| Mobil, tastatur | 360 px, Tab til markør 2, så Enter | kort 2 er valgt, og fokus står på Stokken | N/A |
| PC uendret | 1440 px, trykk på markør 2 | kort 2 er valgt, og siden ruller ikke | N/A |
| Søk-kart med navn | `?demo=uten-vaer`, 1440 px | 8 etiketter, én per prikk, med `kortnavn` fra sidedataene, alle inne i kartflaten | N/A |
| Ingen overlapp | 1440 px, startzoom | ingen etikett overlapper en annen etikett eller en annen prikk | Finnes ingen ledig plass, velges plassen med minst overlapp |
| Zoom | zoom inn og ut på Søk-kartet | etikettene plasseres på nytt etter zoom | N/A |
| Bakgrunnsfeil | flisene feiler | etikettene står som før | N/A |

</frozen-after-approval>

## Code Map

- `data/turer-moldemarka.json`, valideringen av turdatasettet i `src/kjerne` og `src/kjerne/visning/sidedata.ts` (`StartpunktSkjema`) samt der sidedataene lages (`src/server/side.ts`) -- `kortnavn`. Finn alle steder der Startpunkter bygges, også testdata.
- `src/ui/Resultat.tsx` -- `velg`, `velgFraOversikt` (fokus og rulling til `stokk`), og `KartLaster ... onVelg={velg}` i Turforslag-grenen. Ny `velgFraKartet`: under 1200 px gjør den det samme som `velgFraOversikt`, på PC bare `velg`. Bruk `usePc` eller `matchMedia` fra `src/ui/brytepunkt.ts`.
- `src/ui/Kart.tsx` -- `Startpunktkart` (ca. linje 654), `PRIKKIKON`, og kommentaren øverst som sier at prikkene ikke har etikett (oppdateres). Etikett-mønsteret fra `etikettikon` (divIcon med `iconSize [0,0]`) kan gjenbrukes.
- `src/ui/kart-data.ts` -- `SOK_PRIKK` og `sokMarg`. Her kommer en ny ren funksjon som plasserer etiketter i px: for hvert punkt prøves høyre, venstre, over og under, og den første plassen uten overlapp med etiketter, prikker eller kanten velges. Enhetstest i `kart-data.test.ts`.
- `src/ui/Kart.module.css` -- `.prikk` og `.etikett` (halo med `text-shadow`). Ny `.startnavn` i 12 px, 600, `--colors-ink-primary`, ikke kursiv, som i pc-1.
- `src/ui/SokFlate.tsx` -- en skjult liste over Startpunktene for skjermlesere, eller tilsvarende i kartregionen.
- `e2e/kart.spec.ts` (ca. linje 862, `sok-kart-startpunkt`, og 3.5-testene for mobil) -- nye tester for matrisen.

## Tasks & Acceptance

**Execution:**
- [x] datasettet, valideringen og sidedataene -- `kortnavn` med tester -- 3.3
- [x] `src/ui/Resultat.tsx` -- `velgFraKartet` -- 3.5 på mobil
- [x] `src/ui/kart-data.ts` og `kart-data.test.ts` -- ren plassering av etiketter med tester -- 3.3
- [x] `src/ui/Kart.tsx` og `Kart.module.css` -- etiketter i `Startpunktkart`, plassert på nytt ved `zoomend`, `moveend` og endret størrelse -- 3.3
- [x] `src/ui/SokFlate.tsx` eller `Kart.tsx` -- navnene for skjermlesere -- 3.3
- [x] `e2e/kart.spec.ts` -- matrisen -- begge

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.
- Gitt Søk ved 1440 px, når et skjermbilde tas, så står navnene lesbart ved prikkene, som i pc-1.

## Implementation Notes

- **`kortnavn`** er lagt til i `data/turer-moldemarka.json` og `testdata/turer.json` (12 Turer, 8 Startpunkter), i `StartpunktSkjema` for Turdatasettet og sidedataene, i `startpunktLikt` og i `lag-sidedata.ts`. Kortnavnene er fra pc-1: Kaia i Molde sentrum, Romsdalsmuseet, Hatlelitunnelen (Grua), HC-parkering Vardeveien, Damefallet, Fjellbrudammen, Jensgurilia og Tusten skisenter.
- **3.5:** `velgIStokken` i `Resultat.tsx` brukes nå av både Stokkoversikten og kartet under 1200 px (`usePc`). På PC får kartet `velg` som før.
- **3.3:** `plasserEtiketter` og `etikettrekt` i `kart-data.ts` er rene og har tester. `Startpunktkart` lager én `divIcon` per prikk med navnet (`data-plass`). Plasseringen kjøres i et effekt-planlagt `requestAnimationFrame` etter `zoomend`, `moveend` og `resize`, ved endret størrelse (ResizeObserver), når en markør legges til, og når skriftene er lastet. Teksten om bakgrunnskartet er også en hindring.
- **Skjermlesere:** en skjult liste «Startpunkter» med de fulle navnene i kartregionen (`SokFlate.tsx`). Navnene i kartet er `aria-hidden`.
- **Etter gjennomgangen:** `plasserEtiketter` har forbedringsrunder, fire startrekkefølger og diagonale plasser. Valideringen avviser delte kortnavn. `somHtml` er flyttet til `kart-data.ts`. FR-26 og arkitekturen er oppdatert. Vitest 1768/1768, lint og tsc rene, og Playwright 229/229 i CI-modus uten nye forsøk.
- **Verifisering før gjennomgangen:** Vitest 1764/1764, lint og tsc rene, og Playwright 228/228 i CI-modus før rutetesten ble utvidet til nettbrett. `valg.spec.ts` 21/21 etter det.

## Spec Change Log

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH7, EC2, EC3, EC8, VG1 | Plasseringen er grådig uten nytt forsøk, og testen sjekker ikke at den gjøres på nytt etter zoom | medium | Bekreftet. En ny test ved zoom z − 1 viste at Fjellbrudammen dekket prikken til HC-parkering. Nå med forbedringsrunder, fire startrekkefølger og fire diagonale plasser, og testen zoomer ut forbi startzoomen. | patch |
| BH3, EC1 | To ulike Startpunkter kan dele kortnavn | low | Bekreftet. Valideringen avviser det nå (`ulikt-startpunkt`), med test. | patch |
| BH1, EC7 | Gammel JSDoc over `NavngittPunkt` sier at navnet ikke vises | low | Bekreftet. Erstattet. | patch |
| BH4 | FR-26 og arkitekturen nevner ikke `kortnavn` | low | Bekreftet. Oppdatert i epics.md og ARCHITECTURE-SPINE.md. Delen om token avvises: DESIGN.md har ingen token for kartnavn, og `.etikett` bruker samme mønster. | patch |
| BH5 | `plasser` brukes som navn på to ting | low | Bekreftet. Det indre heter nå `valgte`. | patch |
| BH8 | `sidedata.test.ts` tester ikke manglende `kortnavn` | low | Bekreftet. Lagt til. | patch |
| BH9 | `data-testid` på den skjulte listen brukes ikke, og listen har ingen enhetstest | low | Testid-en er fjernet. En enhetstest avvises: listen rendres bare på klienten på PC (`usePc` er usann i SSR), og e2e dekker den. | patch |
| BH10 | Tomme linjer igjen i `valg.spec.ts` | low | Bekreftet. | patch |
| BH11 | Tab-løkka har ingen melding, og testen sjekker ikke Kartinfoboksen | low | Bekreftet. | patch |
| EC4 | En skrift som lastes etter `fonts.ready`, plasseres ikke på nytt | low | Bekreftet. Lytter nå også på `loadingdone`. | patch |
| EC6 | `m.click()` kan rulle siden selv, så PC-testen av at siden står stille kan bli ustabil | low | Bekreftet. Testen ruller markøren inn før den måler. | patch |
| VG2 | `somHtml` er ikke testet | low | Bekreftet. Flyttet til `kart-data.ts` med enhetstest. | patch |
| BH6 | To ResizeObservere og to lister over overleggene | low | Avvist. Ingen konkret feil, og rettingen er en omskriving av tilpasningen fra 3.3. | avvist |
| BH2 | Kortnavnet til Kaia er likt det fulle navnet | false | Skissen pc-1 bruker «Kaia i Molde sentrum». «Kaia» i `turkort.test.ts` er et testoppsett for `fraTekst`. | avvist |
| EC2 (del) | Prikker utenfor kartet skyver synlige navn | false | Et navn som ikke synes, har ingen overlapp med synlige navn og koster ingenting. Et navn som synes delvis, skal telle. | avvist |
| BH12 | `kortnavn` er kopiert for hånd i flere filer | false | Sidedataene bygges felt for felt med vilje, så `koordinatkilde` ikke sendes. Skjemaene gir typefeil hvis feltet glemmes. | avvist |
| BH13 | Specen er ikke med i diffen | false | Det er bevisst. Specen gis til edge-case-laget som egen fil. | avvist |

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

**Manual checks:**
- Skjermbilde av Søk ved 1440 px og av Resultatet ved 360 px etter trykk på markør 2.
