---
title: 'Story 1.10: Serveren svarer på Søket'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '4d2aac4a8244704a1ceb681ac49ec794524a4de9'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-9-regeltekst-og-innholdet-i-turkortet.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kjernen kan lage Turkort (1.9), men ingen server tar imot et Søk. UI-storyene (1.11–1.14) trenger `POST /api/sok`, som svarer med en Resultatvisning, og `lagSidedata(demoId)` for siden (AR-3, AR-7, AD-2–AD-5, AD-13, AD-17, AD-18).

**Approach:** Bygg skallet i `src/server/`:
- `miljo.ts` velger klokke og værkilde ut fra demo-ID-en.
- `vaer/scenarioer.ts` er registeret med `uten-vaer`.
- `sok.ts` orkestrerer ett Søk: `normaliserSok`, `soltider`, `anbefal` og `lagVisning`.
- `side.ts` lager sidedataene.
- `src/app/api/sok/route.ts` er det tynne endepunktet.

All tekst og alle regler ligger i kjernen. I Epic 1 gir værkilden alltid `null`, så Resultatet følger FR-13.

## Decisions

- **Overskrift** følger EXPERIENCE.md › State Patterns: «{Ett|To|Tre} Turforslag som passer tiden din» når Værmeldingen mangler, og «Ingen Tur passer {Tilgjengelig tid}.» når ingen Tur passer. AC-eksempelet «Tre Turer som passer tiden din» avviker fra UX-dokumentet, og UX-dokumentet gjelder. Variantene for vær («som passer nå», «i dårlig vær») kommer i 2.9.
- **`liveTekst`** er overskriften.
- **`dittSok`:**
  - `turdag` er «I dag, man. 9. nov.» eller «I morgen, tir. 10. nov.»
  - `starttidspunkt` er «13:30»
  - `tilgjengeligTid` er «2 t»
  - `vanskelighetsgrad` er «Enkel», «Middels» eller «Krevende»
  - `opplevelsespreferanser` er de valgte i rekkefølgen utsikt, vann
- **`vaer`** er `{ type: 'mangler', tekst: 'Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.' }`.
- **`passerMedTekst`** er «Med {kvarterOpp(korteste Turtid)} eller mer passer minst én Tur.». Ved 16 min blir det «Med 30 min eller mer …».
- **`resultatId`** lages med `crypto.randomUUID()` i skallet.
- **Scenarioet `uten-vaer`:** `scenario.json` er `{ "na": "2026-11-09T13:30:00+01:00", "beskrivelse": "Værmeldingen mangler", "vaer": "mangler" }`.
- **Sidedata:**
  - `turdager`: i dag og i morgen, med startvalg 06:00–22:00 hvert kvarter. Valg som har passert, er låst, og «I dag» er låst etter 22:00.
  - `tilgjengeligTid`: 15–300 min hvert kvarter, med etikett fra `format.varighet`.
  - `startpunkter`: unike Startpunkter fra Turdatasettet.
  - `telletekst`: «12 Turer fra 8 Startpunkter».
  - `demo`: `{ id, beskrivelse, naTekst: 'man. 9. nov. 13:30' }` eller `null`.

## Boundaries & Constraints

**Always:**
- Klokka leses bare i `miljo.ts`.
- Forespørselen valideres strengt med `SokSkjema`.
- Alle svar valideres mot skjemaet i tester.
- Ingen snake_case-felt går ut av serveren.
- Turdatasettet og rutegeometrien importeres statisk. `next.config.ts` får `turbopack.rules['*.geojson'] = { type: 'json' }` (`TurbopackModuleType` i Next 16.4).

