---
title: 'Story 1.5: Turdatasettet valideres og rutegeometrien konverteres'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '49fd69e4f82fc52064cf57ff9f9467875f33d05d'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Turdatasettet har ingen automatisk kontroll, og rutegeometrien finnes bare som GML i EPSG:25833 i en zip-fil. Feil i Turene eller Rutesegmentene når turgåeren uten at noe stopper dem, og 1.6–1.10 har ikke noe skjema å bygge på (FR-26–FR-28, AD-9, AD-10).

**Approach:** Et strengt Zod-skjema for Turdatasettet og et for rutegeometrien i `src/kjerne/turdata/`, og en ren `validerTurdatasett` som sjekker FR-27 mot geometrien. Et skript med proj4 pakker ut zip-fila og skriver `data/rutegeometri.geojson` deterministisk. Fila committes. Vitest kjører FR-27 mot de ekte dataene og mot ødelagte kopier.

## Boundaries & Constraints

**Always:**
- Feltnavnene i `data/turer-moldemarka.json` brukes uendret. Objektene er `z.strictObject`, og `mal_punkt { lat, lon, koordinatkilde }` og `adkomst` er valgfrie.
- FR-27 slår ut ved: ugyldig felt eller verdi, ukjent Rutesegment (nøkkel rutenummer + rutenavn), hull > 50 m mellom linjebitene, Startpunkt > 200 m fra Turens linjer (> Adkomst + 200 m når Turen har Adkomst), og høydemeter som verken er `kontrollert` (med `malt_m` innenfor 20 m) eller `anslag`. Turer med samme Startpunkt-navn har identisk Startpunkt.
- GeoJSON-fila er i WGS84 med `[lon, lat]`, ett `Feature<MultiLineString>` per Rutesegment med `properties { rutenummer, rutenavn }`. En linje som hører til flere Rutesegmenter, er med i hvert av dem. To kjøringer gir byte-identisk fil.
- Skriptet pakker ut zip-fila selv i minnet, uten midlertidige filer og uten nye avhengigheter utover `proj4@2.22.0` (dev, eksakt versjon).
- Kjernen leser `data/` med statiske importer, ikke med `fs`.

**Never:**
- Ingen `testdata/turer.json`, Turtid, filtrering eller lasting i skallet. Det kommer i 1.6 og 1.10.
- Ingen endring i `sok.ts`, `tid.ts`, `vaer/`, `visning/` eller lagreglene i `eslint.config.mjs`.
- Ingen endring i Turdatasettet uten et funn fra testen. Funn rettes eller begrunnes i `.logs/simon-friedl/issues.md`.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet | Feil |
|---|---|---|---|
| Ekte data | `data/turer-moldemarka.json` + `data/rutegeometri.geojson` | ingen avvik | – |
| Felt | `gradering: 'X'`, manglende `kilde`, ekstra felt, `lat: 95`, duplisert `id` | avvik `skjema` | sti peker på feltet |
| Ukjent segment | `1506_MM_0312` med rutenavn `Feil` | avvik `ukjent-rutesegment` med `turId` | – |
| Hull | Tur med to Rutesegmenter som ligger > 50 m fra hverandre | avvik `hull` med målt avstand | – |
| Startpunkt | flyttet ca. 300 m uten Adkomst; Adkomst redusert så avstand > lengde + 200 | avvik `startpunkt` | – |
| Høydemeter | `malt_m` 25 m fra `hoydemeter`; `status: 'ukjent'` | avvik `skjema` på `hoydemeter_kontroll` | – |
| Ulikt Startpunkt | samme navn, annen `lon` | avvik `ulikt-startpunkt` | – |
| Konvertering | GML-utdrag med én linje i to `FotruteInfo` | linjen i begge Featurene | annen `srsName` eller `srsDimension` kaster feil |

</frozen-after-approval>

## Code Map

