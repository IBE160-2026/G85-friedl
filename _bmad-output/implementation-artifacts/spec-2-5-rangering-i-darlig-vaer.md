---
title: 'Story 2.5: Rangering i dårlig vær'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '77a351d5f07f919cbefa25b91a8fc2952878fb91'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-8-rangering-utvalg-og-den-korteste-turen.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Rangeringen fra 1.8 tar ikke hensyn til været. Ved dårlig vær skal lave og skjermede Turer stå øverst (Story 2.5, FR-15, FR-16).

**Approach:** `rangerTurer` og `anbefal` i `src/kjerne/anbefaling.ts` får Værklassen for Tidsvinduet (`VindusKlasse`) som parameter. Ved `darlig` eller `fraradet` brukes rangeringen for dårlig vær. Ved `god`, `middels` og `mangler` er rangeringen den samme som før. Filtreringen endres ikke.

## Decisions

- **Signatur:** `rangerTurer(passer, sok, soltider, vaerklasse: VindusKlasse)` og `anbefal(turer, sok, soltider, vaerklasse: VindusKlasse)`. Parameteren er påkrevd, så ingen kaller glemmer den. `sok.ts` sender `"mangler"` til 2.8 kobler inn Værklassen.
- **Rangering i dårlig vær** (`darlig`, og også `fraradet`, selv om 2.8 ikke kaller `anbefal` da):
  1. uten Mørkevarsel først
  2. Lavtliggende tur først (`hoyeste_punkt_moh < 400`, der 400 er `VAERPUNKT.hoydeMoh`)
  3. Egnet i dårlig vær: `true` før `null` (ukjent) før `false`
  4. flest treff på Opplevelsespreferanser uten utsikt, altså bare `vann`
  5. Turtid nærmest Tilgjengelig tid
  6. ID i kodepunktrekkefølge
- **`treff`** i `RangertTur` er fortsatt antallet treff med utsikt, fordi Turkortet viser det. Rangeringen i dårlig vær bruker et eget tall uten utsikt. `RangertTur` får feltene `lavtliggende: boolean` og `egnetDarligVaer: boolean | null`, så 2.7 kan skrive «Øverst fordi …» uten å regne på nytt.
- **`velgTurforslag`** (variasjon per Mål og påfylling) og `kortesteTur` er uendret.
- Ved `god`, `middels` og `mangler` gir `rangerTurer` nøyaktig samme rekkefølge som før. De eksisterende testene fra 1.8 skal bestå med `"god"` eller `"mangler"` lagt til.

## Boundaries & Constraints

**Always:**
- Kjernen er ren og deterministisk. Input i stokket rekkefølge gir samme svar.
- Været fjerner aldri enkeltturer. `filtrerTurer` får ikke Værklassen.

**Never:**
- Ingen endring av visningen, serveren eller UI-et, utover parameteren `"mangler"` i `sok.ts`.
- Ingen nye felt i Turdatasettet.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-2 dårlig | 9. nov. 10:00, 3 t, Krevende, utsikt, `darlig`, soltidene 9. nov. | Moldevatnet fra Jensgurilia er Turforslag 1 |
| Egnet før ukjent | Moldevatnet fra Jensgurilia (lav, egnet ja) og Bergsvatnet (lav, egnet ukjent), begge passer uten Mørkevarsel | Moldevatnet over Bergsvatnet |
| Lav før høy | en Tur under 400 moh og en over, ellers like | den lave først |
| Mørkevarsel først | en lav Tur med Mørkevarsel og en høy uten | den høye uten Mørkevarsel først |
| Utsikt teller ikke | to Turer der bare den ene har utsikt, ellers like, `darlig` | rekkefølgen avgjøres av Turtid og ID, ikke av utsikt |
| Vann teller | samme, men med `vann` | Turen med vann først |
| God = middels | UJ-1-Søket med `god` og med `middels` | like Turforslag i lik rekkefølge, og lik rangering som med `mangler` |
| Ingen fjernes | `darlig` | `rangerTurer` gir like mange Turer som `filtrerTurer` |
| Stokket | input i stokket rekkefølge, `darlig` | samme rekkefølge |
| Grense | `hoyeste_punkt_moh` 399 og 400 | 399 er lavtliggende, 400 er ikke |

</frozen-after-approval>

## Code Map

- `src/kjerne/anbefaling.ts` og `anbefaling.test.ts` (1.8) -- rangering og utvalg.
- `src/kjerne/vaer/typer.ts` -- `VindusKlasse`.
- `src/kjerne/vaerpunkt.ts` -- `VAERPUNKT.hoydeMoh`.
- `src/kjerne/turdata/skjema.ts` -- `hoyeste_punkt_moh` og `egnet_darlig_vaer`.
- `src/server/sok.ts` -- kalleren.
- `testdata/turer.json` -- Turene testene bruker.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/anbefaling.ts` -- parameteren, rangeringen for dårlig vær og de nye feltene.
- [x] `src/kjerne/anbefaling.test.ts` -- matrisen. Eksisterende tester får Værklassen.
- [x] `src/server/sok.ts` og andre kallere -- send `"mangler"` med en kommentar om 2.8.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1, BH2 | Ingen test låser plassen til vann-treffet under Lavtliggende og Egnet | medium | Bekreftet. Med byttet rekkefølge besto alle testene. | patch |
| BH1 | «Egnet før ukjent» på ekte data består uten egnet-regelen | low | Bekreftet. Turtiden avgjør. En syntetisk test låser regelen. | patch |
| BH5, BH6 | Testene for frarådet og UJ-2 er svake | low | Bekreftet. | patch |
| BH3, BH4 | Rekkefølgen blant Turer med Mørkevarsel, og Alternativ-veien, er ikke testet | low | Bekreftet. | patch |
| EC2 | En ukjent Værklasse gir stille rangeringen for godt vær | low | Bekreftet. Nå med uttømmende `switch`. | patch |
| BH8, BH10 | Kommentaren i `regeltekst.ts` er utdatert, og 400 moh er hardkodet i en kommentar | low | Bekreftet. | patch |
| VG2 | Ruten sjekker ikke at serveren sender `"mangler"` | low | Bekreftet. Billig å låse nå, ikke utsatt. | patch |
| BH7 | Den lokale `ider` skygger hjelperen | low | Bekreftet. | patch |
| BH9 | Sammenligningen er unødvendig kompleks | low | Valgfritt. Oppførselen skal være lik. | patch (valgfritt) |
| EC1 | Variasjonsregelen kan sette en høy Tur over en lav | false | Specen beholder `velgTurforslag`. Variasjonen per Mål (FR-17) går foran. | avvist |
| BH11 | Rutenettestet dekker bare `R` og én dato | low | 1.8-testene med `"god"`/`"mangler"` dekker resten. | avvist |
