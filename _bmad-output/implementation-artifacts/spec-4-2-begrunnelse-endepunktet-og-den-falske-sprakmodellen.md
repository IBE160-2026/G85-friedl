---
title: 'Story 4.2: Begrunnelse-endepunktet og den falske språkmodellen'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '287a085aaa803e48cd989f11faa884142dc500ae'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-4-1-kontroll-av-sprakmodellteksten.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kontrollen finnes, men ingenting ber om en Språkmodelltekst eller bytter den inn (Story 4.2, FR-22, AD-12, AR-18, NFR-3, UX-DR27).

**Approach:**
- `POST /api/begrunnelse` regner ut Regelteksten og fakta selv, spør språkmodellen i Miljøet og kontrollerer svaret.
- Demomodus bruker en falsk modell, og produksjon uten nøkkel gir `{ tekst: null }`.
- Klienten ber om en tekst per Turforslag og bytter den inn bare innen 5 s og bare i samme Resultat.

## Decisions

- **Porten:** `src/server/sprakmodell/typer.ts` har `type Sprakmodell = (inn: { regeltekst: string; fakta: readonly string[] }, signal?: AbortSignal) => Promise<string | null>`.
- **Den falske modellen** (`src/server/sprakmodell/falsk.ts`):
  - Den er deterministisk og gir `` `Kort fortalt: ${regeltekst}.` ``, uten tall eller ord utover Regelteksten.
  - En test går gjennom alle Turforslag i alle demoscenarioene (uj-1, uj-2, uj-3, uten-vaer og ingen-bedre, med standard-Søk og Søkene fra UJ) og sjekker at teksten består `kontrollerSprakmodelltekst`.
- **Miljøet** (`src/server/miljo.ts`) får `sprakmodell: Sprakmodell | null`:
  - I Demomodus er den `falsk`.
  - Uten Demomodus er den `null`. Story 4.3 kobler Claude til når `ANTHROPIC_API_KEY` er satt. Les ikke nøkkelen i denne storyen.
- **Skallet** (`src/server/begrunnelse.ts`) har `lesBegrunnelseForesporsel(data)` og `svarPaBegrunnelse(sok, turId, miljo)`:
  - Body valideres strengt som `{ sok: SokSkjema, turId: string }`. Ugyldig body gir `{ feil: 'ugyldig-sok', detaljer }`, som i `lesSok`.
  - Serveren lager Resultatvisningen på nytt med `svarPaSok` og finner kortet med `turId` bare når `utfall.type === "turforslag"`. Den korteste Turen, frarådet og en ukjent `turId` gir `{ tekst: null }`.
  - `regeltekst` er `kort.regeltekst`, og `fakta` er `lagTurfakta` for Turen fra `TURER`.
  - Er `miljo.sprakmodell` `null`, er svaret `null`.
  - Ellers gjelder svaret fra modellen bare hvis `kontrollerSprakmodelltekst` godkjenner det. Svaret trimmes først.
  - Kaster modellen, er svaret `null`, og feilen logges med `console.error` med bare navn og melding (AR-24).
- **Ruten** `src/app/api/begrunnelse/route.ts` har samme mønster som `/api/sok`:
  - Ukjent demo gir 400.
  - Ugyldig JSON eller body gir 400 `ugyldig-sok`.
  - Ellers er svaret 200 `{ tekst: string | null }`, og uventede feil gir 500.
  - Forespørsler logges ikke.
- **Klienten:**
  - **Kroken** `useBegrunnelser(visning, demoId)` i `src/ui/` sender én `POST` per kort når `utfall.type === "turforslag"`. Den bruker én `AbortController` per Resultat, som avbrytes etter 5 s (`BEGRUNNELSE_FRIST_MS = 5000`), ved nytt Resultat og når komponenten fjernes.
  - **Svaret** legges i et kart nøklet på `resultatId` og `turId`, og brukes bare når `resultatId` er den som vises. Et svar som kommer etter fristen, blir ikke brukt, selv om `fetch` ikke rakk å avbryte.
  - **Teksten** sendes ned som `begrunnelse` (tekst eller `undefined`) til hvert Turkort. Alle tre plassene der `Begrunnelse` vises, bruker `begrunnelse ?? kort.regeltekst`.
  - **Feil:** nettverksfeil, svar som ikke er 200 og `{ tekst: null }` gir ingen endring og ingen melding.
  - **Skjermlesere** får ingen kunngjøring når teksten byttes.
- **UX-DR27:** bare Begrunnelse-boksen endres. Utvalg, rekkefølge, Kriterierader, nummer, kart og Stokkoversikt er uendret.

## Boundaries & Constraints

**Always:**
- Klienten sender aldri tekst, bare `{ sok, turId }`, og bruker `?demo=` som `/api/sok`.
- E2e bruker `?demo=` og har ingen Turnavn (AR-26). Ingen test kaller Anthropic.

