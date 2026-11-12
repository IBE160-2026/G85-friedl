---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-turplanlegger-app-2026-11-02/prd.md
  - _bmad-output/planning-artifacts/prds/prd-turplanlegger-app-2026-11-02/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-turplanlegger-app-2026-11-12/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux/DESIGN.md
  - _bmad-output/planning-artifacts/ux/EXPERIENCE.md
  - _bmad-output/planning-artifacts/kalibrering/README.md
---

# Turplanlegger - Epic Breakdown

## Overview

Dette dokumentet deler kravene fra PRD-en, UX-kontrakten (DESIGN.md og EXPERIENCE.md) og arkitekturen (ARCHITECTURE-SPINE.md) opp i epics og stories som kan bygges. Begrepene fra PRD §3 brukes ordrett. Arkitekturbeslutningene er referert med AD-nummer.

## Requirements Inventory

### Functional Requirements

**Søk (§4.1)**
- FR-1: Brukeren kan velge Turdag «i dag» eller «i morgen». Standard er «i dag». Etter kl. 22:00 kan «i dag» ikke velges. Værmelding, Bedre tidsvindu og solnedgang gjelder valgt Turdag. All tid følger Europe/Oslo, uansett hvilken tidssone enheten eller serveren står i.
- FR-2: Brukeren kan velge Starttidspunkt i hele kvarter fra 06:00 til 22:00. For «i dag» er standard «nå», rundet opp til neste kvarter og tidligst 06:00, og passerte tider kan ikke velges. For «i morgen» er standard 10:00.
- FR-3: Brukeren kan oppgi Tilgjengelig tid fra 15 min til 5 t i steg på 15 min, med standard 2 t. Skjemaet sier at tiden gjelder selve turen, uten reise.
- FR-4: Brukeren kan velge Enkel, Middels eller Krevende som høyeste tillatte Vanskelighetsgrad, med standard Middels.
- FR-5: Brukeren kan krysse av for utsikt, vann, begge eller ingen. Standard er ingen.
- FR-6: Brukeren sender Søket med ett trykk. Hva Søket gir, følger tabellen over Værklasse og treff:
  - god eller middels: Turforslag, eller den korteste Turen
  - dårlig: Værvarsling, Turforslag eller den korteste Turen, og Bedre tidsvindu
  - frarådet: melding og Bedre tidsvindu, uten Turforslag
  - Værmeldingen mangler: Turforslag eller den korteste Turen, med melding om at været ikke er vurdert

  Frarådet går foran alt annet. Et Søk med bare standardverdier gir et gyldig resultat, og et nytt Søk erstatter det forrige helt.

**Værvurdering (§4.2)**
- FR-7: Systemet henter Værmeldingen for Værpunktet for hele Turdagen og for timene i Tidsvinduet etter midnatt. Det betyr timesverdier for hver time i Tidsvinduet. Eksempel: Starttidspunkt 22:00 med 5 t gir timene 22, 23, 00, 01 og 02. MET Norway krediteres.
- FR-8: Hver time får den strengeste Værklassen der minst én verdi når grensen i tabellen:
  - frarådet: ≥ 10 mm/t eller ≥ 17,2 m/s
  - dårlig: ≥ 2 mm/t, ≥ 10,8 m/s eller < −10 °C
  - middels: ≥ 0,5 mm/t, ≥ 8,0 m/s eller < 0 °C

  Eksempler: 2,0 mm/t og 3 m/s gir dårlig. 1,9 mm/t og 3 m/s gir middels. 17,2 m/s gir frarådet. 0,4 mm/t, 7,9 m/s og 5 °C gir god.
- FR-9: Værklassen for Tidsvinduet er klassen til den dårligste timen. En time teller når den overlapper Tidsvinduet, så 13:30–15:30 omfatter timene 13, 14 og 15.
- FR-10: For Tidsvinduet vises Værklasse, temperaturspenn, høyeste nedbør, høyeste vind og værsymbol, og hvilken høyde Værmeldingen gjelder for («ca. 400 moh»).
- FR-11: Ved Værklasse dårlig vises en Værvarsling over Turforslagene eller Alternativet. Den viser Tidsvinduet, høyeste nedbør, høyeste vind og temperaturspennet.
- FR-12: Ved Værklasse frarådet vises ingen Turforslag. I stedet vises en melding med verdiene som utløste klassen («vind opp mot 19 m/s») og et Bedre tidsvindu som Alternativ. Aldri en tom side eller feilmelding.
- FR-13: Kan ikke Værmeldingen hentes, eller svarer ikke MET innen 2 s, gis Turforslag uten værregler, og det sies tydelig at været ikke er vurdert. Det vises ingen Værklasse, Værvarsling eller Bedre tidsvindu. Begrunnelsen sier at værdata mangler, og rangeringen følger reglene for godt vær.

**Anbefaling (§4.3)**
- FR-14: Turtid regnes etter Naismiths regel: lengde totalt ÷ 5 km/t + høydemeter ÷ 600 m/t, avrundet til nærmeste hele minutt. Tusenårsvarden fra Damefallet får 1 t 32 min, og Storlihytta fra Vardeveien 16 min. Turtid vises med merknaden «uten pauser».
- FR-15: Turer med Turtid over Tilgjengelig tid, eller som er vanskeligere enn valgt Vanskelighetsgrad, fjernes. Været fjerner aldri enkeltturer.
- FR-16: Turene rangeres med kriteriene under i rekkefølge. Neste kriterium brukes bare ved likhet.
  - God, middels eller manglende vær: uten Mørkevarsel først, flest treff på Opplevelsespreferanser, Turtid nærmest Tilgjengelig tid, ID alfabetisk.
  - Dårlig vær: uten Mørkevarsel først, Lavtliggende tur først, Egnet i dårlig vær (ja før ukjent før nei), flest treff uten utsikt, Turtid nærmest Tilgjengelig tid, ID.

  Samme Søk, Værmelding og Turdatasett gir alltid samme rekkefølge. Eksemplene for UJ-1 og UJ-2 gjelder.
- FR-17: Det vises opptil tre Turforslag. Først velges den høyest rangerte Turen per Mål, og er det færre enn tre, fylles listen på i rangeringsrekkefølge. Listen fylles aldri med Turer som ikke passer. Eksempelet for 2 t 30 min gjelder. Under Turforslagene står en merknad om at brukeren selv har ansvaret.
- FR-18: Fjerner FR-15 alle Turer, vises den korteste Turen innenfor valgt Vanskelighetsgrad som Alternativ, med hvor mye mer tid den trenger: 15 min gir Storlihytta fra Vardeveien med «trenger 1 min mer». Mørkevarsel gjelder etter samme regel. Aldri en tom side.
- FR-19: Ved Værklasse dårlig eller frarådet letes det etter et Bedre tidsvindu med samme Tilgjengelig tid.
  - Det prøves hele timer i dagslys, fra soloppgang til 30 min før solnedgang og innenfor 06:00–22:00. Det gjelder Turdagen, og når Turdag er «i dag», også i morgen. Bare tidspunkter som ikke har passert, prøves.
  - Det tidligste Starttidspunktet med bedre Værklasse vises, sammen med antall Turer som består FR-15 og ikke får Mørkevarsel. Opplevelsespreferansene påvirker ikke antallet.
  - Brukeren kan ta det i bruk med ett trykk. Finnes det ikke noe Bedre tidsvindu, eller passer ingen Tur før mørket, sier appen det.
  - Eksemplene for 9. november og 21. juni gjelder.

**Begrunnelse og varsler (§4.4)**
- FR-20: Hvert Turforslag har en Regeltekst som nevner fire ting:
  - Turtid og Tilgjengelig tid
  - værsammendraget, eller at værdata mangler
  - hvilke Opplevelsespreferanser Turen treffer
  - reglene for dårlig vær som slo inn

  Samme input gir samme tekst. Teksten nevner aldri en regel som ikke slo inn, og bruker aldri «trygg» eller «trygt». Værordene følger faste grenser, som står på ett sted.
- FR-21: Ender Turen senere enn 30 min før solnedgang, eller starter den før soloppgang, får den Mørkevarsel med klokkeslett og tipset «Lurt å ta med hodelykt.».
  - Med solnedgang 16:00 gir en Tur som ender 15:30, ikke Mørkevarsel, og en som ender 15:31, gir Mørkevarsel.
  - Mørkevarselet fjerner ingen Turer.
  - Sola beregnes lokalt for Værpunktet, med havnivå som horisont og avrundet til hele minutter. 9. november 2026 gir sol opp 08:30 og ned 15:59, med høyst 2 min avvik.
- FR-22: Er en API-nøkkel satt opp, kan Regelteksten byttes med en Språkmodelltekst.
  - Turforslagene vises først med Regeltekst. Kommer Språkmodellteksten innen 5 s, erstatter den Regelteksten.
  - Språkmodellen kalles først etter rangeringen, med Regeltekst og fakta om Turen, og påvirker aldri utvalg eller rekkefølge.
  - Regelteksten blir stående i disse tilfellene: modellteksten mangler en ferdig formatert verdi, har et tall som ikke finnes i inputen, skriver tid eller mengde med ord, eller bruker «trygg» eller «trygt». Den blir også stående ved timeout, manglende nøkkel eller feil.
  - Funksjonen kan testes med en falsk modell.

**Kartvisning (§4.5)**
- FR-23: Kartet viser Startpunkt og Omtrentlig rute for hvert Turforslag, merket «omtrentlig rute». Hvert Turforslag har én markør og én rute, og kartet zoomer slik at alle synes.
- FR-24: Velges et Turforslag i listen, uthever kartet det og viser navn, lengde totalt, Vanskelighetsgrad og Startpunkt. Velges det på kartet, uthever listen det. Ett er valgt om gangen, det første fra start, og valget er merket også for skjermlesere.
- FR-25: Brukeren kan zoome og panorere med mus og berøring. Bakgrunnskartet krever ingen nøkkel, og krediteringen synes.

**Turdatasett (§4.6)**
- FR-26: Hver Tur har ID, navn, Mål, Startpunkt (navn, koordinater og koordinatkilde), retning, lengde totalt, høydemeter med kontrollmerking, høyeste punkt, Vanskelighetsgrad, utsikt, vann, Egnet i dårlig vær, Rutesegmenter (rutenummer og rutenavn), kilde og eventuell Adkomst.
  - Lengde totalt gjelder hele turen.
  - Turer som starter på samme sted, har identisk Startpunkt.
  - Adkomst er påkrevd når Startpunktet ligger over 200 m fra Rutesegmentene.
  - Datasettet ligger i én fil.
- FR-27: En automatisk test feiler når en Tur har ett av disse problemene:
  - et påkrevd felt mangler, eller en verdi er ugyldig
  - et Rutesegment finnes ikke i den konverterte geometrien
  - det er hull på over 50 m mellom linjebitene
  - Startpunktet ligger for langt fra Rutesegmentene: over 200 m, eller over Adkomst + 200 m
  - høydemeter er verken kontrollert eller merket som anslag, eller avviker over 20 m fra målt verdi
- FR-28: Rutegeometrien fra Turrutebasen ligger ferdig konvertert til WGS84 i repoet, og konverteringen kan gjentas med et skript som README beskriver.
- FR-29: Hvert Turforslag og den korteste Turen lenker til kilden for Turen, med kildens navn som lenketekst. Appen krediterer MET Norway, Turrutebasen (Kartverket), morotur.no og Fjord Norway og leverandøren av bakgrunnskartet, nederst i alle tilstander og i kartet.

### NonFunctional Requirements

- NFR-1 Responsivt design: appen er brukbar fra 360 til 1440 px uten horisontal rulling. På PC står kartet over Turforslagene, som står side om side. På smale skjermer stables de. Trykkflater er minst 44 × 44 px, og ingen funksjon krever hover.
- NFR-2 Testbarhet: Turtid, Værklasse, filtrering, rangering, Regeltekst, Bedre tidsvindu og Mørkevarsel kan testes uten nettverk og UI. Testene bruker fast Værscenario, fast «nå», faste soltider og et fast testdatasett i `testdata/`, og eksemplene i FR-16, FR-17, FR-19 og FR-21 testes mot testdatasettet. Solberegningen testes for seg.
- NFR-3 Kjørbar for sensor: appen kan startes lokalt etter README uten gruppens nøkler eller betalte kontoer. Uten nøkkel virker alt unntatt Språkmodelltekst.
- NFR-4 MET-vilkår: værkall går via appens server med identifiserende User-Agent, cache-headere, HTTPS og maks fire desimaler. Nettleseren kaller aldri MET.
- NFR-5 Ytelse: Turforslag med Regeltekst vises innen 3 s etter trykk med «Fast 4G»-struping. Språkmodellteksten kan komme etterpå.
- NFR-6 Personvern: appen har ingen persondata, ber ikke om posisjon, har ingen kontoer og bruker ingen sporings- eller analyseverktøy.
- NFR-7 Hemmeligheter: nøkler ligger i `.env`, som ikke committes. `.env.example` committes.
- NFR-8 Språk: brukergrensesnittet er på norsk bokmål.
- NFR-9 Grunnleggende tilgjengelighet: skjemaet kan brukes med tastatur, alle felt har synlige etiketter, og kontrasten er minst 4,5:1.
- NFR-10 Justerbare terskler: Værtersklene endres på ett sted, uten at andre regler må endres.
- NFR-11 Demomodus: appen kan startes uten MET, med Værscenarioer for UJ-1, UJ-2 og UJ-3 som er de samme som testene bruker. Den falske språkmodellen kan vises. Appen viser tydelig at den er i Demomodus, og README forklarer hvordan.

**MVP-nivåer (PRD §8.1):**

| Nivå | Innhold |
|---|---|
| Kjerne | FR-1–FR-21, FR-26–FR-29, NFR-1–NFR-4, NFR-6–NFR-8, NFR-10, NFR-11 |
| Skal være med | FR-23, FR-25, NFR-5, NFR-9 |
| Kan utgå | FR-22, FR-24 |

Faller kartet bort, viser Turkortet Startpunktet som tekst med kildelenke.

**Suksessmål som krever arbeid:**
- SM-2: alle konsekvenser under FR-6 og FR-8–FR-21 har automatiske tester, og visningskonsekvensene testes gjennom UI-et.
- SM-3: en person utenfor gruppa starter appen etter README og viser UJ-1–UJ-3 i Demomodus.
- SM-4: manuell sjekkliste ved 360, 768 og 1440 px.
- SM-1 og SM-5: brukertest med 5 personer i Demomodus, UJ-1.

