---
title: 'Story 2.3: Værscenarioer for Demomodus og tester'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: 'c987e40fd8f10426fcc70167b4842587c7c7b5ef'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-1-vaerterskler-og-vaerklassen.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-10-serveren-svarer-pa-soket.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Demomodus har bare `uten-vaer`, så UJ-1, UJ-2 og UJ-3 kan ikke vises uavhengig av dagens vær. Det finnes heller ingen parser for MET `compact`, og regeltestene har ingen faste Værmeldinger å bruke (Story 2.3, AR-6, AR-14, AD-13, AD-19, NFR-2, NFR-11).

**Approach:**
- `parseMetCompact` i `src/kjerne/vaer/met-compact.ts` gjør et MET `compact`-svar om til en `Vaermelding`, med Zod.
- Fire scenarioer i `data/vaerscenarioer/`: `uj-1`, `uj-2`, `uj-3` og `ingen-bedre`. Hvert har `met.json` og `scenario.json`. `met.json` lages av et deterministisk skript.
- Registeret og `lagMiljo` får en scenariokilde som gir Værmeldingen til scenarioet.
- Serveren slutter å kaste når Værmeldingen finnes, men behandler den som `mangler` til 2.8 kobler den inn.

## Decisions

- **`parseMetCompact(data: unknown): Vaermelding`:**
  - Skjemaet krever `properties.timeseries` som en liste. Mangler den, kastes `Error` med en melding som nevner `timeseries`.
  - For hver rad leses `time`, `data.instant.details.air_temperature`, `wind_speed`, `data.next_1_hours.details.precipitation_amount` og `data.next_1_hours.summary.symbol_code`. `symbolKode` er `null` når summary eller koden mangler.
  - Rader uten `next_1_hours` tas ikke med. Resultatet sorteres stigende på `startUtc`.
  - Ukjente felt i MET-svaret godtas, siden MET kan legge til felt. Felt som mangler eller har feil type, gir en Zod-feil.
- **Scenarioene** (`na` med tidssoneforskyvning `+01:00`, Værpunktet fra `vaerpunkt.ts`):
  - `uj-1`, «God ettermiddag, mandag 9. november»: `na` er `2026-11-09T13:30:00+01:00`. Hele 9. og 10. november er god, med under 0,1 mm/t og under 5,5 m/s, slik at Værordet blir «oppholdsvær og lite vind». Temperaturen er 3–5 °C.
  - `uj-2`, «Søndag kveld: dårlig formiddag i morgen, bedre fra kl. 14»: `na` er `2026-11-08T20:00:00+01:00`.
    - 9. november fram til og med timen 13:00–14:00 er dårlig, med nedbør på 2,0–3,5 mm/t eller vind på 10,8–13 m/s.
    - Fra 14:00 er det god vær resten av dagen.
    - 8. november er middels fram til midnatt.
  - `uj-3`, «Lørdag formiddag: sterk kuling, bedre i morgen fra kl. 11»: `na` er `2026-11-14T10:00:00+01:00`.
    - 14. november fra 06:00 til 22:00 er frarådet, med vind på 17,2–19,0 m/s og høyst 19,0.
    - 15. november fram til og med timen 10:00–11:00 er frarådet.
    - Fra 11:00 den 15. november er det god vær.
  - `ingen-bedre`, «Dårlig vær i dag og i morgen, uten noe bedre vindu»: `na` er `2026-11-09T10:00:00+01:00`. 9. og 10. november er dårlig hele døgnet, og ingen time er frarådet.
- **`met.json`:**
  - Ekte MET `compact`-form: `type`, `geometry`, `properties.meta` og `properties.timeseries`.
  - Én rad per time fra timen `na` ligger i, til og med 23:00 dagen etter Turdagen. For `uj-2` er det dagen etter 9. november.
  - Etter det følger tre rader med 6 timers mellomrom som bare har `next_6_hours`, slik at filteret blir testet.
  - Tallene har én desimal, og `symbol_code` passer været: `clearsky_day`, `cloudy`, `rain`, `heavyrain` og så videre, med `_night` om natta.
