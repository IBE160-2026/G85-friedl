# Epic 2 Context: Turforslag som tar hensyn til været

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Appen tar Værmeldingen fra MET i bruk. Brukeren ser Værklassen for Tidsvinduet sitt i et Værsammendrag. Ved dårlig vær kommer en Værvarsling, Turene rangeres for dårlig vær, og appen foreslår et Bedre tidsvindu. Ved frarådet vær vises ingen Turforslag, bare en melding og et Bedre tidsvindu som kan tas i bruk med ett trykk. Epicen bytter ut værkilden som alltid ga `null` i Epic 1 med MET-adapteren og Værscenarioene. Demomodus får `uj-1`, `uj-2`, `uj-3` og `ingen-bedre`, slik at alle brukerreisene kan vises uansett været. Den ender med README og en prøvekjøring for sensor. Kalibreringen er gjort (14 av 14 Tidsvinduer, 1 avvik), og startverdiene for tersklene beholdes. Resten av Story 2.2 er kodearbeid.

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

- **Værterskler per time** (strengeste klasse vinner, holder det at én verdi når grensen):
  - frarådet: ≥ 10 mm/t eller ≥ 17,2 m/s
  - dårlig: ≥ 2 mm/t, ≥ 10,8 m/s eller < −10 °C
  - middels: ≥ 0,5 mm/t, ≥ 8,0 m/s eller < 0 °C
  - god: under alle grensene

  Middels vises bare og endrer verken utvalg, rangering eller varsler.
- **Værklasse for Tidsvinduet:** klassen til den dårligste timen blant timene som overlapper vinduet (13:30–15:30 gir timene 13, 14 og 15). Vinduet gjelder hele Tilgjengelig tid, ikke bare Turtiden. Mangler en time, blir klassen `mangler`.
- **Værmelding:** gjelder Værpunktet (ca. 400 moh). Den dekker hele Turdagen og timene i Tidsvinduet etter midnatt (22:00 med 5 t gir timene 22–02).
- **Resultat per Værklasse** (frarådet går foran alt annet):
  - god eller middels: Værsammendrag, så Turforslag eller den korteste Turen
  - dårlig: Værvarsling, Turforslag eller den korteste Turen, og Bedre tidsvindu
  - frarådet: melding med de utløsende verdiene, og Bedre tidsvindu som Alternativ. Ingen Turforslag, ingen korteste Tur, aldri en tom side og aldri en feilmelding.
  - mangler, eller MET svarer ikke innen 2 s: Epic 1-oppførselen («Været er ikke vurdert.»), rangering som i godt vær, og verken Værklasse, Værvarsling eller Bedre tidsvindu
- **Været fjerner aldri enkeltturer.**
- **Rangering i dårlig vær:**
  1. uten Mørkevarsel
  2. Lavtliggende tur (høyeste punkt under 400 moh)
  3. Egnet i dårlig vær (ja før ukjent før nei)
  4. flest treff på Opplevelsespreferanser, der utsikt ikke teller
  5. Turtid nærmest Tilgjengelig tid
  6. ID

  God og middels gir samme rekkefølge.
- **Bedre tidsvindu** (bare ved dårlig eller frarådet):
  - Appen prøver hele timer fra soloppgang til 30 min før solnedgang, innenfor 06:00–22:00, med samme Tilgjengelig tid. Det gjelder Turdagen, og i morgen også når Turdag er «i dag».
  - Bare Starttidspunkter som ikke har passert, prøves, og vinduer med en manglende time hoppes over.
  - Det tidligste vinduet med bedre Værklasse vises, sammen med antall Turer som består filtreringen og ikke får Mørkevarsel. Opplevelsespreferansene teller ikke.
  - Appen bytter ikke Turdag på egen hånd. Passer ingen Tur før mørket, sier appen det og viser vinduet likevel. Finnes det ikke noe vindu, vises en tekst som passer Turdagen.
- **Værsammendrag:** Værklasse, Værsymbol med ord, temperaturspenn, høyeste nedbør og høyeste vind, med Høydemerknaden «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.». Tallformatet:
  - nedbør og vind med én desimal uten «,0», og hele grader
  - «3–5 °C», «−2 til 1 °C» når en verdi er under null, og «4 °C» når verdiene er like

  Værvarslingen har de samme verdiene, med den utløsende verdien først.
