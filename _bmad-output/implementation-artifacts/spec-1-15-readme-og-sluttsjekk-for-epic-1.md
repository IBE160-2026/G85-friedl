---
title: 'Story 1.15: README og sluttsjekk for Epic 1'
type: 'chore'
created: '2026-11-18'
status: 'in-review'
baseline_commit: 'e4ed5afbe22b8802af42be2cd759ddd06d29ca70'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/deferred-work.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** README forklarer ikke hvordan en sensor starter appen, bruker Demomodus eller kjører testene. Ingen har heller sjekket Epic 1 som helhet mot ytelseskravet (NFR-5), sjekklisten for responsivt oppsett (SM-4) og forbudene i UX-DR46 og UX-DR47 (Story 1.15, AR-25, NFR-3, NFR-5, NFR-8).

**Approach:**
- Utvid README.
- Gjør sjekkene i SM-4 og forbudslisten om til en Playwright-test (`e2e/sluttsjekk.spec.ts`) som kan kjøres igjen.
- Mål NFR-5 mot Production med et skript som struper nettverket som Chromes «Fast 4G».
- Noter resultatene i `_bmad-output/implementation-artifacts/epic-1-sluttsjekk.md`.
- Rett småfeil som sjekken finner, innenfor rammene under.

## Decisions

- **README** får seksjonene:
  - «Kom i gang»: `npm install && npm run dev`, Node-versjon fra `package.json`/`.nvmrc` hvis den finnes, og at ingen `.env` eller `ANTHROPIC_API_KEY` trengs (NFR-3).
  - «Demomodus»: `?demo=uten-vaer`, og hva den gjør.
  - «Tester»: `npm test`, `npm run lint`, `npm run test:e2e`, og `CI=1 npx playwright test` mot produksjonsbygget.

  Den eksisterende seksjonen om rutegeometri beholdes og omtales som konverteringsskriptet.
- **SM-4 automatisert:** ved 360, 768 og 1440 px, for Søk, Turforslag (standard-Søk) og Alternativ (15 min), sjekkes:
  - at `scrollWidth <= clientWidth`
  - at alle synlige knapper, lenker og skjemakontroller er minst 44 × 44 px eller ligger inne i en slik flate
  - at siden ikke har noen `title`-attributter eller `:hover`-avhengig innhold. Det sjekkes at ingen elementer bare blir synlige ved hover: i CSS-fila står ingen `:hover`-regel som endrer `display`, `visibility` eller `opacity`.
- **Forbudene i UX-DR46** sjekkes statisk i testen. Ingen `dialog` eller `role="dialog"`, ingen `Notification`, `navigator.share`, `geolocation` eller `localStorage` i `src/ui`, og ingen innlogging. Sjekken bruker `grep` i en Vitest-test (`src/ui/forbud.test.ts`).
- **Ordbruken (UX-DR47, NFR-8)** gjennomgås ved å lese `src/ui/tekster.ts` og tekstene i kjernen mot begrepene i PRD §3. Avvik rettes hvis rettingen er triviell. Ellers noteres de.
- **NFR-5-målingen:** skriptet `scripts/mal-svartid.ts` kjøres med `npx tsx`. Det bruker Playwright og CDP `Network.emulateNetworkConditions` med verdiene Chrome DevTools bruker for «Fast 4G». Verdiene noteres. Skriptet åpner `https://g85-friedl.vercel.app/?demo=uten-vaer` og trykker «Finn tur». Det måler tiden til det første Turkortet er synlig, fem ganger etter én oppvarming, og skriver median og maks. Det krever en Production-deploy som inneholder 1.14.
- **Ren klone:** `git clone` til en midlertidig mappe, deretter `npm ci`, `npm run build` og `npm start`. Så kalles `/?demo=uten-vaer` og `/api/sok`. Resultatet noteres. Dette kan gjøres av den som kjører storyen, og trenger ikke ligge i en test.

## Boundaries & Constraints

**Always:**
- Resultatene noteres med dato, bredder, verdier og det som eventuelt feilet, i `epic-1-sluttsjekk.md`.
- Funn som ikke kan rettes trivielt, noteres som åpne punkter. De rettes ikke i denne storyen.
- Utsatte saker i `deferred-work.md` som gjelder 1.15 (største bredde på brede skjermer, overlappende etiketter i Dagslysstolpen, trange Kriterierader ved 180 px), vurderes. De rettes hvis det er triviell CSS, og noteres ellers.