- **Skriptet** `scripts/lag-vaerscenarioer.ts` (kjøres med `npm run vaerscenarioer`) lager `met.json` deterministisk ut fra en tabell per scenario. To kjøringer gir byte-identiske filer. En test sjekker at skriptet gir de committede filene, som for rutegeometrien.
- **Registeret:**
  - `ScenarioSkjema` blir en union. Enten har scenarioet `vaer: "mangler"`, eller så har det `vaer: "met"` med Værmeldingen fra `met.json` (parset ved import).
  - `scenario.json` for de nye scenarioene har `na`, `beskrivelse` og `"vaer": "met"`.
  - Rekkefølgen i registeret er `uj-1`, `uj-2`, `uj-3`, `ingen-bedre` og `uten-vaer`.
- **`lagMiljo`:** `vaerkildeFor` får grenen `met`, som returnerer scenarioets Værmelding. `met.ts` og cachen importeres ikke.
- **Server fram til 2.8:** `svarPaSok` kaster ikke lenger når Værmeldingen finnes. Den bruker `{ type: 'mangler' }` som `VaerGrunnlag`, med en kommentar om at 2.8 kobler inn Værklassen. Demoene gir dermed foreløpig «Været er ikke vurdert.».
- **Testene i kjernen** leser scenarioene med en statisk import av `data/vaerscenarioer/*/met.json` gjennom `parseMetCompact`, i en hjelper `src/kjerne/vaer/testscenarioer.ts` som bare testene bruker. De importerer ikke fra `src/server`.

## Boundaries & Constraints

**Always:**
- `src/kjerne` forblir ren: ingen `fetch`, ingen `Date.now()` og ingen `fs`. `parseMetCompact` tar data inn og gir data ut.
- Scenarioene importeres statisk, så de følger med i bygget.
- Kontrakttesten for `/api/sok` dekker alle demo-ID-ene, og Playwright godtar de nye ID-ene.

**Never:**
- Ingen kall til MET (2.4).
- Ingen endring av Værterskler, Værklasse-logikken eller visningsskjemaet.
- Resultatet bruker ikke Værmeldingen ennå (2.8).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Parse | `uj-1/met.json` | `Vaermelding` med én time per rad som har `next_1_hours`, stigende. Radene med bare `next_6_hours` er borte. |
| Uten timeseries | `{ properties: {} }` | `Error` som nevner `timeseries` |
| Feil type | `wind_speed: "3"` | Zod-feil |
| Uten symbol | `next_1_hours` uten `summary` | `symbolKode: null` |
| UJ-1 | 9. nov. 13:30–15:30 | `klasseForTidsvindu` gir `god` |
| UJ-1 kl. 15 | 9. nov. 15:00–16:00 | `god` |
| UJ-2 formiddag | 9. nov. 10:00–13:00 | `darlig` |
| UJ-2 fra 14 | 9. nov. 14:00–17:00 | `god`, og 13:00–16:00 er `darlig` |
| UJ-3 | 14. nov. 10:00–12:00 | `fraradet`, med største vind 19,0 m/s i vinduet |
| UJ-3 i morgen | 15. nov. 11:00–13:00 | `god`, og 15. nov. 10:00–12:00 er `fraradet` |
| ingen-bedre | alle hele timer 06–22 den 9. og 10. nov., 2 t | `darlig`, aldri bedre |
| Demo | `?demo=uj-1` | `lagMiljo` gir `na` fra scenarioet og en værkilde som gir Værmeldingen. `/api/sok` svarer 200. |
| Kontrakt | alle `DEMO_IDER` | 200 og en gyldig Resultatvisning |
| Skript | `npm run vaerscenarioer` to ganger | ingen endring i `git status` |

</frozen-after-approval>

## Code Map