### Additional Requirements

Fra ARCHITECTURE-SPINE.md (AD-1–AD-19) og kalibreringsmappa.

**⭐ Starter-mal (Epic 1, Story 1):** Prosjektet lages med `npx create-next-app@16.4.3 <tom-mappe> --ts --app --src-dir --no-tailwind --eslint --no-react-compiler --no-cache-components --import-alias "@/*" --use-npm --no-agents-md` i en tom mappe og flyttes inn i repoet, siden repoets rot ikke er tom. Deretter:
- `react` og `react-dom` oppgraderes til 19.3.1.
- Geist byttes med Nunito Sans via `next/font`.
- Demosiden fjernes.
- Versjonene pinnes som i Stack: Node 26.x i `engines`, TypeScript 5.9.3, `@types/node` 26.6.6, Vitest 5.0.5, Vite 8.3.5, Playwright 1.64.1 og så videre.
- Den første lockfila lages med `npm install --before=2026-10-29` og committes (AD-14).

**Struktur og håndheving**
- AR-1: Lagdelingen `src/kjerne/` (ren TS), `src/server/` (skall), `src/app/api/` (tynne route handlers) og `src/app/` + `src/ui/` (visning) håndheves med ESLint:
  - `@typescript-eslint/no-restricted-imports` med `allowTypeImports` for visning → kjerne
  - bare `page.tsx` → `src/server/side.ts`
  - `no-restricted-globals` og `no-restricted-syntax` mot `fetch`, `Date.now`, `process` og argumentløs `new Date()` i kjernen (AD-1)
- AR-2: Ingen database, ingen kontoer og ingen lagring på serveren utover MET-cachen. Søk og Resultat lever bare i klientens minne og står aldri i URL-en (AD-2).

**Kontrakter (må komme før UI-stories)**
- AR-3: `SokSkjema` (`.strict()`) i `src/kjerne/sok.ts`: `{ dato (Oslo), start 'HH:MM', tilgjengeligMin 15–300/15, vanskelighetsgrad 'G'|'B'|'R', utsikt, vann }`. `normaliserSok(sok, na)` gjør tre ting: runder et passert Starttidspunkt opp til neste kvarter, gjør et Søk etter 22:00 om til i morgen 10:00, og erstatter en dato utenfor i dag og i morgen med standard-Søket. `/api/sok` gir aldri 400 for passert tid og returnerer `sok` og `justering?` (AD-17).
- AR-4: Visningsmodellen er ett Zod-skjema i `src/kjerne/visning/skjema.ts` (AD-3). Det skrives før UI-stories og inneholder:
  - `resultatId`, `sok`, `justering?`, `overskrift`, `dittSok`, `liveTekst`
  - `vaer`: `vurdert` (Værklasse, symbol `{ ord, ikonSti }`, tekster, Høydemerknad, Værvarsling) eller `mangler`
  - `utfall`: `turforslag`, `kortesteTur` eller `fraradet`
  - per kort: `turId`, `kriterier[4]` med `{ merke, tekst, detalj }`, stolpeandeler 0–1, Regeltekst, faktalinje, Kartinfoboks-tekst, Stokkoversikt-rad, kilde `{ navn, url }` og kart `{ rute: GeoJSON Feature [lon,lat], startpunkt {lat,lon}, nummer, malpunkt? }`
  - `bedreTidsvindu`: `funnet` med `nyttSok` og tekster, `ingen` med tekst, eller fraværende

  En kontrakttest validerer `/api/sok` mot skjemaet for hver demo-ID.
- AR-5: `lagSidedata(demoId)` i `src/server/side.ts` er sidens eneste kilde. Den gir demo-info med formatert «nå», skjemavalg for begge Turdager med låste valg, standard-Søk, Startpunkter og telletekst for Søk-kartet, eller `{ feil: 'ukjent-demo', gyldigeDemoIder }` (AD-18).
- AR-6: `Vaermelding = { timer: { startUtc, tempC, vindMs, nedborMmT, symbolKode|null }[] }`, laget av den rene `parseMetCompact` i `src/kjerne/vaer/met-compact.ts`, med bare rader som har `next_1_hours`. Mangler en time i Tidsvinduet, er klassen `mangler`. For Søket gjelder da FR-13, og vinduet hoppes over i letingen etter Bedre tidsvindu (AD-19).
- AR-7: Feilsvar har formen `{ feil: 'ukjent-demo', gyldigeDemoIder }` eller `{ feil: 'ugyldig-sok', detaljer }` med 400. Alt annet gir 500. Feil hos MET og språkmodellen gir aldri HTTP-feil.

**Tid, sol, formatering**
- AR-8: `src/kjerne/tid.ts` er eneste bruker av `@date-fns/tz` (Europe/Oslo) og har `timerITidsvindu` (halvåpent intervall, overlapp teller). Øyeblikk sendes som epoke-ms i UTC. `src/kjerne/format.ts` lager all tekst med tid, dato, varighet, lengde og værverdier (AD-7).
- AR-9: `src/kjerne/sol.ts` er en egen NOAA-implementasjon (senit 90,833°, havnivå, Værpunktet, hele minutter), testet mot 9. november (08:30/15:59) og 21. juni (03:28/23:37–23:38) med ±2 min. Regelfunksjonene får `soltider: Record<Oslo-dato, { oppUtc, nedUtc }>`. Ikke bruk suncalc (AD-11).

**Vær og MET**
- AR-10: `src/server/vaer/met.ts` er den eneste MET-klienten:
  - `compact`, Værpunktet fra `src/kjerne/vaerpunkt.ts`, trunkert til fire desimaler, med `altitude=400`
  - User-Agent `turplanlegger-ibe160/<versjon> https://github.com/IBE160-2026/G85-friedl`
  - `cache: 'no-store'`, og status tolkes fra `response.status`
  - asynkron `VaerCache` med ett kall per nøkkel. Ingen kall innenfor `Expires`, `If-Modified-Since` = `Last-Modified`, og 304 forlenger levetiden
  - tidsgrense 2 s, og ved feil returneres `null`

  Bare `met.ts` bruker cachen (AD-6).
- AR-11: `data/vaerterskler.json` har formen `{ versjon: 1, klasser: [{ klasse, nedbor_mm_t_minst, vind_ms_minst, temp_c_under }] }`, med `>=` for nedbør og vind og `<` for temperatur.
  - `src/kjerne/vaerord.ts` eier bare grensene under laveste terskel (0,1 mm/t og 5,5 m/s). Båndene fra middels og opp hentes fra tersklene.
  - `testdata/vaerklasse-fasit.json` kjøres av Vitest og av `kalibrering_vaerlogg.py --selvtest` (AD-8).
- AR-12: Kalibreringen (PRD §10 spm. 1) må være ferdig før Værvurderingen regnes som ferdig:
  - 14 Tidsvinduer fra 10.–16. november vurderes, og tersklene justeres ved mer enn 2 avvik.
  - Fra 2026-11-17 leser skriptet tersklene fra `data/vaerterskler.json` og får `--selvtest`. Skriptet er et navngitt unntak fra AD-6, med egen User-Agent.
  - Resultatet føres i PRD §10 og §4.2 (kalibrering/README.md).

**Demomodus og miljø**
- AR-13: Demo-ID-en reiser bare som `?demo=` på side- og API-URL-er, via `src/ui/api.ts`, og historikkendringer beholder `?demo`.
  - `lesDemoId` og `lagMiljo` i `src/server/miljo.ts` velger klokke, værkilde og språkmodell. Demo bruker fast «nå», scenarioet og den falske modellen, og alltid det ekte Turdatasettet.
  - Klokka leses bare i `miljo.ts` (AD-4, AD-5).
- AR-14: Værscenarioene ligger i `data/vaerscenarioer/<id>/` med `met.json` (MET compact, én desimal) eller `"vaer": "mangler"`, og `scenario.json` med `na` (ISO 8601 med forskyvning) og `beskrivelse`.
  - Scenarioene er `uj-1`, `uj-2`, `uj-3`, `uten-vaer` og `ingen-bedre`.
  - De importeres statisk i registeret `src/server/vaer/scenarioer.ts`. Scenariokilden bruker `parseMetCompact`, men ikke `met.ts` eller cachen (AD-13).

**Data**
- AR-15: Tur-skjemaet (Zod) i `src/kjerne/turdata/skjema.ts` bruker feltnavnene fra fila uendret, og både skallet og FR-27-testen bruker det.
  - `testdata/turer.json` er en fast kopi som bare regeltestene bruker.
  - `mal_punkt { lat, lon, koordinatkilde }` er valgfritt per Tur, og Mål-trekanten tegnes bare når feltet finnes (AD-9).
- AR-16: `scripts/konverter-rutegeometri.ts` (proj4) konverterer GML i EPSG:25833 til `data/rutegeometri.geojson` i WGS84. Den har ett objekt per Rutesegment, nøklet på rutenummer og rutenavn, og linjer som hører til flere segmenter, er med i hvert av dem. Resultatet committes.
  - Bare skallet leser fila. Omtrentlig rute per Tur legges i visningsmodellen som `MultiLineString` i `[lon, lat]` (AD-10).
- AR-17: Filer i `data/` leses med statiske importer, ikke med `fs` (AD-14).

**Språkmodell**
- AR-18: `POST /api/begrunnelse?demo=` tar `{ sok, turId }` og bare for Turforslag. Serveren regner ut Regeltekst og en fast liste med fakta selv, og svarer `{ tekst | null }`.
  - Klienten bytter inn teksten bare for samme `resultatId` og `turId`, innen 5 s fra visningen (`AbortController`).
  - `claude.ts` bruker `@anthropic-ai/sdk` 1.3.0, `claude-haiku-5-5`, `timeout: 4000`, `maxRetries: 0`, `thinking: disabled` og `effort: low`. Den sender ingen sampling-parametre, leser tekstblokker per type og gir `null` ved `refusal` eller `max_tokens`.
  - Svaret må godkjennes av den rene `kontrollerSprakmodelltekst()` i kjernen.
  - `falsk.ts` gir en deterministisk omskriving som består kontrollen (AD-12).

**Kart og ressurser**
- AR-19: Kartet bruker Leaflet 1.9.4 og react-leaflet 5:
  - lastes via klientkomponenten `src/ui/KartLaster.tsx` med `next/dynamic` og `ssr: false`, og `leaflet.css` importeres der
  - ruter tegnes bare med `<GeoJSON>`
  - Kartutsnitt er samme komponent uten interaksjon
  - bakgrunnen er Kartverket `topograatone` (webmercator) med «© Kartverket» som lenke, og `tileerror` gir en egen tilstand (AD-15)
- AR-20: METs værikoner (MIT) og `LICENSE` ligger i `public/vaerikoner/`, med filnavn fra `symbol_code`. Kreditering: «Data fra MET Norway» med lenke. Nettleseren kontakter bare vår server og Kartverket.

**Drift**
- AR-21: Appen kjører på Vercel Hobby med `vercel.json` `regions: ["arn1"]`. `main` går til Production og andre greiner til Preview.
  - Før den første deploy-storyen sjekkes det at Vercel kan kobles til GitHub-organisasjonen IBE160-2026. Reserven er GitHub Actions med `vercel deploy --prebuilt` og `VERCEL_TOKEN`.
  - Siden rendres dynamisk, og `"use cache"` brukes ikke (AD-14).
- AR-22: GitHub Actions kjører lint, Vitest og Playwright ved hver push (AD-14).
- AR-23: Den eneste miljøvariabelen er `ANTHROPIC_API_KEY`, og den er valgfri. Den settes bare i Production under test og demo, med lav utgiftsgrense. `.env.example` committes. Lokalt kjører appen med `npm install && npm run dev` (AD-14).
- AR-24: Forespørsler logges aldri, og bare adapterfeil logges med `console.error`. Ingen analyseverktøy.
- AR-25: README dekker fem ting:
  - lokal start
  - Demomodus med lenker til `?demo=uj-1`, `uj-2` og `uj-3`
  - konverteringsskriptet (FR-28)
  - testkommandoene
  - kalibreringen

**Tester**
- AR-26: Vitest kjører hver regelkonsekvens i FR-8–FR-21 mot kjernen med `testdata/turer.json` og Værscenarioene, og navngitte eksempler testes bare her. FR-27-testen kjører mot det ekte Turdatasettet.
  - Playwright tester hver visningskonsekvens og alle radene i FR-6 mot `?demo=<id>`. Den sjekker tilstand, antall og felt, men aldri Turnavn. Ingen test kaller MET eller Anthropic (AD-16).

**Oppfølging av dokumentasjon**
- AR-27: DESIGN.md og EXPERIENCE.md oppdateres:
  - Avenir Next byttes med Nunito Sans i `fontFamily`-tokens, Brand & Style og Typography.
  - EXPERIENCE.md Open Question 1 lukkes.
  - Kreditering endres til «© Kartverket».
  - Det sjekkes at Nunito Sans har glyfene ✓, → og tabulære tall.

### UX Design Requirements

Fra DESIGN.md (utseende og tokens) og EXPERIENCE.md (atferd og tilstander). Ved konflikt med skissene gjelder dokumentene (EXPERIENCE.md › Kjente avvik i skissene).

**Grunnlag**
- UX-DR1: Alle tokens fra DESIGN.md-frontmatter ligger som CSS-variabler i `src/ui/tokens.css`:
  - `colors`, inkludert `map-*`
  - `typography` med `fontFeature: tabular-nums`, `fontStyle` og `textTransform`
  - `rounded`, `spacing` og `components`

  Skriften er Nunito Sans (AD-15), og det finnes bare lys modus.
- UX-DR2: Dybde lages med fysiske lag, ikke uskarpe skygger:
  - Stokk-kanter: opptil to, forskjøvet 12 px inn og 9 px ned per lag, bare på mobil og nettbrett. Skjemakortet har to kanter på alle bredder.
  - Kortfot: 6 px under kortet, skoggrønn når kortet er valgt.
  - Paneler ligger flatt med hårstrek.

  Ingen gradienter eller glass.
- UX-DR3: Formene følger tokenene:
  - `rounded.card` på alle kort
  - `rounded.lg` på Værvarsling
  - `rounded.md` på Værsammendrag, Værmangel-linje, Ansvarsmerknad, Bedre tidsvindu-boks og Stokkoversikt-rader
  - `rounded.panel` på Begrunnelse-boksen og `rounded.stamp` på Nummerstempelet
  - `rounded.full` på knapper, segmentvelgere, trinnvelgere, brikker og Demomodus-merket på PC

  Perforeringen (stiplet linje med halvsirkelhakk i hver kortkant) finnes bare på kort.
