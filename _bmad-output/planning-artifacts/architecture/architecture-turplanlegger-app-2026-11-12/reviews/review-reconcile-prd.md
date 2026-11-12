# Avstemming: ARCHITECTURE-SPINE mot PRD og addendum

- **Spine:** `ARCHITECTURE-SPINE.md` (draft, 2026-11-12)
- **Kilder:** `prds/prd-turplanlegger-app-2026-11-02/prd.md`, `addendum.md`
- **Utført:** 2026-11-12, kun lesing. I tillegg er `scripts/kalibrering_vaerlogg.py` lest for å kontrollere AD-8.
- **Avgrensning:** UI-detaljer som UX-dokumentene eier, og produktatferd som FR-ene allerede spesifiserer fullt, er ikke tatt med. Funnene gjelder arkitektur, eller steder der to byggere kan implementere ulikt fordi spinen ikke sier noe.

## Konklusjon

Spinen dekker addendumets tekniske «hvordan» godt. MET-adapteren (User-Agent, `Expires`/`If-Modified-Since`, 2 s, fire desimaler, `altitude=400`), NOAA-solberegning med kontrollverdier, Værscenarioer på fil, falsk språkmodell, `testdata/`, Kartverket uten nøkkel og nivåene i §8.1 er alle med. Det som mangler, er noen kontrakter mellom lagene og noen tilfeller der en AD-regel krasjer med en FR- eller SM-konsekvens. Det viktigste: demo-ID-ene er en lukket liste, så FR-6-raden «Værmeldingen mangler» ikke kan testes gjennom UI-et. I tillegg er det motsetninger mellom AD-1 og AD-4 om hvordan siden får «nå», og Søk-kontrakten mangler når «nå» har flyttet seg. Ingen funn er kritiske.

| # | Alvor | Kort |
|---|---|---|
| 1 | high | Den lukkede demo-ID-lista (AD-5) gjør at FR-6-raden «Værmeldingen mangler» og flere FR-19-tilfeller ikke kan testes gjennom UI-et (AD-16, SM-2) |
| 2 | high | AD-1 forbyr Visning → Skall, men AD-4 krever at server-rendret `page.tsx` henter «nå» og standardverdier fra skall og kjerne |
| 3 | high | Søk-kontrakten mangler: relativ eller absolutt Turdag, og hva serveren gjør når Søket har blitt ugyldig fordi «nå» har flyttet seg (FR-1, FR-2, FR-19) |
| 4 | medium | Ingen regel for manglende timer eller felt i Værmeldingen (FR-7, addendum Horisont) |
| 5 | medium | Værpunktet (62,7617 / 7,1679 / 400) har ingen felles kilde, og kalibreringsskriptet bryter AD-6 og AD-8 i dag |
| 6 | medium | `/api/begrunnelse` stoler på Regeltekst og fakta fra klienten (FR-22-kontrollen, NFR-6, kostnad) |
| 7 | medium | Svar på `/api/begrunnelse` fra et tidligere Søk kan skrive over et nytt Resultat (FR-6, FR-22) |
| 8 | medium | AD-16 lar FR-27 kjøre «med `testdata/`», men FR-27 skal validere det ekte Turdatasettet |
| 9 | medium | Siden kan bli prerendret, slik at «nå» fryses ved bygging (AD-4, FR-1, FR-2) |
| 10 | medium | Playwright og Demomodus kjører mot det ekte Turdatasettet, så navngitte Turer i UJ-ene velter e2e-testene ved dataendringer (NFR-2-intensjonen) |
| 11 | low | AD-12 gjengir FR-22-kontrollen ufullstendig: kravet «alle formaterte verdier må være med» mangler |
| 12 | low | Instruksen og tonen til språkmodellen fra addendumet har ikke noe sted i spinen |
| 13 | low | FR-29: bare Kartverket-krediteringen er forankret, ikke MET-teksten og lisensene, Turrutebasen, kildene eller ikonlisensen |
| 14 | low | §8.1-reserven: Resultat må ha Startpunkt som tekst uavhengig av kartet |
| 15 | low | Ingen tester av MET-adapteren for NFR-4, FR-13 og 2 s |
| 16 | low | Datafiler som leses dynamisk (`vaerscenarioer/<id>`) kan mangle i Vercel-bundelen |

