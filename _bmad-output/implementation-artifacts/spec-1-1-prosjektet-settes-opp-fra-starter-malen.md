---
title: 'Story 1.1: Prosjektet settes opp fra starter-malen'
type: 'chore'
created: '2026-11-17'
status: 'done'
baseline_commit: 'ca8329829c3ab040856adbf77c289f663ee7516c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/architecture/architecture-turplanlegger-app-2026-11-12/ARCHITECTURE-SPINE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Repoet har ingen app-kode. Alle de andre 33 storyene trenger samme grunnmur: Next.js med låste versjoner, lagreglene fra AD-1 håndhevet av ESLint, Vitest, Playwright og CI.

**Approach:** Kjør `create-next-app@16.4.3` med flaggene fra AD-14 i en tom mappe utenfor repoet og flytt inn bare kildefilene. Lås versjonene fra Stack, lag lockfila med `npm install --before=2026-10-29` og legg til lagregler, testoppsett, CI og `.env.example`. Forsiden viser bare «Turplanlegger» i Nunito Sans.

## Boundaries & Constraints

**Always:**
- Eksakte versjoner, uten `^` eller `~`: next 16.4.3, react og react-dom 19.3.1, typescript 5.9.3, @types/node 26.6.6, zod 4.6.7, vitest 5.0.5, vite 8.3.5 og @playwright/test 1.64.1. `engines.node` er `"26.x"`.
- Andre pakker fra malen (eslint, eslint-config-next, @types/react osv.) låses også eksakt, til versjonen `--before=2026-10-29` gir. `.npmrc` får `save-exact=true`.
- Lagreglene, som `@typescript-eslint/no-restricted-imports` med `regex` som fanger både `@/…` og relative stier:
  - `src/kjerne/**` importerer ikke fra `server`, `app` eller `ui`. `fetch` og `process` er forbudt (`no-restricted-globals`), og det samme er `Date.now` og `new Date()` uten argument (`no-restricted-syntax`).
  - `src/ui/**` og `src/app/**` (unntatt `src/app/api/**`) importerer verdier fra `src/kjerne/` bare som typer (`allowTypeImports`). Meldingen nevner lagregelen (AR-1).
  - Ingen fil unntatt `src/app/page.tsx` importerer `src/server/side`. `page.tsx` importerer ikke annet fra `src/server/`. `src/ui/**` importerer ingenting fra `src/server/`.
- Disse er urørt: `data/`, `scripts/`, `.logs/`, `_bmad/`, `_bmad-output/` (bortsett fra spec og story-status), `CLAUDE.md`, `README.md` og `tilbakemelding-product-brief.md`.

**Never:**
- Ingen Tailwind, Geist, React Compiler, `"use cache"`, AGENTS.md eller demo-innhold fra malen (`page.module.css` og SVG-er i `public/`).
- Ingen kjerne-, server- eller UI-moduler fra senere storyer (`sok.ts`, `tokens.css`, `tekster.ts`, `vercel.json` osv.).
- Ingen push, Vercel-oppsett eller endring av GitHub-innstillinger.

</frozen-after-approval>

## Code Map

- `.gitignore` -- dekker allerede Next, `.env`/`.env.*` med `!.env.example`, `test-results/` og `playwright-report/`. Bruk den eksisterende, ikke malens.
- `README.md` -- gruppens README. Den må ikke overskrives av malens README (story 1.15 eier den).
- `data/`, `scripts/kalibrering_vaerlogg.py` -- ingen JS/TS i repoet i dag. ESLint må ignorere `_bmad/**`, `_bmad-output/**`, `.logs/**`, `.claude/**` og `data/**`.
- `_bmad-output/planning-artifacts/ux/DESIGN.md:46-119,402,425-426` og `EXPERIENCE.md:24,86,330-332` -- dokumentoppfølgingen er alt gjort i `e920ada`. Tokens og Typography sier Nunito Sans, tabellsiffer og SVG for ✓/→ er notert, Krediteringen har «© Kartverket», og «Ingen åpne spørsmål». `Avenir` står bare i endringstabellen (linje 325), og der skal det stå. Her skal ingenting endres, bare kontrolleres.
- npm: alle låste versjoner er publisert før 2026-10-29 (sist @types/node 26.6.6, 28. okt.). create-next-app 16.4.3 støtter `--no-…`-flaggene. `--yes` kan legges til hvis CLI-en spør interaktivt.
- Lokalt: Node 26.8.1 og npm 11.19.0.