- UX-DR4: Nummerstempelet er et avrundet kvadrat med 1–3 for Turforslag, «!» på rust for frarådet og «→» på skoggrønt for Bedre tidsvindu-kortet og Alternativkortet. Det har varianten `sizeSmall` i Kartinfoboksen og 40 px i Stokkoversikt.
- UX-DR5: Knappene er primær (`knapp-primaer`, med `heightLarge` for «Finn tur»), sekundær (`knapp-sekundaer`) og tonet (`knapp-tonet`), alle som piller. Rust brukes aldri på knapper.
- UX-DR6: Toppfeltet har logoen, et skoggrønt kvadrat med stiplet sti og prikk, ordmerket «Turplanlegger» og «Moldemarka» dempet. Logoen er ikke en lenke. På PC er bunnteksten «Turplanlegger er en prototype for Moldemarka.».
- UX-DR7: Krediteringen står under en hårstrek nederst i alle tilstander: «Værdata: MET Norway · Turstier: Turrutebasen, Kartverket · Turer: morotur.no og Fjord Norway · Bakgrunnskart: © Kartverket», med lenker.

**Søk**
- UX-DR8: Søk-flaten har overskriften «Hvor lenge vil du gå?» (`display`/`display-mobile`) og ingressen fra Faste tekster, og hjelpetekstene for hvert felt står ordrett. Oppsettet varierer med bredden:
  - PC: Skjemakortet i 5/12 og kartet med de 8 Startpunktene i 7/12, med «12 Turer fra 8 Startpunkter»
  - mobil: forklaringen øverst og Skjemakortet som ark i tommelsonen, med «Finn tur» nederst
  - nettbrett: forklaringen og Skjemakortet uten kart
- UX-DR9: Segmentvelgeren for Turdag og Vanskelighetsgrad er en radiogruppe.
  - Etter 22:00 er «I dag» låst med «Etter kl. 22 kan du bare velge i morgen.».
  - Velges «I morgen», blir Starttidspunkt 10:00. Velges «I dag», blir det «nå» rundet opp.
- UX-DR10: Trinnvelgeren har knappene − og + (15 min) med tilgjengelige navn, for eksempel «Reduser Starttidspunkt med 15 min», og en `<select>` med alle gyldige verdier i midten. Mobil bruker telefonens egen velger.
  - Starttidspunkt går fra 06:00 til 22:00, passerte tider er låst, og «nå» står under verdien når den er nå.
  - Tilgjengelig tid går fra 15 min til 5 t.
- UX-DR11: Preferansebrikkene for utsikt og vann er avkrysningsbokser med kantfargen `border-chip`. Ingen valgt er gyldig.
- UX-DR12: «Finn tur» er aldri låst. Et justert Starttidspunkt vises med hjelpeteksten fra serveren, «Flyttet til 14:15, fordi 13:30 har passert.», også når det gjelder i morgen etter kl. 22.

**Resultat: struktur og tekst**
- UX-DR13: Resultat har fast rekkefølge per bredde (EXPERIENCE.md › Information Architecture):
  1. Demomodus-merke
  2. Ditt søk
  3. vær-del
  4. overskrift
  5. kart og kort (PC) eller Stokk eller meldingskort (mobil)
  6. kart (mobil)
  7. Stokkoversikt (mobil)
  8. Ansvarsmerknad
  9. Kreditering
- UX-DR14: Ditt søk er et panel på PC med overlinjen DITT SØK, fem felt med etikett og verdi og «ingen» når ingen preferanse er valgt, og den sekundære knappen «Endre søk». På mobil er det én linje, for eksempel «I dag 13:30 · 2 t · Middels · utsikt», der preferanseleddet utelates når ingen er valgt, og «Endre søk» står i toppfeltet.
- UX-DR15: Overskriften følger reglene:
  - tallord: Ett, To eller Tre
  - «som passer nå» eller «som passer i morgen fra kl. 14:00»
  - «i dårlig vær» eller «som passer tiden din»
  - «Ingen Tur passer {Tilgjengelig tid}.»

  Den bruker `page-title` og meldes i et høflig live-område.
- UX-DR16: Værsammendraget er et papirpanel med Kriteriemerke og «Værklasse god», Værsymbol med ord og verdiene «3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s». Tidsvinduet står helt til høyre, og Høydemerknaden under. På mobil står klasse og symbol på én linje og verdiene på den neste. Tallformatet følger EXPERIENCE.md › Værord: én desimal uten «,0», hele grader, og «−2 til 1 °C» når én av verdiene er under null.
- UX-DR17: Værsymbolet er METs ikon for `symbol_code` med endelse, sammen med ordet fra tabellen. Endelsen påvirker bare ikonet, ikke ordet.
  - `…andthunder` gir «… og torden», og en ukjent kode gir verken ikon eller ord.
  - Symbolet hentes fra timen med dårligst Værklasse, og den første ved likhet.
  - Ikonet har tom `alt`.
- UX-DR18: Værmangel-linjen er et papirpanel med merket none, «Været er ikke vurdert.» i fet skrift og «Vi fikk ikke hentet Værmeldingen fra MET.». Den står der Værsammendraget ellers står.
- UX-DR19: Værvarslingen har flaten `vaervarsling` og merket warn, med tittelen i rust: «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00». Under står verdiene med den utløsende først, og forklaringen om rekkefølgen. Den meldes i live-området.
- UX-DR20: Bedre tidsvindu-boksen ligger i Værvarslingen, til høyre på PC og under på mobil. Den har skoggrønn kant, overlinjen BEDRE TIDSVINDU, teksten «I morgen fra kl. 14:00 er Værklassen god» og antall Turer før mørket. Knappen «Bruk 14:00» eller «Bruk i morgen 11:00» sender `nyttSok`. Uten Bedre tidsvindu vises en av to tekster, avhengig av Turdag («… i dag eller i morgen.» eller «… i morgen.»), uten knapp.
- UX-DR21: Frarådet-kortet har form som et Turkort:
  - kartutsnitt med vindstreker
  - stempelet «!», «Ingen Turforslag» og «Værklasse frarådet» i rust, med verdiene og meldingen («Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).»)
  - DERFOR INGEN TUR med Kriterieradene Vær og Tid
  - lenken «Sjekk også MET sine farevarsler.», som åpnes i ny fane

  Ved frarådet vises verken kart eller Ansvarsmerknad, og frarådet meldes i live-området.
- UX-DR22: Bedre tidsvindu-kortet har skoggrønn kant og står ved siden av Frarådet-kortet på PC og nederst på samme ark på mobil. Det har stempelet «→», overlinjen ALTERNATIV · BEDRE TIDSVINDU, dagen i `page-title` («I morgen (søn. 15. nov.) fra kl. 11:00»), «fra kl. 11:00 · samme 2 t, Middels» og knappen «Bruk i morgen 11:00».

**Kortene**
- UX-DR23: Turkortet har disse delene ovenfra:
  1. Kartutsnitt (mobil og nettbrett)
  2. Nummerstempel og «1 av 3»
  3. Mål (`card-goal`) og «fra …» (`card-from`)
  4. faktalinje: lengde totalt · høydemeter · høyeste punkt · Vanskelighetsgrad
  5. «Startpunkt: …»
  6. perforering
  7. PASSER FORDI i skoggrønt
  8. fire Kriterierader
  9. Begrunnelse-boks
  10. fot (bare PC) med «Kilde: …» og «Vis på kartet» eller «Vises på kartet» (tonet, med hake)

  På mobil står kildelenken under Begrunnelse-boksen. Vanskelighetsgrad står som ord og fargekodes aldri.
- UX-DR24: Kriterieraden har Kriteriemerke, etikett (Tid, Vær, Ønsker eller Mørke), verdi i rust ved warn, detaljlinjer og hårstrek mellom radene.
  - Kriteriemerket kan være ok (skoggrønn sirkel med hake), warn (rust sirkel med «!») eller none (papirsirkel med strek). Tekstalternativene er «passer», «se opp» og «ikke vurdert».
  - Det tilgjengelige navnet bruker PRD-begrepene Turtid, Værklasse, Opplevelsespreferanser og Mørkevarsel.
  - Radene følger alltid regeltabellen for ✓, ! og – (EXPERIENCE.md › Kriterieradene). Turkort og Alternativkort har alle fire radene i fast rekkefølge, og Frarådet-kortet bare Vær og Tid.
- UX-DR25: Tidsstolpen er fylt med andelen Turtid ÷ Tilgjengelig tid. På Alternativkortet stikker en rustfarget bit ut over enden, med en loddrett strek ved grensen.
- UX-DR26: Dagslysstolpen går fra Starttidspunkt til solnedgang:
  - Feltet etter solnedgang − 30 min er mørkere, med stiplet grense.
  - Fyllet går til Turens slutt og har et endepunkt.
  - Etikettene er starttiden og «sol ned HH:MM».
  - Før soloppgang har stolpen et mørkt felt merket «sol opp HH:MM».
- UX-DR27: Begrunnelse-boksen er et felt i sidefarge med overlinjen BEGRUNNELSE og Regelteksten i kursiv (`rule-text`) på PC, og en kursiv linje «Begrunnelse: «…»» på mobil. Språkmodellteksten byttes inn uten at radene endres.
- UX-DR28: Alternativkortet er bygd som et Turkort, med disse forskjellene:
  - stempelet «→» og «Alternativ · den korteste Turen»
  - merket «Alternativ» i kartutsnittet
  - overlinjen SLIK STÅR DEN MOT SØKET DITT i dempet tone, og Tid-raden er warn
  - under kortet: primærknappen «Endre Tilgjengelig tid», som går til Søk med fokus på feltet, og «Med {korteste Turtid rundet opp til kvarter} eller mer passer minst én Tur.»
- UX-DR29: Kontaktfeil-kortet er et papirkort med merket none, «Vi fikk ikke kontakt.» (`page-title`) og «Søket ditt er tatt vare på.». «Prøv igjen» sender `resultat.sok` eller det siste Søket, og «Endre søk» finnes også. Det vises etter 10 s eller ved nettverksfeil, uten kart og Ansvarsmerknad, og meldes i live-området.
- UX-DR30: Plassholderstokken har to tomme stokk-kanter, en tom kortflate og «Finner turer …». Den har ingen spinner.

**Stokk og valg**
- UX-DR31: Stokken på mobil og nettbrett viser ett kort med stokk-kanter.
  - Sveip er en snarvei, og ← og → blar når Stokken har fokus.
  - Animasjonen er ca. 250 ms (kortet glir ut, og det neste løftes), og «Reduser bevegelse» slår den av.
  - Det tilgjengelige navnet er «Turforslag 1 av 3».
- UX-DR32: Stokknavigasjonen står i tommelsonen:
  - «Forrige» er rund med pil og inaktiv på kort 1.
  - I midten står «1 av 3» med prikker.
  - «Neste tur» er en primær pille og inaktiv på siste kort.
  - De tilgjengelige navnene er «Forrige Turforslag» og «Neste Turforslag».
- UX-DR33: Med færre enn tre Turforslag vises så mange kort som passer, og overskriften tilpasses. Ved to kort heter Stokkoversikt «Begge i stokken». Ved ett kort vises ingen stokk-kanter, Stokknavigasjon eller Stokkoversikt.
- UX-DR34: Stokkoversikten («Alle tre i stokken» eller «Begge i stokken») har rader med stempel (40 px), «Mål fra Startpunkt», fire små Kriteriemerker og «{Turtid} uten pauser · tilbake HH:MM». Valgt rad har skoggrønn kant. Et trykk på en rad velger kortet og ruller til Stokken.
- UX-DR35: På PC står kortene side om side i like brede og like høye kolonner, minst `card-min-width-desktop` brede og med `card-gap-desktop-*` mellomrom. Et trykk, «Vis på kartet», Enter eller mellomrom velger et kort. Valgt kort har skoggrønn kant og fot. Kort 1 er valgt fra start.

**Kart**
- UX-DR36: Kartet bruker det dempede gråtonekartet:
  - Den valgte ruten er stiplet skoggrønn og de andre tynne og grå, alle med papirhalo.
  - Startpunktet er en nummerert sirkel, med numrene side om side når flere Turer deler Startpunkt.
  - Mål er en trekant når `malpunkt` finnes.
  - Etiketten «omtrentlig rute» står i kursiv langs den valgte ruten.
  - Tegnforklaringen står nede til venstre, med Mål bare når det finnes Mål-punkter, og krediteringspillen nede til høyre.
  - Kartet zoomer slik at alle Turforslagene synes. Et trykk på en rute eller et Startpunkt velger kortet. Kartet bruker `map-height-desktop` og `map-height-mobile`.
- UX-DR37: Kartinfoboksen er et papirfelt med skoggrønn kant, øverst til høyre på PC og over kartet på mobil. Den har et lite stempel og viser navn, lengde totalt, Vanskelighetsgrad og Startpunkt for det valgte kortet. Den er ikke interaktiv.
- UX-DR38: Kartutsnittet er statisk og står øverst i Turkortet og Alternativkortet på mobil og nettbrett. Høyden er `map-snippet-height`, og 160 px på nettbrett. Det viser bare kortets egen rute og Startpunkt, med merket «Turforslag N av 3» og «omtrentlig rute · © Kartverket». Et trykk ruller til kartet med kortet valgt.
- UX-DR39: Laster ikke bakgrunnskartet, blir kartflaten papirfarget med ruter, Startpunkter og Mål, og teksten «Bakgrunnskartet kunne ikke lastes.». Kortene virker som før.
- UX-DR40: Søk-kartet på PC viser de 8 Startpunktene fra sidedataene.

**Andre komponenter**
- UX-DR41: Demomodus-merket er okerfarget, som pille i toppfeltet på PC og felt under toppfeltet på mobil: «DEMOMODUS · Værscenario: … · «nå» = …». Det er alltid synlig i Demomodus. Oker brukes ikke andre steder.
- UX-DR42: Ansvarsmerknaden er et papirpanel med merket none og den faste teksten, under Turforslagene eller Alternativkortet.

