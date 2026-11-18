---
title: 'Story 1.3: Søk-kontrakten og tid i Europe/Oslo'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '6c76ff5b1989d724cdd5ebc82cfc5fd8ba18784b'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Klienten, serveren og testene har ikke noe felles Søk. Det finnes ingen skjema og ingen regel for passert tid, og ingenting gjør om veggklokke i Europe/Oslo til UTC. Storyene 1.4, 1.10 og 1.11 trenger dette.

**Approach:** `SokSkjema` og `normaliserSok`/`lagStandardSok` i `src/kjerne/sok.ts`, og Oslo-hjelpere i `src/kjerne/tid.ts` med `@date-fns/tz` 1.5.0 som eneste bruker. En lagregel sperrer `@date-fns/tz` utenfor `tid.ts`. En egen testfil kjører eksemplene med `TZ=UTC` og `TZ=America/New_York`.

## Boundaries & Constraints

**Always:**
- «Nå» er epoke-ms i UTC og kommer som argument. Kjernen leser aldri klokka, heller ikke via `new TZDate()` eller `new TZDate(tz)`.
- «Passert» betyr at Starttidspunktet er tidligere enn «nå». Kl. 13:30:00 er 13:30 ikke passert, men 13:30:01 rundes til 13:45.
- «Etter 22:00» betyr at «nå» rundet opp til kvarter er senere enn 22:00. Kl. 21:50 er standard i dag 22:00, mens 22:00:01 gir i morgen 10:00.
- `justering` for passert tid i dag er «Flyttet til HH:MM, fordi HH:MM har passert.».
- Beslutning (2026-11-18): etter 22:00 er `justering` «Flyttet til i morgen kl. 10:00, fordi klokka har passert 22:00.».
- Beslutning (2026-11-18): en ukjent dato gir standard-Søket med `justering` «Turdagen er ikke i dag eller i morgen, så Søket er satt tilbake til standard.».
- `timerITidsvindu` beholder signaturen fra story 2.1, fordi `vaerklasse.ts` bruker den.

**Never:**
- Ingen `format.ts`, `side.ts`, `/api/sok` eller UI. Det kommer i 1.4, 1.9, 1.10 og 1.11.
- Ingen `date-fns`-pakke ennå. `TZDate` fra `@date-fns/tz` er nok. `date-fns` legges til når en story trenger den.
- Ingen endring i reglene for `@typescript-eslint/no-restricted-imports`. Tidssone-sperren bruker grunnregelen `no-restricted-imports`, så den ikke kolliderer med lagreglene.

## I/O & Edge-Case Matrix

Datoene er i Oslo. «Nå» er 9. november 2026 hvis ikke annet står.

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Passert i dag | nå 13:22, i dag 13:00 | i dag 13:30, «Flyttet til 13:30, fordi 13:00 har passert.» | – |
| Fremtid i dag | nå 13:22, i dag 14:00 | uendret, ingen `justering` | – |
| Etter 22:00 | nå 22:10, i dag 21:00 | i morgen 10:00, med `justering` for 22:00 | – |
| I morgen | nå 22:10, i morgen 07:00 | uendret | – |
| Ukjent dato | i går eller om tre dager | standard-Søket, med `justering` for ukjent dato | – |
| Standard | nå 05:10 / 13:22 / 21:50 / 22:10 | i dag 06:00 / i dag 13:30 / i dag 22:00 / i morgen 10:00, 120 min, B, ingen preferanser | – |
| Ugyldig Søk | 13:10, 05:45, 22:15, 10 eller 310 min, 20 min, 'X', ekstra felt, 2026-02-30 | `safeParse` feiler | – |
| Tidsvindu over midnatt | 22:00 + 300 min | timene 22, 23 (9. nov) og 00, 01, 02 (10. nov) | – |
| Sommertid | Søk 29. mars og 25. oktober 2026 | riktig UTC-øyeblikk på dagen tiden skifter | – |

</frozen-after-approval>

## Code Map