**Never:**
- Ingen nye npm-avhengigheter og ingen `@anthropic-ai/sdk` (4.3).
- Ingen endring av rangeringen, `lagResultatvisning` eller kontrollen fra 4.1 utover det som er nødvendig.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Demo | `?demo=uj-1`, UJ-1-Søket | hver Begrunnelse-boks viser «Kort fortalt: …» innen kort tid, og Kriterieradene og rekkefølgen er de samme som før |
| Forsinket | samme, med `page.route` som holder `/api/begrunnelse` i 6 s | Regelteksten står etter 6,5 s |
| Nytt Søk | svar holdt i 2 s, nytt Søk med annen Tilgjengelig tid før svarene kommer | kortene i det nye Resultatet får sine egne svar, aldri de gamle (enhetstest av kroken eller e2e) |
| Korteste Tur | `?demo=uten-vaer` med 15 min | ingen forespørsel, og Regelteksten står |
| Frarådet | `?demo=uj-3` | ingen forespørsel |
| API, ukjent turId | `{ sok, turId: "finnes-ikke" }` | 200 `{ tekst: null }` |
| API, korteste Tur | turId for den korteste Turen | 200 `{ tekst: null }` |
| API, ugyldig Søk | `{ sok: { dato: "x" }, turId }` | 400 `ugyldig-sok` |
| API, uten nøkkel | uten `?demo=` (falsk MET som i route-testene for `/api/sok`) | 200 `{ tekst: null }` |
| Modellen gir feil | en stub-modell som mangler en verdi eller bruker «trygt» | `{ tekst: null }` |
| Modellen kaster | stub som kaster | `{ tekst: null }`, `console.error` én gang |
| SM-4 | uj-1 ved 360, 768 og 1440 px etter innbytting | ingen horisontal rulling |

</frozen-after-approval>

## Code Map

- `src/app/api/sok/route.ts` og `route.test.ts` -- mønster for ruten og testene.
- `src/server/sok.ts` og `miljo.ts` -- `svarPaSok`, `lesSok` og Miljøet.
- `src/kjerne/begrunnelse/` -- `kontrollerSprakmodelltekst` og `lagTurfakta`.
- `src/server/data.ts` -- `TURER`.
- `src/ui/SokFlate.tsx`, `Resultat.tsx`, `Turkort.tsx` og `Begrunnelse.tsx` -- hvor Resultatet og demo-ID-en finnes, og de tre plassene for Begrunnelsen.
- `e2e/` -- ny `e2e/begrunnelse.spec.ts` og `sluttsjekk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `sprakmodell/typer.ts`, `falsk.ts` og test mot alle demoscenarioene.
- [x] `miljo.ts` -- `sprakmodell`.
- [x] `src/server/begrunnelse.ts` og ruten, med tester for matrisen.
- [x] Kroken og Turkort, med enhetstester.
- [x] E2e -- matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH2, EC1, EC2 | `AbortSignal` sendes ikke videre, og serveren har ingen frist | high | Bekreftet. Med Claude i 4.3 ville det gitt betalte kall ingen ser. | patch |
| BH1, VG2 | Serveren kan bygge et annet Resultat enn det klienten viser | medium | Bekreftet. Klienten sender det normaliserte Søket, og `justering` gir `null`. Faren for at MET-dataene er oppdatert i mellomtiden står igjen og er notert. | patch |
| VG1 | Vakten mot gamle Resultater i kroken er ikke testet | medium | Bekreftet. | patch |
| BH3 | Uten demo sender klienten kall som aldri kan lykkes | low | Bekreftet. Sidedata har nå flagget `sprakmodell`. | patch |
| BH6 | Effekten avhenger av objektet `visning` | low | Bekreftet. | patch |
| BH10, BH11 | Feilmeldingen fra modellen kan inneholde prompten, og loggingen er ulik | medium | Bekreftet (AR-24). | patch |
| BH8, BH9, BH13, BH15 | Tester som ikke sjekker noe, oppsett som ikke brukes, `fakta` og `falsk.test` | low | Bekreftet. | patch |
| BH14, EC3 | E2e avhenger av at svaret er tregt | low | Bekreftet. | patch |
| BH16 | Lang kommentarlinje | low | Bekreftet. | patch |
| BH5 | Endepunktet har ingen beskyttelse mot misbruk | medium | AR-23 bruker en lav utgiftsgrense. Endepunktet regner selv ut teksten, er ingen åpen proxy og sender ingen tekst fra klienten. | defer |
| BH4 | Søket regnes ut på nytt for hver forespørsel | low | MET-svaret er bufret, og rangeringen er billig. | avvist |
| BH12 | `ugyldig-sok` brukes også for feil i `turId` | low | Specen bestemte det, med samme mønster som `/api/sok`. | avvist |

## Implementation Notes

- **Serveren:**
  - `src/server/sprakmodell/typer.ts` og `falsk.ts` (`Kort fortalt: {regeltekst}.`).
  - `src/server/begrunnelse.ts` har frist og avbrudd (`AbortSignal.any` med 5 s fra `src/kjerne/begrunnelse/frist.ts`). `justering` gir `null`, og feil logges bare med navn og status.
  - Ruten er `/api/begrunnelse`.
- **Miljøet** har `sprakmodell`: `falsk` i Demomodus og ellers `null`. Sidedata har flagget `sprakmodell`.
- **Klienten:**
  - `useBegrunnelser(visning, demoId, sprakmodell)` er nøklet på `resultatId` og har en frist på 5 s.
  - `Turkort` har `begrunnelse ?? regeltekst` på alle tre plassene.
- **Kjent gjenstående fare:** en oppdatert MET-melding mellom de to kallene kan gi en annen Regeltekst. Det står som kommentar i `begrunnelse.ts`.
- **To eksisterende e2e-tester** avbryter `/api/begrunnelse` for å sjekke Regelteksten.