- **Værord:**
  - Ordene sier alltid «nedbør», aldri regn eller snø.
  - Grensene under laveste terskel er < 0,1 mm/t «oppholdsvær» og < 5,5 m/s «lite vind».
  - Båndene fra middels og opp følger tersklene: «noe nedbør», «nedbør opptil X mm/t», «frisk vind», «vind opp mot X m/s» og «sterk kuling, vind opp mot X m/s».
- **Værsymbol:**
  - Symbolet hentes fra timen med dårligst Værklasse, den første ved likhet.
  - Endelsen (`_day`, `_night` osv.) velger bare ikonfil og endrer ikke ordet.
  - `…andthunder` gir «… og torden», og en ukjent kode gir verken ikon eller ord.
- **Regeltekst med vær:** delene står i fast rekkefølge, skilt med «, », med liten forbokstav og uten punktum. Rekkefølgen er Tid, værord, lavtliggende tur (H moh) og egnet i dårlig vær (de to siste bare ved dårlig vær og bare når regelen slo inn), og til slutt de Opplevelsespreferansene som treffer. Regelteksten har ikke temperatur. Den nevner aldri en regel som ikke slo inn, og ingen tekst inneholder «trygg» eller «trygt».
- **MET-vilkår:** værkall går bare fra serveren, over HTTPS, med identifiserende User-Agent, cache-headere og maks fire desimaler. Nettleseren kaller aldri MET.
- **Ytelse:** Turforslag vises innen 3 s med «Fast 4G»-struping mot ekte MET, og målingen gjøres i 2.11.
- **Navngitte eksempler** (testes i Vitest):
  - UJ-1: god kl. 13:30–15:30 den 9. november, med «oppholdsvær og lite vind»
  - UJ-2: dårlig formiddag, bedre fra kl. 14 og 5 av 12 Turer før mørket. Moldevatnet fra Jensgurilia står først.
  - UJ-3: frarådet med vind opp mot 19 m/s og null Turforslag. Med 15 min og Bedre tidsvindu tatt i bruk vises den korteste Turen (16 min).
  - `ingen-bedre`: dårlig vær uten noe Bedre tidsvindu
  - Soltider: 9. november prøves 09:00–15:00 (sol 08:30/15:59), og 21. juni prøves 06:00–22:00.

## Technical Decisions

- **Tersklene har én kilde:**
  - `data/vaerterskler.json` har formen `{ versjon: 1, klasser: [{ klasse: 'fraradet'|'darlig'|'middels', nedbor_mm_t_minst, vind_ms_minst, temp_c_under }] }`, med strengeste klasse først.
  - Grensene sammenlignes med `>=` for nedbør og vind og `<` for temperatur, og `null` betyr ingen grense.
  - Zod validerer fila ved import og avviser ukjente nøkler.
  - Endres en grense, skal ingen annen kode måtte endres.
  - `src/kjerne/vaerord.ts` eier bare de to grensene under laveste terskel og henter resten fra tersklene.
- **Fasit:** `testdata/vaerklasse-fasit.json` (timer → klasse og Tidsvindu → klasse) kjøres både av Vitest og av `scripts/kalibrering_vaerlogg.py --selvtest`. Skriptet skal lese tersklene fra JSON-fila i stedet for sin egen `TERSKLER`. Skriptet er et navngitt unntak fra regelen om én MET-klient og bruker User-Agent `turplanlegger-ibe160-kalibrering/<versjon> …` uten cache.
- **Én form og én parser:**
  - `Vaermelding = { timer: { startUtc, tempC, vindMs, nedborMmT, symbolKode | null }[] }`, stigende.
  - Den lages bare av den rene `parseMetCompact` i `src/kjerne/vaer/met-compact.ts`, med Zod og bare rader som har `next_1_hours`. Et svar uten `timeseries` gir en tydelig feil.
  - Timene i et vindu velges med `timerITidsvindu` fra `tid.ts`.
