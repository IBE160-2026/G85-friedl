---
title: 'Story 4.3: Claude Haiku som språkmodell'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: 'a6829dd9c958ef9f0e6337592e6a1f2c2b579e9c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-2-begrunnelse-endepunktet-og-den-falske-sprakmodellen.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Med en nøkkel skal appen få Språkmodelltekst fra Claude Haiku. Uten nøkkel skal alt virke som før (Story 4.3, FR-22, AR-18, AR-23, AR-26, NFR-3).

**Approach:**
- `src/server/sprakmodell/claude.ts` er en `Sprakmodell` som kaller Anthropic med `@anthropic-ai/sdk` 1.3.0. Avhengigheten er godkjent av Simon 2026-11-19.
- Miljøet bruker den når `ANTHROPIC_API_KEY` er satt og Demomodus ikke er på.

## Decisions

- **Avhengigheten:** `npm install --save-exact @anthropic-ai/sdk@1.3.0`. Den skal bare brukes i `claude.ts`, og ESLint skal hindre import andre steder (`no-restricted-imports` med unntak for fila), om mulig.
- **Fabrikken:** `lagClaudeSprakmodell({ klient })` tar en klient med formen `Pick<Anthropic, "messages">`, slik at testene kan sende inn en falsk klient. Den ekte klienten lages i `miljo.ts` med `new Anthropic({ apiKey, timeout: 4000, maxRetries: 0 })`, én gang per prosess.
- **Kallet** bruker `client.messages.create` med `model: "claude-haiku-5-5"`, `max_tokens: 1024`, `thinking: { type: "disabled" }` og `output_config: { effort: "low" }`.
  - Haiku 5.5 tillater `disabled` ved effort `high` og lavere. Standard effort er `medium`, så `low` settes eksplisitt.
  - Kallet har ingen `temperature`, `top_p` eller `top_k`, og heller ingen `fallbacks` (Haiku 5.5 har ikke det).
  - `signal` fra porten sendes videre som request option.
- **Prompten:**
  - `system` er fast tekst på norsk bokmål, uten tidspunkt eller ID.
  - Brukermeldingen har bare Regelteksten og fakta-lista.
  - Prompten ber om én eller to setninger på norsk bokmål som sier det samme som Regelteksten, med mer naturlig språk.
  - Alle tall og verdier skal gjengis ordrett, med desimalkomma, slik de står.
  - Ingen nye tall og ingen tall skrevet med ord.
  - Ingen løfter om sikkerhet. Ikke nevn ordet, beskriv det, så prompten ikke bryter forbudet i `forbud.test.ts` hvis fila skannes.
  - Svaret skal være ren tekst uten anførselstegn.
- **Svaret:**
  - Teksten settes sammen fra blokkene med `type === "text"` og trimmes.
  - `stop_reason` lik `"refusal"` eller `"max_tokens"`, en tom tekst, en feil fra SDK-en (typede klasser), tidsavbrudd og avbrudd gir `null`.
  - Alle unntatt avbrudd fra klientens `signal` logges med `console.error` med bare klassenavn, status og `stop_reason`. Teksten, prompten og nøkkelen logges aldri (AR-24).
  - Kontrollen gjøres i `svarPaBegrunnelse` (4.2). Hvis den ikke allerede gjøres der, gjøres den her med `kontrollerSprakmodelltekst`.
- **Miljøet:**
  - Med `?demo=` brukes `falsk`.
  - Uten demo og med en nøkkel som ikke er tom (`process.env.ANTHROPIC_API_KEY?.trim()`) brukes Claude. Ellers er modellen `null`.
  - `.env.example` står uendret.
- **README:** et kort avsnitt om at `ANTHROPIC_API_KEY` er valgfri, at alt annet virker uten den, at den bare settes i Production under test og demo med lav utgiftsgrense, og at den aldri skal ha `NEXT_PUBLIC_`.

## Boundaries & Constraints

**Always:**
- Testene av `claude.ts` bruker en falsk klient. Ingen test kaller Anthropic (AR-26).
- En test sjekker at parametrene er nøyaktig de over, og at sampling-feltene mangler.

**Never:**
- Ingen andre nye avhengigheter.
- Ikke sett eller les en ekte nøkkel. Ikke kall Anthropic manuelt.
- Ingen strømming og ingen verktøy.

## I/O & Edge-Case Matrix

| Scenario | Falsk klient gir | Forventet |
|---|---|---|
| Vanlig | `end_turn`, tekstblokk «Kort sagt …» | teksten, trimmet |
| Flere blokker | en `thinking`-blokk og to tekstblokker | tekstblokkene satt sammen |
| Refusal | `stop_reason: "refusal"` | `null`, `console.error` én gang |
| Avkortet | `max_tokens` | `null`, `console.error` |
| Tidsavbrudd | kaster `APIConnectionTimeoutError` | `null`, `console.error` |
| API-feil | kaster `RateLimitError` eller `InternalServerError` | `null`, `console.error` |
| Avbrutt | kaster `APIUserAbortError` | `null`, ingen logg |
| Tom | ingen tekstblokker | `null` |
| Parametre | et hvilket som helst kall | modell, `max_tokens`, `thinking` og `output_config` som i Decisions, uten `temperature`/`top_p`/`top_k`, og prompten inneholder Regelteksten og fakta |
| Miljø | demo, nøkkel uten demo, tom nøkkel og ingen nøkkel | falsk, claude, `null`, `null` |

