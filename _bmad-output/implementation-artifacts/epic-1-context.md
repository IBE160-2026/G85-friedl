# Epic 1 Context: Finn en Tur som passer tiden din

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Brukeren fyller ut Søket og får opptil tre Turforslag i Moldemarka som passer Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser. Hvert forslag har Turtid, Mørkevarsel, Regeltekst og kildelenke. Passer ingen Tur, vises den korteste Turen som Alternativ, slik at siden aldri er tom. Været er ikke med ennå: værkilden gir alltid `null`, og Resultatet sier «Været er ikke vurdert.». Epicen legger grunnmuren som Epic 2–4 bygger på: prosjektoppsett, lagregler, CI, Vercel, Søk-kontrakten, visningsmodellen, Turdatasettet og regelkjernen. Den ender med en publisert app som kan vises i Demomodus med `?demo=uten-vaer`.

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

- **Søket:** Turdag «i dag» eller «i morgen» (standard i dag, etter 22:00 bare i morgen). Starttidspunkt i hele kvarter 06:00–22:00: standard er «nå» rundet opp (tidligst 06:00) for i dag og 10:00 for i morgen, og passerte tider er låst. Tilgjengelig tid 15 min–5 t i steg på 15 (standard 2 t, gjelder selve turen uten reise). Vanskelighetsgrad Enkel/Middels/Krevende (standard Middels). Utsikt og vann er valgfrie. All tid følger Europe/Oslo uansett tidssone på enhet eller server.
- **Turtid:** Naismith, lengde totalt ÷ 5 km/t + høydemeter ÷ 600 m/t, rundet til hele minutter og vist «uten pauser».
- **Filtrering:** Turer med Turtid over Tilgjengelig tid fjernes (lik er med), og det samme gjelder Turer som er vanskeligere enn valgt (G < B < R). Mørkevarsel og vær fjerner aldri Turer.
- **Rangering (godt eller manglende vær):** uten Mørkevarsel først, så flest treff på Opplevelsespreferanser, så Turtid nærmest Tilgjengelig tid, så ID alfabetisk. Rekkefølgen er deterministisk, også når input er stokket.
- **Utvalg:** opptil tre Turforslag. Den beste Turen per Mål velges først, og listen fylles på i rangert rekkefølge bare ved færre enn tre. Listen fylles aldri med Turer som ikke passer. Ansvarsmerknaden står under.
- **Korteste Tur:** fjerner filtreringen alt, vises den korteste Turen innenfor valgt Vanskelighetsgrad som Alternativ, med «trenger N min mer». Mørkevarsel gjelder også her.
- **Mørkevarsel:** gis når Turen ender senere enn 30 min før solnedgang eller starter før soloppgang, med klokkeslett og «Lurt å ta med hodelykt.». Sola regnes lokalt for Værpunktet.
- **Regeltekst:** nevner Turtid og Tilgjengelig tid, at værdata mangler, og hvilke Opplevelsespreferanser som treffer. Den nevner aldri en regel som ikke slo inn, samme input gir samme tekst, og ingen tekst inneholder «trygg» eller «trygt».
- **Turdatasett:** én fil, og Turer som starter på samme sted, har identisk Startpunkt. En automatisk test feiler ved manglende eller ugyldig felt, ukjent Rutesegment, hull over 50 m, Startpunkt over 200 m (eller over Adkomst + 200 m) fra rutene, og høydemeter som ikke er kontrollert eller avviker mer enn 20 m.
- **Kilde og kreditering:** hvert kort lenker til kilden med kildens navn som lenketekst. Krediteringen står nederst i alle tilstander.
- **Ikke-funksjonelt:** brukbar 360–1440 px uten horisontal rulling, trykkflater minst 44 × 44 px, ingenting krever hover. Tastatur, synlige etiketter, kontrast minst 4,5:1 og 200 % zoom ved 360 px. Bokmål. Ingen persondata, posisjon, kontoer, informasjonskapsler, sporing eller logging av forespørsler. Startbar etter README uten nøkler. Turforslag vises innen 3 s med «Fast 4G»-struping.

## Technical Decisions

- **Lag (functional core, imperative shell), håndhevet med ESLint:**
  - `src/kjerne/` er ren TS uten `fetch`, `Date.now`, `process` og argumentløs `new Date()`.
  - `src/server/` er skallet.
  - `src/app/api/` har tynne route handlers.
  - `src/app/` og `src/ui/` er visning og importerer bare typer fra kjernen.
  - Bare `page.tsx` importerer fra skallet, og bare `src/server/side.ts`.