## Tasks & Acceptance

**Execution:**
- [x] scratchpad-mappe -- kjør `npx create-next-app@16.4.3 <tom-mappe> --ts --app --src-dir --no-tailwind --eslint --no-react-compiler --no-cache-components --import-alias "@/*" --use-npm --no-agents-md` og kopier inn `src/`, `package.json`, `tsconfig.json`, `next.config.ts` og `eslint.config.mjs`. Ikke kopier `node_modules`, lockfila, `.git`, `README.md`, `.gitignore` eller `public/`-demofilene -- da kommer AC-kommandoen ordrett, uten å røre repoets egne filer.
- [x] `package.json` -- eksakte versjoner, `engines`, avhengighetene `zod`, `vitest`, `vite`, `@playwright/test` og skriptene `lint` (`eslint`), `test` (`vitest run`) og `test:e2e` (`playwright test`). `.npmrc` -- `save-exact=true`. Kjør så `npm install --before=2026-10-29`, som lager `package-lock.json`.
- [x] `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css` -- `lang="nb"`, Nunito Sans fra `next/font/google` (selvhostes ved bygg), tittelen «Turplanlegger» og en side med bare `<h1>Turplanlegger</h1>`. Fjern Geist og demo-CSS. Slett `src/app/page.module.css` og malens SVG-er.
- [x] `eslint.config.mjs` -- lagreglene fra Boundaries som egne objekter per filmønster (flat config overstyrer, den slår ikke sammen) og `globalIgnores` for mappene i Code Map.
- [x] `lagregler.test.ts` (i roten) -- Vitest-test som bruker `ESLint#lintText` med `filePath` og sjekker hvert brudd i AC 3 og at en ren typeimport går gjennom -- slik at regelen ikke kan råtne i stillhet.
- [x] `vitest.config.ts`, `src/kjerne/oppsett.test.ts` -- Node-miljø, aliaset `@` → `src`, include `src/**/*.test.ts` og `*.test.ts`, exclude `e2e/**`. Røyktesten importerer `zod` og validerer et lite skjema.
- [x] `playwright.config.ts`, `e2e/forside.spec.ts` -- bare chromium. webServer er `npm run build && npm run start` på CI og `npm run dev` lokalt (`reuseExistingServer` lokalt). Testen sjekker at overskriften «Turplanlegger» er synlig og at `<html lang="nb">`.
- [x] `.github/workflows/ci.yml` -- `on: push`, Node 26 via `actions/setup-node`, `npm ci`, `npm run lint`, `npm test`, `npx playwright install --with-deps chromium` og `npm run test:e2e` som egne steg i én jobb.
- [x] `.env.example` -- `ANTHROPIC_API_KEY=`.

**Acceptance Criteria:**
- Gitt det ferdige oppsettet, når `npm ci && npm run lint && npm test && npm run test:e2e` kjøres, så lykkes alle.
- Gitt `npm run dev`, når forsiden åpnes, så vises «Turplanlegger» i Nunito Sans, og ingen Geist eller demoinnhold.
- Gitt en midlertidig fil i `src/kjerne/` med `import … from '@/server/x'`, `'../ui/x'`, `fetch(…)`, `process.env`, `Date.now()` eller `new Date()`, når lint kjøres, så feiler lint med lagregel-meldingen. `new Date(0)` er lov.
- Gitt `src/ui/X.tsx` eller `src/app/page.tsx` med en verdiimport fra `@/kjerne/…`, så feiler lint. `import type` går gjennom.
- Gitt `src/ui/X.tsx` eller `src/app/api/sok/route.ts` som importerer `@/server/side`, så feiler lint. `src/app/page.tsx` går gjennom.
- Gitt `git status` etter storyen, så er bare filene i Tasks nye eller endret, `.env` er ignorert og `package-lock.json` er committet.

## Implementation Notes

