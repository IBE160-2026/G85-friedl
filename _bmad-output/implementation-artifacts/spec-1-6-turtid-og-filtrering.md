---
title: 'Story 1.6: Turtid og filtrering'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '2eccf2d98bbfa41738a05002af05d35f255dc120'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Regelkjernen har ingen Turtid og ingen filtrering, så rangeringen, Mørkevarselet og den korteste Turen (1.7–1.9) har ingenting å bygge på (FR-14, FR-15).

**Approach:**
- **Turtid** (`src/kjerne/turtid.ts`): `turtidMin(tur)` regner Naismith, `lengde_km_totalt` ÷ 5 km/t + `hoydemeter` ÷ 600 m/t, og runder av til nærmeste hele minutt. Halve minutter rundes opp, og flyttallsstøy avgjør ikke avrundingen.
- **Filtrering** (`src/kjerne/filtrering.ts`):
  - `passerTid` beholder en Tur når Turtid ≤ Tilgjengelig tid. Lik tid er med.
  - `passerVanskelighetsgrad` bruker rekkefølgen G < B < R.
  - `filtrerTurer(turer, sok)` gir `{ tur, turtidMin }[]` for Turene som passer begge, i samme rekkefølge som input, og endrer ikke input.
  - Predikatene eksporteres, så 1.8 kan finne den korteste Turen innenfor valgt Vanskelighetsgrad.
- **Testdata:** `testdata/turer.json` er en fast kopi av `data/turer-moldemarka.json` som bare regeltestene bruker (AD-9, AD-16). En test sjekker at kopien består `TurdatasettSkjema`.
- **Tester** mot kopien:
  - Tusenårsvarden fra Damefallet får 92 min, og Storlihytta fra Vardeveien får 16 min.
  - Avrundingen ved ,5.
  - Lik Tilgjengelig tid er med, og ett minutt over er ute (syntetisk Tur).
  - Ved 60 min er ingen Turtid over 60, og Enkel gir bare G. G/B/R er testet mot alle tre nivåene.
  - Tom liste, at rekkefølgen beholdes, og at input ikke endres.
- **Lagregler:** funksjonene tar alt som argumenter. Lagreglene for kjernen (ingen nettverk, klokke eller UI) gjelder uendret (NFR-2).

</frozen-after-approval>

## Implementation Notes

- **Nye filer:** `src/kjerne/turtid.ts`, `src/kjerne/filtrering.ts` og testene `turtid.test.ts` og `filtrering.test.ts`. `testdata/turer.json` er en byte-kopi av `data/turer-moldemarka.json` per 2026-11-18.
- **Avrunding:** minuttene rundes først til 6 desimaler og så til helt minutt. Uten det gir 0,05 km og 59 hm (nøyaktig 6,5 min) 6,4999… og dermed 6 min. Testen viser støyen og krever 7.
- **Typer:** `filtrerTurer` tar `Pick<Sok, "tilgjengeligMin" | "vanskelighetsgrad">` og gir `TurMedTid[]`. Vanskelighetsgraden bruker typen fra `Sok`, som har de samme verdiene G/B/R som `gradering` i Tur-skjemaet.
- **Turtider i testdataene:** 16–168 min. Ingen ekte Tur har en Turtid som er et multiplum av 15, så lik Tilgjengelig tid er testet med en syntetisk Tur.

## Review Triage Log

Pass 1 (blind-hunter BH). Edge-case-hunter og verification-gap er ikke med i oneshot-ruten.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, BH11 | Variabelen i `filter`-callbacken skygger for den importerte `turtidMin`, og parameternavnet i `passerTid` er uklart | low | Bekreftet. 1.7–1.9 bygger videre på modulen. Direkte navnebytte. | patch |
| BH2 | `PRESISJON = 1e6` forutsetter få desimaler | low | Bekreftet for verdier med mer enn 6 desimaler. Dataene har lengde med to desimaler og hele høydemeter. Forutsetningen er skrevet i koden. | patch (kommentar) |
| BH3 | Testen for flyttallsstøy sjekker en kopi av formelen | low | Bekreftet. Erstattet med en eksakt heltallsreferanse for 0,01–20 km og 0–1000 hm. | patch |
| BH4 | Antallet i addendumet (fire Turer ved 1 t, alle ved 3 t) er ikke låst | medium | Bekreftet. Settet ved 60 min og alle 12 ved 180 min er nå testet. | patch |
| BH5 | Bare 2 av 12 Turtider er låst | medium | Bekreftet. En tabell med alle 12 vokter både regelen og kopien. | patch |
| BH7 | Testkopien sjekkes ikke mot FR-27 | medium | Bekreftet. `valider.test.ts` validerer nå også `testdata/turer.json` mot rutegeometrien. | patch |
| BH6 | Testen av skjemaet kan ikke feile alene, fordi `parse` på modulnivå kaster først | low | En ugyldig kopi gir likevel en rød testfil. Kosmetisk. | avvist |
| BH8 | Ingen lagregel hindrer `testdata/` i å bli importert av produksjonskode | low | Krever en ny lintregel med test. Ingen kode gjør det i dag. | avvist |
| BH9 | De syntetiske Turene i `filtrering.test.ts` ville ikke bestått `TurSkjema` | low | Filtreringen leser bare `gradering`, lengde og høydemeter, så resten påvirker ikke testen. | avvist |
| BH10 | Ingen vakt mot NaN eller negative tall i `turtidMin` | false | Kjernen får bare data som har gått gjennom `TurdatasettSkjema` (positiv lengde, heltall ≥ 0 for høydemeter). | avvist |
