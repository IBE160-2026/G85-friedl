---
title: 'Story 2.4: Værmeldingen hentes fra MET'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '57cf36b0a35d7223fe96fd720bdb9d01f69b4ca0'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-3-vaerscenarioer-for-demomodus-og-tester.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Appen har ingen MET-klient, så Værmeldingen kan ikke hentes i live-modus (Story 2.4, FR-7, FR-13, NFR-4, NFR-5, AD-6, AR-10, AR-24).

**Approach:**
- `src/server/vaer/met.ts` er den eneste MET-klienten.
- En fabrikk `lagMetVaerkilde(avhengigheter)` gir en `Vaerkilde` med cache i minnet (`VaerCache`), betingede kall, tidsgrense på 2 s og `null` ved feil.
- `fetch` og klokka kommer inn som avhengigheter, så testene kan bruke en falsk `fetch` og en fast klokke.
- Adapteren kobles ikke inn i `lagMiljo` før 2.8.

## Decisions

- **API:** `lagMetVaerkilde({ fetch, klokke, tidsgrenseMs = 2000 }): Vaerkilde`. Instansen eier sin `VaerCache`. `klokke` er `() => number` (epoke-ms). `met.ts` leser ikke klokka selv, så klokka leses fortsatt bare i `miljo.ts`.
- **URL:** `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=62.7617&lon=7.1679&altitude=400`. Koordinatene trunkeres til fire desimaler med en ren hjelper `trunker4(x): string`. Hjelperen trunkerer og runder aldri, og er sikker mot flyttallsfeil: `62.76179` gir `"62.7617"`, og `7.1` gir `"7.1"`.
- **Headere:**
  - `User-Agent: turplanlegger-ibe160/<versjon> https://github.com/IBE160-2026/G85-friedl`. `<versjon>` er `version` fra `package.json`, importert statisk.
  - `cache: 'no-store'`.
  - `If-Modified-Since` når cachen har `Last-Modified`.
- **Cachen:**
  - Nøkkelen er `lat|lon|altitude`.
  - En post har `melding`, `utloperMs` (fra `Expires`) og `sistEndret` (råverdien av `Last-Modified`).
  - Innenfor `utloperMs` returneres `melding` uten kall.
  - Etter utløp sendes et betinget kall. 304 setter ny `utloperMs` fra `Expires` i 304-svaret og beholder `melding`. 200 erstatter posten.
  - Uten `Expires`, eller med en ugyldig verdi, er posten utløpt med en gang, så neste Søk sender et betinget kall.
- **Ett kall om gangen:** det pågående kallet per nøkkel lagres som et løfte. Samtidige Søk venter på det samme løftet. Løftet fjernes når kallet er ferdig, også ved feil.
- **Feil:** tidsavbrudd (`AbortController` etter `tidsgrenseMs`), nettverksfeil, andre statuser enn 200 og 304, JSON som ikke kan parses, og `parseMetCompact`-feil gir `null` og `console.error("MET: …", årsak)`. Utløpt data brukes ikke, så en feilet fornyelse gir `null`. Også 304 uten noe i cachen gir `null` med logg.
- **Status** leses fra `response.status`. `response.ok` brukes ikke, fordi 304 ikke er `ok`.
- **Skjermet fra nettleseren:** `met.ts` importerer `server-only`, hvis pakken finnes, eller sjekkes av en ESLint-regel som hindrer import fra `src/ui`/`src/app` utenom API-ruter. Velg den løsningen som passer de eksisterende lagreglene i `eslint.config.mjs`, og legg til en test i `lagregler.test.ts`.
- **`lagMiljo`** endres ikke. Uten demo er værkilden fortsatt `null`. En kommentar i `miljo.ts` peker på 2.8.

## Boundaries & Constraints

**Always:**
- Ingen test kaller MET. Alle testene bruker en falsk `fetch`.
- `met.ts` er eneste fil som nevner `api.met.no` i `src/`. Det sjekkes av en test eller lint-regel.
- `parseMetCompact` fra 2.3 er eneste parser.