- `src/kjerne/tid.ts` -- har `TIME_MS` og `timerITidsvindu(startUtc, sluttUtc)` (ren UTC-aritmetikk, story 2.1). Oslo-hjelperne legges til her.
- `src/kjerne/vaer/vaerklasse.ts` -- bruker `timerITidsvindu`. Ikke endre den.
- `eslint.config.mjs` -- objektet `lagregler/kjerne` har `no-restricted-syntax` med `ingenUseCache`. Nye selektorer for `TZDate` legges i samme liste. Lagreglene bruker `@typescript-eslint/no-restricted-imports` per filmønster.
- `lagregler.test.ts` -- `forventBrudd`/`forventOk` filtrerer på «Lagregel». Nye meldinger må begynne med «Lagregel».
- `vitest.config.mts` -- tar med `src/**/*.test.ts` og `*.test.ts` i roten. Testfiler i `src/kjerne/` kan ikke bruke `process` på grunn av lint, så tidssonetesten må ligge i roten.
- `src/kjerne/oppsett.test.ts` -- viser zod 4-mønsteret (`.strict()`).
- `package.json` / `.npmrc` -- `save-exact=true`. `@date-fns/tz@1.5.0` finnes og har ingen peer-avhengigheter.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `package-lock.json` -- `npm install @date-fns/tz@1.5.0` -- versjonen fra Stack.
- [x] `src/kjerne/tid.ts` -- `OSLO`, `osloDato(utc)` → 'YYYY-MM-DD', `osloKlokke(utc)` → minutter etter midnatt, `osloTilUtc(dato, 'HH:MM')`, `leggTilDager(dato, n)` og `kvarterOpp(minutter)`. Alt bruker `TZDate` med eksplisitt sone -- AD-7.
- [x] `src/kjerne/sok.ts` -- `SokSkjema` (`z.iso.date()`, start som helt kvarter 06:00–22:00, `tilgjengeligMin` som heltall 15–300 og `multipleOf(15)`, `z.enum(['G','B','R'])` og to boolske felt), `type Sok`, `lagStandardSok(na)` og `normaliserSok(sok, na): { sok; justering? }` -- AD-17.
- [x] `src/kjerne/sok.test.ts`, `src/kjerne/tid.test.ts` -- hver rad i matrisen, også grensene 13:30:00/13:30:01 og 21:50/22:00:01.
- [x] `tidssone.test.ts` (rot) -- setter `process.env.TZ` til `UTC` og `America/New_York`, sjekker at forskyvningen faktisk endret seg og kjører eksemplene for passert tid, etter 22:00, standard og midnatt.
- [x] `eslint.config.mjs` -- `lagregler/tidssone` for `src/**` med `ignores: ['src/kjerne/tid.ts']` og `no-restricted-imports` for `@date-fns/tz` og `@date-fns/tz/*` («Lagregel AD-7: …»). I kjerneobjektet sperres også `new TZDate` med færre enn to argumenter, fordi den leser klokka.
- [x] `lagregler.test.ts` -- import av `@date-fns/tz` feiler i `src/kjerne/sok.ts`, `src/server/x.ts` og `src/ui/X.tsx` og går gjennom i `src/kjerne/tid.ts`. `new TZDate()` og `new TZDate('Europe/Oslo')` feiler i kjernen, mens `new TZDate(0, 'Europe/Oslo')` går gjennom.

**Acceptance Criteria:**
- Gitt endringene, når `npm run lint && npm test && npx tsc --noEmit` kjøres, så lykkes alle.
- Gitt `grep -rl "@date-fns/tz" src`, når den kjøres, så er `src/kjerne/tid.ts` eneste treff.

## Implementation Notes

