# G85 — Irobot

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Simon Friedl

## Kom i gang

Du trenger Node.js 26 (`"engines": { "node": "26.x" }` i `package.json`) og npm. Repoet har ingen `.nvmrc`.

```sh
npm install
npm run dev
```

Åpne så http://localhost:3000. Prøv for eksempel http://localhost:3000/?demo=uj-1 (se «Demomodus» under).

- Appen virker uten noen nøkler, uten `.env`-fil og uten betalte kontoer (NFR-3). Det eneste du mister uten nøkkel, er Språkmodellteksten. Da er Begrunnelsen Regelteksten.
- Produksjonsbygget startes med `npm run build && npm start`.
- `npm install` kan advare om at `fsevents` og `unrs-resolver` har install-skript som ikke er godkjent (`allowScripts`), og `npm audit` melder 7 moderate funn i `minimatch` (bare utviklingsavhengigheter). Begge deler kan ignoreres. Appen, ESLint og Vitest virker uten noe mer.

## API-nøkler og eksterne tjenester

| Tjeneste | Brukes til | Nøkkel | Hva du må gjøre |
|---|---|---|---|
| Anthropic (Claude Haiku) | Språkmodellteksten, altså Begrunnelsen i mer naturlig språk | `ANTHROPIC_API_KEY`, **valgfri** | Ingenting for å kjøre appen. Se under hvis du vil prøve Språkmodellteksten. |
| MET Norway (Locationforecast, samme data som Yr) | Værmeldingen for Værpunktet (400 moh) | Ingen | Ingenting. Serveren sender en identifiserende `User-Agent`, som MET krever. Den må ha internett. |
| Kartverket (`cache.kartverket.no`) | Bakgrunnskartet (gråtonekart) | Ingen | Ingenting. Nettleseren henter kartflisene direkte og må ha internett. |

### `ANTHROPIC_API_KEY` (valgfri)

1. Lag en nøkkel i Anthropic-konsollen: https://console.anthropic.com/. Velg menyen **API Keys** (**Nøkler** på norsk) og **Create Key**, eller trykk **Hent API-nøkkel** på forsiden.
   - API-et krever forhåndskjøpt kreditt, minst 5 USD, under **Billing**. Uten kreditt avviser API-et kallene, og appen viser Regelteksten i stedet for Språkmodellteksten.
   - Et Claude Pro-abonnement dekker ikke API-bruk. API-et faktureres for seg.
   - Sett gjerne en lav utgiftsgrense i konsollen.
2. Kopier eksempelfila og lim inn nøkkelen:
   ```sh
   cp .env.example .env.local
   ```
   ```sh
   # .env.local
   ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Start `npm run dev` på nytt. Next.js leser `.env.local` bare ved oppstart.

- `.env.local` er git-ignorert (`.env.*` i `.gitignore`). Commit aldri en ekte nøkkel. `.env.example` er den eneste env-fila i repoet, og verdien der er tom.
- Gi aldri nøkkelen `NEXT_PUBLIC_`-prefiks. Da havner den i JavaScript-koden som sendes til nettleseren. Den leses bare på serveren.
- **Demomodus virker uten nøkkel.** Med `?demo=` brukes alltid en falsk språkmodell, også når nøkkelen er satt, så demoene gir samme resultat hver gang.
- Uten nøkkel, eller med en tom verdi, virker alt annet som før.
- På Vercel settes nøkkelen som miljøvariabel for Production (Settings → Environment Variables).

### Uten internett

- Uten kontakt med MET står «Været er ikke vurdert.» i Resultatet, og Turforslagene vises likevel. Demomodus bruker lagrede Værscenarioer og trenger ikke MET.
- Uten kontakt med Kartverket blir kartet papirfarget med ruter og Startpunkter, og teksten «Bakgrunnskartet kunne ikke lastes.» vises.
- Kartverket får brukerens IP-adresse og hvilket kartutsnitt som vises. Ellers kontakter nettleseren bare appens egen server (AR-20).

## Språkmodellteksten

Med `ANTHROPIC_API_KEY` satt på serveren skriver Claude Haiku (`claude-haiku-5-5`) Begrunnelsen om i mer naturlig språk. Teksten brukes bare hvis den består kontrollen og kommer innen 5 s. Ellers står Regelteksten (FR-22).

- Nøkkelen er valgfri, og oppsettet står under «API-nøkler og eksterne tjenester». Uten den er Begrunnelsen Regelteksten.
- Testene og CI trenger ikke nøkkelen. Playwright starter serveren med en tom `ANTHROPIC_API_KEY`. En dev-server som allerede kjører på port 3100, brukes som den er.
- `src/server/sprakmodell/claude.ts` er eneste fil som bruker `@anthropic-ai/sdk`, og ESLint sperrer pakken andre steder. Ingen test kaller Anthropic.

## Demomodus

Med `?demo=<id>` bruker appen et fast «nå» i stedet for klokka, og et lagret Værscenario i stedet for MET (NFR-11). Turene kommer fra det ekte Turdatasettet. Merket «DEMOMODUS» øverst viser Værscenarioet og «nå». Ellers ser alt ut som uten Demomodus.

Brukerreisene vises slik. Lenkene går til Production, og lokalt bytter du ut domenet med `http://localhost:3000`.