---

## Funn

### 1. [high] Demo-ID-ene er en lukket liste, men SM-2 og AD-16 krever UI-test av hver FR-6-rad

**Hva:** AD-5 tillater bare `uj-1`, `uj-2` og `uj-3`, og alt annet gir 400. AD-16 sier at hver visningskonsekvens, «blant annet radene i FR-6-tabellen», er en Playwright-test mot `?demo=<id>`, og at ingen test kaller MET. Flere tilfeller kan da ikke nås:

- FR-6-raden **«Værmeldingen mangler»** (begge kolonner) og FR-13-konsekvensene «ingen Værklasse/Værvarsling/Bedre tidsvindu vises» og «Begrunnelsen sier at værdata mangler». Ingen demo-ID gir `vaer: mangler`, og ekte MET kan ikke brukes i test.
- FR-19 **«Finnes det ikke noe Bedre tidsvindu, sier appen det»** (også FR-6-konsekvens) og **«Passer ingen Tur før mørket … Bedre tidsvindu vises likevel»**. Med tre faste scenarioer er det ikke gitt at noen av dem gir disse tilstandene.
- FR-19-eksempelet «Turdag i dag, 9. november, dårlig til 15:00 → 1 Tur før mørket». Det kan dekkes i Vitest, men ikke i UI-et.
- UJ-1 sitt edge case («Svarer ikke MET …») kan ikke vises i Demomodus.

**PRD:** FR-6-tabellen og konsekvensene, FR-13, FR-19, SM-2 («Det gjelder også hver rute i tabellen under FR-6. Konsekvenser for hva som vises, testes gjennom brukergrensesnittet»), NFR-11 («minst ett Værscenario per brukerreise», altså et minimum, ikke en lukket liste).

**Forslag:** I AD-5 bør gyldige demo-ID-er være mappene i `data/vaerscenarioer/`, ikke en hardkodet liste. Legg til scenarioer for testtilstandene, for eksempel `uten-vaer` (Værscenario-kilden returnerer `null`, gjerne angitt i `scenario.json` uten `met.json`), `ingen-bedre` og `bedre-uten-dagslys`. README og Demomodus-meldingen kan fortsatt framheve de tre UJ-scenarioene. Legg til i AD-13 at et scenario kan angi «Værmeldingen mangler».

### 2. [high] AD-1 og AD-4 motsier hverandre om hvordan siden får «nå»

**Hva:** AD-1 og diagrammet sier at Visning (`src/app/`) bare snakker med API-et over HTTP og bare importerer `type` fra kjernen, og at ESLint håndhever det. AD-4 krever at «siden rendres på serveren og får «nå» og standardverdiene … ferdig utregnet fra kjernen». Det må gjøres i `page.tsx`, som er en server-komponent i `src/app/`, ved å kalle `lagMiljo(demoId)` og kjernefunksjoner. Det er nettopp det ESLint-regelen forbyr. Én bygger kaller da sin egen `/api` over HTTP fra serveren, en annen slår av lint-regelen. Det samme gjelder etikettene på skjemavalgene (kvarter 06:00–22:00, «15 min … 5 t»). AD-7 sier at UI-et aldri formaterer, så de må også komme ferdig formatert fra serveren. Ved «i dag» → «i morgen» trenger klienten begge dagers tillatte valg og standardverdier (FR-2: 10:00 for i morgen, passerte kvarter sperret for i dag) uten å regne selv.

**PRD:** FR-1, FR-2, NFR-2. AD-1 og AD-4 seg imellom.