- **Regelmotoren kjører bare på serveren.** Nettleseren regner aldri ut regler, formaterer ikke domeneverdier og bygger aldri et Søk av et tidspunkt. Det finnes ingen database eller lagret tilstand. Søk og Resultat lever i klientens minne og står aldri i URL-en.
- **Søk-kontrakten:** `SokSkjema` (`.strict()`) i `src/kjerne/sok.ts`: `{ dato 'YYYY-MM-DD', start 'HH:MM', tilgjengeligMin, vanskelighetsgrad 'G'|'B'|'R', utsikt, vann }`. `normaliserSok(sok, na)` er den eneste justeringen. Den runder passert tid opp til neste kvarter, gjør et Søk etter 22:00 om til i morgen 10:00, og erstatter en ukjent dato med standard-Søket. `/api/sok` gir aldri 400 for passert tid og returnerer `sok` og `justering?`.
- **Visningsmodellen** er ett Zod-skjema i `src/kjerne/visning/skjema.ts` og skrives før UI-storyene. Det har `resultatId`, `sok`, `justering?`, `overskrift`, `dittSok`, `liveTekst`, `vaer` (`vurdert`/`mangler`), `utfall` (`turforslag`/`kortesteTur`/`fraradet`), kortfelt og `bedreTidsvindu`. Kriterier har `merke` `ok`/`se-opp`/`ingen` (vist som ok, warn og none). Skjemaet utvides når et felt trengs. Ingen snake_case-felt går ut av skallet. En kontrakttest validerer `/api/sok` for hver demo-ID.
- **Sidedata:** `lagSidedata(demoId)` i `src/server/side.ts` er sidens eneste kilde og gir demo-info, skjemavalg med låste valg, standard-Søk, Startpunkter og telletekst, eller `{ feil: 'ukjent-demo', gyldigeDemoIder }`.
- **Klokke og miljø:** klokka leses bare i `src/server/miljo.ts` (`lesDemoId`, `lagMiljo`). Demo-ID reiser bare som `?demo=` via `src/ui/api.ts`. Demo bruker fast «nå» fra `data/vaerscenarioer/<id>/scenario.json` og alltid det ekte Turdatasettet. Scenarioene importeres statisk i registeret `src/server/vaer/scenarioer.ts`.
- **Tid og formatering:** `src/kjerne/tid.ts` er eneste bruker av `@date-fns/tz` og har `timerITidsvindu` (halvåpent intervall, overlapp teller). Øyeblikk sendes som epoke-ms i UTC. All tekst med tall lages i `src/kjerne/format.ts`: 24-timersklokke, «1 t 32 min» og desimalkomma uten «,0».
- **Sol:** egen NOAA-implementasjon i `src/kjerne/sol.ts` (senit 90,833°, havnivå, Værpunktet, hele minutter), ikke suncalc. Regelfunksjonene får `soltider: Record<Oslo-dato, { oppUtc, nedUtc }>` for Turdagen, og for i morgen også når Turdag er i dag. Orkestreringen bygger objektet, og en dato som mangler, er en feil.
- **Data:** Tur-skjemaet i `src/kjerne/turdata/skjema.ts` bruker feltnavnene fra `data/turer-moldemarka.json` uendret, og `mal_punkt` er valgfritt. `testdata/turer.json` er en fast kopi som bare regeltestene bruker. `scripts/konverter-rutegeometri.ts` (proj4) lager `data/rutegeometri.geojson` (WGS84, ett objekt per Rutesegment), og fila committes. Ruten går til visningsmodellen som `MultiLineString` i `[lon, lat]`, og punkter er `{ lat, lon }`. `data/` leses med statiske importer, aldri med `fs`.
- **Feil:** 400 med `{ feil: 'ugyldig-sok', detaljer }` eller `{ feil: 'ukjent-demo', gyldigeDemoIder }`, og 500 for alt annet. Ugyldig Søk og 500 gir Kontaktfeil-kortet i klienten. Klientens tidsgrense er 10 s. Bare adapterfeil logges, med `console.error`.
- **Konvensjoner:** PRD-begrepene på bokmål uten æøå i identifikatorer, camelCase for verdier og PascalCase for typer og komponenter. kebab-case `.ts` og PascalCase `.tsx`. Tester ligger ved koden som `*.test.ts`, og Playwright ligger i `e2e/`. CSS Modules med tokens i `src/ui/tokens.css`, ikke Tailwind. Faste tekster står ordrett i `src/ui/tekster.ts`.
- **Stack og drift:** Next.js App Router med låste versjoner (se Story 1.1 og `package-lock.json`). Kjernen bruker bare de rene bibliotekene `zod`, `date-fns` og `@date-fns/tz`. Nunito Sans selvhostes via `next/font`. Vercel Hobby, `regions: ["arn1"]`, dynamisk rendring og ingen `"use cache"`. GitHub Actions kjører lint, Vitest og Playwright ved hver push. Eneste miljøvariabel er den valgfrie `ANTHROPIC_API_KEY`. `.env.example` committes, `.env` gjør det ikke.
- **Tester:** Vitest kjører regelkonsekvensene og de navngitte eksemplene mot kjernen med `testdata/turer.json`. Datasett-testen går mot det ekte Turdatasettet. Playwright går mot `?demo=uten-vaer` og sjekker tilstand, antall og felt, men aldri Turnavn. Ingen test kaller MET eller Anthropic.