- `data/turer-moldemarka.json` -- 12 Turer, 8 Startpunkter, 5 med `adkomst`. `retning` er `en_vei` (totalt = 2 × kilde), `tur_retur` eller `rundtur` (totalt = kilde). `hoydemeter_kontroll` er `{ status: 'kontrollert', malt_m }` eller `{ status: 'anslag' }`. `merknad` og `historie` finnes også.
- `data/raw/Friluftsliv_1506_Molde_25833_TurOgFriluftsruter_GML.zip` -- én GML-fil (1,7 MB). `gml:featureMember` med `app:senterlinje/gml:LineString/gml:posList` (Øst Nord), og ett eller flere `app:rutenummer`/`app:rutenavn` i `*RuteInfo`. 536 linjer, 105 Rutesegmenter, 40 linjer i flere. `1506_MM_0312` har to rutenavn. Ingen XML-entiteter.
- `src/kjerne/vaer/terskler.ts` -- mønsteret for statisk JSON-import fra `data/` og en tydelig feilmelding.
- `src/kjerne/visning/skjema.ts` -- zod 4-mønsteret med `z.strictObject` og `superRefine`.
- `vitest.config.mts` -- `include` dekker bare `src/**` og roten. Vite kan ikke importere `.geojson` uten en plugin.
- `tsconfig.json` -- `include: **/*.ts`, så `scripts/` typesjekkes.
- `README.md` -- får en seksjon om rutegeometrien.

## Tasks & Acceptance

**Execution:**
- [x] `package.json` -- `proj4` 2.22.0 i devDependencies og `"rutegeometri": "node scripts/konverter-rutegeometri.ts"` -- AD-10.
- [x] `scripts/konverter-rutegeometri.ts` -- eksporter `pakkUtGml(zip)`, `lesRutesegmenter(gml)` og `konverter(zip): string`. Kjøres som hovedmodul (`import.meta.main`): les zip-fila og skriv `data/rutegeometri.geojson` -- FR-28.
- [x] `data/rutegeometri.geojson` -- generert med `npm run rutegeometri` og committet.
- [x] `src/kjerne/turdata/skjema.ts` -- `TurSkjema`, `TurdatasettSkjema` og typene `Tur` og `Turdatasett` -- AD-9, FR-26.
- [x] `src/kjerne/turdata/rutegeometri.ts` -- `RutegeometriSkjema`, `type Rutegeometri` og `rutesegmentNokkel` -- AD-10.
- [x] `src/kjerne/turdata/geometri.ts` -- avstand i meter fra punkt til linje og største hull mellom linjebiter.
- [x] `src/kjerne/turdata/valider.ts` -- `validerTurdatasett(data: unknown, geometri: Rutegeometri): Avvik[]` -- FR-27.
- [x] `src/kjerne/turdata/valider.test.ts` og `geometri.test.ts` -- matriseradene for data, med ødelagte kopier via `structuredClone`.
- [x] `scripts/konverter-rutegeometri.test.ts` -- konverteringsradene, og at `konverter` på zip-fila gir den committede fila byte for byte.
- [x] `vitest.config.mts` og `src/types/geojson.d.ts` -- `scripts/**/*.test.ts` i `include`, en liten plugin som laster `*.geojson` som JSON, og `declare module "*.geojson"` med `unknown` som standardeksport.
- [x] `README.md` -- seksjonen «Rutegeometri»: kilde, `npm run rutegeometri`, at zip-fila pakkes ut av skriptet, og at fila committes.

**Acceptance Criteria:**
- Gitt endringene, når `npm run lint && npm test && npx tsc --noEmit` kjøres, så lykkes alle.
- Gitt `data/rutegeometri.geojson`, når `npm run rutegeometri` kjøres to ganger, så viser `git status` ingen endring i fila.

## Implementation Notes