**Never:**
- Ingen MET-adapter (2.4).
- Ingen språkmodell (Epic 4).
- Ingen andre scenarioer enn `uten-vaer` (2.3).
- Ingen UI-endring utover det `page.tsx` trenger for å bygge.
- Ingen test kaller MET eller Anthropic.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-1 uten vær | `?demo=uten-vaer`, Søk 2026-11-09 13:30, 120 min, B, utsikt | 200, overskrift «Tre Turforslag som passer tiden din», tre kort med `kart.nummer` 1–3, `vaer.type` `mangler` |
| UJ-3 | samme, 15 min | 200, `utfall.type` `kortesteTur`, Storlihytta fra Vardeveien, `passerMedTekst` «Med 30 min eller mer passer minst én Tur.», overskrift «Ingen Tur passer 15 min.» |
| Passert tid | `uten-vaer`, start 12:00 | 200, `sok.start` «13:30» og `justering` «Flyttet til 13:30, fordi 12:00 har passert.» |
| Ugyldig Søk | ekstra felt eller start «13:10» | 400 `{ feil: 'ugyldig-sok', detaljer: [{ sti, melding }] }` |
| Ukjent demo | `?demo=finnes-ikke` | 400 `{ feil: 'ukjent-demo', gyldigeDemoIder: ['uten-vaer'] }` |
| Uventet feil | kjernen kaster | 500, med `console.error` |
| Uten demo | ingen `?demo` | systemklokke, værkilde `null`, Resultat etter FR-13 |
| Sidedata | `lagSidedata('uten-vaer')` og `lagSidedata(null)` | validerer mot `SidedataSkjema`. Ukjent demo gir `UkjentDemoFeil`. |

</frozen-after-approval>

## Implementation Notes

- **Nye filer:**
  - `src/server/` (`miljo.ts`, `data.ts`, `sok.ts`, `side.ts` og `vaer/scenarioer.ts`)
  - `src/app/api/sok/route.ts`
  - `src/kjerne/visning/lag-visning.ts` og `lag-sidedata.ts`
  - `data/vaerscenarioer/uten-vaer/scenario.json`
  - `e2e/api-sok.spec.ts`
- **`byggSidedata`** ligger i kjernen, fordi låsene på Starttidspunkt er regler. `sok.ts` eksporterer konstantene og `erIDagLast` og `erPassert`, så skjemaet og normaliseringen ikke kan gli fra hverandre.
- **`format.ts`** har fått `dag` og `tallord`, og `tid.ts` har fått `ukedag`. Datoer som ikke finnes, kaster.
- **Next-oppgradering:** `next build` med Next 16.4.3 stoppet annenhver gang med `SecurityFatalError`. Simon valgte å oppgradere til 16.4.6, i en egen commit (`187d7a4`).
- **`?demo=` uten verdi** gir `ukjent-demo`. Meldingene i `ugyldig-sok` er Zods standardtekster, som bare utviklere ser.

## Code Map

- `src/kjerne/sok.ts` -- `SokSkjema`, `normaliserSok(sok, na)` og `lagStandardSok(na)`.
- `src/kjerne/anbefaling.ts` -- `anbefal(turer, sok, soltider)`.
- `src/kjerne/turkort.ts`, `regeltekst.ts` og `format.ts` (1.9) -- `lagTurkort` og formatering. Utvid `format.ts` med dagtekst («man. 9. nov.») og tallord om de mangler.
- `src/kjerne/sol.ts` -- `soltider(dato)`. Bygg `Soltider` for Turdagen og dagen etter (AD-11).
- `src/kjerne/tid.ts` -- `osloDato`, `leggTilDager`, `osloTilUtc` og `kvarterOpp`.
- `src/kjerne/visning/skjema.ts`, `sidedata.ts` og `feil.ts` -- skjemaene for svar og feil. De endres ikke.
- `src/kjerne/turdata/skjema.ts` og `rutegeometri.ts` -- skjemaene for `data/turer-moldemarka.json` og `data/rutegeometri.geojson`. Valideres én gang ved import i `src/server/data.ts`.
- `eslint.config.mjs` -- lagreglene:
  - `src/server/` importerer ikke `ui` eller `app`.
  - `src/app/api/` importerer ikke `ui`.
  - bare `page.tsx` importerer `src/server/side`.
- `vitest.config.mts` -- har geojson-pluginen allerede.
- `next.config.ts` -- skal få regelen for `.geojson`.

## Tasks & Acceptance

**Execution:**
- [x] `data/vaerscenarioer/uten-vaer/scenario.json` og `src/server/vaer/scenarioer.ts` -- registeret med Zod-skjema for scenarioet.
- [x] `src/server/miljo.ts` -- `lesDemoId(url)` og `lagMiljo(demoId)`, som gir `{ na, vaerkilde, demo }` eller `UkjentDemoFeil`.
- [x] `src/server/data.ts` -- validert Turdatasett og validert rutegeometri.
- [x] `src/kjerne/visning/lag-visning.ts` (+ test) -- `lagVisning(...)` gir `Resultatvisning` med overskrift, `dittSok`, `liveTekst`, `vaer` og `utfall`.
- [x] `src/server/sok.ts` -- `svarPaSok(sok, miljo)` orkestrerer og validerer svaret mot `ResultatvisningSkjema`.
- [x] `src/server/side.ts` -- `lagSidedata(demoId)`.
- [x] `src/app/api/sok/route.ts` -- POST: 200, 400 eller 500 etter matrisen.
- [x] `next.config.ts` -- regelen for `.geojson`.
- [x] Tester:
  - kontrakttest for hver demo-ID, som kaller `POST` direkte
  - hver rad i matrisen
  - sidedata
  - `npm run build` er grønt

