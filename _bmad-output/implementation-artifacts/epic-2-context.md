# Epic 2 Context: Turforslag som tar hensyn til været

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Appen tar i bruk Værmeldingen fra MET. Brukeren ser Værklassen for Tidsvinduet sitt i et Værsammendrag. Ved dårlig vær kommer en Værvarsling, Turene rangeres for dårlig vær, og appen foreslår et Bedre tidsvindu. Ved frarådet vær vises ingen Turforslag, bare en melding og et Bedre tidsvindu som kan tas i bruk med ett trykk. Epicen bytter ut værkilden som alltid ga `null` i Epic 1 med MET-adapteren og Værscenarioene. Demomodus får `uj-1`, `uj-2`, `uj-3` og `ingen-bedre`, slik at alle brukerreisene kan vises uansett været. Kalibreringen er gjort (14 av 14 Tidsvinduer, 1 avvik), og startverdiene for tersklene beholdes. Epicen avsluttes med README og en prøvekjøring for sensor.

## Stories

- Story 2.1: Værtersklene og Værklassen
- Story 2.2: Kalibrering av Værtersklene
- Story 2.3: Værscenarioer for Demomodus og tester
- Story 2.4: Værmeldingen hentes fra MET
- Story 2.5: Rangering i dårlig vær
- Story 2.6: Bedre tidsvindu
- Story 2.7: Værsammendrag, Værord og Regeltekst med vær
- Story 2.8: Resultatmodell for dårlig og frarådet vær
- Story 2.9: Vær-delen i Resultatet
- Story 2.10: Bedre tidsvindu og Frarådet i Resultatet
- Story 2.11: README og prøvekjøring for sensor

## Requirements & Constraints

- **Værterskler per time.** Strengeste klasse vinner, og det holder at én verdi når grensen.
  - frarådet: ≥ 10 mm/t eller ≥ 17,2 m/s
  - dårlig: ≥ 2 mm/t, ≥ 10,8 m/s eller < −10 °C
  - middels: ≥ 0,5 mm/t, ≥ 8,0 m/s eller < 0 °C
  - god: under alle grensene

  Middels vises bare og endrer verken utvalg, rangering eller varsler.
- **Værklasse for Tidsvinduet** er klassen til den dårligste timen som overlapper vinduet (13:30–15:30 gir timene 13, 14 og 15). Den gjelder hele Tilgjengelig tid, ikke bare Turtiden. Mangler én time, blir klassen `mangler`.
- **Værmeldingen** gjelder Værpunktet (ca. 400 moh) og dekker hele Turdagen og timene i Tidsvinduet etter midnatt.
- **Resultat per Værklasse** (frarådet går foran alt annet):
  - god eller middels: Værsammendrag, så Turforslag eller den korteste Turen
  - dårlig: Værvarsling med den utløsende verdien først, Turforslag eller den korteste Turen, og Bedre tidsvindu
  - frarådet: melding med de utløsende verdiene og Bedre tidsvindu som Alternativ. Ingen Turforslag og ingen korteste Tur, men aldri en tom side eller en feilmelding.
  - mangler, eller MET svarer ikke innen 2 s: oppførselen fra Epic 1 («Været er ikke vurdert.»), rangering som i godt vær, og verken Værklasse, Værvarsling eller Bedre tidsvindu
- **Været fjerner aldri enkeltturer.**
- **Rangering i dårlig vær:** uten Mørkevarsel, så Lavtliggende tur (høyeste punkt under 400 moh), så Egnet i dårlig vær (ja, ukjent, nei), så flest treff på Opplevelsespreferanser uten utsikt, så Turtid nærmest Tilgjengelig tid, og til slutt ID. God og middels gir samme rekkefølge.
- **Bedre tidsvindu** (bare ved dårlig og frarådet):
  - Appen prøver hele timer fra soloppgang til 30 min før solnedgang, innenfor 06:00–22:00, med samme Tilgjengelig tid, på Turdagen og i morgen når Turdag er «i dag».
  - Passerte Starttidspunkter og vinduer med en manglende time hoppes over.
  - Det tidligste vinduet med bedre Værklasse vises, med antall Turer som består filtreringen og ikke får Mørkevarsel. Opplevelsespreferansene teller ikke.
  - Appen bytter ikke Turdag på egen hånd. Passer ingen Tur før mørket, sier appen det og viser vinduet likevel. Finnes det ikke noe vindu, vises en tekst som passer Turdagen.