**Forslag:** Legg til en eksplisitt lovlig kant i AD-1: «`src/app/page.tsx` (server-komponent) kan importere én skallfunksjon, f.eks. `src/server/skjema.ts › lagSkjemaoppsett(demoId)`, og ingenting annet fra `src/server/`». Klientkomponenter i `src/ui/` er fortsatt bare `import type`. Si i AD-4 at oppsettet inneholder ferdig formaterte valglister og standardverdier for **begge** Turdager, og om Turdag «i dag» er tillatt.

### 3. [high] Søk-kontrakten mangler for relativ Turdag og for Søk som har blitt ugyldige

**Hva:** AD-4 sier at hvert Søk regnes med serverens «nå» for kallet. Spinen sier ikke:

- om Søk sendes med Turdag som `i-dag`/`i-morgen` (relativ, og løses mot server-«nå») eller som en absolutt dato,
- hva som skjer når skjemaet er lastet før og sendt etter at tilstanden har endret seg. Eksempler: siden åpnes 21:50 og Søket sendes 22:05 (FR-1: «i dag» kan ikke velges etter 22:00), et Starttidspunkt har passert (FR-2), eller «Bruk Bedre tidsvindu» trykkes etter at vinduets time har passert (FR-19: «Bare Starttidspunkt som ikke har passert»). Et Søk rundt midnatt med relativ Turdag kan også peke på en annen dato enn brukeren så.

Konvensjonen sier at et ugyldig Søk gir 400 med Zod-feil, men ikke hva klienten viser ved 400. Kontaktfeil-kortet gjelder bare manglende kontakt eller 500. To byggere velger ulikt: 400 og feilmelding, eller stille klemming til neste kvarter. FR-12 og FR-18 sier «aldri en tom side eller feilmelding», og ånden i det gjelder her også.

**PRD:** FR-1, FR-2, FR-6 («Et nytt Søk erstatter det forrige helt»), FR-19 (siste konsekvens: nytt Søk med Starttidspunkt **og Turdag**).

**Forslag:** Legg Søk-skjemaet (Zod, i kjernen) inn i en AD eller i konvensjonstabellen. Velg enten absolutt dato (`turdato: 'YYYY-MM-DD'`, valideres mot server-«nå» som i dag eller i morgen) eller relativ Turdag. Bestem én regel for Søk som har blitt ugyldige, for eksempel at serveren svarer 409 med et nytt skjemaoppsett og klienten viser skjemaet med oppdaterte valg, eller at serveren klemmer og Resultatet sier hva som ble endret. `bedreTidsvindu.funnet` bør bære det nye Søket ferdig utfylt, så «Bruk» bare sender det tilbake.

### 4. [medium] Ingen regel for manglende timer eller felt i Værmeldingen

**Hva:** FR-7 krever timesverdier for **hver** time i Tidsvinduet. Addendumet sier at MET har timesoppløsning bare de første ca. 60 timene, og at feltene ligger i `instant.details` og `next_1_hours`. Spinen sier ikke hva som skjer når en time i Tidsvinduet mangler, når `next_1_hours` mangler (overgang til `next_6_hours`), eller når den inneværende timen ikke er med i svaret (MET-svaret starter ofte på neste hele time etter en oppdatering). Kalibreringsskriptet behandler i dag manglende verdier som «utløser ikke» (`None` hoppes over i `klasse_for_time`). Det gir en mildere Værklasse, og den kan gli fra appen. Tre rimelige og ulike valg finnes: `vaer: mangler` (FR-13), klassifisere med de timene som finnes, eller la manglende verdi bety «utløser ikke».

**PRD:** FR-7 (konsekvens 1 og 2), FR-9, FR-13, addendum › Værintegrasjon (Felt, Horisont).

