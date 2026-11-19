# Epic 3 Context: Se Turforslagene på kartet

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Brukeren ser Startpunkt og Omtrentlig rute for hvert Turforslag på et dempet Kartverket-kart, og kan velge Tur både i kartet og i listen. Søk-flaten på PC viser de 8 Startpunktene. Mobil og nettbrett får Kartutsnitt i kortene. Visningsmodellen har allerede `kart` per kort (`rute` som `MultiLineString` i `[lon, lat]`, `startpunkt`, `nummer` og eventuell `malpunkt`). Det er bare UI-et som mangler.

## Stories

- Story 3.1: Kartet viser Turforslagene
- Story 3.2: Kartutsnitt i kortene
- Story 3.3: Søk-kartet på PC
- Story 3.4: Når bakgrunnskartet ikke laster
- Story 3.5: Velg Turforslag i listen eller på kartet

## Requirements & Constraints

- **AR-19:** Leaflet 1.9.4 og react-leaflet 5.0.0 (installert, med `@types/leaflet` 1.9.22).
  - Kartet lastes via klientkomponenten `src/ui/KartLaster.tsx` med `next/dynamic` og `ssr: false`, og `leaflet.css` importeres der.
  - Ruter tegnes bare med `<GeoJSON>`.
  - Kartutsnittet er samme komponent uten interaksjon.
  - Bakgrunnen er Kartverket `topograatone` (webmercator): `https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png`, uten nøkkel.
  - «© Kartverket» er en lenke. `tileerror` gir en egen tilstand (AD-15).
- **AR-20:** nettleseren kontakter bare vår egen server og `cache.kartverket.no`. Playwright stubber kartflisene.
- **FR-23:** én markør og én rute per Turforslag, merket «omtrentlig rute». Kartet zoomer slik at alle synes.
- **FR-24** («kan utgå» i prioriteringen): velges et kort, uthever kartet det, og Kartinfoboksen viser navn, lengde totalt, Vanskelighetsgrad og Startpunkt. Velges det på kartet, uthever listen det. Ett kort er valgt om gangen, kort 1 fra start, og valget er merket for skjermlesere.
- **FR-25:** zoom og panorering med mus og berøring. Bakgrunnskartet krever ingen nøkkel, og krediteringen synes.
- **FR-29:** kreditering i kartet.
- **UX-DR13, rekkefølgen i Resultatet:**
  - PC: kartet over kortene.
  - Mobil og nettbrett: kartet etter Stokken, og så Stokkoversikten.
  - Ingen kart ved frarådet, Kontaktfeil eller mens svaret venter.
  - Ved Alternativet viser kartet ruten til den korteste Turen (EXPERIENCE › State Patterns).
- **UX-DR36:** det dempede gråtonekartet.
  - Den valgte ruten er stiplet skoggrønn. De andre er tynne og grå. Alle har papirhalo.
  - Startpunktet er en nummerert sirkel, med numrene side om side når Startpunktet er delt.
  - Mål er en trekant.
  - Etiketten «omtrentlig rute» står i kursiv langs den valgte ruten.
  - Tegnforklaringen står nede til venstre, med Mål bare når det finnes. Krediteringspillen står nede til høyre.
  - Høyden er `map-height-desktop` (340 px) eller `map-height-mobile` (250 px).
- **UX-DR37:** Kartinfoboksen (3.5) er et papirfelt med skoggrønn kant og et lite stempel. Den står øverst til høyre på PC og over kartet på mobil, og den er ikke interaktiv.
- **UX-DR38:** Kartutsnittet (3.2) er statisk, `map-snippet-height` høyt og 160 px på nettbrett. Det har merket «Turforslag N av 3» og «omtrentlig rute · © Kartverket». Et trykk ruller til kartet med kortet valgt. Alternativkortet har merket «Alternativ».
- **UX-DR39:** feiler kartflisene, blir kartflaten papirfarget med ruter, Startpunkter og Mål, og teksten «Bakgrunnskartet kunne ikke lastes.» (3.4).
- **UX-DR40:** Søk-kartet på PC har de 8 Startpunktene og telleteksten «12 Turer fra 8 Startpunkter» fra sidedataene (3.3). Skjemakortet er 5/12 og kartet 7/12.
- **UX-DR43 og UX-DR44:** det valgte kortet er merket for skjermleser. Ruter og Startpunkter nås med tastatur og har fokusring. Trykkflater er minst 44 × 44 px.
- **Kartet er aldri eneste kilde** til informasjon. Alt det viser, står også i kortet.
- **Tokens:** `--components-kart-*`, `--spacing-map-height-*` og `--rounded-map` i `src/ui/tokens.css`.

## Technical Decisions

- **Lagreglene:**
  - `src/kjerne` er ren.
  - UI-et importerer bare typer fra kjernen.
  - Klokka leses bare i `src/server/miljo.ts`.
  - ESLint og `lagregler.test.ts` håndhever reglene.
- **Ingen test** kaller Kartverket, MET eller Anthropic. E2e bruker alltid `?demo=` og har ingen Turnavn (AR-26).
- **Skissene** ligger i `_bmad-output/planning-artifacts/ux/konsept-07-kortstokken/`: pc-1, pc-2, mob-2 og mob-3.
- **Ingen prettier.** Prosjektets stil er ca. 120 kolonner.

## Cross-Story Dependencies

- 3.2 bruker kartkomponenten fra 3.1.
- 3.4 bygger på `tileerror` i den.
- 3.5 kobler valget i `Resultat.tsx` (`valgt`) til kartet og legger til Kartinfoboksen.
- I 3.1 viser kartet bare det valgte kortet fra Stokken som valgt.
