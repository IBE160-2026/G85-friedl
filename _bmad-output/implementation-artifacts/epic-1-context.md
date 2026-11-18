# Epic 1 Context: Finn en Tur som passer tiden din

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Brukeren fyller ut Søket og får opptil tre Turforslag i Moldemarka som passer Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser. Hvert forslag har Turtid, Mørkevarsel, Regeltekst og kildelenke. Passer ingen Tur, vises den korteste Turen som Alternativ, så siden er aldri tom. Været er ikke med ennå: værkilden gir `null`, og Resultatet sier «Været er ikke vurdert.». Epicen legger grunnmuren som Epic 2–4 bygger på (oppsett, lagregler, CI, Vercel, kontraktene, Turdatasettet og regelkjernen) og ender med en publisert app som kan vises i Demomodus med `?demo=uten-vaer`.

## Stories

- Story 1.1: Prosjektet settes opp fra starter-malen
- Story 1.2: Appen publiseres på Vercel
- Story 1.3: Søk-kontrakten og tid i Europe/Oslo
- Story 1.4: Visningskontrakten og sidedata
- Story 1.5: Turdatasettet valideres og rutegeometrien konverteres
- Story 1.6: Turtid og filtrering
- Story 1.7: Solberegning og Mørkevarsel
- Story 1.8: Rangering, utvalg og den korteste Turen
- Story 1.9: Regeltekst og innholdet i Turkortet
- Story 1.10: Serveren svarer på Søket
- Story 1.11: Søk-flaten
- Story 1.12: Resultat med Turkort på PC
- Story 1.13: Stokken på mobil og nettbrett
- Story 1.14: Alternativ, Kontaktfeil, Plassholder og Tilbake
- Story 1.15: README og sluttsjekk for Epic 1

## Requirements & Constraints

- **Søket:** Turdag i dag eller i morgen (etter 22:00 bare i morgen). Starttidspunkt i hele kvarter 06:00–22:00, med standard «nå» rundet opp (tidligst 06:00) for i dag og 10:00 for i morgen. Passerte tider er låst. Tilgjengelig tid er 15 min–5 t i steg på 15 (standard 2 t, uten reise). Vanskelighetsgrad har standard Middels, og utsikt og vann er valgfrie. All tid følger Europe/Oslo.
- **Regler:** Turtid regnes etter Naismith og vises «uten pauser». Turer over Tilgjengelig tid (lik er med) eller vanskeligere enn valgt (G < B < R) fjernes. Mørkevarsel fjerner aldri Turer. Rangeringen er uten Mørkevarsel først, så flest preferansetreff, så Turtid nærmest Tilgjengelig tid, så ID, og den er deterministisk. Utvalget tar den beste Turen per Mål først, fyller på bare ved færre enn tre, og fyller aldri med Turer som ikke passer. Uten treff blir den korteste Turen innenfor Vanskelighetsgraden Alternativ med «trenger N min mer».
- **Regeltekst:** nevner Turtid av Tilgjengelig tid, at værdata mangler, og preferansene som treffer. Den nevner aldri en regel som ikke slo inn, og samme input gir samme tekst. Ingen tekst inneholder «trygg» eller «trygt».
- **Kilde og kreditering:** hvert kort lenker til kilden med kildens navn som lenketekst. Krediteringen står nederst i alle tilstander.
- **Ikke-funksjonelt:** brukbar 360–1440 px uten horisontal rulling. Trykkflater er minst 44 × 44 px, og ingenting krever hover. Tastatur, synlige etiketter, kontrast minst 4,5:1 og 200 % zoom ved 360 px. Bokmål. Ingen persondata, posisjon, kontoer, informasjonskapsler, sporing eller logging av forespørsler. Startbar etter README uten nøkler. Turforslag vises innen 3 s med «Fast 4G»-struping.

## Technical Decisions