**Tilgjengelighet, responsivt, interaksjon og tekst**
- UX-DR43: Skjermlesere leser Turkortet som én artikkel med lesetekst, for eksempel «Turforslag 1 av 3: Tusenårsvarden fra Damefallet. Turtid: 1 t 32 min av 2 t, gangtid uten pauser. Værklasse: god …». Valgt kort er merket for skjermleser (FR-24).
- UX-DR44: Fokusringen (`fokusring`, papir innerst og skoggrønt ytterst) gjelder alle kontroller, kort og ruter. Trykkflater er minst 44 × 44 px, også kildelenken. Mening bæres aldri av farge alene, kontrasten følger tabellen i DESIGN.md og er minst 4,5:1, og teksten tåler 200 % zoom ved 360 px.
- UX-DR45: Oppsettet har tre bredder:
  - 360–767 px: mobil
  - 768–1199 px: nettbrett, med mobiloppsett, `margin-tablet` og `text-max-width`
  - ≥ 1200 px: PC

  Ingen horisontal rulling ved 360, 768, 1200 eller 1440 px. Sjekklisten i SM-4 følges.
- UX-DR46: Interaksjonen følger EXPERIENCE.md › Interaction Primitives:
  - Ett trykk er nok, og ingenting krever hover, dobbelttrykk eller langt trykk.
  - Et nytt Søk erstatter resultatet og ruller til overskriften.
  - Resultat lager én historikkoppføring, og Tilbake går til Søk med verdiene. Et nytt Søk fra Resultat erstatter oppføringen.
  - Det er ikke tillatt med karusell, popup, varsler, tellere, deling, favoritter, innlogging eller «Min posisjon».
- UX-DR47: Språket følger EXPERIENCE.md › Voice and Tone:
  - begrepene fra PRD §3
  - 24-timersklokke, desimalkomma og «1 t 2 min»
  - aldri «trygg» eller «trygt», og ingen overdrivelser
  - faste tekster ordrett i `src/ui/tekster.ts`
  - merknadstekstene i skissene bygges ikke

### FR Coverage Map

| FR | Epic | Hva |
|---|---|---|
| FR-1 | Epic 1 | Turdag i dag eller i morgen, og regelen etter 22:00 |
| FR-2 | Epic 1 | Starttidspunkt i kvarter, med standard og låste tider |
| FR-3 | Epic 1 | Tilgjengelig tid |
| FR-4 | Epic 1 | Vanskelighetsgrad |
| FR-5 | Epic 1 | Opplevelsespreferanser |
| FR-6 | Epic 1 + Epic 2 | Epic 1: raden der Værmeldingen mangler, og at et nytt Søk erstatter det forrige. Epic 2: radene for god/middels, dårlig og frarådet, og at frarådet går foran |
| FR-7 | Epic 2 | Hente Værmelding for hele Turdagen og over midnatt, og kreditere MET |
| FR-8 | Epic 2 | Værklasse per time ut fra tersklene |
| FR-9 | Epic 2 | Værklasse for Tidsvinduet, der overlapp teller |
| FR-10 | Epic 2 | Værsammendrag og Høydemerknad |
| FR-11 | Epic 2 | Værvarsling ved dårlig vær |
| FR-12 | Epic 2 | Frarådet-melding med Bedre tidsvindu |
| FR-13 | Epic 1 | Turforslag uten værregler når Værmeldingen mangler |
| FR-14 | Epic 1 | Turtid etter Naismith |
| FR-15 | Epic 1 | Filtrering på tid og Vanskelighetsgrad |
| FR-16 | Epic 1 + Epic 2 | Epic 1: rangering ved godt eller manglende vær. Epic 2: rangering ved dårlig vær |
| FR-17 | Epic 1 | Opptil tre Turforslag, ett per Mål, og Ansvarsmerknad |
| FR-18 | Epic 1 | Den korteste Turen som Alternativ |
| FR-19 | Epic 2 | Bedre tidsvindu |
| FR-20 | Epic 1 + Epic 2 | Epic 1: Regeltekst med Turtid, preferanser og at værdata mangler. Epic 2: værsammendrag og reglene for dårlig vær i teksten |
| FR-21 | Epic 1 | Mørkevarsel og solberegning |
| FR-22 | Epic 4 | Språkmodelltekst med kontroll og falsk modell |
| FR-23 | Epic 3 | Kart med Startpunkt og Omtrentlig rute |
| FR-24 | Epic 3 | Valg som henger sammen mellom liste og kart |
| FR-25 | Epic 3 | Zoom og panorering, kart uten nøkkel og kreditering |
| FR-26 | Epic 1 | Turdatasettets felt i én fil |
| FR-27 | Epic 1 | Automatisk test av Turdatasettet |
| FR-28 | Epic 1 | Konvertert rutegeometri og konverteringsskript |
| FR-29 | Epic 1 + Epic 3 | Epic 1: kildelenke og kreditering i alle tilstander. Epic 3: kreditering i kartet |

**NFR:**

| NFR | Epic |
|---|---|
| NFR-1 | Akseptansekriterium i hver UI-story |
| NFR-2 | Epic 1 + Epic 2 |
| NFR-3 | Epic 1, og nøkkelen er valgfri i Epic 4 |
| NFR-4 | Epic 2 |
| NFR-5 | Måles i siste story i Epic 1, og på nytt i Epic 2 og 4 |
| NFR-6 | Epic 1 |
| NFR-7 | Epic 1 |
| NFR-8 | Akseptansekriterium i hver UI-story |
| NFR-9 | Akseptansekriterium i hver UI-story |
| NFR-10 | Epic 2 |
| NFR-11 | Epic 1 (`uten-vaer`), Epic 2 (UJ-1–UJ-3 og `ingen-bedre`) og Epic 4 (falsk modell) |

**Suksessmål:**

| Mål | Hvor |
|---|---|
| SM-2 | Testene i Epic 1 og 2 |
| SM-3 | Siste story i Epic 2: README og prøvekjøring for sensor |
| SM-4 | Akseptansekriterium i hver UI-story |
| SM-1 og SM-5 | Utenfor epics. Brukertesten står som åpent punkt i `issues.md` |

## Epic List

Epic 2, 3 og 4 bygger på Epic 1, men er uavhengige av hverandre. Epic 3 kan derfor lages mens kalibreringen i Epic 2 pågår.

### Epic 1: Finn en Tur som passer tiden din
Brukeren fyller ut Søket og får opptil tre Turforslag som passer Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser. Hvert forslag har Turtid, Mørkevarsel, Regeltekst og kildelenke. Passer ingen Tur, vises den korteste Turen som Alternativ. Været står som «ikke vurdert» (FR-13). Appen ligger ute på Vercel og kan vises i Demomodus med `?demo=uten-vaer`.

**FRs covered:** FR-1, FR-2, FR-3, FR-4, FR-5, FR-6 (raden der Værmeldingen mangler), FR-13, FR-14, FR-15, FR-16 (rangering ved godt eller manglende vær), FR-17, FR-18, FR-20 (alt unntatt været), FR-21, FR-26, FR-27, FR-28, FR-29

**Merknader:**
- Storyene kommer i denne rekkefølgen: starter-malen, CI og Vercel (med sjekken av org-tilkoblingen), kontraktene AD-17 og AD-3, Turdatasettet, regelkjernen og sola, Søk-flaten, Resultat med Turkort og Stokk, Alternativ, Kontaktfeil og Plassholder, og til slutt README.
- Den mobile Stokken er med her. Kartutsnittet kommer først i Epic 3.
- AR-27, oppdateringen av skriften i DESIGN.md og EXPERIENCE.md, hører hjemme her.
- Værkilden gir alltid `null` til Epic 2 er ferdig.

### Epic 2: Turforslag som tar hensyn til været
Brukeren ser Værklassen for Tidsvinduet sitt. Ved dårlig vær kommer en Værvarsling og Turforslag rangert for dårlig vær. Ved frarådet vær vises ingen Turforslag, og appen foreslår et Bedre tidsvindu som kan brukes med ett trykk. Demomodus får UJ-1–UJ-3 og scenarioet `ingen-bedre`.

**FRs covered:** FR-6 (radene for god, dårlig og frarådet vær), FR-7, FR-8, FR-9, FR-10, FR-11, FR-12, FR-16 (rangering ved dårlig vær), FR-19, FR-20 (været)

**Merknader:**
- Innhold: MET-adapteren med cache (AR-10), `vaerterskler.json` og Værord, Værscenarioene, Værsammendrag, Værsymbol, Værvarsling, Bedre tidsvindu-boksen og -kortet, og Frarådet-kortet.
- Epicen er ikke ferdig før kalibreringen er gjort (AR-12), tidligst 17. november.
- Den siste storyen fullfører README og kjører SM-3, en prøvekjøring for sensor med UJ-1–UJ-3 i Demomodus.

### Epic 3: Se Turforslagene på kartet
Brukeren ser Startpunkt og Omtrentlig rute for hvert Turforslag på et dempet Kartverket-kart, og kan velge Tur både i kartet og i listen. Søk-flaten på PC viser de 8 Startpunktene, og mobil og nettbrett får Kartutsnitt i kortene.

**FRs covered:** FR-23, FR-24, FR-25, FR-29 (kreditering i kartet)

**Merknader:**
- Kartet bruker Leaflet via `KartLaster` og har en egen tilstand for `tileerror`.
- FR-24 er «Kan utgå» og blir en egen story til slutt.

### Epic 4: Begrunnelser skrevet av en språkmodell
Er en API-nøkkel satt opp, bytter appen ut Regelteksten med en mer naturlig Språkmodelltekst innen 5 s. Rangeringen endres aldri, og Regelteksten blir stående når modellteksten ikke består kontrollen. Demomodus viser den falske modellen.

**FRs covered:** FR-22

**Merknader:**
- Epicen bruker `/api/begrunnelse`, `claude.ts` med Haiku 5.5, `falsk.ts` og `kontrollerSprakmodelltekst()`.
- Hele epicen er «Kan utgå».

## Epic 1: Finn en Tur som passer tiden din

Brukeren fyller ut Søket og får opptil tre Turforslag som passer Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser. Hvert forslag har Turtid, Mørkevarsel, Regeltekst og kildelenke, og passer ingen Tur, vises den korteste Turen som Alternativ. Været står som «ikke vurdert» (FR-13). Appen ligger ute på Vercel og kan vises i Demomodus med `?demo=uten-vaer`.

### Story 1.1: Prosjektet settes opp fra starter-malen

Som utvikler i gruppa
vil jeg ha et Next.js-prosjekt med låste versjoner, lagregler og testoppsett,
slik at alle storyene bygger på samme grunnmur.

**Acceptance Criteria:**

**Given** repoet uten app-kode
**When** `npx create-next-app@16.4.3 <tom-mappe> --ts --app --src-dir --no-tailwind --eslint --no-react-compiler --no-cache-components --import-alias "@/*" --use-npm --no-agents-md` kjøres i en tom mappe og filene flyttes inn i repoet
**Then** repoet har `src/app/` og en `package.json` med `engines.node` 26.x og versjonene fra Stack i spinen: next 16.4.3, react og react-dom 19.3.1, typescript 5.9.3, @types/node 26.6.6, zod 4.6.7, vitest 5.0.5, vite 8.3.5 og @playwright/test 1.64.1
**And** `data/`, `scripts/`, `.logs/`, `_bmad/`, `_bmad-output/`, `CLAUDE.md` og den eksisterende `README.md` er urørt
**And** den første lockfila er laget med `npm install --before=2026-10-29` og committet

**Given** appen kjører lokalt med `npm run dev`
**When** forsiden åpnes
**Then** demosiden fra create-next-app er borte, og siden viser «Turplanlegger» i Nunito Sans lastet med `next/font`
**And** Geist er fjernet

**Given** en fil i `src/kjerne/` som importerer fra `src/server/`, `src/app/` eller `src/ui/`, eller som bruker `fetch`, `Date.now`, `process` eller `new Date()` uten argument
**When** `npm run lint` kjøres
**Then** lint feiler med en melding om lagregelen (AR-1)
**And** lint feiler når en fil i `src/ui/` eller `src/app/` importerer en verdi fra `src/kjerne/`, men en ren typeimport er tillatt
**And** lint feiler når en annen fil enn `src/app/page.tsx` importerer `src/server/side.ts`

**Given** `npm test` og `npm run test:e2e`
**When** de kjøres
**Then** Vitest kjører én røyktest i `src/kjerne/`, og Playwright kjører én røyktest mot forsiden
**And** en GitHub Actions-workflow kjører lint, Vitest og Playwright ved hver push, og blir rød når én av dem feiler (AR-22)

**Given** repoet
**When** det sjekkes for hemmeligheter
**Then** `.env` står i `.gitignore`, og `.env.example` med en tom `ANTHROPIC_API_KEY=` er committet (NFR-7, AR-23)

**Given** DESIGN.md og EXPERIENCE.md
**When** storyen er ferdig
**Then** Avenir Next er byttet med Nunito Sans i `fontFamily`-tokens, Brand & Style og Typography. Open Question 1 i EXPERIENCE.md er lukket, og Krediteringen sier «© Kartverket» (AR-27).
**And** det er sjekket og notert at Nunito Sans viser ✓, → og tabulære tall

### Story 1.2: Appen publiseres på Vercel

Som turgåer
vil jeg kunne åpne Turplanlegger i nettleseren,
slik at jeg ikke må installere noe.

**Acceptance Criteria:**

**Given** repoet ligger i GitHub-organisasjonen IBE160-2026
**When** Vercel kobles til repoet
**Then** det er avklart og notert om Vercel-appen fikk tilgang direkte eller måtte godkjennes av org-eieren
**And** får ikke Vercel tilgang, deployer GitHub Actions med `vercel deploy --prebuilt` og hemmeligheten `VERCEL_TOKEN` i stedet (AR-21)

**Given** `vercel.json` med `regions: ["arn1"]`
**When** det pushes til `main`
**Then** Production-URL-en viser siden fra Story 1.1
**And** en push til en annen grein gir en Preview-URL

**Given** den publiserte siden
**When** svaret inspiseres
**Then** siden er rendret dynamisk, og det finnes ingen `"use cache"` i koden
**And** siden laster ingen analyse- eller sporingsskript og setter ingen informasjonskapsler (NFR-6)
**And** serveren logger ingen forespørsler (AR-24)

### Story 1.3: Søk-kontrakten og tid i Europe/Oslo

Som utvikler i gruppa
vil jeg ha ett skjema for Søket og én normalisering,
slik at klienten, serveren og testene tolker et Søk likt.

**Acceptance Criteria:**