**Forslag:** Legg til en regel i AD-6 eller AD-13 for parsingen, som er felles for MET og Værscenario: «Mangler en time i Tidsvinduet, eller `air_temperature`, `wind_speed` eller `next_1_hours.precipitation_amount` for den timen, er Værmeldingen `null` for Søket (FR-13).» Avklar også at Bedre tidsvindu bare vurderer kandidatvinduer der alle timene finnes. Legg et Værscenario med hull inn i Vitest.

### 5. [medium] Værpunktet har ingen felles kilde, og kalibreringsskriptet bryter AD-6 og AD-8

**Hva:** Værpunktet (62,7617 N, 7,1679 Ø, 400 moh) brukes av MET-adapteren (AD-6), solberegningen (AD-11), høydeteksten i værsammendraget (FR-10: «ca. 400 moh») og kalibreringsskriptet. 400 er også grensen for Lavtliggende tur (§3). Spinen sier ikke hvor verdiene står, så de havner i fire filer. I tillegg:

- `scripts/kalibrering_vaerlogg.py` har i dag egne `TERSKLER`, egen `LAT, LON, HOYDE` og eget MET-kall med egen User-Agent. AD-6 sier at `met.ts` er «det eneste stedet som kaller `api.met.no`», og AD-8 sier at skriptet «har ingen egne terskler». Begge stemmer ikke med koden, og loggingen pågår 10.–16. november. Skal skriptet skrives om midt i kalibreringsuka?
- Skriptet har også sin egen klassifiseringslogikk, ikke bare tersklene. Da kan regelen for strengeste klasse og ≥ eller < gli fra kjernen selv om tersklene er felles.

**PRD:** §3 Værpunkt og Lavtliggende tur, FR-10, FR-21, NFR-4, NFR-10, §10 spm. 1, addendum › Avklarte spørsmål 4.

**Forslag:** Legg Værpunktet i `data/vaerpunkt.json` (eller i `vaerterskler.json`), lest av skallet og skriptet. Si i AD-6 at regelen gjelder appen, og at kalibreringsskriptet er et unntak med egen User-Agent (`…-kalibrering`), utenfor `src/`. Si i AD-8 når skriptet går over til å lese JSON-fila (etter loggeuka), og legg til felles testvektorer, f.eks. `testdata/vaerklasse-tilfeller.json` med FR-8-eksemplene, som både Vitest og et lite Python-selvtest kjører. Si om grensen for Lavtliggende tur (400) er en konstant i kjernen eller konfigurasjon.

### 6. [medium] `/api/begrunnelse` stoler på input fra klienten

**Hva:** AD-12 lar klienten sende «Regelteksten og fakta om Turen». FR-22-kontrollen sjekker Språkmodellteksten mot nettopp disse verdiene. Den som sender et vilkårlig kall, styrer både prompten og fasiten. Med nøkkelen satt på Vercel blir endepunktet en åpen Claude-proxy (rate limiting er utsatt). Addendumet sier «Inndata: Regelteksten og fakta om Turen, ingenting om brukeren», men en klient kan sende hva som helst, og spinen setter ingen lengdegrense eller skjema for forespørselen.

**PRD:** FR-22 (konsekvens 2–4), addendum › Språkmodell (Inndata, Kontroll, Kostnad: maks ett kall per Turforslag), NFR-6, §6 Kostnad.

**Forslag:** La `/api/begrunnelse` ta `{ turId, regeltekst, demoId }`, slå opp fakta om Turen på serveren fra Turdatasettet, og avvise en `turId` som ikke finnes. Sett en øvre grense på lengden av `regeltekst` i Zod-skjemaet. Bedre, men dyrere: send med det validerte Søket og regn Regelteksten ut på nytt på serveren, fordi MET-svaret ligger i cache. Nevn dette i Deferred-raden om rate limiting som en del av grunnen til at risikoen er akseptert.

### 7. [medium] Svar på Begrunnelse fra et tidligere Søk kan skrive over et nytt Resultat