- Alle oppgavene er gjort. Lint er ren, Vitest gir 241/241, `tsc` er ren, og grep finner `@date-fns/tz` bare i `src/kjerne/tid.ts`.
- `klokkeTekst(minutter)` i `tid.ts` er lagt til utover Code Map. Den gjør minutter om til 'HH:MM' for `sok.ts` og kaster ved verdier utenfor døgnet.
- `osloKlokke` regner sekunder og millisekunder som en brøkdel av et minutt, så rundingen stemmer med sjekken for passert tid.
- Endring av `process.env.TZ` mens testene kjører virker i Vitest 5. `tidssone.test.ts` sjekker forskyvningen før hvert eksempel og kjører i UTC, America/New_York og Asia/Tokyo.
- Etter gjennomgangen sperrer kjernen også `TZDate.tz(sone)`, og forbudet mot `@date-fns/tz` gjelder alle filer som lintes, ikke bare `src/`.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1 | Ingen test bruker millisekunder, så en fjernet `getMilliseconds()`-del i `osloKlokke` gir «Flyttet til 13:30, fordi 13:30 har passert.» uten at noen test feiler | medium | Gap-funnet er forhåndsverifisert. «Nå» fra serveren har nesten alltid millisekunder. | patch (P1) |
| EC7 | Med «nå» 13:30:00.300 blir 13:30 flyttet til 13:45 | false | Specen sier at «passert» betyr tidligere enn «nå». 13:30 er tidligere enn 13:30:00.300, så 13:45 er riktig. | avvist |
| BH1, EC1, VG-a | `TZDate.tz('Europe/Oslo')`, alias, `TZDateMini` og navneromsimport leser klokka uten lintfeil | low | `TZDate.tz` er bekreftet med lintText, og det er den mest sannsynlige veien (`mini.js` kaller `Date.now()`). Alias og `TZDateMini` er usannsynlig i `tid.ts`, som er eneste fil med importen. | patch (P2, bare `TZDate.tz`) |
| BH2 | Kommentaren påstår at to argumenter alltid gir sone, men `new TZDate(2026, 10, 9)` har ingen | low | Bekreftet. En regel som krever sone, blir komplisert, og `tidssone.test.ts` feiler i UTC hvis en hjelper mangler sone. Kommentaren rettes. | patch (P3, kommentar) |
| BH3, EC2, VG-b | Dynamisk `import('@date-fns/tz')` går forbi lint | low | Bekreftet, men usannsynlig. Grep-sjekken i Verification fanger det, og fiksen krever selektorer i to objekter. | avvist |
| EC8 | Tidssone-sperren gjelder bare `src/**`, så `e2e/` og testfiler i roten kan importere `@date-fns/tz` | low | Bekreftet. Storyen sier at `tid.ts` er eneste fil som importerer pakken. Fiksen er å fjerne `files`. | patch (P4) |
| BH7 | Tidssonetesten har ingen sone øst for Oslo | low | Stemmer: UTC og New York ligger vest for Oslo. Fiksen er én rad i `describe.each`. | patch (P5) |
| BH4, EC3 | `osloTilUtc` og `leggTilDager` sjekker ikke verdiområdet (2026-13-45, 25:99) | low | Alle kall får verdier fra et Søk validert av `SokSkjema` (`z.iso.date()` og regex for start), eller `leggTilDager(…, 1)`. Fiksen er nye vakter for input som ikke kan nå fram. | avvist |
| EC4 | År under 100 blir 19xx | false | En slik dato er verken i dag eller i morgen, så `normaliserSok` gir standard-Søket før `osloTilUtc` kalles. | avvist |
| EC5 | `NaN` som «nå» gir `NaN-NaN-NaN` | low | «Nå» kommer fra `miljo.ts` og er aldri `NaN`. Det er en ny vakt for en tilstand som ikke er vist. | avvist |
| EC6 | `normaliserSok` validerer ikke input | false | Kontrakten (AD-17) er at Søket er validert med `SokSkjema` før det normaliseres, og typen `Sok` krever det. | avvist |
| BH5 | `leggTilDager` godtar desimaltall for `n` | low | Eneste kall bruker `1`. | avvist |
| BH6 | Oppførselen for 02:30 på dagene tiden skifter er ikke dokumentert | low | Starttidene er 06:00–22:00 og treffer aldri hullet. Design Notes sier dette. | avvist |
| BH8 | `toEqual` overser `justering: undefined` | low | `undefined` forsvinner i JSON, så brukeren merker det aldri. Én test sjekker `"justering" in`. | avvist |
| BH9 | Ingen test for idempotens | low | Ingen feil er vist. Løkkene for gyldig Søk dekker hovedkravet. | avvist |
| BH10 | 06–22 og 10:00 står to steder i `sok.ts` | low | Konstantene ligger rett ved hverandre i samme fil, og testene for grensene feiler hvis de glir fra hverandre. | avvist |
| BH11 | Kodene G/B/R mangler etiketter i kontrakten | low | Kodene og rekkefølgen står i AD-17 og i epic-konteksten. Etikettene hører til `tekster.ts` (UI). | avvist |
| BH12 | Testhjelperne er kopiert i `tidssone.test.ts` | low | Hjelperne er små, og testen må stå alene i roten. | avvist |
| BH13 | Statusene spriker, specen mangler i diffen og `epic-1-context.md` er endret | false | Steg 5 synker sprint-status. Specen holdes bevisst utenfor diffen. Endringen i epic-konteksten er kompileringen i steg 1. | avvist |

## Design Notes

- Tidsvinduet er `[osloTilUtc(dato, start), + tilgjengeligMin · 60 000)`. Varigheten legges til i UTC, så en natt med sommertidsskifte gir riktig antall timer. Starttidene 06:00–22:00 treffer aldri hullet eller dobbelttimen kl. 02–03.
- Justeringsteksten bygges i `sok.ts`. Klokkeslettene er allerede 'HH:MM'-strenger, så ingen tall formateres, og AD-7s krav om `format.ts` slår ikke inn.
- `normaliserSok` får et Søk som allerede er validert. Sjekken er: dato er i morgen → uendret; dato er i dag → sjekk «etter 22:00», deretter passert tid; ellers → standard.

## Verification

**Commands:**
- `npm run lint` -- forventet: 0 feil
- `npm test` -- forventet: alle grønne, også `tidssone.test.ts`
- `npx tsc --noEmit` -- forventet: ren
- `grep -rl "@date-fns/tz" src` -- forventet: bare `src/kjerne/tid.ts`