**Given** `SokSkjema` (`.strict()`) i `src/kjerne/sok.ts`
**When** et Søk med `dato`, `start` 'HH:MM', `tilgjengeligMin`, `vanskelighetsgrad` 'G'|'B'|'R', `utsikt` og `vann` valideres
**Then** et gyldig Søk godtas
**And** disse avvises: start som ikke er et helt kvarter (13:10), start utenfor 06:00–22:00, `tilgjengeligMin` utenfor 15–300 eller ikke delelig med 15, en ukjent Vanskelighetsgrad og ekstra felt

**Given** «nå» er 9. november 2026 kl. 13:22 i Oslo
**When** `normaliserSok` får et Søk for i dag kl. 13:00
**Then** Søket blir i dag kl. 13:30, og `justering` er «Flyttet til 13:30, fordi 13:00 har passert.»
**And** et Søk for i dag kl. 14:00 er uendret og har ingen `justering`

**Given** «nå» er kl. 22:10
**When** `normaliserSok` får et Søk for i dag
**Then** Søket blir i morgen kl. 10:00, med `justering`

**Given** et Søk med en dato som verken er i dag eller i morgen
**When** `normaliserSok` kjøres
**Then** Søket erstattes med standard-Søket

**Given** standard-Søket
**When** det lages med «nå» kl. 05:10, 13:22 og 22:10
**Then** Starttidspunktet blir i dag 06:00, i dag 13:30 og i morgen 10:00
**And** standard er 2 t, Middels og ingen Opplevelsespreferanser (FR-1–FR-5)

**Given** `timerITidsvindu` i `src/kjerne/tid.ts`
**When** Tidsvinduet er 13:30–15:30
**Then** timene er 13, 14 og 15
**And** 22:00 med 5 t gir timene 22, 23, 00, 01 og 02, med riktig dato for timene etter midnatt (FR-7, FR-9)
**And** testene gir samme svar med `TZ=UTC` og `TZ=America/New_York`, og `src/kjerne/tid.ts` er den eneste fila som importerer `@date-fns/tz`

### Story 1.4: Visningskontrakten og sidedata

Som utvikler i gruppa
vil jeg ha visningsmodellen og sidedataene som Zod-skjemaer,
slik at server og UI kan bygges hver for seg mot samme form.

**Acceptance Criteria:**

**Given** `src/kjerne/visning/skjema.ts`
**When** skjemaet leses
**Then** det beskriver alle feltene i AR-4:
- `resultatId`, `sok`, `justering?`, `overskrift`, `dittSok`, `liveTekst`
- `vaer`, med variantene `vurdert` og `mangler`
- `utfall`, med variantene `turforslag`, `kortesteTur` og `fraradet`
- kortfeltene: `turId`, `kriterier[4]`, stolpeandeler, Regeltekst, faktalinje, Kartinfoboks-tekst, Stokkoversikt-rad, `kilde` og `kart`
- `bedreTidsvindu`, med variantene `funnet` og `ingen`

**And** typene eksporteres med `z.infer`, slik at UI-et bare importerer typer

**Given** ett eksempel per variant av `utfall` og `vaer`
**When** eksemplene valideres
**Then** alle godtas
**And** et eksempel med et ekstra felt eller et snake_case-felt avvises
**And** en stolpeandel utenfor 0–1 avvises

**Given** sidedata-skjemaet for `lagSidedata` (AD-18)
**When** det leses
**Then** det beskriver demo-info med formatert «nå», skjemavalg for begge Turdager med låste valg, standard-Søk, Startpunkter og telletekst
**And** feilformene `{ feil: 'ukjent-demo', gyldigeDemoIder }` og `{ feil: 'ugyldig-sok', detaljer }` har egne skjemaer (AR-7)

### Story 1.5: Turdatasettet valideres og rutegeometrien konverteres

Som utvikler i gruppa
vil jeg at Turdatasettet og rutegeometrien kontrolleres automatisk,
slik at feil i dataene blir oppdaget før de vises for en turgåer.

**Acceptance Criteria:**

**Given** Tur-skjemaet i `src/kjerne/turdata/skjema.ts`
**When** `data/turer-moldemarka.json` valideres
**Then** hver Tur har feltene i FR-26, med feltnavnene fra fila uendret
**And** `mal_punkt { lat, lon, koordinatkilde }` er valgfritt (AR-15)

**Given** `scripts/konverter-rutegeometri.ts` (proj4)
**When** skriptet kjøres på GML-fila i `data/raw/` (EPSG:25833)
**Then** det skriver `data/rutegeometri.geojson` i WGS84, med ett objekt per Rutesegment nøklet på rutenummer og rutenavn
**And** en linje som hører til flere segmenter, er med i hvert av dem
**And** to kjøringer gir identisk fil, og fila er committet (FR-28)
**And** README har en seksjon om hvordan skriptet kjøres

**Given** FR-27-testen kjører mot det ekte Turdatasettet og den konverterte geometrien
**When** testen kjøres
**Then** den består
**And** for hvert av de fem problemene i FR-27 finnes en test som får en tilsiktet ødelagt kopi til å feile: manglende felt eller ugyldig verdi, ukjent Rutesegment, hull over 50 m, Startpunkt for langt unna (over 200 m, eller over Adkomst + 200 m) og høydemeter som ikke er kontrollert eller avviker over 20 m
**And** Turer som starter på samme sted, har identisk Startpunkt

**Given** feil i det ekte Turdatasettet som testen finner
**When** storyen avsluttes
**Then** dataene er rettet, eller avviket er begrunnet og ført i `issues.md`

### Story 1.6: Turtid og filtrering

Som turgåer
vil jeg bare få Turer jeg rekker, og som ikke er vanskeligere enn jeg valgte,
slik at forslagene passer dagen min.

**Acceptance Criteria:**

**Given** `testdata/turer.json` er en fast kopi av Turdatasettet som bare regeltestene bruker
**When** Turtid regnes med Naismiths regel (lengde totalt ÷ 5 km/t + høydemeter ÷ 600 m/t)
**Then** Tusenårsvarden fra Damefallet får 1 t 32 min, og Storlihytta fra Vardeveien får 16 min
**And** Turtid rundes til nærmeste hele minutt (FR-14)

**Given** et Søk med Tilgjengelig tid og Vanskelighetsgrad
**When** Turene filtreres
**Then** Turer med Turtid over Tilgjengelig tid fjernes, mens Turer med Turtid lik Tilgjengelig tid blir med
**And** Turer som er vanskeligere enn valgt Vanskelighetsgrad, fjernes (G < B < R) (FR-15)

**Given** kjernefunksjonene for Turtid og filtrering
**When** de testes
**Then** de bruker verken nettverk, klokke eller UI (NFR-2)

### Story 1.7: Solberegning og Mørkevarsel

Som turgåer
vil jeg få vite om en Tur ender etter at det blir mørkt,
slik at jeg kan ta med hodelykt.

**Acceptance Criteria:**

**Given** `src/kjerne/sol.ts` med NOAA-beregning (senit 90,833°, havnivå som horisont og Værpunktet)
**When** sola beregnes for 9. november 2026 og 21. juni 2026
**Then** 9. november gir sol opp 08:30 og ned 15:59, og 21. juni gir 03:28 og 23:37, med høyst 2 min avvik og avrundet til hele minutter (FR-21, AR-9)
**And** suncalc er ikke en avhengighet

**Given** solnedgang 16:00 sendt inn som `soltider`
**When** en Tur ender 15:30
**Then** den får ikke Mørkevarsel
**And** en Tur som ender 15:31, får Mørkevarsel med klokkeslett og tipset «Lurt å ta med hodelykt.»

**Given** en Tur som starter før soloppgang
**When** Mørkevarselet vurderes
**Then** Turen får Mørkevarsel

**Given** Turer med Mørkevarsel
**When** Turene filtreres
**Then** Mørkevarselet fjerner ingen Turer

**Given** et Tidsvindu som går over midnatt
**When** Mørkevarselet vurderes
**Then** soltidene for riktig Oslo-dato brukes

### Story 1.8: Rangering, utvalg og den korteste Turen

Som turgåer
vil jeg få de beste forslagene, til ulike Mål,
slik at jeg kan velge mellom reelle alternativer.

**Acceptance Criteria:**

**Given** Værklasse god, middels eller mangler
**When** Turene rangeres
**Then** rekkefølgen følger kriteriene i FR-16: Turer uten Mørkevarsel først, deretter flest treff på Opplevelsespreferanser, så Turtid nærmest Tilgjengelig tid, og til slutt ID alfabetisk
**And** UJ-1 (god Værklasse, 9. november, start 13:30, 2 t, Middels, utsikt) gir Tusenårsvarden fra Damefallet, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet, i den rekkefølgen og uten Mørkevarsel
**And** UJ-1 kl. 15:00 med 1 t gir Storlihytta fra Vardeveien uten Mørkevarsel, og deretter Skihytta fra Damefallet og Bergsvatnet, begge med Mørkevarsel

**Given** Turer som består filtreringen
**When** opptil tre Turforslag velges
**Then** den høyest rangerte Turen per Mål velges først, og listen fylles på i rangeringsrekkefølge bare hvis det er færre enn tre
**And** god Værklasse, 9. november, start 10:00, 2 t 30 min, Krevende, utsikt og vann gir Tusenårsvarden fra Grua, Varden via Den grønne korridor og Moldevatnet fra Jensgurilia, i den rekkefølgen
**And** listen fylles aldri med Turer som ikke passer (FR-17)

**Given** at filtreringen fjerner alle Turer
**When** Resultatet lages
**Then** den korteste Turen innenfor valgt Vanskelighetsgrad blir Alternativ, sammen med hvor mye mer tid den trenger
**And** 15 min gir Storlihytta fra Vardeveien (16 min) med «trenger 1 min mer»
**And** Mørkevarsel gjelder Alternativet etter samme regel (FR-18)

**Given** samme Søk, Værklasse, soltider og Turdatasett
**When** rangeringen kjøres flere ganger, og med Turene i stokket rekkefølge
**Then** rekkefølgen er den samme hver gang

### Story 1.9: Regeltekst og innholdet i Turkortet

Som turgåer
vil jeg se hvorfor hver Tur ble foreslått,
slik at jeg kan vurdere forslaget selv.

**Acceptance Criteria:**

**Given** `src/kjerne/format.ts`
**When** tid, varighet, lengde og tall formateres
**Then** formatet er 24-timersklokke, «1 t 32 min», desimalkomma og én desimal uten «,0» (UX-DR47)
**And** all tekst med tall i kjernen lages med `format.ts`

**Given** et Turforslag når Værmeldingen mangler
**When** Regelteksten lages
**Then** den nevner Turtid og Tilgjengelig tid, at værdata mangler, og hvilke Opplevelsespreferanser Turen treffer
**And** den nevner aldri en regel som ikke slo inn
**And** samme input gir samme tekst (FR-20)

**Given** alle tekster kjernen lager for testdatasettet og alle Søk i testene
**When** de sjekkes
**Then** ingen av dem inneholder «trygg» eller «trygt»

**Given** et Turkort
**When** Kriterieradene lages
**Then** det finnes fire rader i fast rekkefølge (Tid, Vær, Ønsker, Mørke), med merke ok, warn eller none etter regeltabellen i EXPERIENCE.md › Kriterieradene
**And** Vær-raden er none med «ikke vurdert» når Værmeldingen mangler
**And** Mørke-raden er warn når Turen har Mørkevarsel (UX-DR24)

**Given** et Turkort
**When** resten av innholdet lages
**Then** det har faktalinje (lengde totalt · høydemeter · høyeste punkt · Vanskelighetsgrad som ord), «Startpunkt: …», kilde `{ navn, url }`, Tidsstolpe-andel (Turtid ÷ Tilgjengelig tid) og andelene for Dagslysstolpen (UX-DR25, UX-DR26)
**And** det har Stokkoversikt-rad («{Turtid} uten pauser · tilbake HH:MM») og lesetekst for skjermlesere, for eksempel «Turforslag 1 av 3: Tusenårsvarden fra Damefallet. Turtid: 1 t 32 min av 2 t, gangtid uten pauser. …» (UX-DR43)
**And** kortet validerer mot visningsskjemaet fra Story 1.4

### Story 1.10: Serveren svarer på Søket

Som turgåer
vil jeg få et ferdig Resultat fra serveren når jeg trykker «Finn tur»,
slik at siden bare trenger å vise det.

**Acceptance Criteria:**

**Given** `POST /api/sok` med et gyldig Søk
**When** serveren svarer
**Then** svaret er en visningsmodell som validerer mot skjemaet, med det normaliserte `sok`, eventuell `justering` og en ny `resultatId`
**And** Søket normaliseres alltid, så passert tid gir aldri 400 (AR-3)
**And** et ugyldig Søk gir 400 med `{ feil: 'ugyldig-sok', detaljer }`, og annen feil gir 500 (AR-7)

**Given** `lesDemoId` og `lagMiljo` i `src/server/miljo.ts`
**When** det kommer et kall uten `?demo=`
**Then** klokka er systemklokka, og værkilden gir `null` til Epic 2 er ferdig, så Resultatet følger FR-13
**And** klokka leses bare i `miljo.ts`

**Given** et kall med `?demo=uten-vaer`
**When** serveren svarer
**Then** «nå» er hentet fra `data/vaerscenarioer/uten-vaer/scenario.json`, værkilden er `"vaer": "mangler"`, og det ekte Turdatasettet brukes
**And** scenarioet er statisk importert i registeret `src/server/vaer/scenarioer.ts`
**And** en ukjent demo-ID gir 400 med `{ feil: 'ukjent-demo', gyldigeDemoIder }`

**Given** visningsmodellen for Resultat
**When** den lages
**Then** `overskrift` følger reglene i UX-DR15, for eksempel «Tre Turer som passer tiden din» og «Ingen Tur passer 15 min.», med tallord for antall
**And** `dittSok` og `liveTekst` er fylt ut, og Omtrentlig rute står i `kart.rute` som `MultiLineString` i `[lon, lat]` (AR-16)
**And** ingen snake_case-felt fra Turdatasettet går ut av serveren

**Given** `lagSidedata(demoId)` i `src/server/side.ts`
**When** siden rendres
**Then** sidedataene validerer mot sidedata-skjemaet, med låste valg for i dag (passerte tider, og «I dag» etter 22:00)

**Given** en kontrakttest
**When** den kjøres
**Then** svaret fra `/api/sok` valideres mot skjemaet for hver demo-ID som finnes
**And** ingen test kaller MET eller Anthropic (AR-26)

### Story 1.11: Søk-flaten

Som turgåer
vil jeg fylle ut ett enkelt skjema med fornuftige standardverdier,
slik at jeg kan finne en tur med ett trykk.