- **MET-adapteren** `src/server/vaer/met.ts` er den eneste MET-klienten og den eneste som bruker `VaerCache`:
  - `compact` med Værpunktet fra `src/kjerne/vaerpunkt.ts`, trunkert til fire desimaler, og `altitude=400`
  - User-Agent `turplanlegger-ibe160/<versjon> https://github.com/IBE160-2026/G85-friedl`, og `cache: 'no-store'`
  - status leses fra `response.status` (200 eller 304)
  - `VaerCache` ligger i minnet, er nøklet på (lat, lon, altitude) og er asynkron, med ett pågående kall per nøkkel. Innenfor `Expires` gjøres ingen kall. Etter `Expires` sendes `If-Modified-Since` lik `Last-Modified`, og 304 forlenger levetiden.
  - Tidsgrensen er 2 s. Feil, tidsavbrudd og svar som ikke kan parses gir `null` og `console.error`, aldri en HTTP-feil, og utløpt data brukes ikke.
- **Værscenarioer:**
  - De ligger i `data/vaerscenarioer/<id>/` med `met.json` (MET `compact`, én desimal) eller `"vaer": "mangler"`, og `scenario.json` med `na` (ISO 8601 med forskyvning) og `beskrivelse`.
  - De importeres statisk i registeret `src/server/vaer/scenarioer.ts`, der nøklene er de gyldige demo-ID-ene.
  - Scenariokilden bruker `parseMetCompact`, men aldri `met.ts` eller cachen.
  - Regeltestene og Demomodus bruker de samme scenarioene.
- **Valg av værkilde:**
  - `lagMiljo` i `src/server/miljo.ts` velger scenariokilden for `?demo=`.
  - Uten demo gir den `null` helt til Story 2.8 kobler inn MET-adapteren, slik at MET ikke kalles før Resultatet bruker Værmeldingen.
- **Visningsmodellen** (skjemaet fra Epic 1 utvides etter behov):
  - `vaer.vurdert` har Værklasse, symbol `{ ord, ikonSti }`, ferdige tekster, Høydemerknad og eventuell Værvarsling.
  - `utfall: 'fraradet'` brukes ved frarådet vær.
  - `bedreTidsvindu` er `funnet` med `nyttSok` (ny Turdag og nytt Starttidspunkt, resten uendret) og tekster, `ingen` med tekst, eller fraværende ved god, middels og manglende vær.
  - Kriteriemerkene er `ok`/`se-opp`/`ingen`.
  - Kontrakttesten for `/api/sok` skal dekke de nye demo-ID-ene.
- **Lag og tekst:**
  - Værklasse, rangering, Bedre tidsvindu, Værord og Regeltekst ligger i kjernen. Klokke og soltider kommer inn som argumenter.
  - All tekst med tall lages i `src/kjerne/format.ts`, og nettleseren formaterer ingenting.
- **Ikoner:** METs værikoner (MIT) ligger med `LICENSE` i `public/vaerikoner/`, med filnavn fra `symbol_code` med endelse. Ikonet har tom `alt`, og ordet står alltid ved siden av.
- **Tester:**
  - Adaptertestene bruker en falsk `fetch`, og ingen test kaller MET.
  - Playwright går mot `?demo=uj-1`, `uj-2`, `uj-3`, `uten-vaer` og `ingen-bedre` og dekker alle radene i tabellen over Værklasse og treff, både med Turforslag og når ingen Tur passer.
  - Playwright sjekker tilstand, antall og felt, men aldri Turnavn.

## UX & Interaction Patterns

- **Plassering:** vær-delen står der Værmangel-linjen står i Epic 1, mellom Ditt søk og overskriften.
- **Værsammendrag:** papirpanel (`rounded.md`) med Kriteriemerke, «Værklasse god», Værsymbol med ord og verdiene. Tidsvinduet står helt til høyre og Høydemerknaden under. På mobil står klasse og symbol på én linje og verdiene på neste.
- **Værvarsling:**
  - flaten `vaervarsling` (`rounded.lg`) med merket warn og tittelen i rust, for eksempel «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00»
  - verdiene med den utløsende først, og forklaringen om rekkefølgen under
  - meldes i live-området, og overskriften blir for eksempel «Tre Turer i dårlig vær»