- **Tekster:**
  - Tall har én desimal uten «,0» og hele grader («3–5 °C», «−2 til 1 °C», «4 °C»).
  - Værord sier alltid «nedbør». Under laveste terskel gjelder < 0,1 mm/t «oppholdsvær» og < 5,5 m/s «lite vind».
  - Værsymbolet hentes fra timen med dårligst klasse (den første ved likhet). Endelsen velger bare ikonfil, `…andthunder` gir «… og torden», og en ukjent kode gir verken ikon eller ord.
  - Regelteksten har faste deler i fast rekkefølge, nevner bare regler som slo inn, og har ikke temperatur. Ingen tekst inneholder «trygg» eller «trygt».
- **MET-vilkår:** værkall går bare fra serveren, over HTTPS, med identifiserende User-Agent, cache-headere og maks fire desimaler. Nettleseren kaller aldri MET.
- **Ytelse:** Turforslag vises innen 3 s med «Fast 4G»-struping mot ekte MET. Målingen gjøres i 2.11.
- **Navngitte eksempler** testes i Vitest mot kjernen: UJ-1 (god, «oppholdsvær og lite vind»), UJ-2 (bedre fra kl. 14, 5 av 12 Turer, Moldevatnet fra Jensgurilia først), UJ-3 (frarådet, vind opp mot 19 m/s, null Turforslag), `ingen-bedre`, og soltidene 9. november (09:00–15:00) og 21. juni (06:00–22:00).

## Technical Decisions

- **Lag:** Værklasse, rangering, Bedre tidsvindu, Værord, Regeltekst og visningsmodell er rene funksjoner i `src/kjerne/`. Klokke, soltider og Værmelding kommer inn som argumenter. All tekst med tall lages i `src/kjerne/format.ts`, og veggklokke-logikk går gjennom `src/kjerne/tid.ts` (`timerITidsvindu`). Nettleseren regner og formaterer ingenting.
- **Tersklene har én kilde:**
  - `data/vaerterskler.json`: `{ versjon: 1, klasser: [{ klasse: 'fraradet'|'darlig'|'middels', nedbor_mm_t_minst, vind_ms_minst, temp_c_under }] }`, strengeste først. `>=` for nedbør og vind, `<` for temperatur, og `null` betyr ingen grense.
  - Zod validerer fila og avviser ukjente nøkler. Endres en grense, skal ingen annen kode måtte endres.
  - `src/kjerne/vaerord.ts` eier bare grensene under laveste terskel og henter båndene fra tersklene.
- **Fasit:** `testdata/vaerklasse-fasit.json` kjøres av Vitest og av `scripts/kalibrering_vaerlogg.py --selvtest`. Skriptet leser tersklene fra JSON-fila. Det er det eneste unntaket fra regelen om én MET-klient og bruker User-Agent `turplanlegger-ibe160-kalibrering/<versjon> …` uten cache.
- **Én form og én parser:** `Vaermelding = { timer: { startUtc, tempC, vindMs, nedborMmT, symbolKode | null }[] }`, stigende. Den lages bare av `parseMetCompact` i `src/kjerne/vaer/met-compact.ts` (Zod, bare rader med `next_1_hours`). Et svar uten `timeseries` gir en tydelig feil.
- **MET-adapteren** `src/server/vaer/met.ts` er den eneste som kaller `api.met.no` og den eneste som bruker `VaerCache`:
  - `compact`, Værpunktet fra `src/kjerne/vaerpunkt.ts` trunkert til fire desimaler, `altitude=400`
  - User-Agent `turplanlegger-ibe160/<versjon> https://github.com/IBE160-2026/G85-friedl`, `cache: 'no-store'`, og status fra `response.status` (200 eller 304)
  - `VaerCache` i minnet, nøklet på (lat, lon, altitude), asynkron, med ett pågående kall per nøkkel. Ingen kall innenfor `Expires`. Etter det sendes `If-Modified-Since` lik `Last-Modified`, og 304 forlenger levetiden.
  - Tidsgrensen er 2 s. Feil, tidsavbrudd og svar som ikke kan parses gir `null` og `console.error`, aldri en HTTP-feil. Utløpt data brukes ikke.
