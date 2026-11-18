---
title: 'Story 2.1: Værtersklene og Værklassen'
type: 'feature'
created: '2026-11-18'
status: 'done'
route: 'dispatch'
review_loop_iteration: 0
baseline_commit: 'fce56ae4a4371a8f75518515d61168da10586d41'
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kjernen har ingen Værterskler, ingen `Vaermelding`-type og ingen Værklasse. Story 2.2 (kalibreringsskriptet), 2.3 og 2.5–2.7 venter på dette, og tersklene finnes i dag bare som `TERSKLER` i Python-skriptet.

**Approach:** Legg tersklene i `data/vaerterskler.json` (AR-11, startverdiene i PRD §4.2, beholdt etter kalibreringen) og valider dem med Zod ved import. Lag rene funksjoner som setter Værklassen per time (FR-8) og for et Tidsvindu (FR-9, AR-6), og en språknøytral fasit i `testdata/vaerklasse-fasit.json` som Vitest kjører nå og Python-skriptet kan kjøre i 2.2.

## Boundaries & Constraints

**Always:**
- Én kilde for tersklene: verdiene står bare i `data/vaerterskler.json`. Klassifiseringen tar tersklene som parameter med den importerte fila som standard, slik at en endret grense ikke krever kodeendring (NFR-10).
- `>=` for nedbør og vind, `<` for temperatur, og `null` betyr ingen grense. Strengeste klasse vinner.
- Øyeblikk er epoke-ms i UTC (AD-7). Kjernereglene i ESLint (ingen `Date.now()`, `new Date()` uten argument, fil-I/O eller nett) gjelder også testene i `src/kjerne/`.
- Fasiten bruker ISO 8601 med forskyvning (`+01:00`), ikke `Z`, så Python 3.9 `fromisoformat` kan lese den.

**Never:**
- Ikke endre `scripts/kalibrering_vaerlogg.py` (story 2.2) eller lag `parseMetCompact` (story 2.3).
- Ikke installer `@date-fns/tz` eller lag Oslo-logikk. Det hører til story 1.3.
- Ikke endre tersklene, PRD-en eller UX-dokumentene.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| FR-8 dårlig | 2,0 mm/t, 3 m/s, 5 °C | `darlig` | – |
| FR-8 middels | 1,9 mm/t, 3 m/s, 5 °C | `middels` | – |
| FR-8 frarådet | 0 mm/t, 17,2 m/s, −15 °C | `fraradet` | – |
| FR-8 god | 0,4 mm/t, 7,9 m/s, 5 °C | `god` | – |
| Temperaturgrense | 0,0 °C / −0,1 °C / −10,0 °C / −10,1 °C | `god` / `middels` / `middels` / `darlig` | – |
| FR-9 dårligste time | vindu med god, frarådet, god | `fraradet` | – |
| FR-9 overlapp | 13:30–15:30 | timene som starter 13, 14 og 15 | – |
| Helt timeslutt | 10:00–12:00 | timene 10 og 11, ikke 12 | – |
| Time mangler | vindu 13:30–15:30, Værmeldingen mangler 14 | `mangler` | – |
| Ugyldig terskelfil | ukjent nøkkel, feil `versjon` eller feil rekkefølge | – | kaster feil som nevner `data/vaerterskler.json` og hva som er galt |

</frozen-after-approval>

## Code Map

- `src/kjerne/` -- har bare `oppsett.test.ts` (Zod 4-røyktest, mønster for testene). Ingen `tid.ts`, `vaer/` eller `format.ts` ennå.
- `eslint.config.mjs:100-138` -- kjernereglene. Import av JSON fra `data/` eller `testdata/` er lov (bare `server|app|ui` og Node-moduler er sperret). `data/**` er ignorert av ESLint.
- `tsconfig.json` -- `resolveJsonModule: true`, alias `@/*` → `src/*`. `vitest.config.mts` tar med `src/**/*.test.ts`.
- `scripts/kalibrering_vaerlogg.py:36-63` -- `TERSKLER` og `klasse_for_time`: samme regel som skal i kjernen. Les for å bekrefte at fasiten gir samme svar, men ikke endre.
- `ARCHITECTURE-SPINE.md` AD-7, AD-8, AD-19 -- form på JSON-fila, `Vaermelding` og `timerITidsvindu` (halvåpent intervall, overlapp teller).
- `epic-2-context.md` -- samlet krav for epicen. Nok til denne storyen sammen med spec-en.

## Tasks & Acceptance

