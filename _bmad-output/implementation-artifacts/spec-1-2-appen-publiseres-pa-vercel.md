---
title: 'Story 1.2: Appen publiseres på Vercel'
type: 'chore'
created: '2026-11-18'
status: 'done'
baseline_commit: '01b8044c71b5d9870af673ce0d8fc9b1202e627a'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Repoet er koblet til Vercel (team `irobot`, prosjekt `g85-friedl`), og https://g85-friedl.vercel.app svarer. Men siden er ferdigrendret ved bygging (`x-nextjs-prerender: 1`, `x-vercel-cache: HIT`), regionen er ikke låst til `arn1`, og README mangler lenken som faglærer ba om. Ingen test passer på at siden forblir dynamisk og fri for sporing og informasjonskapsler.

**Approach:** Legg til `vercel.json` med `regions: ["arn1"]`, gjør forsiden dynamisk med `export const dynamic = "force-dynamic"`, slå av logging av forespørsler i Next og forby `"use cache"` med en lagregel. En e2e-test sjekker dynamikk, informasjonskapsler og skript. README får lenken og avklaringen om Vercel-tilgangen.

## Boundaries & Constraints

**Always:**
- Vercel-tilgangen er avklart (2026-11-18): Vercel-appen var allerede installert i organisasjonen IBE160-2026 med tilgang til alle repoer, så ingen godkjenning trengtes. Reserven med Actions, `vercel deploy --prebuilt` og `VERCEL_TOKEN` brukes ikke.
- Beslutning (2026-11-18): avklaringen noteres i README, og spørsmål 1 i tabellen over åpne spørsmål i `ARCHITECTURE-SPINE.md` lukkes med samme svar. Epic-kontekstene kompileres på nytt ved neste `bmad-build`.
- `main` går til Production og andre greiner til Preview, med Vercels standard Git-kobling. CI-workflowen deployer ikke.
- Lagregelen mot `"use cache"` gjelder hele `src/**`. Den må også stå i kjerneobjektets `no-restricted-syntax`, fordi flat config overstyrer i stedet for å slå sammen.

**Never:**
- Ingen `VERCEL_TOKEN`, deploy-steg i `ci.yml`, Vercel Analytics, Speed Insights eller andre skript og pakker for analyse eller sporing.
- Ingen `cacheComponents`, `"use cache"` eller `revalidate` på siden.
- Ingen push og ingen endring i Vercel-dashbordet. Det gjør brukeren.
- Ingen kode fra senere storyer (`side.ts`, `miljo.ts`, `?demo=`).

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Dynamisk side | GET `/` mot `next start` | `cache-control` inneholder `no-store`, ingen `x-nextjs-prerender`, og `next build` viser `ƒ /` | Testen feiler hvis siden blir statisk igjen |
| Ingen kapsler | GET `/` og sideinnlasting | Ingen `set-cookie`, og `context.cookies()` er tom | Testen feiler |
| Ingen fremmede skript | HTML fra `/` | Alle `<script src>` er relative eller har samme origin | Testen feiler |
| `"use cache"` i koden | Fil i `src/` med direktivet `"use cache"` | Lint feiler med lagregel-melding | – |

</frozen-after-approval>

## Code Map

- `src/app/page.tsx` -- forsiden med bare `<h1>Turplanlegger</h1>`. Her skal `export const dynamic = "force-dynamic"` inn. Lagreglene tillater pakkeimport fra `next/…` i `page.tsx`.
- `next.config.ts` -- har `agentRules: false`. Legg til `logging: { incomingRequests: false }` (Next 15.2+, gjelder bare dev, ifølge `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/logging.md`). Produksjon med `next start` logger ikke forespørsler.
- `eslint.config.mjs:77-161` -- lagregelobjektene. Kjernens `no-restricted-syntax` (linje 118-132) overstyrer et globalt objekt for `src/kjerne/**`.
- `lagregler.test.ts` -- `forventBrudd` og `forventOk` med `ESLint#lintText`. Gjenbruk dem for den nye regelen.
- `e2e/forside.spec.ts`, `playwright.config.ts` -- CI kjører `next build && next start` på port 3100, og lokalt kjører `next dev`. Dev svarer også med `no-store`, så testen går gjennom begge steder, men bare CI fanger en statisk side.
- `README.md` -- gruppens README (story 1.15 eier resten). Legg bare til en kort seksjon.
- `_bmad-output/planning-artifacts/architecture/architecture-turplanlegger-app-2026-11-12/ARCHITECTURE-SPINE.md:406` -- rad 1 i tabellen over åpne spørsmål (Vercel-tilgangen). Linje 200 beskriver reserven og kan stå.
- `.logs/simon-friedl/987-2026-11-18-09-28-46-vercel-avklaring.md` -- svaret fra faglærer og Production-URL-en.
- Grunnlinje 2026-11-18: `cache-control: public, max-age=0, must-revalidate`, `x-nextjs-prerender: 1`, `x-vercel-cache: HIT`, bare egne skript og ingen `set-cookie`.