- create-next-app kjørt med AC-flaggene pluss `--yes`. Malpakker låst til det `--before=2026-10-29` ga: eslint 9.39.5, eslint-config-next 16.4.3, @types/react og @types/react-dom 19.3.0.
- `next.config.ts` fikk `agentRules: false`. Ellers skriver `next dev` en `AGENTS.md` når en AI-agent kjører den, og det forbyr specen.
- Lagreglene er litt strengere enn ordlyden: andre filer i `src/app/` (som `layout.tsx`) importerer ingenting fra `src/server/` (AD-1). `./side` og `../side` er forbudt inne i `src/server/`, og det samme er `Date()` uten `new` i kjernen.
- `lagregler.test.ts` har 27 tilfeller. Vitest gir 29/29, Playwright 1/1 både lokalt og med `CI=1`, og `tsc --noEmit` er ren.
- `src/app/favicon.ico` fra malen fulgte med `src/`.
- `npm audit`: 8 moderate. GHSA-mfr8-8qww-v76h i next 16.4.3 gjelder bare `'use cache'` sammen med `unstable_cache`, og det er utelukket av AD-14 (fikset i 16.4.6). De 7 andre er minimatch i typescript-eslint, bare dev.
- På grunn av den advarselen stopper `next build`/`next dev` med feil første gang når en AI-agent kjører dem, og lykkes ved nytt forsøk. Mennesker og Actions merker ikke dette.
- Vite advarer om at `vitest.config.ts` er ESM i en CommonJS-pakke. Ufarlig.