**Acceptance Criteria:**

**Given** `src/ui/tokens.css`
**When** stilarket leses
**Then** alle tokens fra frontmatteren i DESIGN.md finnes som CSS-variabler, og komponentene bruker CSS Modules med disse variablene (UX-DR1)
**And** faste tekster ligger ordrett i `src/ui/tekster.ts`
**And** knappene er primær, sekundær eller tonet, alle som piller, og «Finn tur» bruker `heightLarge`. Rust brukes aldri på knapper (UX-DR5).

**Given** Søk-flaten
**When** den vises
**Then** den har Toppfeltet med logo og «Moldemarka» (UX-DR6), overskriften «Hvor lenge vil du gå?», ingressen og Skjemakortet med to stokk-kanter (UX-DR2, UX-DR8)
**And** Skjemakortet har Turdag og Vanskelighetsgrad som Segmentvelgere (radiogruppe), Starttidspunkt og Tilgjengelig tid som Trinnvelgere med − og + og `<select>`, og utsikt og vann som Preferansebrikker (avkrysningsbokser), med hjelpetekstene ordrett (UX-DR9–UX-DR11)
**And** Krediteringen står nederst (UX-DR7)

**Given** sidedata med «nå» etter 22:00
**When** Søk-flaten vises
**Then** «I dag» er låst med «Etter kl. 22 kan du bare velge i morgen.»

**Given** at Turdag endres
**When** «I morgen» velges
**Then** Starttidspunkt blir 10:00
**And** når «I dag» velges igjen, blir det «nå» rundet opp, og passerte tider er låst

**Given** Trinnvelgeren
**When** den brukes med tastatur og skjermleser
**Then** knappene har tilgjengelige navn som «Reduser Starttidspunkt med 15 min»
**And** Starttidspunkt går fra 06:00 til 22:00 og Tilgjengelig tid fra 15 min til 5 t, og «nå» står under verdien når den er nå

**Given** «Finn tur»
**When** den trykkes med standardverdiene
**Then** Søket sendes via `src/ui/api.ts` med eventuell `?demo=`, og knappen er aldri låst
**And** får Søket en `justering`, viser hjelpeteksten under Starttidspunkt teksten fra serveren (UX-DR12)

**Given** bredde 360–1199 px og ≥ 1200 px
**When** siden vises
**Then** mobil har forklaringen øverst og Skjemakortet i tommelsonen med «Finn tur» nederst, og nettbrett har forklaringen og Skjemakortet
**And** PC bruker nettbrettoppsettet til kartet kommer i Epic 3
**And** det er ingen horisontal rulling ved 360, 768, 1200 og 1440 px (NFR-1)

**Given** Demomodus (`?demo=uten-vaer`)
**When** siden vises
**Then** Demomodus-merket står som okerfarget pille i toppfeltet på PC og som felt under toppfeltet på mobil: «DEMOMODUS · Værscenario: … · «nå» = …» (UX-DR41)

**Given** hele Søk-flaten
**When** den brukes med tastatur
**Then** alle felt kan nås og endres, har synlige etiketter og fokusring, trykkflatene er minst 44 × 44 px, og kontrasten er minst 4,5:1 (NFR-9, UX-DR44)
**And** teksten tåler 200 % zoom ved 360 px

### Story 1.12: Resultat med Turkort på PC

Som turgåer
vil jeg se Turforslagene side om side med Turtid, kriterier og begrunnelse,
slik at jeg kan sammenligne dem raskt.

**Acceptance Criteria:**

**Given** et Resultat med Turforslag og manglende vær, på ≥ 1200 px
**When** det vises
**Then** rekkefølgen er Demomodus-merke, Ditt søk, Værmangel-linjen, overskriften, kortene, Ansvarsmerknaden og Krediteringen (UX-DR13)
**And** Ditt søk er et panel med overlinjen DITT SØK, fem felt («ingen» når ingen preferanse er valgt) og knappen «Endre søk», som går tilbake til Søk med verdiene (UX-DR14)
**And** Værmangel-linjen viser «Været er ikke vurdert.» og «Vi fikk ikke hentet Værmeldingen fra MET.» (UX-DR18)

**Given** Turkortene på PC
**When** de vises
**Then** de står side om side i like brede og like høye kolonner, med bredde og mellomrom fra tokenene (UX-DR35)
**And** hvert kort har Nummerstempel og «1 av 3», Mål og «fra …», faktalinje, «Startpunkt: …», perforering, PASSER FORDI, fire Kriterierader, Begrunnelse-boks med Regeltekst i kursiv og fot med «Kilde: …» (UX-DR23, UX-DR24, UX-DR27)
**And** Tidsstolpen og Dagslysstolpen er tegnet etter andelene i visningsmodellen (UX-DR25, UX-DR26)
**And** kildelenken har kildens navn som lenketekst og en trykkflate på minst 44 × 44 px (FR-29)

**Given** kortene og panelene
**When** de vises
**Then** formene følger tokenene (UX-DR3): `rounded.card` på kort, `rounded.md` på paneler og `rounded.panel` på Begrunnelse-boksen, og perforeringen finnes bare på kort
**And** dybden lages med kortfot (6 px under kortet) og hårstreker, uten uskarpe skygger, gradienter eller glass (UX-DR2)
**And** Nummerstempelet er et avrundet kvadrat med 1–3 og `rounded.stamp` (UX-DR4)
**And** Ansvarsmerknaden er et papirpanel med merket none og den faste teksten fra `tekster.ts`, under Turforslagene (FR-17, UX-DR42)

**Given** Resultatet
**When** det vises
**Then** overskriften meldes i et høflig live-område
**And** skjermlesere leser hvert kort som én artikkel med leseteksten fra visningsmodellen (UX-DR43)

**Given** et nytt Søk
**When** Resultatet kommer
**Then** det erstatter det forrige helt, og siden ruller til overskriften (FR-6, UX-DR46)

**Given** Playwright mot `?demo=uten-vaer`
**When** testene kjøres
**Then** de sjekker tilstanden, antall kort og feltene i hvert kort, men aldri Turnavn (AR-26)

### Story 1.13: Stokken på mobil og nettbrett

Som turgåer på mobil
vil jeg bla gjennom Turforslagene ett om gangen med tommelen,
slik at jeg kan lese hvert forslag i ro.

**Acceptance Criteria:**

**Given** et Resultat med tre Turforslag, på 360–1199 px
**When** det vises
**Then** Ditt søk er én linje, for eksempel «I dag 13:30 · 2 t · Middels · utsikt», der preferanseleddet utelates når ingen er valgt, og «Endre søk» står i toppfeltet (UX-DR14)
**And** Stokken viser ett kort med opptil to stokk-kanter, og Begrunnelsen står som én kursiv linje med kildelenken under (UX-DR27, UX-DR31)

**Given** Stokknavigasjonen i tommelsonen
**When** brukeren blar
**Then** «Forrige» er inaktiv på kort 1, og «Neste tur» er inaktiv på siste kort
**And** midten viser «1 av 3» med prikker, og knappene heter «Forrige Turforslag» og «Neste Turforslag» (UX-DR32)
**And** sveip og ← og → blar når Stokken har fokus, og Stokken heter «Turforslag 1 av 3» for skjermlesere

**Given** blaingen
**When** den animeres
**Then** kortet glir ut og det neste løftes på ca. 250 ms
**And** med «Reduser bevegelse» er animasjonen slått av

**Given** Stokkoversikten under Stokken
**When** den vises
**Then** den heter «Alle tre i stokken» og har én rad per kort med stempel på 40 px, «Mål fra Startpunkt», fire små Kriteriemerker og «{Turtid} uten pauser · tilbake HH:MM» (UX-DR34)
**And** et trykk på en rad velger kortet og ruller til Stokken, og den valgte raden har skoggrønn kant

**Given** to Turforslag
**When** Stokken vises
**Then** Stokkoversikten heter «Begge i stokken»
**And** med ett Turforslag vises verken stokk-kanter, Stokknavigasjon eller Stokkoversikt (UX-DR33)

**Given** 768–1199 px
**When** siden vises
**Then** den bruker mobiloppsettet med `margin-tablet` og `text-max-width` (UX-DR45)

### Story 1.14: Alternativ, Kontaktfeil, Plassholder og Tilbake

Som turgåer
vil jeg alltid få et svar jeg kan gjøre noe med, også når ingen Tur passer eller nettet svikter,
slik at jeg aldri står igjen med en tom side.

**Acceptance Criteria:**

**Given** et Søk der ingen Tur passer Tilgjengelig tid (15 min)
**When** Resultatet vises
**Then** Alternativkortet viser stempelet «→», «Alternativ · den korteste Turen», overlinjen SLIK STÅR DEN MOT SØKET DITT og Tid-raden som warn
**And** Tidsstolpen har en rustfarget bit ut over enden og en loddrett strek ved grensen (UX-DR25)
**And** under kortet står primærknappen «Endre Tilgjengelig tid» og «Med {korteste Turtid rundet opp til kvarter} eller mer passer minst én Tur.» (UX-DR28)
**And** «Endre Tilgjengelig tid» går til Søk med fokus på feltet

**Given** at «Finn tur» er trykket
**When** svaret ikke er kommet ennå
**Then** Plassholderstokken vises, med to tomme stokk-kanter, en tom kortflate og «Finner turer …», uten spinner (UX-DR30)

**Given** at svaret ikke kommer innen 10 s, eller at nettverket feiler
**When** klienten gir opp
**Then** Kontaktfeil-kortet viser «Vi fikk ikke kontakt.» og «Søket ditt er tatt vare på.», uten kart og Ansvarsmerknad, og meldingen meldes i live-området (UX-DR29)
**And** «Prøv igjen» sender det siste Søket på nytt, og «Endre søk» går til Søk med verdiene

**Given** et Resultat
**When** brukeren trykker Tilbake i nettleseren
**Then** Søk vises med verdiene fra Søket
**And** Resultat lager én historikkoppføring, og et nytt Søk fra Resultat erstatter oppføringen
**And** `?demo` beholdes i URL-en ved alle historikkendringer, mens Søket aldri står i URL-en (AR-2, AR-13)

**Given** Playwright mot `?demo=uten-vaer`
**When** testene kjøres
**Then** Alternativ, Plassholder, Kontaktfeil (med nettverket stoppet) og Tilbake er testet

### Story 1.15: README og sluttsjekk for Epic 1

Som sensor
vil jeg kunne starte appen etter README uten gruppens nøkler,
slik at jeg kan prøve den selv.

**Acceptance Criteria:**

**Given** README
**When** den leses
**Then** den forklarer lokal start med `npm install && npm run dev`, Demomodus med `?demo=uten-vaer`, testkommandoene og konverteringsskriptet (AR-25)
**And** den sier at appen virker uten `ANTHROPIC_API_KEY` (NFR-3)

**Given** en ren klone uten `.env`
**When** README følges
**Then** appen starter og gir Turforslag med «Været er ikke vurdert.»

**Given** Production-URL-en med «Fast 4G»-struping i nettleseren
**When** «Finn tur» trykkes
**Then** Turforslag med Regeltekst vises innen 3 s, og målingen er notert (NFR-5)

**Given** sjekklisten i SM-4
**When** Søk, Turforslag og Alternativ sjekkes ved 360, 768 og 1440 px
**Then** ingen sjekk feiler, og resultatet er notert

**Given** hele appen
**When** den gjennomgås
**Then** den har ingen karusell, popup, varsler, tellere, deling, favoritter, innlogging eller «Min posisjon», og ingenting krever hover, dobbelttrykk eller langt trykk (UX-DR46)
**And** tekstene bruker begrepene fra PRD §3 og er på bokmål, og merknadstekstene fra skissene er ikke bygget (UX-DR47, NFR-8)

## Epic 2: Turforslag som tar hensyn til været

Brukeren ser Værklassen for Tidsvinduet sitt. Ved dårlig vær kommer en Værvarsling og Turforslag rangert for dårlig vær. Ved frarådet vær vises ingen Turforslag, og appen foreslår et Bedre tidsvindu som kan brukes med ett trykk. Demomodus får UJ-1–UJ-3 og `ingen-bedre`.

### Story 2.1: Værtersklene og Værklassen

Som turgåer
vil jeg at hver time i Tidsvinduet får en Værklasse etter faste grenser,
slik at vurderingen av været er forutsigbar.

**Acceptance Criteria:**

**Given** `data/vaerterskler.json`
**When** fila leses
**Then** den har formen `{ versjon: 1, klasser: [{ klasse, nedbor_mm_t_minst, vind_ms_minst, temp_c_under }] }`, med strengeste klasse først og startverdiene fra FR-8 (AR-11)
**And** fila valideres av et Zod-skjema ved import, og en ugyldig fil gir en tydelig feil
**And** typen `Vaermelding = { timer: { startUtc, tempC, vindMs, nedborMmT, symbolKode | null }[] }` er definert i `src/kjerne/vaer/` (AR-6)

**Given** én time i Værmeldingen
**When** Værklassen settes
**Then** timen får den strengeste klassen der minst én verdi når grensen, med `>=` for nedbør og vind og `<` for temperatur
**And** eksemplene i FR-8 gjelder: 2,0 mm/t og 3 m/s gir dårlig, 1,9 mm/t og 3 m/s gir middels, 17,2 m/s gir frarådet, og 0,4 mm/t, 7,9 m/s og 5 °C gir god

**Given** et Tidsvindu
**When** Værklassen for vinduet settes
**Then** den er klassen til den dårligste timen blant timene som overlapper vinduet (FR-9)
**And** mangler én av timene i Værmeldingen, er klassen `mangler` (AR-6)

**Given** `testdata/vaerklasse-fasit.json` med timer og Tidsvinduer og fasit for klassene
**When** Vitest kjøres
**Then** alle radene i fasiten består

**Given** en endret grense i `data/vaerterskler.json`
**When** testene kjøres på nytt
**Then** bare tester som gjelder den grensen endrer utfall, og ingen annen kode må endres (NFR-10)

### Story 2.2: Kalibrering av Værtersklene

Som turgåer
vil jeg at Værklassen stemmer med hva en vanlig turgåer ville ment om været,
slik at jeg kan stole på varslingene.

**Acceptance Criteria:**

**Given** at loggingen 10.–16. november er ferdig
**When** `scripts/kalibrering_vaerlogg.py` endres fra 17. november
**Then** skriptet leser tersklene fra `data/vaerterskler.json` i stedet for egne `TERSKLER`
**And** `--selvtest` kjører `testdata/vaerklasse-fasit.json` og består
**And** skriptet bruker egen User-Agent, som et navngitt unntak fra AD-6 (AR-12)