**Never:**
- Ingen nye funksjoner og ingen endring av oppførsel.
- Ingen hemmeligheter i README eller i sluttsjekken.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| README | lest | Kom i gang, Demomodus, Tester og konverteringsskriptet, og at appen virker uten `ANTHROPIC_API_KEY` |
| Ren klone | uten `.env` | appen starter og gir Turforslag med «Været er ikke vurdert.» |
| NFR-5 | Production med «Fast 4G» | median og maks ≤ 3 s, eller avviket notert |
| SM-4 | 3 visninger × 3 bredder | ingen horisontal rulling, trykkflater på 44 px og ingenting som krever hover |
| Forbud | `src/ui` | ingen av de forbudte API-ene eller mønstrene |

</frozen-after-approval>

## Code Map

- `README.md` -- utvides.
- `e2e/` -- ny `sluttsjekk.spec.ts`.
- `src/ui/` -- ny `forbud.test.ts`, og eventuelt små CSS-rettinger.
- `scripts/` -- ny `mal-svartid.ts`.
- `_bmad-output/implementation-artifacts/epic-1-sluttsjekk.md` -- ny fil med resultatene.

## Tasks & Acceptance

**Execution:**
- [x] `README.md` -- seksjonene over.
- [x] `e2e/sluttsjekk.spec.ts` og `src/ui/forbud.test.ts` -- SM-4 og forbudene.
- [x] `scripts/mal-svartid.ts` -- NFR-5-målingen. Den kjøres når Production har 1.14.
- [x] `_bmad-output/implementation-artifacts/epic-1-sluttsjekk.md` -- resultatene fra den rene klonen, SM-4, ordbruken og NFR-5.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.
- Gitt sluttsjekken, når den leses, så har hvert krav i storyen et notert resultat.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn
- `npx tsx scripts/mal-svartid.ts` -- forventet: median og maks skrevet ut

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC4 | `npx tsx` laster ned en tsx-versjon som ikke er låst | medium | Bekreftet. Bruker nå `node` direkte, som `rutegeometri` gjør. | patch |
| BH9, EC1–3 | Målingen stopper på første kort og ser bort fra opacity | medium | Bekreftet. Stopper nå når Regelteksten er synlig. Rettet også medianen og feilhåndteringen. | patch |
| BH2, EC11, EC12 | `forbud.test.ts` avhenger av hvilken `grep` maskinen har | medium | Bekreftet. Skrevet om med `fs` og `RegExp`. | patch |
| BH3, EC13 | `sign ?in` mangler ordgrenser | low | Bekreftet. «designing» traff mønsteret. | patch |
| BH4, EC8 | SVG `<title>` blir ikke fanget | low | Bekreftet. | patch |
| BH5, EC5–7 | Hover-sjekken er smal og kan kaste | low | Bekreftet. | patch |
| EC9 | Sjekken leser JSON uten å se på status | low | Bekreftet. | patch |
| BH10 | Unntaket for trykkflater gjelder mer enn kommentaren sier | low | Bekreftet. Gjelder nå bare radioknapper og avkrysningsbokser. | patch |
| BH6 | SM-4 dekker ikke Kontaktfeil eller ukjent demo | low | Bekreftet. | patch |
| VG1, BH6 | CSS-rettingen i Kriterierad har ingen test | medium | Bekreftet. Geometritest ved 180 og 360 px. | patch |
| BH7 | Den rene klonen testet ikke det storyen leverer | medium | Bekreftet. Kjøres på nytt etter commit, slik README beskriver. | patch |
| BH8 | To steg har samme klokkeslett | low | Bekreftet. | patch |
| BH11 | Ordbruken er bare sjekket for hånd | low | Bekreftet. Ordene er lagt til i `forbud.test.ts`. | patch |
| BH12 | Kravnummeret NFR-6 er feil | low | Bekreftet. | patch |
| EC15 | README sier at alle e2e-testene går mot `uten-vaer` | low | Bekreftet. | patch |
| EC10 | Kontroller som bare vises ved fokus | low | Appen har ingen slike. | avvist |
| EC14 | `role` i en template-literal | low | Ingen slik kode finnes. | avvist |
| EC16 | Forbudene sjekkes ikke på den rendrede siden | low | Ingen kode legger inn markup ved kjøring. Kildesjekken er tilstrekkelig, og `svg title` sjekkes også i e2e. | avvist |
| BH5 (container query) | Bruk container query i stedet for media query | low | Kortene er aldri smalere enn visningsbredden, utenom på PC. | avvist |
