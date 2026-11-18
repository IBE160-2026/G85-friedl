# G85 — Irobot

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Simon Friedl

## Publisert app

Appen er publisert på Vercel: **https://g85-friedl.vercel.app**

- Push til `main` publiseres til Production. Push til andre greiner gir en Preview-URL.
- Vercels egen Git-kobling deployer. CI-workflowen deployer ikke.
- Funksjonene kjører i regionen `arn1` (Stockholm), satt i `vercel.json`. Siden rendres dynamisk per forespørsel.
- Tilgang (avklart 2026-11-18): Vercel-appen var allerede installert i GitHub-organisasjonen IBE160-2026 med tilgang til alle repoer, så ingen godkjenning trengtes. Reserven med deploy fra GitHub Actions og `VERCEL_TOKEN` brukes ikke.

## Rutegeometri

Rutene på kartet kommer fra Kartverkets Turrutebase for Molde («Tur- og friluftsruter», GML i EPSG:25833), lastet ned fra Geonorge til `data/raw/Friluftsliv_1506_Molde_25833_TurOgFriluftsruter_GML.zip`.

- `npm run rutegeometri` kjører `scripts/konverter-rutegeometri.ts`. Skriptet pakker ut GML-fila fra zip-fila selv, i minnet, så du trenger ikke pakke den ut først.
- Senterlinjene regnes om til WGS84 med proj4 og skrives til `data/rutegeometri.geojson`, med ett `Feature<MultiLineString>` per Rutesegment (rutenummer + rutenavn) og koordinater som `[lon, lat]`. En linje som hører til flere Rutesegmenter, er med i hvert av dem. Linjer uten rutenummer hoppes over.
- Fila committes, og kjernen leser den med en statisk import, aldri med `fs`. To kjøringer gir byte-identisk fil. En test sjekker at skriptet gir den committede fila, så kjør skriptet og commit fila på nytt hvis zip-fila byttes.
- `src/kjerne/turdata/valider.ts` sjekker Turdatasettet (`data/turer-moldemarka.json`) mot rutegeometrien (FR-27), og `npm test` feiler ved avvik.