**Given** 14 vurderte Tidsvinduer i `vaerlogg.csv`
**When** `--oppsummer` kjøres
**Then** antall avvik er notert
**And** er det mer enn 2 avvik, er tersklene justert i `data/vaerterskler.json`, med grensene for dårlig og frarådet prioritert

**Given** resultatet av kalibreringen
**When** storyen avsluttes
**Then** antall avvik og eventuelle nye terskler er ført i PRD §10 spm. 1, og tabellen i §4.2 og eksemplene i FR-8 er oppdatert hvis tersklene ble endret
**And** Værord-grensene under laveste terskel (EXPERIENCE.md › Værord) er vurdert sammen med tersklene
**And** punktet er lukket i `issues.md`

### Story 2.3: Værscenarioer for Demomodus og tester

Som sensor
vil jeg kunne vise UJ-1, UJ-2 og UJ-3 uansett hvordan været er i dag,
slik at alle brukerreisene kan demonstreres.

**Acceptance Criteria:**

**Given** `parseMetCompact` i `src/kjerne/vaer/met-compact.ts`
**When** et MET `compact`-svar parses
**Then** resultatet er en `Vaermelding` (typen fra Story 2.1) med bare radene som har `next_1_hours` (AR-6)
**And** et svar uten `timeseries` gir en tydelig feil

**Given** `data/vaerscenarioer/` med `uj-1`, `uj-2`, `uj-3` og `ingen-bedre`
**When** scenarioene lastes
**Then** hvert har `met.json` (MET `compact` med én desimal) og `scenario.json` med `na` (ISO 8601 med forskyvning) og `beskrivelse` (AR-14)
**And** `uj-1` gir god Værklasse kl. 13:30–15:30 den 9. november, `uj-2` gir dårlig vær på formiddagen og bedre fra kl. 14, `uj-3` gir frarådet med vind opp mot 19 m/s, og `ingen-bedre` gir dårlig vær uten noe Bedre tidsvindu
**And** alle er statisk importert i registeret `src/server/vaer/scenarioer.ts`, ved siden av `uten-vaer`

**Given** `?demo=uj-1`, `?demo=uj-2`, `?demo=uj-3` og `?demo=ingen-bedre`
**When** et Søk sendes
**Then** `lagMiljo` gir scenarioets «nå» og en værkilde som returnerer scenarioets Værmelding, uten `met.ts` og MET-cachen (AR-14)
**And** Resultatet tar Værmeldingen i bruk fra Story 2.8
**And** kontrakttesten fra Story 1.10 dekker de nye demo-ID-ene

**Given** regeltestene
**When** de kjøres
**Then** de bruker de samme Værscenarioene som Demomodus (NFR-2, NFR-11)

### Story 2.4: Værmeldingen hentes fra MET

Som turgåer
vil jeg at appen bruker den ferske Værmeldingen fra MET,
slik at forslagene passer været akkurat nå.

**Acceptance Criteria:**

**Given** `src/server/vaer/met.ts`, som er den eneste MET-klienten
**When** Værmeldingen hentes
**Then** kallet går til `compact` med Værpunktet fra `src/kjerne/vaerpunkt.ts`, trunkert til fire desimaler, og `altitude=400`, over HTTPS
**And** User-Agent er `turplanlegger-ibe160/<versjon> https://github.com/IBE160-2026/G85-friedl`, og kallet bruker `cache: 'no-store'` (AR-10, NFR-4)
**And** nettleseren kaller aldri MET

**Given** en Værmelding i cachen som ikke har passert `Expires`
**When** et nytt Søk kommer
**Then** MET kalles ikke
**And** etter `Expires` sendes `If-Modified-Since` med verdien fra `Last-Modified`, og svaret 304 forlenger levetiden
**And** samtidige Søk med samme nøkkel gir bare ett kall

**Given** at MET ikke svarer innen 2 s, svarer med feil eller gir et svar som ikke kan parses
**When** et Søk kommer
**Then** adapteren gir `null`, feilen logges med `console.error`, og Resultatet følger FR-13 uten HTTP-feil (AR-7, AR-24)

**Given** et Søk for Turdagen
**When** timene velges
**Then** Værmeldingen gir timer for hele Turdagen og for timene i Tidsvinduet etter midnatt (FR-7)

**Given** testene for adapteren
**When** de kjøres
**Then** de bruker en falsk `fetch`, og ingen test kaller MET

**Given** et kall uten `?demo=` i produksjon
**When** Søket besvares
**Then** `lagMiljo` velger MET som værkilde

### Story 2.5: Rangering i dårlig vær

Som turgåer
vil jeg få lave og skjermede Turer øverst når været er dårlig,
slik at jeg kan gå likevel.

**Acceptance Criteria:**

**Given** Værklasse dårlig
**When** Turene rangeres
**Then** rekkefølgen er Turer uten Mørkevarsel først, deretter Lavtliggende tur (høyeste punkt under 400 moh), så Egnet i dårlig vær (ja før ukjent før nei), så flest treff på Opplevelsespreferanser uten utsikt, så Turtid nærmest Tilgjengelig tid og til slutt ID (FR-16)
**And** Moldevatnet fra Jensgurilia (lavtliggende, egnet ja) står over Bergsvatnet (lavtliggende, egnet ukjent) når begge passer og ingen av dem får Mørkevarsel
**And** Værscenarioet for UJ-2 (i morgen 10:00, 3 t, Krevende, utsikt) gir Moldevatnet fra Jensgurilia først

**Given** Værklasse god og middels for samme Søk
**When** Turene rangeres
**Then** begge gir de samme Turforslagene i samme rekkefølge

**Given** en hvilken som helst Værklasse
**When** Turene filtreres
**Then** været fjerner aldri enkeltturer (FR-15)

### Story 2.6: Bedre tidsvindu

Som turgåer
vil jeg få vite når været blir bedre,
slik at jeg kan flytte turen i stedet for å droppe den.

**Acceptance Criteria:**

**Given** Værklasse dårlig eller frarådet
**When** appen leter etter et Bedre tidsvindu med samme Tilgjengelig tid
**Then** den prøver hele timer fra soloppgang til 30 min før solnedgang, innenfor 06:00–22:00, på Turdagen og, når Turdag er «i dag», også i morgen
**And** 9. november (sol opp 08:30, ned 15:59) prøves 09:00–15:00, og 21. juni prøves 06:00–22:00
**And** bare Starttidspunkter som ikke har passert, prøves
**And** et vindu der en time mangler i Værmeldingen, hoppes over (AR-6)

**Given** at et vindu med bedre Værklasse finnes
**When** Bedre tidsvindu velges
**Then** det tidligste Starttidspunktet vises, med antall Turer som består FR-15 og ikke får Mørkevarsel fra det nye Starttidspunktet, uten hensyn til Opplevelsespreferanser
**And** UJ-2 (9. november, 3 t, Krevende) gir Bedre tidsvindu fra kl. 14:00, der 5 av 12 Turer passer før mørket
**And** i dag 9. november, med dårlig vær til kl. 15:00, gir 3 t og Krevende et Bedre tidsvindu i dag fra kl. 15:00 med 1 Tur. Appen bytter ikke til i morgen på egen hånd.
**And** visningsmodellen har `bedreTidsvindu: funnet` med `nyttSok` (ny Turdag og nytt Starttidspunkt, resten uendret) og tekstene

**Given** at ingen Tur passer før mørket i det nye vinduet
**When** Bedre tidsvindu vises
**Then** appen sier det, og Bedre tidsvindu vises likevel

**Given** Værscenarioet `ingen-bedre`
**When** appen leter
**Then** visningsmodellen har `bedreTidsvindu: ingen` med teksten som passer Turdagen (FR-19)

**Given** Værklasse god, middels eller mangler
**When** Resultatet lages
**Then** det finnes ikke noe `bedreTidsvindu`

### Story 2.7: Værsammendrag, Værord og Regeltekst med vær

Som turgåer
vil jeg få været oppsummert med tall og vanlige ord,
slik at jeg forstår hvorfor Turene ble foreslått.

**Acceptance Criteria:**

**Given** Tidsvinduet i UJ-1
**When** Værsammendraget lages
**Then** det har Værklasse, Værsymbol, temperaturspenn, høyeste nedbør og høyeste vind, for eksempel «3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s» (FR-10, UX-DR16)
**And** tallene har én desimal uten «,0» og hele grader, og «−2 til 1 °C» brukes når én av verdiene er under null
**And** Høydemerknaden er «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.»

**Given** `src/kjerne/vaerord.ts`
**When** værordene velges
**Then** grensene under laveste terskel (0,1 mm/t og 5,5 m/s) ligger her, og båndene fra middels og opp hentes fra Værtersklene (AR-11)
**And** værordene sier alltid «nedbør», og UJ-1 gir «oppholdsvær og lite vind»

**Given** timene i Tidsvinduet
**When** Værsymbolet velges
**Then** det hentes fra timen med dårligst Værklasse, og den første av dem ved likhet
**And** ordet hentes fra tabellen i EXPERIENCE.md uten endelsen, og `…andthunder` gir «… og torden»
**And** en ukjent `symbol_code` gir verken ikon eller ord (UX-DR17)

**Given** et Turforslag i godt vær
**When** Regelteksten lages
**Then** UJ-1 gir «passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt» (FR-20)
**And** Vær-raden er ok med «Værklasse god» og detaljen «oppholdsvær og lite vind · 3–5 °C»

**Given** et Turforslag i dårlig vær
**When** Regelteksten og Vær-raden lages
**Then** de nevner reglene for dårlig vær som slo inn, for eksempel «Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær»
**And** de nevner aldri en regel som ikke slo inn

### Story 2.8: Resultatmodell for dårlig og frarådet vær

Som turgåer
vil jeg få et Resultat som passer været,
slik at jeg aldri får forslag når det er frarådet å gå.

**Acceptance Criteria:**

**Given** Værklasse god eller middels
**When** Resultatet lages
**Then** det har Værsammendrag og Turforslag, eller den korteste Turen (FR-6)

**Given** Værklasse dårlig
**When** Resultatet lages
**Then** det har en Værvarsling med Tidsvinduet, høyeste nedbør, høyeste vind og temperaturspenn, med den utløsende verdien først (FR-11)
**And** det har Turforslag eller den korteste Turen, og Bedre tidsvindu
**And** overskriften er for eksempel «Tre Turer i dårlig vær» (UX-DR15)

**Given** Værklasse frarådet
**When** Resultatet lages
**Then** `utfall` er `fraradet`, uten Turforslag og uten den korteste Turen, også når ingen Tur passer tiden (FR-12)
**And** meldingen nevner verdiene som utløste klassen, for eksempel «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).»
**And** Frarådet-kortet har bare Kriterieradene Vær og Tid
**And** Bedre tidsvindu er med som Alternativ

**Given** Værscenarioet for UJ-3
**When** et Søk sendes
**Then** Resultatet har null Turforslag og ingen feilmelding (SM-C1)
**And** med 15 min og Bedre tidsvindu tatt i bruk vises den korteste Turen (16 min) med hvor mye mer tid den trenger

**Given** Værmeldingen mangler
**When** Resultatet lages
**Then** det har verken Værklasse, Værvarsling eller Bedre tidsvindu, og Turene rangeres etter reglene for godt vær (FR-13)

### Story 2.9: Vær-delen i Resultatet

Som turgåer
vil jeg se været for Tidsvinduet øverst i Resultatet,
slik at jeg vet hva jeg går ut i.

**Acceptance Criteria:**

**Given** `public/vaerikoner/` med METs værikoner og `LICENSE` (MIT)
**When** et Værsymbol vises
**Then** ikonet hentes fra `symbol_code` med endelse, har tom `alt` og står sammen med ordet (AR-20, UX-DR17)

**Given** Værklasse god eller middels
**When** Resultatet vises
**Then** Værsammendraget står der Værmangel-linjen ellers står, som papirpanel med Kriteriemerke, «Værklasse god», Værsymbol med ord, verdiene, Tidsvinduet helt til høyre og Høydemerknaden under (UX-DR16)
**And** på mobil står klasse og symbol på én linje og verdiene på neste

**Given** Værklasse dårlig
**When** Resultatet vises
**Then** Værvarslingen står over Turforslagene eller Alternativet, med flaten `vaervarsling`, merket warn og tittelen i rust, for eksempel «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00» (UX-DR19)
**And** verdiene står med den utløsende først, og forklaringen om rekkefølgen står under
**And** Værvarslingen meldes i live-området

**Given** Turkortene i godt og dårlig vær
**When** de vises
**Then** Vær-raden viser merke og tekst fra visningsmodellen, med verdien i rust ved warn

**Given** Playwright mot `?demo=uj-1` og `?demo=uj-2`
**When** testene kjøres
**Then** de sjekker Værsammendrag, Værvarsling og Vær-raden på PC og mobil, uten å sjekke Turnavn

### Story 2.10: Bedre tidsvindu og Frarådet i Resultatet

Som turgåer
vil jeg kunne ta i bruk et bedre tidspunkt med ett trykk,
slik at jeg slipper å fylle ut Søket på nytt.

**Acceptance Criteria:**

**Given** Værklasse dårlig med et Bedre tidsvindu
**When** Resultatet vises
**Then** Bedre tidsvindu-boksen står i Værvarslingen, til høyre på PC og under på mobil, med skoggrønn kant, overlinjen BEDRE TIDSVINDU, teksten «I morgen fra kl. 14:00 er Værklassen god» og antall Turer før mørket (UX-DR20)
**And** knappen «Bruk 14:00» eller «Bruk i morgen 11:00» sender `nyttSok`, og det nye Resultatet erstatter det forrige

**Given** at ikke noe Bedre tidsvindu finnes
**When** Resultatet vises
**Then** boksen viser teksten som passer Turdagen («… i dag eller i morgen.» eller «… i morgen.») uten knapp

**Given** Værklasse frarådet
**When** Resultatet vises
**Then** Frarådet-kortet har form som et Turkort, med en papirflate med vindstreker der Kartutsnittet skal stå (byttes i Story 3.2), stempelet «!», «Ingen Turforslag» og «Værklasse frarådet» i rust, verdiene og meldingen, DERFOR INGEN TUR med radene Vær og Tid, og lenken «Sjekk også MET sine farevarsler.», som åpnes i ny fane (UX-DR21)
**And** Bedre tidsvindu-kortet står ved siden av på PC og nederst på samme ark på mobil, med stempelet «→», overlinjen ALTERNATIV · BEDRE TIDSVINDU, dagen i `page-title`, «fra kl. 11:00 · samme 2 t, Middels» og knappen «Bruk i morgen 11:00» (UX-DR22)
**And** kart og Ansvarsmerknad vises ikke, og frarådet meldes i live-området