- Etter review, pass 1: patchene P1–P10 er lagt inn.
  - `vitest.config.ts` har fått nytt navn, `vitest.config.mts`, og fanger nå også `*.test.tsx`.
  - Playwright bruker port 3100.
  - Favicon fra malen er slettet.
  - Lagreglene er utvidet med `globalThis.*`, `Temporal.Now`, `performance`, `node:*`, skall/api → visning og spesifikatorvarianter.
  - Resultat: lint og `tsc` er rene, Vitest gir 59/59, og Playwright gir 1/1 med `CI=1` (bygg og start på 3100).

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1 | `Date()` uten `new` i kjernen er ikke testet | low | Ingen test lintet `Date()` før denne gjennomgangen. Selektoren kan forsvinne uten at noe blir rødt. | patch (P4) |
| VG2 | `layout.tsx` → `@/server/miljo` er ikke testet | low | Bare `@/server/side` var testet for `layout.tsx`, og den fanges av den globale side-regelen. | patch (P4) |
| VG3 | AC 2 (Nunito Sans, tittel) sjekkes bare manuelt | low | e2e sjekker bare h1 og `lang`. | patch (P5) |
| VG-a | `globalThis.fetch` og `node:process` slipper gjennom i kjernen | medium | `no-restricted-globals` fanger bare bare identifikatorer. | patch (P1) |
| BH1 | CI mangler eget typecheck- og byggsteg | low | `next build` i webServer typesjekker og feiler, og CI blir rødt. Gevinsten er bare et tydeligere stegnavn, og fiksen krever nye skript og steg. | avvist |
| BH2 | Dynamisk `import()` og `require()` omgår lagreglene | low | Reelt, men lite sannsynlig i ESM/TS-koden her. Fiksen krever egne syntaksregler per lag, som må flettes med kjernens. | avvist |
| BH3 | Kjernens renhetsregler kan omgås (`Temporal.Now`, `performance.now`, `globalThis.*`, `node:*`) | medium | `Temporal` finnes i Node 26 og er et sannsynlig valg i tidskode i 2026. Fiksen er tillegg i eksisterende lister. | patch (P1) |
| BH4 | Relative regexer ignorerer dybde (falske treff) | low | Krever en undermappe i kjernen som heter ui, app eller server. Ingen slik finnes i strukturen i spinen, og fiksen krever stioppløsning. | avvist |
| BH5 | `forventOk` består tomt for ignorerte stier | false | Hvis `src/**` blir ignorert, feiler alle `forventBrudd`-testene (de forventer lengde 1). Suiten blir rød. | avvist |
| BH6 | Utestede regelgrener (`Date()`, `../side`, layout→server, re-eksport, `../app/x`) | low | Bekreftet med grep i `lagregler.test.ts`. | patch (P4) |
| BH7 | AC 2 er ikke testet automatisk | low | Samme rot som VG3. | patch (P5) |
| BH8 | Playwright-spor lastes ikke opp i CI | low | Gjelder bare feilsøking etter en rød e2e. Med én røyktest er det lite sannsynlig, og fiksen er et nytt steg. | avvist |
| BH9 | Workflow mangler `permissions`, `concurrency` og `timeout-minutes` | low | Tokenet får standardomfanget i organisasjonen. Fiksen er noen få linjer. Nettleser-cache er utelatt. | patch (P6) |
| BH10 | `engines` er bare rådgivende | low | `engine-strict=true` ville også håndheve `engines` i transitive pakker og kunne knekke `npm ci`. Det er ikke en enkel fiks. | avvist |
| BH11 | Vitest finner ikke `*.test.tsx` | low | Endringen er ett glob-mønster. | patch (P7) |
| BH12 | Malens favicon (Vercel) er beholdt | low | Det er demoinnhold fra malen, synlig i fanen. Sletting er nok. | patch (P8) |
| BH13 | Status ulik i spec og sprint-status, `last_updated` gjettet | low | Statusen synkes i steg 5 (false). Tidsstempelet 16:30 var feil. | patch (orkestrator) |
| BH14 | Lockfil utenfor diffen, audit-advarselen er bare dokumentert i specen | false/medium | Lockfila er tatt ut av review-diffen med vilje og blir committet. Advarselen mot next 16.4.3 gjelder fortsatt (fikset i 16.4.6). | defer |
| BH15 | `.env.example` mangler kontekst | low | En kommentar er nok. | patch (P9) |
| EC1 | Dynamisk `import('@/server/x')` | low | Samme som BH2. | avvist |
| EC2 | `./../server/x` omgår regexen | low | Fiksen er en valgfri `(\./)?` i regexen. | patch (P2) |
| EC3 | Falske treff for undermapper i kjernen | low | Samme som BH4. | avvist |
| EC4 | `globalThis.fetch`/`process`, `node:process` | medium | Samme rot som BH3. | patch (P1) |
| EC5 | `Date['now']()`, `globalThis.Date.now()`, `new Date(...[])`, `performance.now()` | medium | Samme rot som BH3. | patch (P1) |
| EC6 | `@/server/side.js` omgår side-regelen | low | Med bundler-oppløsning blir `.js` til `side.ts`. Fiksen er en filendelse i regexen. | patch (P2) |
| EC7 | `@/server/side/index` omgår side-regelen | low | Fiksen er en valgfri `(/index)?`. | patch (P2) |
| EC8 | `../side` og `./side` på andre dybder gir falske treff | low | Ville peke på `src/side` eller `src/server/<sub>/side`, og ingen av dem finnes eller er planlagt. Fiksen er blokker per dybde. | avvist |
| EC9 | Skallet kan importere `@/ui` og `@/app` | low | AD-1 tillater bare skall → kjerne og data. Det er ett ekstra mønster. | patch (P3) |
| EC10 | `src/app/api/**` kan importere `@/ui` | low | Samme lagregel. | patch (P3) |
| EC11 | `forventOk` og ignorerte stier | false | Samme som BH5. | avvist |
| EC12 | `*.test.tsx` kjøres ikke | low | Samme som BH11. | patch (P7) |
| EC13 | ESM-advarsel for `vitest.config.ts` | low | Advarselen skrives ved hver `npm test`. Fiksen er å gi fila nytt navn, `.mts`. | patch (P7b) |
| EC14 | `PORT` i miljøet gir feil port | low | `next` følger `PORT`. Fiksen er å sende `-p` eksplisitt. | patch (P10) |
| EC15 | En annen app på port 3000 lokalt | low | `reuseExistingServer` gjenbruker en fremmed app. Fiksen er en egen port. | patch (P10) |

## Design Notes

- Valget av `next/font/google` framfor `local`: Next laster ned fonten ved bygg og serverer den fra vår egen origin, så nettleseren kontakter aldri Google (AD-15, NFR-6). Bygget trenger nett, og det har Vercel og Actions.
- `src/app/api/**` er unntatt view-regelen, siden arkitekturen regner API som eget lag ved siden av Visning.

## Verification

**Commands:**
- `npm run lint` -- forventet: 0 feil
- `npm test` -- forventet: røyktest og lagregeltester grønne
- `npx playwright install chromium && npm run test:e2e` -- forventet: 1 bestått
- `npm ls next react react-dom typescript zod vitest vite @playwright/test @types/node` -- forventet: eksakte Stack-versjoner
- `git status --short` -- forventet: ingen endring i `data/`, `scripts/`, `_bmad/`, `README.md` eller `CLAUDE.md`

**Manual checks:**
- I nettleseren skal beregnet `font-family` på `h1` inneholde Nunito Sans.
- At CI blir rød/grønn, kan bare bekreftes etter en push. Den gjør brukeren.
