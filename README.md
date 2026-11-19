# G85 — Irobot

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Simon Friedl

## Kom i gang

Du trenger Node.js 26 (`"engines": { "node": "26.x" }` i `package.json`) og npm. Repoet har ingen `.nvmrc`.

```sh
npm install && npm run dev
```

Åpne så http://localhost:3000.

- Du trenger ingen `.env`, ingen `ANTHROPIC_API_KEY` og ingen andre nøkler eller betalte kontoer (NFR-3). Uten språkmodellnøkkel virker alt unntatt Språkmodellteksten, og den er ikke bygget ennå (Epic 4).
- `.env.example` viser den eneste valgfrie variabelen, `ANTHROPIC_API_KEY`. Den leses bare på serveren. Legg aldri en ekte nøkkel i repoet.
- Produksjonsbygget startes med `npm run build && npm start`.
- Appen henter ikke Værmeldingen fra MET ennå (Epic 2), så Resultatet sier «Været er ikke vurdert.» både med og uten Demomodus.

## Demomodus

Åpne appen med `?demo=uten-vaer`, for eksempel http://localhost:3000/?demo=uten-vaer eller https://g85-friedl.vercel.app/?demo=uten-vaer.

- Appen bruker da et fast «nå», man. 9. nov. 2026 kl. 13:30, i stedet for klokka, og Værscenarioet «Værmeldingen mangler» i stedet for MET (NFR-11). Turene kommer fra det ekte Turdatasettet.
- Merket «DEMOMODUS» øverst viser Værscenarioet og «nå». Ellers ser alt ut som uten Demomodus.
- Med standard-Søket (2 t, Middels) får du tre Turforslag. Med Tilgjengelig tid 15 min passer ingen Tur, og du får Alternativet med den korteste Turen.
- En ukjent demo-ID, for eksempel `?demo=finnes-ikke`, gir et panel med lenker til de gyldige demoene.
- Værscenarioene for brukerreisene UJ-1–UJ-3 kommer i Epic 2.

## Tester

```sh
npm test               # Vitest: regelkjernen, kontraktene, Turdatasettet, lagreglene og UI-et
npm run lint           # ESLint, med lagreglene
npx tsc --noEmit       # typesjekk
npm run test:e2e       # Playwright mot utviklingsserveren
CI=1 npx playwright test   # Playwright mot produksjonsbygget, som i CI
```

- Første gang Playwright kjøres, må Chromium installeres: `npx playwright install chromium`.
- `npm run test:e2e` starter `next dev` på port 3100, eller bruker en server som allerede kjører der. Med `CI=1` bygges appen med `npm run build` og startes med `npm start`.
- Ingen test kaller MET eller Anthropic. Playwright-testene går mot den lokale serveren. De fleste bruker `?demo=uten-vaer`, mens `forside.spec.ts` og `publisering.spec.ts` åpner `/` uten demo. Uten demo mangler Værmeldingen også, fordi MET ikke er koblet til ennå.
- `e2e/sluttsjekk.spec.ts` er sjekklisten i SM-4 ved 360, 768 og 1440 px. Resultatene fra sluttsjekken av Epic 1 står i `_bmad-output/implementation-artifacts/epic-1-sluttsjekk.md`.
- `npm run svartid` måler svartiden (NFR-5) mot Production med «Fast 4G»-struping. `npm run svartid -- <url>` måler mot en annen server. Skriptet trenger Chromium fra Playwright.

## Publisert app

Appen er publisert på Vercel: **https://g85-friedl.vercel.app**

- Push til `main` publiseres til Production. Push til andre greiner gir en Preview-URL.
- Vercels egen Git-kobling deployer. CI-workflowen deployer ikke.
- Funksjonene kjører i regionen `arn1` (Stockholm), satt i `vercel.json`. Siden rendres dynamisk per forespørsel.
- Tilgang (avklart 2026-11-18): Vercel-appen var allerede installert i GitHub-organisasjonen IBE160-2026 med tilgang til alle repoer, så ingen godkjenning trengtes. Reserven med deploy fra GitHub Actions og `VERCEL_TOKEN` brukes ikke.

## Rutegeometri og konverteringsskriptet

Rutene på kartet kommer fra Kartverkets Turrutebase for Molde («Tur- og friluftsruter», GML i EPSG:25833), lastet ned fra Geonorge til `data/raw/Friluftsliv_1506_Molde_25833_TurOgFriluftsruter_GML.zip`.

- `npm run rutegeometri` kjører konverteringsskriptet, `scripts/konverter-rutegeometri.ts`. Skriptet pakker ut GML-fila fra zip-fila selv, i minnet, så du trenger ikke pakke den ut først.
- Senterlinjene regnes om til WGS84 med proj4 og skrives til `data/rutegeometri.geojson`, med ett `Feature<MultiLineString>` per Rutesegment (rutenummer + rutenavn) og koordinater som `[lon, lat]`. En linje som hører til flere Rutesegmenter, er med i hvert av dem. Linjer uten rutenummer hoppes over.
- Fila committes, og kjernen leser den med en statisk import, aldri med `fs`. To kjøringer gir byte-identisk fil. En test sjekker at skriptet gir den committede fila, så kjør skriptet og commit fila på nytt hvis zip-fila byttes.
- `src/kjerne/turdata/valider.ts` sjekker Turdatasettet (`data/turer-moldemarka.json`) mot rutegeometrien (FR-27), og `npm test` feiler ved avvik.