**Given** Playwright mot `?demo=uj-1`, `uj-2`, `uj-3`, `uten-vaer` og `ingen-bedre`
**When** testene kjøres
**Then** alle radene i tabellen under FR-6 er testet: god, dårlig, frarådet og manglende vær, både med Turforslag og når ingen Tur passer
**And** testene sjekker tilstand, antall og felt, men aldri Turnavn (AR-26)

### Story 2.11: README og prøvekjøring for sensor

Som sensor
vil jeg kunne starte appen og vise UJ-1–UJ-3 i Demomodus etter README,
slik at jeg kan vurdere hele løsningen.

**Acceptance Criteria:**

**Given** README
**When** den leses
**Then** den har lenker til `?demo=uj-1`, `?demo=uj-2` og `?demo=uj-3`, med en kort beskrivelse av hver, og en seksjon om kalibreringen (AR-25)

**Given** en person utenfor gruppa med en ren klone og uten nøkler
**When** personen følger README
**Then** personen starter appen og viser UJ-1, UJ-2 og UJ-3 i Demomodus uten hjelp, og resultatet er notert (SM-3)

**Given** Production-URL-en med ekte MET og «Fast 4G»-struping
**When** «Finn tur» trykkes
**Then** Turforslag med Regeltekst vises innen 3 s, og målingen er notert (NFR-5)

**Given** sjekklisten i SM-4
**When** Værsammendrag, Værvarsling med Bedre tidsvindu og Frarådet sjekkes ved 360, 768 og 1440 px
**Then** ingen sjekk feiler, og resultatet er notert

## Epic 3: Se Turforslagene på kartet

Brukeren ser Startpunkt og Omtrentlig rute for hvert Turforslag på et dempet Kartverket-kart og kan velge Tur i kartet eller i listen. Søk-flaten på PC viser de 8 Startpunktene, og mobil og nettbrett får Kartutsnitt i kortene.

### Story 3.1: Kartet viser Turforslagene

Som turgåer
vil jeg se på kartet hvor Turforslagene starter og omtrent hvor de går,
slik at jeg vet hvor jeg skal.

**Acceptance Criteria:**

**Given** leaflet 1.9.4 og react-leaflet 5.0.0
**When** Resultatet med Turforslag vises
**Then** kartet lastes via klientkomponenten `src/ui/KartLaster.tsx` med `next/dynamic` og `ssr: false`, og `leaflet.css` importeres der (AR-19)
**And** bakgrunnen er Kartverkets `topograatone` (`https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png`), uten nøkkel

**Given** visningsmodellen med `kart` per kort
**When** kartet tegnes
**Then** hvert Turforslag har én rute, tegnet med `<GeoJSON>` fra `kart.rute` (`[lon, lat]`), og ett Startpunkt som nummerert sirkel (FR-23)
**And** når flere Turforslag deler Startpunkt, står numrene side om side
**And** den første Turen er tegnet som valgt, med stiplet skoggrønn rute, mens de andre er tynne og grå, alle med papirhalo
**And** etiketten «omtrentlig rute» står i kursiv langs den valgte ruten (UX-DR36)

**Given** en Tur med `mal_punkt` i Turdatasettet
**When** kartet tegnes
**Then** serveren fyller `kart.malpunkt` fra `mal_punkt`, og Mål vises som trekant
**And** tegnforklaringen nede til venstre viser Mål bare når minst ett Mål-punkt finnes

**Given** kartet
**When** det åpnes
**Then** det zoomer slik at alle Turforslagene synes
**And** brukeren kan zoome og panorere med mus og berøring (FR-25)
**And** krediteringspillen nede til høyre har «© Kartverket» som lenke (FR-29)

**Given** oppsettet
**When** Resultatet vises
**Then** kartet står over kortene på PC med `map-height-desktop`, og etter Stokken på mobil og nettbrett med `map-height-mobile` (UX-DR13, NFR-1)
**And** ved frarådet vises ikke kartet

**Given** nettverkstrafikken fra nettleseren
**When** siden brukes
**Then** nettleseren kontakter bare vår egen server og `cache.kartverket.no` (AR-20)
**And** Playwright stubber kartflisene, så testene ikke avhenger av Kartverket

### Story 3.2: Kartutsnitt i kortene

Som turgåer på mobil
vil jeg se et lite kart i hvert kort,
slik at jeg ser hvor Turen går uten å rulle ned til kartet.

**Acceptance Criteria:**

**Given** et Turkort på 360–1199 px
**When** det vises
**Then** Kartutsnittet står øverst i kortet, med høyden `map-snippet-height` og 160 px på nettbrett (UX-DR38)
**And** det er samme kartkomponent uten interaksjon, og viser bare kortets egen rute og Startpunkt
**And** det har merket «Turforslag N av 3» og «omtrentlig rute · © Kartverket»

**Given** et Kartutsnitt
**When** brukeren trykker på det
**Then** siden ruller til kartet

**Given** Alternativkortet
**When** det vises på mobil og nettbrett
**Then** Kartutsnittet har merket «Alternativ» (UX-DR28)

**Given** Frarådet-kortet, når Epic 2 er bygget
**When** det vises
**Then** papirflaten fra Story 2.10 er byttet med et Kartutsnitt av Moldemarka uten rute, med vindstreker over (UX-DR21)

**Given** kortene på ≥ 1200 px
**When** de vises
**Then** de har ikke Kartutsnitt

### Story 3.3: Søk-kartet på PC

Som turgåer på PC
vil jeg se hvor Turene i Moldemarka starter før jeg søker,
slik at jeg får oversikt over området.

**Acceptance Criteria:**

**Given** Søk-flaten på ≥ 1200 px
**When** den vises
**Then** Skjemakortet står i 5/12 og kartet i 7/12 (UX-DR8)
**And** kartet viser de 8 Startpunktene fra sidedataene, med telleteksten «12 Turer fra 8 Startpunkter» (UX-DR40)
**And** telleteksten kommer fra sidedataene og er ikke hardkodet

**Given** Søk-flaten på 360–1199 px
**When** den vises
**Then** den har ikke Søk-kartet

### Story 3.4: Når bakgrunnskartet ikke laster

Som turgåer
vil jeg fortsatt se rutene og bruke kortene når kartflisene ikke laster,
slik at forslagene er til nytte uansett.

**Acceptance Criteria:**

**Given** at kartflisene ikke laster (`tileerror`)
**When** kartet vises
**Then** kartflaten blir papirfarget med ruter, Startpunkter og Mål, og teksten «Bakgrunnskartet kunne ikke lastes.» (UX-DR39)
**And** Turkortene, Stokken og knappene virker som før

**Given** Kartutsnitt og Søk-kartet
**When** kartflisene ikke laster
**Then** de får samme papirflate

**Given** Playwright med blokkerte forespørsler til kartflisene
**When** testen kjøres
**Then** feiltilstanden og teksten vises, og Turforslagene kan fortsatt leses og blas i

### Story 3.5: Velg Turforslag i listen eller på kartet

Som turgåer
vil jeg kunne velge et Turforslag og se det uthevet både i listen og på kartet,
slik at jeg vet hvilken rute som hører til hvilket kort.

**Acceptance Criteria:**

**Given** Turkortene på PC
**When** brukeren trykker på et kort eller «Vis på kartet», eller bruker Enter eller mellomrom på kortet
**Then** kortet blir valgt, med skoggrønn kant og fot, og knappen viser «Vises på kartet» tonet med hake (UX-DR35)
**And** kartet uthever ruten til kortet og viser den i Kartinfoboksen (FR-24)
**And** kort 1 er valgt fra start, og bare ett er valgt om gangen

**Given** kartet
**When** brukeren trykker på en rute eller et Startpunkt
**Then** det tilhørende kortet blir valgt, og listen eller Stokken viser det

**Given** Stokken på mobil og nettbrett
**When** brukeren blar til et kort, trykker på en rad i Stokkoversikten eller trykker på et Kartutsnitt
**Then** kortet blir valgt, og kartet uthever ruten

**Given** Kartinfoboksen
**When** et kort er valgt
**Then** den viser lite stempel, navn, lengde totalt, Vanskelighetsgrad og Startpunkt for kortet, med skoggrønn kant, øverst til høyre på PC og over kartet på mobil (UX-DR37)
**And** den er ikke interaktiv

**Given** skjermleser
**When** valget endres
**Then** det valgte kortet er merket som valgt også for skjermlesere (FR-24, UX-DR43)
**And** ruter og Startpunkter kan nås med tastatur og har fokusring (UX-DR44)

**Given** Playwright mot `?demo=uten-vaer`
**When** testene kjøres
**Then** valg fra kort til kart og fra kart til kort er testet på PC og mobil

## Epic 4: Begrunnelser skrevet av en språkmodell

Er en API-nøkkel satt opp, bytter appen Regelteksten med en mer naturlig Språkmodelltekst innen 5 s. Rangeringen endres aldri, og Regelteksten blir stående når modellteksten ikke består kontrollen. Demomodus viser den falske modellen.

### Story 4.1: Kontroll av Språkmodellteksten

Som turgåer
vil jeg at en omskrevet begrunnelse sier nøyaktig det samme som Regelteksten,
slik at jeg aldri får feil tall eller løfter appen ikke kan holde.

**Acceptance Criteria:**

**Given** `kontrollerSprakmodelltekst(tekst, regeltekst, fakta)` i `src/kjerne/begrunnelse/`
**When** en tekst gjengir alle ferdig formaterte verdier fra Regelteksten ordrett (Turtid, Tilgjengelig tid og værverdier, for eksempel «1 t 32 min» og «3,5 mm/t»)
**Then** teksten godkjennes

**Given** en tekst med ett av disse problemene
**When** den kontrolleres
**Then** den avvises, og hvert problem har sin egen test (FR-22):
- en ferdig formatert verdi fra Regelteksten mangler
- et tall finnes verken i Regelteksten eller i fakta om Turen
- tid eller mengde er skrevet med ord, for eksempel «halvannen time» eller «to timer»
- ordet «trygg» eller «trygt» er brukt

**Given** kontrollfunksjonen
**When** den testes
**Then** den er ren og bruker verken nettverk eller klokke (NFR-2)

### Story 4.2: Begrunnelse-endepunktet og den falske språkmodellen

Som turgåer
vil jeg få en mer naturlig begrunnelse når den er klar, uten å vente på den,
slik at forslagene kommer like raskt som før.

**Acceptance Criteria:**

**Given** `POST /api/begrunnelse?demo=…` med `{ sok, turId }`
**When** serveren svarer
**Then** den regner ut Regeltekst og en fast liste med fakta om Turen selv, og svarer `{ tekst: string | null }` (AR-18)
**And** klienten sender aldri tekst, og en `turId` som ikke er et Turforslag for Søket (også den korteste Turen) gir `{ tekst: null }`
**And** et ugyldig Søk gir 400 med `{ feil: 'ugyldig-sok', detaljer }`

**Given** Demomodus
**When** en begrunnelse bes om
**Then** `src/server/sprakmodell/falsk.ts` lager en deterministisk omskriving av Regelteksten som består kontrollen fra Story 4.1

**Given** produksjon uten `ANTHROPIC_API_KEY`
**When** en begrunnelse bes om
**Then** svaret er `{ tekst: null }`, uten HTTP-feil (NFR-3)

**Given** et Resultat med Turforslag
**When** det vises
**Then** hvert Turforslag vises med en gang med Regelteksten, og klienten ber om en begrunnelse per Turforslag
**And** teksten byttes inn bare hvis kortet med samme `resultatId` og `turId` fortsatt vises og det har gått under 5 s siden Resultatet ble vist (`AbortController`)
**And** Begrunnelse-boksen kan bli høyere, men Kriterieradene, utvalget og rekkefølgen endres aldri (UX-DR27)

**Given** et nytt Søk før begrunnelsene har kommet
**When** de gamle svarene kommer
**Then** de byttes ikke inn i det nye Resultatet

**Given** Playwright mot `?demo=uten-vaer`
**When** testen kjøres
**Then** Begrunnelse-boksen viser teksten fra den falske modellen
**And** med et forsinket svar over 5 s står Regelteksten igjen

### Story 4.3: Claude Haiku som språkmodell

Som turgåer
vil jeg få begrunnelser skrevet i naturlig språk når appen har en nøkkel,
slik at teksten blir lettere å lese.

**Acceptance Criteria:**

**Given** `src/server/sprakmodell/claude.ts`, som er det eneste stedet som kaller Anthropic
**When** en begrunnelse bes om og nøkkelen er satt
**Then** kallet bruker `@anthropic-ai/sdk` 1.3.0 og `claude-haiku-5-5` med `timeout: 4000`, `maxRetries: 0`, `thinking: { type: 'disabled' }` og `output_config: { effort: 'low' }`, uten `temperature`, `top_p` eller `top_k` (AR-18)
**And** prompten inneholder bare Regelteksten og fakta om Turen, og ber om samme innhold i mer naturlig språk med verdiene gjengitt ordrett

**Given** svaret fra Claude
**When** det leses
**Then** teksten hentes fra blokker av `type: 'text'`
**And** `stop_reason` lik `refusal` eller `max_tokens`, tidsavbrudd og feil gir `null`, og feilen logges med `console.error`
**And** en tekst som ikke består `kontrollerSprakmodelltekst()`, gir `null`

**Given** testene for `claude.ts`
**When** de kjøres
**Then** de bruker en falsk SDK-klient, og ingen test kaller Anthropic (AR-26)

**Given** Production
**When** nøkkelen settes
**Then** `ANTHROPIC_API_KEY` settes bare i Production under test og demo, med lav utgiftsgrense i Anthropic-konsollen (AR-23)
**And** README sier at nøkkelen er valgfri, og at alt annet virker uten den

**Given** Production-URL-en med nøkkel og «Fast 4G»-struping
**When** «Finn tur» trykkes
**Then** Turforslag med Regeltekst vises fortsatt innen 3 s (NFR-5)
**And** det er notert om Språkmodellteksten kom innen 5 s, og hvor ofte kontrollen avviste den, i en manuell prøve med fem vanlige Søk uten `?demo=`