**Hva:** FR-6 sier at «Et nytt Søk erstatter det forrige resultatet helt». Med AD-12 er opptil tre `/api/begrunnelse`-kall i gang i opptil 5 s etter hvert Søk. Trykker brukeren «Bruk Bedre tidsvindu» eller «Finn tur» igjen, kan svar fra det forrige Søket komme inn og bytte Begrunnelsen på et Turforslag i det nye Resultatet, særlig hvis samme Tur er med begge gangene. Spinen sier ikke hvordan svar knyttes til et Søk, eller hvem som håndhever 5 s: serveren har en tidsgrense på 5 s, men FR-22 måler fra visningen.

**PRD:** FR-6 (siste konsekvens), FR-22 (konsekvens 1).

**Forslag:** Legg til i AD-12: klienten avbryter (`AbortController`) eller ignorerer Begrunnelse-svar som hører til et eldre Resultat (en Søk-ID eller -teller i klienttilstanden). Serverens tidsgrense på 5 s er den som teller, og klienten bytter aldri inn tekst etter at et nytt Søk er sendt.

### 8. [medium] AD-16 setter FR-27 sammen med `testdata/`

**Hva:** AD-16 sier: «Hver regelkonsekvens i FR-8–FR-21 og FR-27 er en Vitest-test … med `testdata/`». FR-27 skal feile når **Turdatasettet** (`data/turer-moldemarka.json`) har feil, sjekket mot **den konverterte rutegeometrien** (`data/rutegeometri.geojson`). Kjøres den mot den faste kopien, oppdager den aldri feil i nye Turer, og SM-C2 («hver Tur må bestå FR-27») mister kraften. AD-10 sier også at «bare skallet leser» rutegeometrifila, men FR-27-testen må lese den.

**PRD:** FR-27, FR-28, SM-C2, NFR-2 (testdata gjelder eksemplene i FR-16, FR-17, FR-19 og FR-21).

**Forslag:** Formuler AD-16 om: «FR-27 kjøres mot `data/turer-moldemarka.json` og `data/rutegeometri.geojson`, ikke mot `testdata/`. `testdata/turer.json` må også bestå Tur-skjemaet.» Legg til i AD-10 at FR-27-testen også kan lese fila. Si hvor geometriberegningene (hull > 50 m, avstand til Startpunkt ≤ 200 m eller Adkomst + 200 m) ligger, f.eks. rene funksjoner i `src/kjerne/turdata/`.

### 9. [medium] Siden kan bli prerendret, slik at «nå» fryses ved bygging

**Hva:** AD-6 tar hensyn til Next.js' fetch-cache, men spinen sier ikke at siden og route handlerne må rendres dynamisk. En `page.tsx` som ikke leser `searchParams` eller andre dynamiske API-er, kan prerenderes ved bygging i Next.js 16. Da blir standardverdiene for Turdag og Starttidspunkt (FR-1, FR-2) frosset til byggetidspunktet i Production. Feilen viser seg ikke lokalt med `npm run dev`.

**PRD:** FR-1, FR-2, AD-4 sin intensjon.

**Forslag:** Legg til i AD-4: «Siden og `/api/*` rendres alltid dynamisk (`await connection()` eller tilsvarende i Next 16). Ingen statisk eller ISR-cache av siden.» Legg til en Playwright-test som sjekker at standard-Starttidspunkt følger miljøets «nå» (Demomodus).

### 10. [medium] UI-testene og Demomodus bruker det ekte Turdatasettet

**Hva:** AD-9 gjør `data/turer-moldemarka.json` til den eneste kilden appen bruker, og AD-16 kjører Playwright mot `?demo=<id>`, altså mot det ekte datasettet. UJ-1–UJ-3 og FR-16, FR-17 og FR-19 navngir bestemte Turer og rekkefølger. NFR-2 legger eksemplene på et fast testdatasett «slik at endringer i Turene ikke velter testene», men spinen sier ikke om Playwright skal sjekke navngitte Turer (skjørt) eller bare tilstander og struktur. SM-3 (sensor viser alle brukerreisene) og SM-1 forutsetter også at Demomodus gir det UJ-tekstene beskriver.