**Execution:**
- [x] `data/vaerterskler.json` -- `{ versjon: 1, klasser: [fraradet 10/17.2/null, darlig 2/10.8/-10, middels 0.5/8.0/0] }` -- AR-11, startverdiene.
- [x] `src/kjerne/vaer/typer.ts` -- `Vaerklasse = 'god'|'middels'|'darlig'|'fraradet'`, `VindusKlasse = Vaerklasse | 'mangler'`, `Vaertime { startUtc: number; tempC; vindMs; nedborMmT: number; symbolKode: string | null }`, `Vaermelding { timer: Vaertime[] }` -- AR-6.
- [x] `src/kjerne/vaer/terskler.ts` -- strengt Zod-skjema, `lesVaerterskler(data: unknown)` som kaster tydelig feil, og `VAERTERSKLER` lest fra JSON-fila ved import -- AD-8.
- [x] `src/kjerne/tid.ts` -- `timerITidsvindu(startUtc, sluttUtc): number[]`, starten på hver hele time som overlapper `[start, slutt)` -- AD-7. Ren UTC-aritmetikk; story 1.3 bygger videre på fila.
- [x] `src/kjerne/vaer/vaerklasse.ts` -- `klasseForTime(time, terskler = VAERTERSKLER)` og `klasseForTidsvindu(melding, startUtc, sluttUtc, terskler = VAERTERSKLER): VindusKlasse` -- FR-8, FR-9.
- [x] `testdata/vaerklasse-fasit.json` -- `{ timer: [{ beskrivelse, nedborMmT, vindMs, tempC, klasse }], tidsvinduer: [{ beskrivelse, start, slutt, timer: [{ start, nedborMmT, vindMs, tempC }], klasse }] }` med alle radene i matrisen, grensene for nedbør og vind (eksakt grense og like under), og 10. nov. formiddag fra kalibreringen (1,0 mm/t → `middels`).
- [x] `src/kjerne/vaer/vaerklasse.test.ts` og `terskler.test.ts` -- kjør hele fasiten, ugyldige terskelfiler og NFR-10-testen (under).

**Acceptance Criteria:**
- Given `data/vaerterskler.json`, when `VAERTERSKLER` importeres, then det har strengeste klasse først og startverdiene fra FR-8, og skjemaet avviser ukjente nøkler.
- Given hele fasiten, when Vitest kjøres, then alle radene består.
- Given en kopi av tersklene der grensen for dårlig nedbør er 3,0, when fasiten kjøres med den, then bare radene med nedbør i [2,0, 3,0) endrer utfall, og ingen kode er endret (NFR-10).
- Given hele repoet, when lint og tester kjøres, then de er grønne, og lagreglene i `lagregler.test.ts` er urørt.

## Implementation Notes

- Implementert av underagent fra spec-en; verifisert i hovedøkten: `npm run lint` 0 feil, `npx tsc --noEmit` 0 feil, `npm test` 106/106 grønne. Alle radene i matrisen har en test som kjørte og besto.
- Valg som spec-en ikke dekket: et tomt eller omvendt vindu (`slutt <= start`) gir `mangler`. `terskler.ts` eksporterer også `TERSKELKLASSER` og `VaertersklerSkjema`, og `vaerklasse.ts` eksporterer `darligsteKlasse`.
- Skjemaet sjekker bare rekkefølgen på klassene, ikke at grensene blir strengere fra middels til frarådet.
- Kalibreringsraden 10. nov. bruker nedbøren per time (1,0 og 0,7) og loggens min/maks for temperatur og maks vind (1,6), fordi CSV-en ikke har vind og temperatur per time.
- Fasiten bruker ASCII-klassenavn (`fraradet`, `darlig`). Python-skriptet bruker `frarådet` og `dårlig`, så story 2.2 må oversette ved `--selvtest`. Med en kastescript-oversettelse ga `klasse_for_time` i skriptet samme svar på alle 27 radene (Python 3.9 `fromisoformat` leste tidene).

## Spec Change Log

## Review Triage Log