## UX & Interaction Patterns

- **Utseende:** alle tokens fra DESIGN.md blir CSS-variabler, og det finnes bare lys modus. Dybde lages med stokk-kanter, kortfot og hårstreker, uten uskarpe skygger, gradienter eller glass. Knappene er piller (primær, sekundær eller tonet), og rust brukes aldri på knapper. ✓ og → tegnes som SVG, fordi Nunito Sans mangler glyfene.
- **Søk:** Segmentvelgere (radiogruppe) for Turdag og Vanskelighetsgrad, Trinnvelgere (− / `<select>` / +) for Starttidspunkt og Tilgjengelig tid, og Preferansebrikker (avkrysningsbokser). Hjelpetekstene står ordrett. «Finn tur» er aldri låst, og en `justering` vises som hjelpetekst under Starttidspunkt.
- **Resultat (PC, ≥ 1200 px):** rekkefølgen er Demomodus-merke, Ditt søk-panel, Værmangel-linjen, overskriften (live-område), kort side om side, Ansvarsmerknad og Kreditering. Turkortet har Nummerstempel, Mål og «fra …», faktalinje, Startpunkt, perforering, PASSER FORDI, fire Kriterierader (Tid, Vær, Ønsker, Mørke), Tidsstolpe og Dagslysstolpe, Begrunnelse-boks og kildelenke. Skjermlesere leser hvert kort som én artikkel.
- **Mobil og nettbrett (360–1199 px):** Stokken med ett kort om gangen, stokk-kanter og Stokknavigasjon i tommelsonen. Sveip og ← → blar, animasjonen er ca. 250 ms og slås av med «Reduser bevegelse». Stokkoversikten står under. Ditt søk er én linje, og «Endre søk» står i toppfeltet.
- **Tilstander:** Alternativkortet (stempel «→», Tid-raden warn, rust bit på Tidsstolpen og knappen «Endre Tilgjengelig tid»), Plassholderstokken uten spinner, Kontaktfeil-kortet etter 10 s eller ved nettverksfeil («Prøv igjen» og «Endre søk»), og Demomodus-merket i oker.
- **Interaksjon:** ett trykk er nok. Et nytt Søk erstatter Resultatet og ruller til overskriften. Resultat lager én historikkoppføring, og Tilbake går til Søk med verdiene. `?demo` beholdes. Ingen karusell, popup, varsler, tellere, deling, favoritter, innlogging eller «Min posisjon».

## Cross-Story Dependencies

- 1.1 og 1.2 kommer først. Vercel-tilgangen er avklart (2026-11-18): appen var allerede installert i organisasjonen IBE160-2026, så reserven med deploy fra Actions trengs ikke.
- Kontraktene i 1.3 (Søk) og 1.4 (visningsmodell og sidedata) må være ferdige før serveren (1.10) og UI-storyene (1.11–1.14).
- 1.5 (Turdatasett og geometri) trengs av 1.6–1.10. Regelkjernen 1.6 → 1.7 → 1.8 → 1.9 må være ferdig før 1.10 kan svare.
- 1.11 → 1.12 → 1.13 → 1.14 bygger på hverandre. 1.15 avslutter med README, måling av svartiden på 3 s og den manuelle sjekklisten ved 360, 768 og 1440 px.
- Mot andre epics: værkilden gir `null` til Epic 2 er ferdig, og skjemaet har allerede variantene `vaer.vurdert`, `fraradet` og `bedreTidsvindu` til Epic 2. Kart, Kartutsnitt og Søk-kartet kommer i Epic 3, så PC bruker nettbrettoppsettet på Søk inntil da. Språkmodellteksten kommer i Epic 4.
- Dokumentoppfølgingen hører hjemme i 1.1: skriften i DESIGN.md og EXPERIENCE.md byttes til Nunito Sans, og Krediteringen sier «© Kartverket».