- Utover specen: `merknad` er påkrevd, og `id` er kebab-case med små bokstaver. En Tur med ukjent Rutesegment får ikke sjekkene for hull og Startpunkt, så den får ingen følgefeil. En linje med samme Rutesegment to ganger står bare én gang i Featuren. Zip-utpakkingen sjekker også størrelse og CRC-32, og Zip64 avvises.
- Retting etter sjekken mot diffen: mønsteret for `*Info` fanget bare `*ruteInfo` med `\w`, så de 58 linjene med `SkiløypeInfo` ble telt som «uten rutenummer». Dermed manglet 7 Rutesegmenter. Mønsteret er nå `\p{Lu}[\p{L}\d_]*Info` med flagget `u`. En ny test sjekker at hvert rutenummer og rutenavn i GML-fila kommer med, og at ingen linje hoppes over. Fila har nå 105 Rutesegmenter (746 KB) og er byte-identisk over to kjøringer.
- `npm run rutegeometri` skriver advarselen `MODULE_TYPELESS_PACKAGE_JSON` fordi `package.json` mangler `"type"`. Den er ufarlig. `"type": "module"` er ikke lagt til, fordi det kan påvirke Next.js.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG). Før gjennomgangen fant sjekken mot diffen at 7 Rutesegmenter med `SkiløypeInfo` manglet. Det er rettet og står i Implementation Notes.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1 | Grensen på 50 m for hull er ikke låst. Den eneste testen har et hull på ca. 5 km. | medium | Forhåndsverifisert: med `MAKS_HULL_M` = 5000 er alt grønt. | patch |
| VG2 | Grensen på 100 m for ulike navn er bare testet ved 0 m | medium | Forhåndsverifisert: med grensen satt til 1 m er alt grønt. | patch |
| VG3 | Regelen mot duplikater i `RutegeometriSkjema` har ingen test | medium | Forhåndsverifisert: uten `superRefine` er alt grønt. Uten regelen vinner det siste duplikatet i `Map`. | patch |
| VG4 | `id`-format, påkrevd `merknad` og `oppdatert` som dato har ingen negative tester | medium | Forhåndsverifisert: hver løsning er grønn. Regler som er lagt til, skal være låst. | patch |
| VG5 | Høydegrensen kan drive opp til 24 m uten at noen test feiler | low | Forhåndsverifisert. Retting med ett testtilfelle ved 21 m. | patch |
| BH5 | Testene bruker faste posisjoner (`turer.11`) i datasettet | low | Bekreftet: testene velter hvis Turene sorteres på nytt, uten at valideringen er feil. Direkte retting. | patch |
| BH8 | Vitest-pluginen limer inn rå tekst som JS | low | Bekreftet: en ødelagt fil gir en uklar syntaksfeil, og tekst som ikke er JSON, blir kjørt. Retting på én linje med `JSON.parse`. | patch |
| VG6, BH6 | Zip64, feil størrelse, flere `.gml`-filer, ukjent entitet, manglende `srsName` og `*Info` med feil antall felt er ikke testet | low | Bekreftet. Grenene er forsvar i et engangsskript med fast input. CRC-sjekken og byte-testen dekker den ekte veien. | defer |
| BH1, EC10 | `storsteHull` gir et falskt hull når to linjer krysser hverandre uten endepunkt i nærheten | low | Bekreftet for X-kryss, men Turrutebasen deler linjene i kryss, og de ekte dataene gir 0–9 m. Feilen er høylytt (testen blir rød), ikke stille. Rettingen krever kryss-sjekk for alle par av linjestykker. | avvist |
| BH2 | Spec og sprint-status er uenige om status | false | `review` settes i sprint-status når steg 5 presenterer. Rettingen før gjennomgangen er ført i Implementation Notes. | avvist |
| BH3 | Diffen mangler `rutegeometri.geojson`, `package-lock.json` og `epic-2-context.md` | false | De to første er genererte og er sjekket hver for seg (sha og `npm ls`). `epic-2-context.md` er ikke en del av denne storyen. | avvist |
| BH4 | Bytt til `.mts` for å bli kvitt Node-advarselen | low | Advarselen er ufarlig. Navnet `.ts` er gitt av AD-10. | avvist |
| BH7, EC6, EC7 | Zip-leseren mangler grensesjekker, flaggsjekker, `__MACOSX` og en grense for utpakking | low | Input er en fast fil i repoet. Feil gir en høylytt exception. Det krever nye vakter. | avvist |
| BH9 | Samme Rutesegment to ganger i én Tur godtas | low | Bekreftet, men duplikatet endrer ikke hull eller avstand. Det krever en ny regel. | avvist |
| BH10 | `mal_punkt` sjekkes ikke mot ruta | low | Ingen Tur har `mal_punkt` ennå, og FR-27 krever det ikke. | avvist |
| BH11 | Navnene `Linje` og `Rutesegment` brukes for to ulike typer hver | low | De ligger i separate moduler (skriptet mot kjernen), og ingen kaller blander dem. | avvist |
| BH12 | Feilen for duplisert `id` peker ikke på den første Turen | low | Kosmetisk. Stien peker på duplikatet. | avvist |
| BH13 | 746 KB GeoJSON havner i bunten | low | Fila importeres bare av skallet på serveren (AD-10), aldri av nettleseren. | avvist |
| BH14, EC9 | CDATA i rutenavn håndteres ikke | low | GML-fila har ingen CDATA. Ny gren for input som ikke finnes. | avvist |
| EC1, EC4 | Flere `senterlinje` eller `*Info` med attributter i ett objekt | low | Finnes ikke i GML-fila. Testen for fullstendighet fanger at linjer faller bort. | avvist |
| EC2, EC3, EC8 | Tomt rutenavn, ingen `featureMember` og NaN fra proj4 gir en ugyldig fil | false | `RutegeometriSkjema.parse` i `valider.test.ts` og byte-testen gjør dette til en rød test, ikke en stille feil. | avvist |
| EC5 | `utenRutenummer > 0` blir bare logget | false | Den nye testen for fullstendighet krever 0 linjer uten rutenummer i de ekte dataene. | avvist |
| EC11 | En tom `Linje` gir TypeError | false | `LinjeSkjema` krever minst to punkter, og kjernen får bare validerte linjer. | avvist |