**PRD:** NFR-2, NFR-11, SM-1, SM-2, SM-3, SM-C2.

**Forslag:** Velg én av to løsninger og skriv den i AD-9 eller AD-16. (a) Playwright sjekker tilstander, antall og varsler, ikke navn, og navngitte rekkefølger testes bare i Vitest mot `testdata/`. (b) Et Værscenario kan angi sitt eget Turdatasett (`scenario.json › turdatasett: "testdata"`), slik at Demomodus og e2e alltid gir UJ-fortellingen.

### 11. [low] AD-12 gjengir FR-22-kontrollen ufullstendig

**Hva:** AD-12 oppsummerer kontrollen som «tall, ord for tid og mengde, og «trygg»/«trygt»». FR-22 og addendumet krever også at Språkmodellteksten **har med alle** ferdig formaterte verdier fra Regelteksten (Turtid, Tilgjengelig tid, værverdier). Uten det kan en bygger lage en kontroll som bare ser etter ukjente tall. Kontrollen må også bruke de samme strengene som `format.ts` lager («1 t 32 min» må være med ordrett, ikke bare tallene 1 og 32).

**PRD:** FR-22 konsekvens 3 og 4, addendum › Språkmodell › Kontroll.

**Forslag:** Formuler AD-12 som de fire reglene i FR-22, og si at `kontrollerSprakmodelltekst()` får de formaterte verdiene som en liste fra kjernen, ikke tolket ut av Regelteksten.

### 12. [low] Instruksen og tonen til språkmodellen har ikke noe sted

**Hva:** Addendumet gir instruksen: én til to setninger på bokmål, ingen nye fakta, tallene ordrett, ikke «trygg» eller «trygt». Spinen sier ikke hvor prompten bor eller at den er fast. §6 (aldri «trygg», ingen vurdering av føre) gjelder også de faste UI-tekstene i `src/ui/tekster.ts`, ikke bare Regeltekst.

**PRD:** addendum › Språkmodell › Instruks, §6, FR-20 konsekvens 4.

**Forslag:** Legg til i AD-12: prompten er en konstant i `src/server/sprakmodell/` (eller i kjernen, så den kan testes) med instruksen fra addendumet. Legg eventuelt til en Vitest-test som sjekker at `tekster.ts` og alle Regeltekst-maler ikke inneholder «trygg» eller «trygt».

### 13. [low] Kreditering etter FR-29 er bare delvis forankret

**Hva:** Kapabilitetskartet viser til AD-15, og AD-15 nevner bare «© Kartverket» for bakgrunnskartet. Dette står ikke i spinen: «Data fra MET Norway» med lenke og NLOD 2.0/CC BY 4.0 (addendumet; et MET-vilkår etter §8.1), Turrutebasen (Kartverket) for rutegeometrien, morotur.no og Fjord Norway, og MIT-lisensen for METs værikoner. AD-3 sier «kildelenke», men FR-29 krever også kildens **navn** som lenketekst for både Turforslag og den korteste Turen.

**PRD:** FR-7 konsekvens 3, FR-29, addendum › Værintegrasjon › Kreditering og lisens, §8.1 (krediteringen er et MET-vilkår).

**Forslag:** Én linje i AD-15 eller konvensjonene: krediteringstekstene ligger i `src/ui/tekster.ts` og vises i alle tilstander. Kildenavn og URL kommer fra feltet `kilde` i Turdatasettet og følger med i Resultatet for hvert Turforslag og den korteste Turen.

### 14. [low] §8.1-reserven trenger Startpunkt som tekst i Resultatet

**Hva:** §8.1 sier: «Faller kartet bort, viser Turkortet Startpunktet som tekst med lenke til kilden.» Kartet er på nivå 2 og Resultatet på nivå 1. AD-3 lister Regeltekst, varsler, kildelenke og rutegeometri per Tur, men ikke Startpunkt. Det trengs uansett for FR-24. Kartet og rutegeometrien bør kunne mangle uten at Resultat-typen endres.