</frozen-after-approval>

## Code Map

- `src/server/sprakmodell/typer.ts` og `falsk.ts` -- porten fra 4.2.
- `src/server/miljo.ts` og testen -- valget av modell.
- `src/server/begrunnelse.ts` -- kontrollen.
- `eslint.config.mjs` -- `no-restricted-imports`.
- `README.md` -- avsnittet om nøkkelen.

## Tasks & Acceptance

**Execution:**
- [x] Avhengigheten, med eksakt versjon.
- [x] `claude.ts` og test for matrisen.
- [x] `miljo.ts` og test.
- [x] ESLint-regelen og README.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` og `CI=1 npx playwright test`, når de kjøres uten nøkkel, så er alle grønne.

## Verification

**Commands:**
- `npm test`, `npm run lint`, `npx tsc --noEmit` -- forventet: grønne
- `npm run build` -- forventet: bygger uten nøkkel
- `CI=1 npx playwright test` -- forventet: grønn

**Manual checks (Simon):**
- Sett `ANTHROPIC_API_KEY` i Production på Vercel med lav utgiftsgrense i konsollen.
- Gjør en prøve med fem vanlige Søk uten `?demo=` med «Fast 4G»-struping. Noter om Turforslagene kom innen 3 s, om Språkmodellteksten kom innen 5 s, og hvor ofte kontrollen avviste den.

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH6, EC7, EC8 | Testene og e2e kan kalle Anthropic hvis nøkkelen finnes i skallet eller i `.env.local` | high | Bekreftet. Bryter AR-26. | patch |
| EC4 | `ANTHROPIC_LOG` kan skrive prompten til loggen | medium | Bekreftet (AR-24). Bruker nå `logLevel: "off"`. | patch |
| EC3 | `new Anthropic` kan kaste i `lagMiljo` | medium | Bekreftet. Gir nå `null` med logg. | patch |
| BH2, EC1, EC2 | Ukjente `stop_reason` slippes gjennom | medium | Bekreftet. Bare `end_turn` godtas. | patch |
| BH9 | `max_tokens` 1024 er for høyt | low | Bekreftet. Senket til 300. | patch |
| BH1 | Fristen på 4000 er ikke knyttet til fristen på 5 s | low | Bekreftet. | patch |
| BH5, EC5, EC6 | ESLint fanger ikke dynamisk import, og SDK-en eksporteres videre | low | Bekreftet. | patch |
| VG1, EC9, BH4 | Grener for avbrudd og feil er ikke testet | low | Bekreftet. | patch |
| VG2, BH3 | Bytte av nøkkel er ikke testet | low | Bekreftet. Liten endring. | patch |
| BH7, BH8 | Testene leser SDK-ens interne felt og lekker cache | low | Bekreftet. | patch |
| BH10 | `.env.example` nevner «Epic 4» og har ingen vakt mot `NEXT_PUBLIC_` | low | Specen fryser fila. README advarer mot `NEXT_PUBLIC_`. | avvist |

## Implementation Notes

- **`@anthropic-ai/sdk` 1.3.0** er låst til eksakt versjon, godkjent av Simon 2026-11-19. Den drar med seg 7 avhengigheter: `@babel/runtime`, `@opentelemetry/api`, `@stablelib/base64`, `fast-sha256`, `json-schema-to-ts`, `standardwebhooks` og `ts-algebra`.
- **`src/server/sprakmodell/claude.ts`** har `lagClaudeSprakmodell({ klient })` og `lagClaudeKlient(apiKey)`.
  - Klienten lages med `timeout: CLAUDE_TIMEOUT_MS` (fristen minus 1000 ms), `maxRetries: 0` og `logLevel: "off"`, inne i try/catch.
  - Kallet bruker `claude-haiku-5-5`, `thinking: disabled` og `effort: low`.
  - Bare `stop_reason` lik `end_turn` gir tekst.
- **Avvik fra Decisions:** `max_tokens` er 300, ikke 1024. Det gir lavere kostnad og raskere svar innen fristen, og et langt svar regnes som feil.
- **Miljøet:** klienten lages ved første kall uten demo, én per nøkkel. Konstruktørfeil gir `null` og logges én gang.
- **Ingen kall til Anthropic i testene (AR-26):**
  - `vitest.setup.ts` tømmer nøkkelen.
  - Playwright-konfigurasjonen setter `webServer.env.ANTHROPIC_API_KEY = ""`.
  - `testmiljo.test.ts` viser at en tom verdi går foran `.env.local`.
  - Dette gjelder ikke en dev-server som allerede kjører og brukes på nytt lokalt.
- **ESLint** stopper statisk import, `import()` og `require()` av SDK-en utenfor `claude.ts` og testen for den.
- **Prompten** er fast systemtekst på norsk uten tall. Brukermeldingen har bare Regelteksten og fakta.