## Tasks & Acceptance

**Execution:**
- [x] `vercel.json` -- `$schema` og `regions: ["arn1"]` -- låser funksjonsregionen (AR-21). Hobby tillater én region.
- [x] `src/app/page.tsx` -- `export const dynamic = "force-dynamic"` med en kort kommentar om hvorfor (AD-14) -- siden skal rendres per forespørsel.
- [x] `next.config.ts` -- `logging: { incomingRequests: false }` -- AR-24, også i dev.
- [x] `eslint.config.mjs` -- selektor for direktiver som begynner med `use cache`, i et globalt objekt for `src/**` og flettet inn i kjerneobjektet -- AD-14.
- [x] `lagregler.test.ts` -- brudd for `"use cache"` i `src/app/x.tsx` og `src/kjerne/x.ts`, og `"use client"` går gjennom.
- [x] `e2e/publisering.spec.ts` -- radene i I/O-matrisen for dynamikk, kapsler og skript.
- [x] `README.md` -- seksjonen «Publisert app» med https://g85-friedl.vercel.app, `main` → Production, greiner → Preview, region `arn1` og avklaringen om tilgang.
- [x] `ARCHITECTURE-SPINE.md` -- marker spørsmål 1 som avklart 2026-11-18 (direkte tilgang, reserven trengs ikke), i samme form som tabellen ellers.

**Acceptance Criteria:**
- Gitt endringene, når `npm run lint && npm test && npx tsc --noEmit && CI=1 npm run test:e2e` kjøres, så lykkes alle.
- Gitt `npm run build`, når rutetabellen skrives, så er `/` merket `ƒ` (Dynamic).
- Gitt at brukeren har pushet til `main` og Vercel har deployet, når `curl -sI https://g85-friedl.vercel.app/` kjøres, så mangler `x-nextjs-prerender`, `cache-control` inneholder `no-store`, det finnes ingen `set-cookie`, og `x-vercel-id` viser `arn1` for funksjonen.

## Implementation Notes