## Design Notes

- `Avvik = { regel: 'skjema' | 'ukjent-rutesegment' | 'hull' | 'startpunkt' | 'ulikt-startpunkt', turId?, melding }`. Skjemafeil (også høydemeter) blir `skjema` med zod-stien i meldingen. Geometrisjekkene kjøres bare når skjemaet godtar dataene.
- Skjemaet håndhever også at `id` er unik, at `gradering_tekst` passer til `gradering` (G Enkel, B Middels, R Krevende), at `lengde_km_totalt` stemmer med `retning` (toleranse 0,005), og at `kilde` er http eller https.
- Avstand: lokal ekvirektangulær projeksjon rundt punktet, nøyaktig nok under 10 km. Hull: linjebitene er noder, kanten er minste avstand fra et endepunkt til den andre linja (begge veier), og største kant i minste spenntre må være ≤ 50 m. Forhåndssjekken ga største hull 9,3 m (Moldedalen), og Startpunkt-avstandene 2–1032 m holder seg innenfor grensene.
- Samme sted: like navn krever identisk Startpunkt, og to ulike navn under 100 m fra hverandre er også avvik. De nærmeste ulike Startpunktene ligger ca. 390 m fra hverandre.
- Skriptet er deterministisk: Featurene sorteres på rutenummer og så rutenavn i kodepunktrekkefølge, linjene står i GML-rekkefølge, koordinatene rundes til 6 desimaler, og fila har én Feature per linje og linjeskift til slutt. Linjer uten rutenummer hoppes over, og antallet skrives ut.
- Zip: les sentralkatalogen og pakk ut med `zlib.inflateRawSync`. Metode 0 og 8 støttes, alt annet kaster feil.
- 1.10 må legge `turbopack.rules['*.geojson'] = { type: 'json' }` i `next.config.ts` når skallet importerer fila.

## Verification

**Commands:**
- `npm run lint` -- forventet: 0 feil
- `npm test` -- forventet: alle grønne
- `npx tsc --noEmit` -- forventet: ren
- `npm run rutegeometri && git status --porcelain data/rutegeometri.geojson` -- forventet: tom etter commit