**Never:**
- Ingen kobling inn i `lagMiljo` eller i Resultatet (2.8).
- Ingen delt cache (Redis eller Runtime Cache).
- Ingen logging av forespørselsdata.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Første kall | tom cache, `fetch` gir 200 med `Expires` om 30 min | ett kall med riktig URL, User-Agent og `cache: 'no-store'`, og en `Vaermelding` tilbake |
| Innenfor Expires | nytt kall 10 min senere | ingen `fetch`, samme melding |
| Etter Expires, 304 | klokka 31 min senere, `fetch` gir 304 med nytt `Expires` | `If-Modified-Since` lik `Last-Modified`, samme melding, og levetiden forlenget |
| Etter Expires, 200 | ny `fetch` gir 200 | ny melding |
| Samtidige | to kall før `fetch` løses | `fetch` kalt én gang, og begge får samme melding |
| Tidsavbrudd | `fetch` løses aldri | `null` etter 2 s (falske timere), og `console.error` |
| 500 | status 500 | `null` og logg |
| Ugyldig JSON | `json()` kaster | `null` og logg |
| Uten timeseries | `{ properties: {} }` | `null` og logg |
| Fornyelse feiler | utløpt post, `fetch` kaster | `null`, ikke den gamle meldingen |
| 304 uten cache | tom cache, 304 | `null` og logg |
| Uten Expires | 200 uten `Expires` | meldingen returneres, og neste kall sender et betinget kall |
| Trunkering | `62.76179`, `7.16799`, `7.1` | `"62.7617"`, `"7.1679"`, `"7.1"` |
| Timer etter midnatt | `uj-2/met.json` gjennom adapteren, Turdag 9. nov. 22:00, 3 t | timene 21, 22 og 23 UTC finnes, og vinduet blir ikke `mangler` |
| Uten demo | `lagMiljo(null)` | værkilden gir `null` og kaller ikke `fetch` |

</frozen-after-approval>

## Code Map

- `src/kjerne/vaer/met-compact.ts` (2.3) -- `parseMetCompact`.
- `src/kjerne/vaerpunkt.ts` -- `VAERPUNKT`.
- `src/server/miljo.ts` -- `Vaerkilde`-typen og kommentaren om 2.8.
- `eslint.config.mjs` og `lagregler.test.ts` -- lagreglene.
- `package.json` -- `version`.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/vaer/met.ts` -- `lagMetVaerkilde`, `VaerCache` og `trunker4`.
- [x] `src/server/vaer/met.test.ts` -- matrisen, med falsk `fetch` og `vi.useFakeTimers` for tidsavbruddet.
- [x] `eslint.config.mjs` og/eller `lagregler.test.ts` -- `met.ts` er skjermet fra nettleseren, og `api.met.no` står bare i `met.ts`.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne, og ingen test har kalt MET.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn
- `grep -rn "api.met.no" src` -- forventet: bare `src/server/vaer/met.ts` (og testen for den)

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH2, EC1 | Ingen pause etter feil, så hvert Søk treffer MET under utfall og 429 | high | Bekreftet. MET-vilkårene ber klienter holde igjen. Nå med «ikke før» per nøkkel: `Retry-After`, ellers 60 s. | patch |
| BH1 | Loggen kan lekke forespørselsdata via `cause` | medium | Bekreftet. Undici legger vertsnavn og IP i `cause`. Loggen viser nå bare `name`, `message` og `code`. | patch |
| EC4 | Et 200-svar uten timer caches som gyldig | medium | Bekreftet. | patch |
| BH4 | 203 forkastes | low | Bekreftet. MET bruker 203 for et produkt som skal fases ut, og innholdet er gyldig. | patch |
| EC6, VG1 | 304 med ny `Last-Modified`, og ingen test av at et nytt kall etter 304 fortsatt er betinget | medium | Bekreftet. | patch |
| EC2 | Innholdet leses ikke ved feilstatus | low | Bekreftet. Kansellerer nå innholdet. | patch |
| EC5 | `tidsgrenseMs` valideres ikke | low | Bekreftet. | patch |
| BH9 | `MetFeil` bruker ikke `Error.cause` | low | Bekreftet. | patch |
| BH7 | Typeimporten fra `miljo.ts` blir en sirkel i 2.8 | low | Bekreftet. `Vaerkilde` er flyttet til `src/server/vaer/typer.ts`. | patch |
| BH6 | Ingenting sier at instansen må leve gjennom hele prosessen | medium | Bekreftet. Står nå i doc-kommentaren, til 2.8. | patch |
| BH5 | Skjermingen bygger bare på ESLint, og kommentaren sier for mye | low | Kommentaren er rettet. `server-only` er en ny avhengighet og legges ikke inn uten Simon. | patch (kommentar) og defer |
| BH10 | Vertssjekken dekker bare `src/` | low | Bekreftet. Dekker nå også `e2e/` og `scripts/`. | patch |
| BH8 | Testene for fornyelse, 304 uten `Expires` og opprydding av timere mangler | low | Bekreftet. | patch |
| BH11 | Testen i `miljo.test.ts` er en kopi | low | Bekreftet. | patch |
| BH3, EC3 | Ingen nedre eller øvre grense for levetiden | low | Følger AD-6 (`Expires` gjelder). Pausen etter feil og betingede kall dekker det som trengs. | avvist |
| BH12 | `met.ts` importerer hele `package.json` | low | Bare på serveren. Fila er liten. | avvist |
| EC7 | Specen sier `api.met.no` bare i `met.ts` | false | Specen tillater testen. | avvist |