- **Værscenarioer:** `data/vaerscenarioer/<id>/` har `met.json` (MET `compact`, én desimal) eller `"vaer": "mangler"`, og `scenario.json` med `na` (ISO 8601 med forskyvning) og `beskrivelse`. Registeret `src/server/vaer/scenarioer.ts` importerer dem statisk, og nøklene er de gyldige demo-ID-ene. Scenariokilden bruker `parseMetCompact`, men aldri `met.ts` eller cachen. Regeltestene og Demomodus bruker de samme scenarioene.
- **Valg av værkilde:** bare `lagMiljo` i `src/server/miljo.ts` velger værkilde. Med `?demo=` velger den scenariokilden. Uten demo gir den `null` til Story 2.8 kobler inn MET-adapteren.
- **Visningsmodellen** (`src/kjerne/visning/skjema.ts`) utvides ved behov:
  - `vaer.vurdert` har Værklasse, symbol `{ ord, ikonSti }`, ferdige tekster, Høydemerknad og eventuell Værvarsling.
  - `utfall.type: 'fraradet'` brukes ved frarådet vær.
  - `bedreTidsvindu` er `funnet` med `nyttSok` (et komplett Søk) og tekster, `ingen` med tekst, eller fraværende.
  - Kriteriemerkene er `ok`, `se-opp` eller `ingen`.
  - Kontrakttesten for `/api/sok` skal dekke alle demo-ID-er. UI-et bygger aldri et Søk av et tidspunkt.
- **Ikoner:** METs værikoner (MIT) ligger med `LICENSE` i `public/vaerikoner/` og er navngitt etter `symbol_code` med endelse. Ikonet har tom `alt`, og ordet står alltid ved siden av.
- **Tester:** adaptertestene bruker en falsk `fetch`, og ingen test kaller MET. Playwright går mot `?demo=uj-1`, `uj-2`, `uj-3`, `uten-vaer` og `ingen-bedre` og dekker alle kombinasjonene av Værklasse og treff. Testene sjekker tilstand, antall og felt, men aldri Turnavn.

## UX & Interaction Patterns

- Vær-delen står der Værmangel-linjen står i Epic 1, mellom Ditt søk og overskriften.
- **Værsammendrag:** papirpanel med Kriteriemerke, Værklasse, Værsymbol med ord og verdiene. Tidsvinduet står til høyre og Høydemerknaden under. På mobil står klasse og symbol på én linje og verdiene på neste.
- **Værvarsling:** flaten `vaervarsling` med merket warn og tittelen i rust. Verdiene står med den utløsende først. Varslingen meldes i live-området, og overskriften tilpasses (for eksempel «Tre Turer i dårlig vær»).
- **Bedre tidsvindu-boksen** står i Værvarslingen (til høyre på PC, under på mobil) med skoggrønn kant. Den har en antallslinje og knappen «Bruk 14:00» eller «Bruk i morgen 11:00». Knappen sender `nyttSok`, og det nye Resultatet erstatter det forrige. Uten vindu vises bare teksten, uten knapp.
- **Frarådet-kortet** har form som et Turkort, med en papirflate med vindstreker der Kartutsnittet skal stå. Det har stempelet «!», verdiene og meldingen, og under DERFOR INGEN TUR bare radene Vær og Tid. Lenken til MET sine farevarsler åpnes i ny fane. Kart og Ansvarsmerknad vises ikke, og frarådet meldes i live-området.
- **Bedre tidsvindu-kortet** står ved siden av Frarådet-kortet på PC og nederst på mobil, med stempelet «→» og knappen.
- **Vær-raden i Turkortet** er ok med Værord og temperatur i godt vær. I dårlig vær er den warn, med verdien i rust og «Øverst fordi: …», der bare reglene som slo inn, nevnes.
- Værsammendrag, Værvarsling med Bedre tidsvindu og Frarådet sjekkes ved 360, 768 og 1440 px.

## Cross-Story Dependencies

- **Fra Epic 1:** Epic 2 bygger på Søk-kontrakten og visningsmodellen, `lagMiljo` og scenarioregisteret (med `uten-vaer`), regelkjernen (filtrering, rangering, sol og Mørkevarsel), Regelteksten, kontrakttesten fra Story 1.10, og Turkort og Stokk.
- **Rekkefølgen i Epic 2:**
  - 2.1 kommer først med tersklene, `Vaermelding`-typen og fasiten. 2.2 og 2.3 bygger på den.
  - 2.5–2.7 trenger 2.1 og 2.3.
  - 2.8 samler 2.4–2.7 og kobler MET-adapteren inn i produksjon.
  - UI-storyene 2.9 og 2.10 kommer etter 2.8, og 2.11 avslutter.
- **Kalibreringen:** tersklene beholdes. Story 2.2 gjenstår som kodearbeid: skriptet skal lese JSON-fila og få `--selvtest` og egen User-Agent, Værord-grensene skal vurderes, og punktet skal lukkes i `issues.md`. Grensene for dårlig og frarådet ble ikke prøvd mot virkelig vær i loggeuka.
- **Mot Epic 3:** Epic 3 kan lages parallelt. Story 3.2 bytter vindstrekflaten i Frarådet-kortet med Kartutsnitt, men ved frarådet vises ikke kartet.
- Brukertesten (5 personer i Demomodus med UJ-1) planlegges når Epic 2 er ferdig.