| Demo | «Nå» | Søk | Det du ser |
|---|---|---|---|
| [`?demo=uj-1`](https://g85-friedl.vercel.app/?demo=uj-1) | man. 9. nov. kl. 13:30 | I dag 13:30, 2 t, Middels, utsikt | **Godt vær (UJ-1).** Værsammendraget med «Værklasse god», klarvær, 3–5 °C, og tre Turforslag med Regeltekst. |
| [`?demo=uj-2`](https://g85-friedl.vercel.app/?demo=uj-2) | søn. 8. nov. kl. 20:00 | I morgen 10:00, 3 t, Krevende, utsikt | **Dårlig vær (UJ-2).** Værvarslingen med nedbør og vind, lavtliggende Turer øverst, og Bedre tidsvindu-boksen «I morgen fra kl. 14:00 er Værklassen god.». «Bruk 14:00» gir et nytt Resultat. |
| [`?demo=uj-3`](https://g85-friedl.vercel.app/?demo=uj-3) | lør. 14. nov. kl. 10:00 | I dag 10:00, 2 t, Middels | **Frarådet (UJ-3).** Frarådet-kortet med sterk kuling og ingen Turforslag, og Bedre tidsvindu-kortet. «Bruk i morgen 11:00» gir tre Turforslag for søn. 15. nov. 11:00. |

- Skjemaet fyller ut Turdag og Starttidspunkt ut fra «nå». For UJ-2 velger du «I morgen», og Starttidspunktet blir 10:00. For UJ-1 og UJ-2 krysser du av for utsikt. Velg ellers Tilgjengelig tid og Vanskelighetsgrad som i tabellen, og trykk «Finn tur».
- `?demo=uten-vaer` (man. 9. nov. kl. 13:30, Værscenarioet «Værmeldingen mangler») viser Resultatet uten Værmelding. Med standard-Søket (2 t, Middels) får du tre Turforslag og «Været er ikke vurdert.». Med Tilgjengelig tid 15 min passer ingen Tur, og du får Alternativet med den korteste Turen.
- `?demo=ingen-bedre` (man. 9. nov. kl. 10:00) har dårlig vær i dag og i morgen, og Bedre tidsvindu-boksen sier at det ikke finnes noe bedre tidsvindu.
- En ukjent demo-ID, for eksempel `?demo=finnes-ikke`, gir et panel med lenker til de gyldige demoene.

## Tester

```sh
npm test               # Vitest: regelkjernen, kontraktene, Turdatasettet, lagreglene og UI-et
npm run lint           # ESLint, med lagreglene
npx next typegen && npx tsc --noEmit   # typesjekk
npm run test:e2e       # Playwright mot utviklingsserveren
CI=1 npx playwright test   # Playwright mot produksjonsbygget, som i CI
```

- `next typegen` lager typene `PageProps` og `LayoutProps`. På en ny klone finnes de ikke før `next dev`, `next build` eller `next typegen` har kjørt, og da feiler `tsc` med «Cannot find name 'PageProps'».
- Første gang Playwright kjøres, må Chromium installeres: `npx playwright install chromium`.
- `npm run test:e2e` starter `next dev` på port 3100, eller bruker en server som allerede kjører der. Med `CI=1` bygges appen med `npm run build` og startes med `npm start`.
- Ingen test kaller MET, Anthropic eller Kartverket. Playwright-testene går mot den lokale serveren med `?demo=`, og `e2e/fixtures.ts` stubber kartflisene fra `cache.kartverket.no` med en grå PNG. Vitest-testene for MET-klienten bruker en falsk `fetch`.
- `e2e/sluttsjekk.spec.ts` er sjekklisten i SM-4 ved 360, 768 og 1440 px. Resultatene står i `_bmad-output/implementation-artifacts/epic-1-sluttsjekk.md` og `epic-2-sluttsjekk.md`.
- `npm run svartid` måler svartiden (NFR-5) mot Production med «Fast 4G»-struping, med `?demo=uten-vaer`. `npm run svartid -- https://g85-friedl.vercel.app/` måler med ekte MET, og `npm run svartid -- <url>` mot en annen server. Skriptet trenger Chromium fra Playwright.

## Kalibreringen av Værtersklene

Værklassen (god, middels, dårlig, frarådet) settes av tersklene for temperatur, nedbør, vind og værsymbol i `data/vaerterskler.json`. Både appen og kalibreringsskriptet leser den fila (AD-8).

- Tersklene ble kalibrert 10.–17. november 2026 (PRD §10, spørsmål 1). `scripts/kalibrering_vaerlogg.py` hentet Værmeldingen fra MET for to Tidsvinduer om dagen i 7 dager. Vi vurderte selv hvert Tidsvindu uten å se Værklassen.
- Resultatet var 1 avvik av 14 vurderte Tidsvinduer (10. nov. formiddag: middels, men vi ville valgt en lav Tur). Grensen var 2 avvik, så startverdiene i PRD §4.2 er beholdt.
- Loggen og fremgangsmåten står i `_bmad-output/planning-artifacts/kalibrering/` (`vaerlogg.csv` og `README.md`).
- `python3 scripts/kalibrering_vaerlogg.py --oppsummer` teller avvikene på nytt. `--selvtest` sjekker skriptets klassifisering mot `testdata/vaerklasse-fasit.json` uten å kalle MET, og CI kjører den ved hver push. Skriptet bruker bare Pythons standardbibliotek (3.9+).
- Endres tersklene, endrer du `data/vaerterskler.json` og fasiten sammen, og kjører `--selvtest` og `npm test`.

## Publisert app

Appen er publisert på Vercel: **https://g85-friedl.vercel.app**

- Push til `main` publiseres til Production. Push til andre greiner gir en Preview-URL.
- Vercels egen Git-kobling deployer. CI-workflowen deployer ikke.
- Funksjonene kjører i regionen `arn1` (Stockholm), satt i `vercel.json`. Siden rendres dynamisk per forespørsel.
- Kartflisene går ikke via Vercel: nettleseren henter dem direkte fra `cache.kartverket.no` (uten nøkkel), og Kartverket ser IP-adressen og kartutsnittet. I Playwright er flisene stubbet.
- Tilgang (avklart 2026-11-18): Vercel-appen var allerede installert i GitHub-organisasjonen IBE160-2026 med tilgang til alle repoer, så ingen godkjenning trengtes. Reserven med deploy fra GitHub Actions og `VERCEL_TOKEN` brukes ikke.

## Rutegeometri og konverteringsskriptet

Rutene på kartet kommer fra Kartverkets Turrutebase for Molde («Tur- og friluftsruter», GML i EPSG:25833), lastet ned fra Geonorge til `data/raw/Friluftsliv_1506_Molde_25833_TurOgFriluftsruter_GML.zip`.

- `npm run rutegeometri` kjører konverteringsskriptet, `scripts/konverter-rutegeometri.ts`. Skriptet pakker ut GML-fila fra zip-fila selv, i minnet, så du trenger ikke pakke den ut først.
- Senterlinjene regnes om til WGS84 med proj4 og skrives til `data/rutegeometri.geojson`, med ett `Feature<MultiLineString>` per Rutesegment (rutenummer + rutenavn) og koordinater som `[lon, lat]`. En linje som hører til flere Rutesegmenter, er med i hvert av dem. Linjer uten rutenummer hoppes over.
- Fila committes, og kjernen leser den med en statisk import, aldri med `fs`. To kjøringer gir byte-identisk fil. En test sjekker at skriptet gir den committede fila, så kjør skriptet og commit fila på nytt hvis zip-fila byttes.
- `src/kjerne/turdata/valider.ts` sjekker Turdatasettet (`data/turer-moldemarka.json`) mot rutegeometrien (FR-27), og `npm test` feiler ved avvik.