| # | Kilde | Funn | Dom | Begrunnelse | Rute |
|---|---|---|---|---|---|
| 1 | blind, verification-gap | NFR-10-testen for Tidsvinduer er tom: ingen vinduer har en time i [2,0, 3,0), og mutasjonen `klasseForTime(time)` uten `terskler` overlevde | medium | Bekreftet: nedbøren i vinduene er 0, 0,6, 0,7, 1,0 og 12,0. AC3 er dermed ikke vist for vinduer | patch |
| 2 | verification-gap | Testen av dobbel time fanger ikke «siste vinner» | low | Bekreftet: den dårligste står sist i testen, og mutasjonen overlevde. Retting er én ekstra påstand | patch |
| 3 | verification-gap | Tomt eller omvendt vindu → `mangler` er ikke testet, og en sletting av vakta ga `god` | low | Bekreftet: ingen kall med `slutt <= start`. Retting er to påstander | patch |
| 4 | verification-gap | `null` som «ingen grense» for nedbør og vind er ikke testet | low | Bekreftet: ingen terskelkopi har null for nedbør eller vind, og mutasjonen overlevde | patch |
| 5 | blind | `null` for temperatur kan tolkes feil uten at det merkes | false | Hvis frarådet `temp_c_under: null` ble lest som 0, ville −0,1 °C gi frarådet, og fasitraden forventer middels | avvist |
| 6 | blind | DST-testen sjekker ikke antall timer | low | Bekreftet: den sjekker bare `% TIME_MS`. Retting er én påstand om lengde 4 | patch |
| 7 | blind | Testen «ukjent klasse» består selv uten `z.enum` | low | Bekreftet: `/klasse/` treffer stien `klasser[0].klasse` uansett feil | patch |
| 8 | edge, blind | Predikatet `iOmradet` ser bare på nedbør og brekker hvis en rad i området når dårlig via vind eller temperatur | low | Riktig, men ingen rad gjør det nå. Retting er en kommentar | patch |
| 9 | blind | Fasiten bruker `fraradet`/`darlig`, mens skriptet bruker `frarådet`/`dårlig`, og det står ikke ved fasiten | low | Bekreftet. Retting er en kommentar i testen | patch |
| 10 | edge, blind | `timerITidsvindu` henger ved `Infinity` eller svært lange vinduer | low | Ingen kaller kan sende `Infinity`: vinduene kommer fra Søk (maks 5 t). Retting krever en ny vakt | avvist |
| 11 | edge, blind | NaN i en time gir `god` | low | `Vaertime` er `number`, og `parseMetCompact` (2.3) validerer med Zod. JSON kan ikke gi NaN. Retting krever en ny vakt | avvist |
| 12 | edge | En time som ikke starter på hel time gir `mangler` | low | MET gir hele timer (AD-19), og Design Notes beskriver eksakt nøkkel. Retting krever ny logikk | avvist |
| 13 | edge, blind | Skjemaet godtar grenser som ikke blir strengere oppover, og negative grenser | low | Riktig, men intent krever bare strengt skjema og rekkefølge. Fila endres sjelden (kalibreringen beholdt verdiene). Retting legger til valideringslogikk | avvist |
| 14 | blind | En endret grense gjør testene røde | false | Det er meningen: AC-en i epicen sier at tester som gjelder grensen, skal endre utfall | avvist |
| 15 | blind | Feilmeldingen nevner alltid `data/vaerterskler.json` | low | Bare fila valideres i appen. Retting krever ny parameter | avvist |
| 16 | blind | Klasselista står fire steder | low | `RANG` er `Record<Vaerklasse, …>`, så `tsc` fanger en ny klasse. Retting er refaktorering | avvist |
| 17 | blind | `klasseForTidsvindu` regner ut alle timer på nytt for hvert kall | low | Melding på ca. 60 timer, vinduer på maks 16 t per dag. Ingen målbar kostnad | avvist |
| 18 | blind | Tomt vindu burde kaste i stedet for å gi `mangler` | low | Valget står i Implementation Notes og i kommentaren. Testen kommer med funn 3 | avvist |
| 19 | verification-gap | CI kjører ikke `tsc --noEmit` | medium | Fantes før denne storyen | defer |

## Design Notes

- `timerITidsvindu` trenger ikke tidssoner: Norge har hele timers forskyvning, så hele UTC-timer er hele Oslo-timer. Funksjonen ligger likevel i `tid.ts` fordi AD-7 sier at den hører hjemme der.
- En time i `Vaermelding` regnes som til stede når `startUtc` er nøyaktig en forventet timestart. Doble timer bryter ikke regelen, siden den dårligste vinner.

## Verification

**Commands:**
- `npm run lint` -- forventet: 0 feil
- `npm test` -- forventet: alle tester grønne, også de nye
- `npx tsc --noEmit` -- forventet: 0 feil
- `git status --short` -- forventet: ingen endring i `scripts/`, `_bmad-output/planning-artifacts/` eller `lagregler.test.ts`