- **Bedre tidsvindu-boksen:**
  - Den står i Værvarslingen, til høyre på PC og under på mobil, med skoggrønn kant og overlinjen BEDRE TIDSVINDU.
  - Teksten er for eksempel «I morgen fra kl. 14:00 er Værklassen god», med antallslinjen «{N} Turer passer før mørket.», «1 Tur passer før mørket.» eller «Ingen Tur passer før mørket.».
  - Knappen «Bruk 14:00» eller «Bruk i morgen 11:00» sender `nyttSok`, og det nye Resultatet erstatter det forrige.
  - Uten vindu vises «… i dag eller i morgen.» eller «… i morgen.», uten knapp.
- **Frarådet-kortet:**
  - Det har form som et Turkort, med en papirflate med vindstreker der Kartutsnittet skal stå (byttes i Story 3.2).
  - Det har stempelet «!», «Ingen Turforslag» og «Værklasse frarådet» i rust, verdiene og meldingen, for eksempel «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).».
  - Under står DERFOR INGEN TUR med bare radene Vær og Tid. Tid-raden er «ikke vurdert», med detaljen «Frarådet går foran tid og ønsker.».
  - Lenken «Sjekk også MET sine farevarsler.» åpnes i ny fane.
  - Kart og Ansvarsmerknad vises ikke, og frarådet meldes i live-området.
- **Bedre tidsvindu-kortet:** står ved siden av Frarådet-kortet på PC og nederst på samme ark på mobil, med skoggrønn kant. Det har stempelet «→», overlinjen ALTERNATIV · BEDRE TIDSVINDU, dagen i `page-title` («I morgen (søn. 15. nov.) fra kl. 11:00»), «fra kl. 11:00 · samme 2 t, Middels» og knappen «Bruk i morgen 11:00».
- **Vær-raden i Turkortet:**
  - ok: «Værklasse god» med detaljen «oppholdsvær og lite vind · 3–5 °C»
  - warn: «Værklasse dårlig» med verdien i rust og «Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær», der bare reglene som slo inn, nevnes
- **Sjekkliste:** Værsammendrag, Værvarsling med Bedre tidsvindu og Frarådet sjekkes ved 360, 768 og 1440 px.

## Cross-Story Dependencies

- **Epic 1 må være ferdig først.** Epic 2 bygger på kontraktene (Søk og visningsmodell), `lagMiljo`, regelkjernen (filtrering, rangering, sol og Mørkevarsel), Regelteksten og Turkort og Stokk. Per nå er bare Story 1.1 ferdig.
- **Rekkefølgen i Epic 2:**
  - 2.1 (terskler, `Vaermelding`-typen og fasiten) kommer først.
  - 2.2 trenger 2.1 for JSON-fila og fasiten.
  - 2.3 trenger typen fra 2.1.
  - 2.5–2.7 trenger 2.1 og 2.3.
  - 2.8 samler 2.4–2.7 og kobler inn MET-adapteren i produksjon.
  - UI-storyene 2.9 → 2.10 kommer etter 2.8, og 2.11 avslutter.
- **Kalibreringen:**
  - Kalibreringen er avklart: tersklene beholdes, og resultatet står i PRD-en.
  - Story 2.2 må fortsatt la skriptet lese `data/vaerterskler.json`, legge til `--selvtest` og egen User-Agent, og vurdere Værord-grensene sammen med tersklene. Til slutt lukkes punktet i `issues.md`.
  - Et åpent punkt står igjen: grensene for dårlig og frarådet ble ikke prøvd mot virkelig vær i kalibreringsuka (bare god og middels). Det bør vurderes en dag med dårlig vær før Værvurderingen regnes som ferdig.
- **Mot andre epics:**
  - Epic 3 kan lages parallelt og bytter vindstrekflaten i Frarådet-kortet med Kartutsnitt (3.2).
  - Ved frarådet vises ikke kartet.
  - Brukertesten (SM-1 og SM-5, 5 personer i Demomodus med UJ-1) planlegges når Epic 2 er ferdig.