**PRD:** §8.1 (nivåene og konsekvens 1), FR-24, FR-26.

**Forslag:** Legg Startpunkt (navn og koordinater) og et valgfritt felt for rutegeometri inn i AD-3. Legg eventuelt til en setning i spinen om at AD-10 og AD-15 hører til nivå 2 (unntatt FR-28-konverteringen), og at AD-12 er nivå 3, slik at epics kan ta nivåene i riktig rekkefølge.

### 15. [low] Ingen tester av MET-adapteren

**Hva:** AD-16 dekker tester av kjernen og visningen, og «ingen test kaller MET». Ingenting sier at adapteren testes med en stubbet `fetch`: User-Agent, fire desimaler, `altitude`, at `Expires` respekteres, `If-Modified-Since` og 304, og at 2 s eller feil gir `null`. Det er her NFR-4 (MET-vilkårene, med risiko for blokkering) og FR-13 faktisk oppfylles.

**PRD:** NFR-4, FR-13, addendum › Værintegrasjon (User-Agent, Caching, Tidsgrense).

**Forslag:** Legg til i AD-16: «`src/server/vaer/met.ts` har Vitest-tester med stubbet `fetch` for NFR-4-reglene og FR-13 (tidsavbrudd, 4xx/5xx, 304).»

### 16. [low] Dynamisk leste datafiler på Vercel

**Hva:** Skallet leser `data/vaerscenarioer/<id>/…`, Turdatasettet, terskler og rutegeometri. Leses de med `fs` og en dynamisk sti, kan Vercels filsporing utelate dem, og da virker Demomodus lokalt men ikke i Production. Det er ikke et PRD-krav, men det rammer NFR-11 og SM-3 hvis Demomodus brukes på den deployede adressen.

**PRD:** NFR-11 og SM-3 (indirekte).

**Forslag:** Bruk statisk `import` av JSON, eller en eksplisitt `outputFileTracingIncludes` for `data/**`. Si det i AD-13 eller AD-14.

---

## Kontrollert og i orden (ikke funn)

- MET: HTTPS, `compact`, fire desimaler, `altitude=400`, User-Agent, cache nøklet på (lat, lon, altitude), `Expires`, `If-Modified-Since`/304, ingen fast TTL, `no-store`, 2 s, at nettleseren aldri kaller MET, og Europe/Oslo med tidssonebibliotek (AD-6, AD-7).
- Solberegning: NOAA, 90,833°, havnivå, Værpunktet, hele minutter, ±2 min mot kontrollverdiene, og soltider som argument (AD-11).
- Værscenarioer i MET-format, felles for test og demo, med eget fast «nå» og demo-merke (AD-5, AD-13). Den falske modellen også i Demomodus.
- Deterministisk rangering, ingen klientmotor, og Resultat med varianter per FR-6-celle (AD-2, AD-3).
- Terskler på ett sted og Værord på ett sted (AD-8, NFR-10). Se funn 5 for hvordan skriptet etterlever dette.
- Turdatasett i én fil, CSV avledet, skjemafelt uendret, `testdata/` for eksemplene i FR-16, FR-17, FR-19 og FR-21 (AD-9).
- Rutegeometri: GML EPSG:25833 → WGS84, nøklet på rutenummer og rutenavn, MultiLineString, slått sammen på serveren (AD-10).
- Kart uten nøkkel, med berøring og kreditering i kartet (AD-15). Ingen posisjon og ingen analyseverktøy (NFR-6).
- `.env`/`.env.example`, valgfri nøkkel, start uten nøkler (AD-14, NFR-3, NFR-7).
- §8.1-nivåene er nevnt i Deferred og overlatt til epics. Se funn 14 for den ene arkitekturkonsekvensen.