- **Functional core, imperative shell, håndhevet med ESLint:** `src/kjerne/` er ren TS uten `fetch`, `Date.now`, `process` og argumentløs `new Date()`. `src/server/` er skallet, og `src/app/api/` har tynne route handlers. `src/app/` og `src/ui/` importerer bare typer fra kjernen, og bare `page.tsx` importerer skallet (`src/server/side.ts`).
- **Regelmotoren kjører bare på serveren.** UI-et viser ferdige strenger, andeler og flagg. Det regner ikke, formaterer ikke domeneverdier og bygger aldri et Søk av et tidspunkt. Det finnes ingen lagret tilstand, og Søket og Resultatet står aldri i URL-en.
- **Kontraktene:** `SokSkjema` og `normaliserSok` i `src/kjerne/sok.ts` er den eneste justeringen, og `/api/sok` gir aldri 400 for passert tid. Visningsmodellen er ett Zod-skjema i `src/kjerne/visning/skjema.ts`, med `utfall` `turforslag`/`kortesteTur`/`fraradet`, `vaer` `vurdert`/`mangler` og kriterier med `merke` `ok`/`se-opp`/`ingen`. Skjemaet utvides når et felt trengs, og ingen snake_case-felt går ut av skallet. En kontrakttest validerer `/api/sok` for hver demo-ID. `lagSidedata(demoId)` er sidens eneste datakilde.
- **Klokke og Demomodus:** klokka leses bare i `src/server/miljo.ts` (`lesDemoId`, `lagMiljo`). Demo-ID-en reiser bare som `?demo=` via `src/ui/api.ts`. Demo bruker fast «nå» fra scenarioet og alltid det ekte Turdatasettet, og scenarioene importeres statisk i `src/server/vaer/scenarioer.ts`.
- **Tid, format og sol:** bare `src/kjerne/tid.ts` bruker `@date-fns/tz`, og øyeblikk sendes som epoke-ms i UTC. All tekst med tall lages i `src/kjerne/format.ts` (24-timersklokke, «1 t 32 min», desimalkomma uten «,0»). Regelfunksjonene får `soltider` per Oslo-dato fra orkestreringen.
- **Data:** `data/` leses med statiske importer, aldri med `fs`. Omtrentlig rute går til visningsmodellen som `MultiLineString` i `[lon, lat]`, og punkter er `{ lat, lon }`. Regeltestene bruker `testdata/turer.json`.
- **Feil:** 400 gir `{ feil: 'ugyldig-sok', detaljer }` eller `{ feil: 'ukjent-demo', gyldigeDemoIder }`, og alt annet gir 500. Ugyldig Søk og 500 gir Kontaktfeil-kortet. Klientens tidsgrense er 10 s.
- **Konvensjoner:** PRD-begrepene på bokmål uten æøå i identifikatorer, kebab-case `.ts` og PascalCase `.tsx`. Tester ligger ved koden som `*.test.ts`, og Playwright ligger i `e2e/`. CSS Modules med tokens i `src/ui/tokens.css`, ikke Tailwind. Faste tekster står ordrett fra EXPERIENCE.md i `src/ui/tekster.ts`.
- **Tester:** navngitte regeleksempler testes bare i Vitest mot kjernen. Playwright går mot `?demo=uten-vaer` og sjekker tilstand, antall og felt, men aldri Turnavn. Ingen test kaller MET eller Anthropic.
- **Drift:** Vercel Hobby i `arn1`, dynamisk rendring og ingen `"use cache"`. CI kjører lint, Vitest og Playwright ved hver push.

## UX & Interaction Patterns

- **Utseende:** bare lys modus. Dybde lages med stokk-kanter, kortfot og hårstreker, uten skygger, gradienter eller glass. Knappene er piller, og rust brukes aldri på knapper. ✓ og → er SVG, fordi Nunito Sans mangler glyfene.
- **Kriterieradene** Tid, Vær, Ønsker og Mørke kommer i fast rekkefølge og følger regeltabellen i EXPERIENCE.md. Uten vær er Vær-raden «–» «ikke vurdert». Mørkevarsel gir «!» med klokkeslett og «Lurt å ta med hodelykt.» som siste linje. Tid-raden er «!» bare på Alternativkortet.
- **Regeltekst-mønsteret:** delene skilles med «, », har liten forbokstav og ikke punktum til slutt, for eksempel «passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt».
- **Søk:** Segmentvelgere (radiogrupper), Trinnvelgere (− / `<select>` / +) og Preferansebrikker (avkrysningsbokser). «Finn tur» er aldri låst, og en `justering` vises under Starttidspunkt.
- **Resultat:** PC (≥ 1200 px) har kortene side om side og Ditt søk som panel. Mobil og nettbrett (360–1199 px) har Stokken med ett kort, Stokknavigasjon i tommelsonen og Stokkoversikt under. Overskriften bruker tallord og meldes i et høflig live-område, og hvert kort leses som én artikkel.
- **Tilstander:** Alternativkortet, Plassholderstokken uten spinner og Kontaktfeil-kortet etter 10 s eller ved nettverksfeil. Ingen tilstand gir en tom side.
- **Interaksjon:** ett trykk er nok. Et nytt Søk erstatter Resultatet og ruller til overskriften. Resultat lager én historikkoppføring, og Tilbake går til Søk med verdiene. `?demo` beholdes. Ingen karusell, popup, varsler, tellere, deling, favoritter, innlogging eller «Min posisjon».

## Cross-Story Dependencies

- 1.1–1.8 er ferdige. Vercel var allerede koblet til organisasjonen, så reserven med deploy fra Actions trengs ikke.
- 1.9 (Regeltekst og kortinnhold) må være ferdig før 1.10 (`/api/sok`), og 1.10 må være ferdig før UI-storyene 1.11 → 1.12 → 1.13 → 1.14. 1.15 avslutter med README, måling av svartiden på 3 s og sjekklisten ved 360, 768 og 1440 px.
- Mot andre epics: værkilden gir `null` til Epic 2 er ferdig. Skjemaet har allerede variantene for vær, frarådet og Bedre tidsvindu. Kart og Kartutsnitt kommer i Epic 3, og til da bruker PC nettbrettoppsettet på Søk. Språkmodellteksten kommer i Epic 4.