- `src/kjerne/vaer/typer.ts`, `vaerklasse.ts` og `terskler.ts` (2.1) -- `Vaermelding` og `klasseForTidsvindu`.
- `src/kjerne/tid.ts` -- `osloTilUtc` for testene.
- `src/server/vaer/scenarioer.ts`, `src/server/miljo.ts` og `src/server/sok.ts` -- registeret, værkilden, og at serveren ikke lenger kaster.
- `src/app/api/sok/route.test.ts` -- kontrakttesten bruker allerede `DEMO_IDER`.
- `scripts/konverter-rutegeometri.ts` og testen for den -- mønsteret for et deterministisk skript med en test av at den committede fila stemmer.
- `package.json` -- skriptet `vaerscenarioer`.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/vaer/met-compact.ts` og `.test.ts` -- parseren og testene for den.
- [x] `scripts/lag-vaerscenarioer.ts` og `data/vaerscenarioer/{uj-1,uj-2,uj-3,ingen-bedre}/` -- filene og testen av skriptet.
- [x] `src/kjerne/vaer/testscenarioer.ts` og `src/kjerne/vaer/scenarioer.test.ts` -- radene i matrisen for Værklassene.
- [x] `src/server/vaer/scenarioer.ts`, `miljo.ts` (og testen), og `sok.ts` -- registeret, værkilden og fjerningen av kastet.
- [x] `e2e/api-sok.spec.ts` -- en rask sjekk av at `?demo=uj-1` og `?demo=uj-3` svarer 200.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.
- Gitt `npm run vaerscenarioer`, når det kjøres, så endres ingen committede filer.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn
- `npm run vaerscenarioer && git status --short data/` -- forventet: ingen endring

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| EC2 | Rader uten `next_1_hours` valideres og kan felle hele Værmeldingen | high | Bekreftet. Rader i ekte MET-svar kan mangle felt. Parseren filtrerer nå før valideringen. | patch |
| BH8, EC3–5 | Parseren godtar timer som ikke er hele, like tider og negative verdier, og avviser tom `symbol_code` | medium | Bekreftet. Dette må på plass før 2.4 sender ekte svar gjennom parseren. | patch |
| BH3, EC1 | Det samme objektet for Værmeldingen deles mellom forespørsler, og frysingen er grunn | medium | Bekreftet. Fryses nå helt. | patch |
| BH4 | Feilgrenene i `les()` er ikke testet | low | Bekreftet. | patch |
| BH1 | `sok.ts` kaller værkilden og kaster svaret | low | Bekreftet. Kallet kommer tilbake i 2.8. | patch |
| BH2, VG1 | At demoene midlertidig gir «Været er ikke vurdert.», er ikke sjekket | low | Bekreftet. Sjekkes nå i kontrakttesten, og 2.8 endrer det. | patch |
| BH5, EC6–8 | Vaktene i skriptet mangler eller er ikke testet | low | Bekreftet. | patch |
| BH7 | Hull på én time mellom radene per time og radene per 6 timer | low | Bekreftet. | patch |
| BH6 | `testscenarioer.ts` validerer ikke, og lista er ført for hånd | low | Bekreftet. | patch |
| BH7 (resten) | Mangler `next_6_hours` på radene per time, og symbolet for 6 timer | low | Parseren bruker ikke de feltene. | avvist |
| BH9 | Dag og natt i symbolene er tilnærmet | low | Bare ikonvalg. Påvirker ikke Værklassen. | avvist |
| BH10 | CSS-rettingen for UkjentDemo har ingen test | false | Sluttsjekken dekker den med 44 px for alle lenker. | avvist |
| BH11, VG-a | Demomerket lover vær som Resultatet ikke viser før 2.8 | low | Kjent mellomtilstand, og specen sier det. | avvist |
| BH13 | Skriptet har en kopi av Værpunktet | low | Importen krever endelsen `.ts`, som `tsc` avviser. En test sjekker at verdiene er like. | avvist |

## Implementation Notes

- **ingen-bedre:** `met.json` starter i timen der «nå» er (10:00). Vinduer som starter 06–09 den 9. november, gir derfor `mangler`. De er uansett passert og hoppes over i letingen etter Bedre tidsvindu.
- **UkjentDemo:** lenkene har fått `min-width` på 44 px, fordi de korte ID-ene `uj-1`–`uj-3` ellers feilet SM-4.
- **Demoene viser foreløpig «Været er ikke vurdert.»**, selv om scenarioet har en Værmelding. Det endres i 2.8.
