# Story 1.1: prosjektoppsett

## 2026-11-17 kl. 16:17 — Simon Friedl

### Oppgave
Brukeren kjørte `bmad-help` og deretter `bmad-build` for story 1.1, «Prosjektet settes opp fra starter-malen». Storyen er den første i Epic 1: Next.js med låste versjoner, lagregler, testoppsett og CI som de andre storyene bygger på.

### Plan
- `bmad-help` viste status. Planleggingen var ferdig og alle storyer sto som `backlog`. Neste påkrevde steg var `bmad-build` for 1.1.
- Brukeren tillot subagenter i hele Build-kjøringen.
- En subagent samlet konteksten for Epic 1 i [`epic-1-context.md`](../../_bmad-output/implementation-artifacts/epic-1-context.md).
- Specen ble skrevet etter undersøkelsen: [`spec-1-1-prosjektet-settes-opp-fra-starter-malen.md`](../../_bmad-output/implementation-artifacts/spec-1-1-prosjektet-settes-opp-fra-starter-malen.md). Den er på ca. 2 300 tokens. Brukeren valgte å beholde hele specen, og godkjente og fortsatte.
- En subagent implementerte. Etterpå gjorde tre uavhengige reviewere gjennomgangen (Blind Hunter, Edge Case Hunter og Verification Gap). Funnene ble sortert, og patchene gikk tilbake til implementeringsagenten.

### Resultat
- **Commit `4b78031`** («Story 1.1: prosjektet satt opp fra starter-malen»), ikke pushet.
- **Oppsett:**
  - `create-next-app@16.4.3` er kjørt med flaggene fra AD-14 i scratchpad, og bare kildefilene er flyttet inn.
  - Versjonene er låst eksakt etter Stack: next 16.4.3, react 19.3.1, typescript 5.9.3, zod 4.6.7, vitest 5.0.5, vite 8.3.5 og @playwright/test 1.64.1. I tillegg er eslint 9.39.5 låst. `engines.node` er `26.x`, og `.npmrc` har `save-exact=true`.
  - `package-lock.json` er laget med `npm install --before=2026-10-29`.
- **Forsiden:** viser bare «Turplanlegger» i Nunito Sans (`next/font/google`, selvhostet ved bygg) med `lang="nb"`. Geist, demo-CSS og favicon fra malen er fjernet. `next.config.ts` har `agentRules: false`, så `next dev` ikke skriver `AGENTS.md`.
- **Lagregler (AD-1)** i `eslint.config.mjs`:
  - Kjernen kan ikke importere fra server, app eller ui, og heller ikke `node:*`/`fs`/`http`. `fetch`, `process`, `performance`, `globalThis.*`, `Date.now`, `Temporal.Now`, `Date()` og `new Date()` er forbudt.
  - Visningen importerer bare typer fra kjernen.
  - Bare `page.tsx` kan importere `src/server/side`.
  - Skall og API kan ikke importere visningen.
  - `lagregler.test.ts` dekker reglene med `ESLint#lintText`.
- **Tester og CI:**
  - `vitest.config.mts` og røyktesten `src/kjerne/oppsett.test.ts`.
  - `playwright.config.ts` med port 3100. `e2e/forside.spec.ts` sjekker h1, `lang`, tittel og Nunito Sans.
  - `.github/workflows/ci.yml` kjører lint, Vitest og Playwright ved push, med `permissions: contents: read`, `concurrency` og en tidsgrense på 20 min.
  - `.env.example` har en kommentert `ANTHROPIC_API_KEY=`.
- **Verifisert:** `npm run lint` og `tsc --noEmit` er rene, Vitest gir 59/59, og Playwright gir 1/1 med `CI=1` (bygg og start). `npm ls` viser Stack-versjonene. `data/`, `scripts/`, `_bmad/`, `README.md`, `CLAUDE.md` og `.gitignore` er urørt.
- **Dokumentoppfølgingen** (Nunito Sans i DESIGN.md og EXPERIENCE.md, «© Kartverket», ingen åpne spørsmål) var alt gjort i `e920ada`. Den er kontrollert, men ikke endret.
- **Gjennomgangen:** 34 funn.
  - 10 patch-grupper er rettet.
  - 1 er utsatt til [`deferred-work.md`](../../_bmad-output/implementation-artifacts/deferred-work.md).
  - Resten er avvist med begrunnelse i Review Triage Log i specen.
- **Sprint-status:** story 1.1 sto først som `review` og Epic 1 som `in-progress`.
- **Walkthrough (`bmad-walkthrough`):**
  - Gikk gjennom fem temaer: lagregler, lint-tester, låst grunnmur, forside og CI.
  - Fant fem risikopunkter: next-advarselen, CI som ikke er kjørt, at flat config overstyrer, at `next/font/google` trenger nett ved bygg, og at e2e bruker dev-modus lokalt.
  - Ga forslag til manuelle sjekker.
  - Brukeren godkjente, og story 1.1 er satt til `done` i `eb7f6b9`.
- **Push og CI:**
  - `ca83298..5e06e42` er pushet til `origin/main` etter brukerens beskjed.
  - CI-kjøringen 44113787194 ble grønn på 1 min 56 s, med Playwright 1/1.
  - Annoteringer: `actions/checkout@v4` og `actions/setup-node@v4` bruker Node 20, som er avviklet, og `ubuntu-latest` går over til Ubuntu 26.
- **Lukket i issues.md:** «Neste steg: `bmad-build` for story 1.1».

### Åpne punkter
- CI er grønn på GitHub. Gjenstår: bekreft at den blir rød når lint, Vitest eller Playwright feiler (valgfritt, på en egen grein).
- Oppgrader `actions/checkout` og `actions/setup-node` fra v4 til en versjon som ikke kjører på Node 20, før GitHub fjerner Node 20 på runnerne.
- next 16.4.3 har sikkerhetsadvarselen GHSA-mfr8-8qww-v76h, som er rettet i 16.4.6. Den gjelder bare `'use cache'` med `unstable_cache`, og det er utelukket av AD-14. npm audit gir også 7 moderate funn i minimatch gjennom typescript-eslint (bare dev). Gruppen må avgjøre om Stack skal oppgraderes. Bieffekt: `next build`/`next dev` stopper første gang når en AI-agent kjører dem.
- Neste story: `bmad-build` for 1.2 («Appen publiseres på Vercel») i et nytt kontekstvindu. Vercel-sjekken mot IBE160-2026 står alt som eget punkt.
