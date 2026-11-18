---
title: 'Story 1.8: Rangering, utvalg og den korteste Turen'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '2deb2702e82eb95349338942d3deb9219e5a4d6a'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kjernen kan filtrere Turer og gi Mørkevarsel, men kan ikke rangere dem, velge opptil tre Turforslag eller finne den korteste Turen når ingen passer (FR-16–FR-18). Regelteksten (1.9) og serveren (1.10) trenger resultatet.

**Approach:**
- `src/kjerne/anbefaling.ts`, ren og deterministisk, for god eller middels Værklasse og når Værmeldingen mangler. Rangeringen ved dårlig vær kommer i 2.5.
- `rangerTurer(passer: TurMedTid[], sok, soltider)` gir `RangertTur[] = { tur, turtidMin, morkevarsel, treff }`, sortert slik:
  1. uten Mørkevarsel først
  2. flest treff på Opplevelsespreferanser (`sok.utsikt && tur.utsikt` + `sok.vann && tur.vann`)
  3. minst `tilgjengeligMin − turtidMin`
  4. `id` i kodepunktrekkefølge

  Ingen Turer fjernes.
- `velgTurforslag(rangert)` gir opptil tre. Den går først nedover rangeringen og tar den beste Turen per Mål. Så fyller den på med de neste i rangeringen bare når det er færre enn tre, og fyllingen kommer etter variasjonsvalgene. Lista fylles aldri med Turer som ikke passer.
- `kortesteTur(turer, sok, soltider)` velger blant Turene innenfor Vanskelighetsgraden den med minst Turtid (likhet avgjøres på `id`). Den gir `{ tur, turtidMin, trengerMerMin, morkevarsel }` og kaster hvis ingen Tur har gyldig Vanskelighetsgrad.
- `anbefal(turer, sok, soltider)` gir `{ type: 'turforslag', forslag }` eller `{ type: 'kortesteTur', alternativ }`.
- **Tester** mot `testdata/turer.json` med 9. november, sol opp 08:30 og ned 15:59:
  - UJ-1 13:30, 2 t, Middels, utsikt gir Tusenårsvarden fra Damefallet, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet, uten Mørkevarsel.
  - UJ-1 15:00, 1 t gir Storlihytta fra Vardeveien (uten varsel), Skihytta fra Damefallet og Bergsvatnet (med varsel).
  - UJ-2 14:00, 3 t, Krevende, utsikt gir Storlihytta fra Romsdalsmuseet, Skihytta fra Damefallet og Bergsvatnet, og Turer med Mørkevarsel er fortsatt med nederst i rangeringen.
  - 10:00, 2 t 30 min, Krevende, utsikt og vann gir Tusenårsvarden fra Grua, Varden via Den grønne korridor og Moldevatnet fra Jensgurilia.
  - To Turer som passer, gir to Turforslag, og tre Turer der to har samme Mål, gir den andre Målet som nummer to.
  - 15 min gir Storlihytta fra Vardeveien med `trengerMerMin` 1, og Alternativet kan få Mørkevarsel.
  - Stokket input gir samme rekkefølge.

</frozen-after-approval>

## Implementation Notes

- **Nye filer:** `src/kjerne/anbefaling.ts` og `anbefaling.test.ts`. `RangertTur` og `Alternativ` utvider `TurMedTid` fra 1.6.
- **Ingen værparameter.** Siden Værklassen ennå ikke påvirker noe, tar funksjonene ikke Værklassen inn. Story 2.5 legger den til sammen med rangeringen ved dårlig vær. Testen for «middels og god gir samme rekkefølge» hører hjemme der.
- `velgTurforslag` er generisk over `TurMedTid`, så 2.5 kan bruke den med samme utvalg.
- `trengerMerMin` er `max(0, turtid − tilgjengelig)`. I `anbefal` er verdien alltid positiv, fordi den korteste Turen bare brukes når ingen Tur passer.
- **Åpent punkt fra 1.7 er løst:** UJ-2-testen viser at Turer med Mørkevarsel er med i rangeringen, alle nederst.
- **Gjennomgang:** blind-hunter ga 8 funn. 7 er rettet i testene eller i en doc-kommentar, og 1 er utsatt til `deferred-work.md`.

## Review Triage Log

Pass 1 (blind-hunter BH). Edge-case-hunter og verification-gap er ikke med i oneshot-ruten.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1 | ID-kriteriet er ikke testet, fordi `a-lang` står før `b-lang` i input og sorteringen er stabil | low | Bekreftet. Input er snudd, så testen feiler uten ID-kriteriet. | patch |
| BH2 | Kriterium 3 bruker `Math.abs`, mens specen sier `tilgjengeligMin − turtidMin` | low | De er like for Turer som har passert `filtrerTurer`, og PRD-en sier «nærmest». Forutsetningen står nå i doc-kommentaren. | patch (kommentar) |
| BH3 | `anbefal` kaster når ingen Tur har Vanskelighetsgrad Enkel | low | Kan ikke skje med dagens Turdatasett. Hører hjemme i valideringen av datasettet. | defer |
| BH4 | UJ-2-testen sjekker lengden mot hele datasettet i stedet for `passer` | low | Bekreftet. Sjekker nå `passer.length`. | patch |
| BH5 | Ingen test av at `anbefal` gir færre enn tre Turforslag på ekte data | low | Bekreftet. 30 min med Enkel gir ett Turforslag. | patch |
| BH6 | `treff` er bare halvt testet | low | Bekreftet. Egen test av alle kombinasjonene. | patch |
| BH7 | Mørkevarsel ved soloppgang er ikke testet i rangeringen eller for Alternativet | low | Bekreftet. Test av start 07:00 for begge. | patch |
| BH8 | Stokkehjelperen er ikke LCG-en kommentaren sier, fordi produktet går over 2^53 | low | Bekreftet. Bruker nå Park–Miller, som er eksakt i flyttall. | patch |