- Alle oppgavene er gjort. Lint er ren, Vitest gir 120/120, `tsc` er ren, og `CI=1 npm run test:e2e` gir 4/4 mot `next start`. `prerender-manifest.json` har bare `/_global-error` og `/_not-found`, så `/` er dynamisk.
- `lagregelfeil` i `lagregler.test.ts` filtrerer nå på «Lagregel» i stedet for «AR-1», så hjelperne også fanger AD-14-meldingen. Alle AR-1-meldinger begynner med «Lagregel AR-1», så de gamle testene blir ikke svakere.
- Next 16.4.3 stopper `next build`/`next dev` med `SecurityFatalError` første gang en AI-agent kjører dem, og lykkes ved nytt forsøk. Dette er kjent fra story 1.1.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1 | Sprint-status sier `in-progress` mens specen sier `in-review` | false | Steg 5 synker sprint-status til `review`. Statusen blir ikke stående feil. | avvist |
| BH2 | Bare `"use cache"` er sperret. `revalidate`, `cacheComponents` og en fjernet `force-dynamic` er det ikke | low | CI kjører e2e mot `next start`. Både `revalidate` og en fjernet `force-dynamic` gir `x-nextjs-prerender` eller mangel på `no-store`, og `cacheComponents` gjør `export const dynamic` til byggfeil. Bare lokalt slipper det gjennom, og fiksen er nye regler. | avvist |
| BH3 | Lagregelen forsvinner hvis et senere objekt setter `no-restricted-syntax`, og `src/app/api/` er ikke testet | low | I dag setter bare kjerneobjektet regelen, og det har flettet den inn. Mangelen på test for `src/app/api/` er reell, og fiksen er ett element i en liste og en kommentar. | patch (P1) |
| BH4 | Sjekken mot NFR-6 ser bare på `<script src>`, ikke `fetch`, beacon, piksler, `<link>` eller fonter fra andre domener | medium | En `<link>` til Google Fonts eller en sporingspiksel består testen i dag. En lytter på alle forespørsler ved innlasting fanger dem. | patch (P2) |
| EC1 | Et skript som lastes og så fjernes fra DOM, sees ikke | low | Samme rot som BH4. Lytteren på forespørsler fanger det. | patch (P2) |
| EC2 | Regexen på HTML stopper tidlig ved `>` i attributter | low | Samme rot som BH4. Regexen erstattes av lytteren. | patch (P2) |
| BH10 | `networkidle` frarådes, og `length > 0` er ikke relevant for kravet | low | `length > 0` faller bort med P2. `networkidle` er riktig her, fordi testen skal se alt som lastes. | patch (P2, delvis) |
| VG1 | Vercel Analytics og Speed Insights laster fra samme origin (`/_vercel/insights/…`) under `next start` og består testen | medium | Bekreftet fra `getScriptSrc` i pakkene. Specen forbyr dem uttrykkelig. | patch (P3) |
| EC3 | `revalidate` og `cacheComponents` slipper forbi lint | low | Samme som BH2. | avvist |
| EC4 | Lokalt går testen mot `next dev`, som alltid svarer `no-store` | low | Dette er dokumentert i testen og i specen. CI er porten. | avvist |
| BH5 | AR-24 er ikke sjekket, og Vercels egne logger nevnes ikke | false | Spinen godtar Vercels logger («Overvåking utover Vercels logger» er utsatt). AR-24 gjelder appens kode, og `next start` logger ikke forespørsler. | avvist |
| VG3 | `incomingRequests: false` har ingen test | low | Gjelder bare utskrift fra `next dev`. En test måtte lese stdout fra dev-serveren. | avvist |
| BH6 | `epic-1-context.md` er endret utenfor diffen | false | Den ble kompilert på nytt av denne kjøringen (steg 1) og skal committes med storyen. | avvist |
| BH7 | Svaret i spinen står i kolonnen «Inntil avklart» | false | Cellen begynner med «Avklart 2026-11-18», og det er kolonnen som sier hva som gjelder for spørsmålet. Ingen leser blir villedet. | avvist |
| BH8 | README sier at siden er dynamisk og bruker `arn1` før push | false | Setningene beskriver konfigurasjonen i repoet (`vercel.json`, `force-dynamic`), og den er riktig. | avvist |
| BH9, EC5, VG2 | Production, Preview og `arn1` sjekkes bare for hånd | low | Intensjonen sier at brukeren pusher, og at sjekkene er manuelle. De føres som åpent punkt i sesjonsloggen. | avvist |

## Design Notes

- `force-dynamic` framfor `await connection()`: segmentkonfigurasjonen er eksplisitt og synlig øverst i fila. Den er lovlig fordi `cacheComponents` er av. Når story 1.4/1.10 leser `searchParams`, blir siden dynamisk uansett, men linjen gjør kravet tydelig.
- Preview-kravet (push til en annen grein) og Production-kravet kan bare sjekkes etter push. Begge står som manuelle sjekker for brukeren.

## Verification

**Commands:**
- `npm run lint` -- forventet: 0 feil
- `npm test` -- forventet: alle grønne, også de nye lagregeltestene
- `npx tsc --noEmit` -- forventet: ren
- `npm run build` -- forventet: `ƒ /`
- `CI=1 npm run test:e2e` -- forventet: alle bestått mot `next start`

**Manual checks:**
- Etter push til en annen grein: Vercel gir en Preview-URL. Etter push til `main`: Production-sjekken i siste AC.