**Acceptance Criteria:**
- Gitt `npm run build`, når appen bygges, så lykkes bygget med de statiske importene av datasettene.
- Gitt et svar fra `/api/sok`, når det serialiseres, så har det ingen nøkler med `_`.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `npm run build` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG). Gjennomgangen stoppet midt i fordi bruksgrensen ble nådd, og fortsatte etter at grensen var nullstilt.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1 | `POST /api/sok` og regelen for `*.geojson` i Turbopack kjøres aldri i den ekte Next-serveren | medium | Bekreftet. Vitest bruker sin egen plugin, og ingen e2e-test kaller API-et. Ny Playwright-test mot `/api/sok`. | patch |
| VG-a, EC1, EC2, BH1 | `dag()` og `ukedag()` godtar datoer som ikke finnes, som 30. feb., og gir feil ukedag | low | Bekreftet mot doc-kommentaren («Kaster for en ugyldig dato»). Kan ikke nås i dag. Sjekk tur-retur og tester. | patch |
| BH10 | `tallord(0)` gir «null», som ville gitt «Null Turforslag» | low | Bekreftet. Gyldig område er 1–10, og funksjonen kaster utenfor. | patch |
| BH9 | `turdagTekst` har en gren som ikke kan nås, for andre datoer enn i dag og i morgen | low | Bekreftet. Grenen kaster nå. | patch |
| BH6 | `lag-sidedata.ts` definerer konstantene og regelen for passert tid på nytt, ved siden av `sok.ts` | medium | Bekreftet. Skjemaet og normaliseringen kan gli fra hverandre uten at noen test merker det. Konstantene og regelen deles nå, og det er lagt til en test for sommertidsskiftet. | patch |
| BH5 | `lagMiljo` ignorerer `scenario.vaer` | low | Bekreftet. En ny verdi i 2.3 ville stille gitt «mangler». `switch` som dekker alle verdiene. | patch |
| BH11 | `side.test.ts` bruker den ekte klokka | low | Bekreftet. Bruker nå faste tidsfunksjoner. | patch |
| BH7 | Testene skriver `["uten-vaer"]` direkte | low | Bekreftet. Brekker når 2.3 legger til scenarioer. Bruker nå `DEMO_IDER`. | patch |
| BH3 | 500-svaret har ikke testet innhold | low | Bekreftet. Testen sjekker nå at kroppen er tom. | patch |
| EC3 | `passerMedTekst` kan foreslå over 5 t | false | Alle Vanskelighetsgrader omfatter Enkel, og korteste Tur er 16 min. | avvist |
| EC4, BH10b | Tomt `forslag` gir «Null Turforslag» | false | `anbefal` lager Turforslag bare når minst én Tur passer. Dekket av `tallord` som kaster. | avvist |
| EC5, BH12 | Startpunkter slås sammen på navn alene | false | FR-27-valideringen krever samme koordinater for samme navn. | avvist |
| EC6 | Stor forespørselskropp leses før validering | low | Vercel begrenser størrelsen på kroppen. Det ville vært en ny vakt. | avvist |
| EC7 | `lagSidedata` logger ikke før den kaster | low | Next logger feil når siden rendres. Det ville vært en ny vakt. | avvist |
| EC8, BH4 | Meldingene i `ugyldig-sok` er Zods engelske standardtekster, og skallet har én hardkodet melding | low | `detaljer` vises aldri til brukeren. Ugyldig Søk gir Kontaktfeil-kortet (Consistency Conventions). | avvist |
| BH2 | En ødelagt datafil feiler når modulen lastes, utenfor `try` i ruten | low | Datafilene er committet og testet i `valider.test.ts`. Next svarer 500 også da. | avvist |
| BH8 | `liveTekst` melder ikke justeringen | false | EXPERIENCE.md › Accessibility: overskriften meldes. Justeringen står som hjelpetekst under Starttidspunkt (UX-DR12). | avvist |
