---
title: 'Adversarial review: ARCHITECTURE-SPINE.md (Turplanlegger)'
lens: 'to enheter ett nivå ned som følger alle AD-er ordrett, men likevel bygger inkompatibelt'
reviewed: '2026-11-12'
target: ../ARCHITECTURE-SPINE.md
sources:
  - ../../../prds/prd-turplanlegger-app-2026-11-02/prd.md
  - ../../../prds/prd-turplanlegger-app-2026-11-02/addendum.md
  - ../../../ux/EXPERIENCE.md
  - ../.memlog.md
  - ../../../../../scripts/kalibrering_vaerlogg.py
  - ../../../../../data/turer-moldemarka.json
---

# Adversarial review — Architecture Spine, Turplanlegger

## Dom

Spinen låser *hvor* ting bor (lag, moduler, én adapter, én fil) godt, men nesten aldri *formen* på det som krysser en grense. Den sier selv at feltene i Resultat er utsatt («Koden eier formen»), mens AD-7 og AD-3 forbyr UI-et å formatere eller utlede noe. To Claude Code-økter som bygger server-siden og visningen hver for seg, vil derfor måtte finne opp den samme kontrakten to ganger. I tillegg motsier AD-4 og AD-1 hverandre om hvordan siden får «nå» ved render. Det er det første som vil skje. Funnene under er rangert etter hvor sannsynlig det er at de faktisk skjer. Hvert funn har to enheter som begge følger alle AD-er, hullet som lar dem kollidere, og en ny eller strammere AD-regel.

Alvorlighet: **critical** = blokkerer integrasjon eller gir feil svar i hovedflyten; **high** = sannsynlig feil som tester ikke nødvendigvis fanger; **medium** = sannsynlig omarbeid; **low** = kantfall.

## Oversikt

| # | Alvorlighet | Hull | Ny/strammere AD |
|---|---|---|---|
| 1 | critical | Siden har ingen lovlig vei til «nå», standardverdier og Startpunkter ved render | AD-4 + AD-1: `src/server/side.ts` |
| 2 | critical | Resultat-feltene er utsatt, men UI-et får verken formatere eller utlede | AD-3: visningskontrakt |
| 3 | critical | Søk-formen er ikke eid: relativ/absolutt Turdag, tidsformat, G/B/R vs «Middels» | Ny AD: `src/kjerne/sok.ts` |
| 4 | high | Rutegeometri: GeoJSON [lon, lat] mot Leaflet [lat, lng] | AD-10 + AD-15 |
| 5 | high | Demo-ID: query, body eller header; Zod stripper ukjente nøkler stille | AD-5 |
| 6 | high | «Bruk Bedre tidsvindu» krever at klienten bygger et Søk fra et ISO-tidspunkt | AD-3 + AD-2 |
| 7 | high | Kalibreringsskriptet har egne terskler og eget MET-kall; JSON-formen er udefinert | AD-8 + AD-6 |
| 8 | high | Værscenario «gjennom samme parsing» kan gå gjennom MET-cachen | AD-13 + AD-6 |
| 9 | high | Normalisert Værmelding: UTC- eller Oslo-nøkler, manglende timer, `next_6_hours` | Ny AD: `Vaermelding` |
| 10 | high | Passert Starttidspunkt: hvem runder opp, og hvordan kommer det tilbake? | AD-4 |
| 11 | medium-high | Ingen demo-ID for «Værmeldingen mangler» eller «ingen Bedre tidsvindu», men AD-16 krever Playwright for alle FR-6-rader | AD-5 + AD-13 + AD-16 |
| 12 | medium-high | Språkmodelltekst kommer etter et nytt Søk og havner på feil kort | AD-12 |
| 13 | medium | «Fakta om Turen» kommer fra klienten og styrer hvilke tall kontrollen godtar; falsk modell feiler kontrollen | AD-12 |
| 14 | medium | Værord-grensene gjentar terskeltallene og glir fra dem etter kalibreringen | AD-8 |
| 15 | medium | Soltider: «i morgen» relativt til nå eller Turdag+1, og i hvilken form? | AD-11 |
| 16 | medium | Playwright mot Demomodus bruker det levende Turdatasettet | AD-9 + AD-16 |
| 17 | medium | Rå Tur med snake_case «helt ut i API-et» mot ferdig formaterte strenger | Konvensjon «Datafelt» |
| 18 | medium-low | Begge 400-feilene har samme form, så klienten kan ikke skille ukjent demo-ID fra ugyldig Søk | Konvensjon «Feil» |
| 19 | low | `symbol_code` → ord og ikonfil: hvem mapper? | AD-3 |
| 20 | low | `VaerCache` er synkron eller asynkron; parallelle fornyelser | AD-6 |
| 21 | low | Avrunding i visning og klassifisering er uenige for håndskrevne scenarioverdier | AD-13 |

---

## 1. Siden har ingen lovlig vei til «nå» ved render — critical

- **Enhet A (story «Søk-skjema med standardverdier», `src/app/page.tsx`):** AD-4 sier at siden «rendres på serveren og får «nå» og standardverdiene … ferdig utregnet fra kjernen». Økten importerer `lagMiljo` fra `src/server/miljo.ts` og `standardverdier()` fra `src/kjerne/tid.ts` i server-komponenten.
- **Enhet B (story «Lagdeling og ESLint», AD-1):** Lagtabellen plasserer `src/app/` (side) i Visning, diagrammet har bare pilene Visning → API (HTTP) og Visning → kjerne (`import type`), og ESLint-regelen forbyr verdi-importer fra kjernen i Visning. Enhet A feiler lint. Den neste økten «fikser» det med `new Date()` i `page.tsx` (klokka er bare forbudt i kjernen ifølge tabellen), eller med et nytt `/api/standardverdier`. Da har appen enten to klokker, eller en klokke som ignorerer `?demo`.
- **Samme hull, flere behov:** Søk-kartet på PC viser «12 Turer fra 8 Startpunkter» og de 8 Startpunktene *før* noe Søk (EXPERIENCE.md › Faste tekster, State Patterns), så siden trenger også Turdatasett-data ved render. En ukjent demo-ID ved render («siden viser en melding med de gyldige ID-ene») må også håndteres før noe API-kall.
- **Foreslått AD (stramming av AD-4 og AD-1):** «`src/app/page.tsx` er den ene filen i Visning som kan importere fra skallet, og bare `lagSidedata(demoId)` fra `src/server/side.ts`. Den returnerer `{ demo, naTekst, skjema: { turdager, starttider: {verdi, etikett, last}[], tilgjengeligTider: {verdi, etikett}[], standard: Sok }, startpunkter, telletekst }`, eller `{ feil: 'ukjent-demo', gyldigeDemoIder }`. ESLint håndhever unntaket for akkurat denne stien.»

## 2. Resultat-feltene er utsatt, men UI-et får verken formatere eller utlede — critical

- **Enhet A (story «Orkestrering av Søk», `src/server/sok.ts` + `src/kjerne/resultat.ts`):** Følger AD-3 og lager varianten `turforslag` med `regeltekst`, `varsler`, `kildelenke`, `rute`, og formaterte `turtid: "1 t 32 min"`, `tilbake: "15:02"`.
- **Enhet B (story «Turkort med Kriterierader», `src/ui/Turkort.tsx`):** EXPERIENCE.md krever fire Kriterierader med merke ✓/!/–, tekst og detalj («1 t 32 min av 2 t» / «gangtid, uten pauser», «utsikt ✓ · vann –», «Mørkevarsel: tilbake ca. 15:32» / «Sola går ned 15:59 …»), Tidsstolpe og Dagslysstolpe, overskrift («Tre Turforslag som passer i morgen fra kl. 14:00»), Ditt søk-linje, Stokkoversikt-rad («1 t 32 min uten pauser · tilbake 15:02»), Kartinfoboks («3,06 km · Enkel»), kildenavn som lenketekst og teksten under Alternativkortet («Med 30 min eller mer …»). Enhet B finner ikke disse i Resultatet. For å holde AD-3 («utleder ingenting») og AD-7 («formaterer aldri») kan den ikke regne dem ut. Den må utvide `resultat.ts` selv, og en tredje økt (Alternativkort eller Frarådet-kort) utvider den på en annen måte.
- **Hullet:** Deferred-raden «De enkelte feltene i Resultat … Koden eier formen» betyr i praksis at *den første økten som skriver koden* eier formen, og at de andre gjetter. Stolpene trenger dessuten tall (andel), og spinen sier ikke om en andel 0–1 er «å regne ut».
- **Foreslått AD (erstatter Deferred-raden, strammer AD-3):** «`Resultat` skrives ferdig som Zod-skjema i `src/kjerne/resultat.ts` i den første storyen, før noen UI-story. Hvert kort har `kriterier: [tid, vaer, onsker, morke]` med `{ merke: 'ok'|'se-opp'|'ikke-vurdert', tekst, detalj, tilgjengeligNavn, andel?: number /* 0–1 for stolpene */ }`. Resultatet har også `overskrift`, `dittSok`, `liveTekst` og kortets `kartinfo`/`stokkrad`. UI-et viser bare strenger og andeler, og en kontrakttest validerer `/api/sok`-svaret mot skjemaet for hver demo-ID.»

## 3. Søk-formen er ikke eid — critical

- **Enhet A (skjema-story):** Sender `{ turdag: 'i-morgen', starttid: '10:00', tilgjengeligTid: 180, vanskelighetsgrad: 'Krevende', preferanser: ['utsikt'] }`, altså etikettene fra UI-et.
- **Enhet B (filtrering i kjernen, FR-15):** Sammenligner mot `gradering` i datafila (`'G'|'B'|'R'`; `gradering_tekst` er «Middels»), og forventer `turdag: '2026-11-09'` og `startMin: 600`. Begge følger AD-2 og konvensjonen «Validering». Konvensjonen sier at Zod-validering skjer «i route handleren», mens lagtabellen legger «Zod-skjemaer» i kjernen, så det finnes to mulige eiere.
- **Konkret feil uten typefeil:** Med *relativ* Turdag velger Ingrid «i morgen» kl. 23:58 søndag. Søket kommer fram 00:01 mandag, og serveren tolker «i morgen» som tirsdag. Med *absolutt* dato og en server som krever i dag/i morgen blir det samme Søket enten 400 eller «i dag». Ingen AD sier hvilken.
- **Foreslått AD (ny, «Søk-kontrakten»):** «`src/kjerne/sok.ts` eksporterer det eneste `SokSkjema` (Zod, `.strict()`): `{ dato: 'YYYY-MM-DD' (Oslo), start: 'HH:MM', tilgjengeligMin: 15..300 i steg på 15, vanskelighetsgrad: 'G'|'B'|'R', utsikt: boolean, vann: boolean }`. Route handleren og `lagSidedata` importerer det, og UI-et bruker bare `z.infer`-typen. Serveren avgjør i dag/i morgen ut fra sin egen «nå», og en dato som verken er i dag eller i morgen behandles etter regelen i funn 10.»

## 4. Rutegeometri: [lon, lat] mot [lat, lng] — high

- **Enhet A (AD-10, skallet):** Legger Omtrentlig rute inn som GeoJSON `MultiLineString`, og RFC 7946 krever `[lon, lat]`: `[7.1679, 62.7617]`.
- **Enhet B (kart-story, AD-15):** Bruker react-leaflet `<Polyline positions={rute.coordinates}>`, og Leaflet forventer `[lat, lng]`. Rutene havner i Arabiahavet. Det gir ingen typefeil, og ingen Vitest-test fanger det, fordi begge sidene er «riktige». Startpunkt ligger i datafila som `{ lat, lon }`, så det blir to koordinatformer i samme Resultat.
- **Foreslått AD (stramming av AD-10 og AD-15):** «Rutegeometri i Resultatet er en GeoJSON `Feature` (RFC 7946, `[lon, lat]`), og Startpunkt er `{ lat, lon }`. Kartkomponenten tegner ruter bare med `L.geoJSON`/`<GeoJSON>`, aldri ved å sende koordinatlister til `Polyline`. En Playwright-sjekk i `?demo=uj-1` verifiserer at kartets `getBounds()` ligger innenfor Moldemarka.»

## 5. Demo-ID-transport — high

- **Enhet A (klientens fetch):** «Siden sender demo-ID-en med i hvert API-kall» (AD-5), så den gjør `POST /api/sok?demo=uj-2`.
- **Enhet B (route handler):** Leser `body.demoId`. Zod sitt standard `z.object` *stripper* ukjente nøkler i stedet for å feile, så et Søk uten `demoId` i body blir et gyldig live-Søk: ekte MET og ekte klokke under en demo. Det er den blandede tilstanden AD-5 skal hindre, og det synes bare på værdataene. En tredje variant er headeren `x-demo`.
- **Følgefeil:** En historikk-story («Resultat legger én historikkoppføring», EXPERIENCE.md › Interaction Primitives) gjør `history.pushState({}, '', '/')` og mister `?demo`. Ved Tilbake eller omlasting er siden plutselig live.
- **Foreslått AD (stramming av AD-5):** «Demo-ID-en reiser bare som query-parameteren `demo` på sidens URL og på begge API-URL-ene. Den leses bare av `lesDemoId(url)` i `src/server/miljo.ts`. Alle forespørselsskjemaer er `.strict()`, all `fetch` fra klienten går gjennom `src/ui/api.ts`, som kopierer `demo` fra `location.search`, og hver `pushState`/`replaceState` beholder `?demo`.»

## 6. «Bruk Bedre tidsvindu» krever at klienten bygger et Søk fra et ISO-tidspunkt — high

- **Enhet A (kjernen, FR-19):** `bedreTidsvindu: { type: 'funnet', start: '2026-11-10T14:00:00+01:00', antallForMorket: 5 }`. Det følger konvensjonen «Maskinlesbare tidspunkter er ISO 8601 med tidssoneforskyvning».
- **Enhet B (Bedre tidsvindu-boksen):** Må lage et nytt Søk (AD-2) med `dato` og `start` i Oslo-tid fra ISO-strengen. Det er nøyaktig tidssoneomregning, som AD-7 forbyr i UI-et. Økten bruker `new Date(iso).getHours()`, som er riktig på en norsk laptop og feil i CI (UTC) og på enheter i andre tidssoner (FR-1). Knappeteksten «Bruk i morgen 11:00» og «I morgen (søn. 15. nov.) fra kl. 11:00» mangler også.
- **Foreslått AD (stramming av AD-3):** «`bedreTidsvindu.funnet` har `nyttSok: Sok`, et komplett Søk som klienten sender uendret, og ferdige `tittel`, `knappetekst` og `antallTekst`. Det samme gjelder «Prøv igjen», som sender `resultat.sok` (funn 10). Klienten bygger aldri et Søk fra et tidspunkt.»

## 7. Kalibreringsskriptet og terskelfila — high

- **Enhet A (server-story, AD-8):** Lager `data/vaerterskler.json` som `{ "darlig": { "nedbor": 2, "vind": 10.8, "temp": -10 }, … }` og leser den med Zod.
- **Enhet B (skript-story, AD-8):** `scripts/kalibrering_vaerlogg.py` finnes *allerede* med egen `TERSKLER`-liste av tupler `(klasse, nedbør >=, vind >=, temp <)` med `None` for «ingen grense», sortert strengeste først. Økten skriver om til å lese JSON, men i sin egen form (liste med `"klasse"`, `"frarådet"` med æ/å, eller `>` i stedet for `>=`). Nå gjelder to former, eller én form med to tolkninger av grenseoperatoren. FR-8-eksemplet «2,0 mm/t gir dårlig» krever `>=` for nedbør og vind og `<` for temperatur, og det står ikke i noen AD.
- **Mer:** Skriptet kaller `api.met.no` selv med User-Agent `turplanlegger-ibe160-kalibrering/0.1`. Det bryter AD-6 («det eneste stedet som kaller api.met.no»). Skriptet har dessuten en egen implementasjon av FR-8 og FR-9 (`klasse_for_time` og vindusaggregering med `range(start, slutt)`), så det finnes to motorer for Værklasse. Det er nettopp den driften AD-8 skal hindre.
- **Foreslått AD (stramming av AD-8 og AD-6):** «`data/vaerterskler.json` har formen `{ "versjon": 1, "klasser": [ { "klasse": "fraradet"|"darlig"|"middels", "nedbor_mm_t_minst": number|null, "vind_ms_minst": number|null, "temp_c_under": number|null } ] }` med strengeste klasse først (`>=` for nedbør og vind, `<` for temperatur, `null` = ingen grense). Zod-skjemaet i kjernen og Python-lesingen avviser ukjente nøkler. `testdata/vaerklasse-fasit.json` (timer → forventet klasse, og Tidsvindu → klasse) kjøres både av Vitest og av `kalibrering_vaerlogg.py --selvtest`. Skriptet er et navngitt unntak fra AD-6, med egen User-Agent-suffiks og uten cache, og regnes ikke som app-trafikk.»

## 8. Værscenario-kilden og MET-cachen — high

- **Enhet A (MET-adapter, AD-6):** Parsingen ligger i `met.ts`, etter `fetch`, med cachen nøklet på `(lat, lon, altitude)`.
- **Enhet B (Værscenario-kilde, AD-13: «går gjennom samme parsing som MET-adapteren»):** Den enkleste måten å bruke «samme parsing» på er å kalle adapteren med en fil-«fetcher». Da går scenarioets `met.json` inn i `VaerCache` med *samme nøkkel* som ekte MET, siden Værpunktet er det samme. Etter én demo-forespørsel får live-brukere på samme Vercel-instans UJ-3-kulingen fram til `Expires`, eller demoen får ekte vær. Begge følger AD-6 og AD-13 ordrett.
- **Foreslått AD (stramming av AD-13 og AD-6):** «MET-parsingen er en ren funksjon `parseMetCompact(json): Vaermelding` i `src/kjerne/vaer/met-compact.ts` (Zod-validert). MET-adapteren og Værscenario-kilden kaller den hver for seg. `VaerCache` brukes bare inne i `met.ts`, og Værscenario-kilden har ingen cache og importerer ikke `met.ts`.»

## 9. Normalisert Værmelding — high

- **Enhet A (parsing):** Lager `timer: Record<string, Time>` med nøkkel som Oslo-veggklokke `"2026-11-09T13"`, slik kalibreringsskriptet gjør (`timer[tid.hour]`).
- **Enhet B (FR-9 og FR-19 i kjernen):** Følger AD-7 («Øyeblikk sendes … som UTC») og slår opp timer med UTC-epoke. Resultatet er ingen treff (vær «mangler» uten at MET feilet) eller et skift på én time. På natta med 25 timer i oktober er Oslo-nøkkelen `T02` dobbel, og den ene timen forsvinner stille.
- **Mer som ikke er bestemt:**
  - MET gir bare `next_1_hours` de første ca. 60 timene og deretter `next_6_hours`. Hva skjer når én time i Tidsvinduet mangler? Skriptet hopper over hele vinduet, men serveren kan klassifisere de timene som finnes.
  - Hva skjer når `precipitation_amount` mangler? Er den 0 eller ukjent?
  - Hvilket `time` er timens start? `next_1_hours` på raden med `time = 13:00Z` gjelder 13–14Z.
- **Foreslått AD (ny, «Værmelding-formen»):** «`Vaermelding = { timer: { startUtc: number /* epoke-ms, hel UTC-time */, tempC: number, vindMs: number, nedborMmT: number, symbolKode: string|null }[] }`, stigende og bare med rader som har `next_1_hours`. Timene i et Tidsvindu velges bare med `timerITidsvindu(start, slutt)` i `tid.ts` (halvåpent, «overlapper»). Mangler én av timene, er Værklassen for det vinduet `mangler`: FR-13 for Søket, og vinduet hoppes over i letingen etter Bedre tidsvindu.»

## 10. Passert Starttidspunkt — high

- **Enhet A (skjema):** Låser passerte tider ut fra sidens «nå» ved render (AD-4). Ingrid har siden åpen fra 13:20 og sender «13:30» kl. 13:40. Klienten kan ikke se at tiden har passert uten å bruke sin egen klokke, som AD-4 forbyr.
- **Enhet B (route handler):** Validerer at `start >= nå` med Zod og svarer 400. Klienten viser da Kontaktfeil-kortet («Vi fikk ikke kontakt.»), som er feil. En annen økt runder stille opp til 13:45. Da viser Ditt søk fortsatt 13:30, Regeltekst og Mørkevarsel gjelder 13:45, og «Endre søk» henter 13:30 tilbake. EXPERIENCE.md krever at et passert Starttidspunkt rundes opp «ved sending, ved «Prøv igjen» og når «Endre søk» henter Søket tilbake», med hjelpeteksten «Flyttet til 14:15, fordi 13:30 har passert.», og etter 22:00 at Turdag blir i morgen kl. 10:00. Ingen AD sier hvilken enhet som gjør det.
- **Foreslått AD (stramming av AD-4):** «Bare serveren justerer et passert Starttidspunkt, og den gir aldri 400 for det. `/api/sok` normaliserer Søket med sin egen «nå» (opp til neste kvarter, eller i morgen 10:00 etter 22:00) og returnerer `resultat.sok` (det normaliserte Søket) og `resultat.justering?: { tekst }`. Ditt søk, «Prøv igjen» og «Endre søk» bruker bare `resultat.sok`.»

## 11. Demo-ID-er som Playwright trenger, men som ikke finnes — medium-high

- **Enhet A (e2e-story, AD-16):** «Hver visningskonsekvens, blant annet radene i FR-6-tabellen, er en Playwright-test mot `?demo=<id>`». Raden «Værmeldingen mangler» og tilstanden «Ingen Bedre tidsvindu» kan ikke nås med `uj-1`–`uj-3`. Økten legger til `data/vaerscenarioer/uten-vaer/`.
- **Enhet B (miljø-story, AD-5):** Hardkoder `z.enum(['uj-1','uj-2','uj-3'])`, så `uten-vaer` gir 400. Listen med gyldige ID-er står nå tre steder (enum, mappenavn, meldingen på siden), og den er alltid feil på minst ett av dem.
- **Foreslått AD (stramming av AD-5, AD-13 og AD-16):** «Gyldige demo-ID-er er mappenavnene under `data/vaerscenarioer/`, lest én gang i `miljo.ts`. Meldingen på siden og Playwright bruker samme liste. `scenario.json` kan ha `"vaer": "mangler"` i stedet for `met.json`. Scenarioene `uten-vaer` og `ingen-bedre` finnes ved siden av `uj-1`–`uj-3`, og README viser bare UJ-scenarioene.»

## 12. Språkmodelltekst havner på feil kort — medium-high

- **Enhet A (klient, AD-12):** Sender tre `/api/begrunnelse`-kall og bytter teksten på kort *i* når svar *i* kommer.
- **Enhet B (Bedre tidsvindu-boks eller «Prøv igjen»):** Ingrid trykker «Bruk 14:00» etter 2 s (Flow 2). Det nye Resultatet vises, og så kommer svaret fra det *gamle* kallet og erstatter Regelteksten på det nye kort 1 med en tekst om en annen Tur. Spinen sier heller ikke hvem som eier 5-sekundersgrensen. SDK-en har 5 s (AD-12), men klientens grense er ikke nevnt. Med nettverk på toppen blir det i praksis 5 s + RTT, mens FR-22 sier «innen 5 s».
- **Foreslått AD (stramming av AD-12):** «Hvert Resultat har en `resultatId` (fra serveren). Svaret fra `/api/begrunnelse` byttes inn bare hvis kortets `resultatId` og `turId` fortsatt vises og det er under 5 s siden Resultatet ble vist (klientens `AbortController` på 5 s). SDK-grensen på serveren er 4 s, så summen holder.»

## 13. Hvem eier «fakta om Turen», og består den falske modellen kontrollen? — medium

- **Enhet A (klient):** Sender `{ regeltekst, fakta: turforslag.tur }`, altså hele Tur-objektet med koordinater, `lengde_km_kilde`, `adkomst.lengde_m` og `merknad`.
- **Enhet B (`kontrollerSprakmodelltekst`, FR-22):** «Kan ikke ha andre tall enn dem i Regelteksten og fakta om Turen». Når klienten bestemmer faktaene, bestemmer klienten også hvilke tall modellen får finne på. «62,7617» eller «1900» blir lovlige, og serveren har ingen måte å vite hva som er sant. En tredje økt (`falsk.ts`, «faste svar») returnerer en fast setning som ikke inneholder «1 t 32 min». Kontrollen avviser den, så Demomodus viser aldri Språkmodelltekst, og NFR-11 («kan vises med den falske språkmodellen») feiler stille.
- **Uavklart:** Får Alternativkortet (som har Begrunnelse-boks) også et kall? AD-12 sier «per Turforslag».
- **Foreslått AD (stramming av AD-12):** «Forespørselen er `{ turId, regeltekst }`. Serveren henter faktaene selv fra Turdatasettet med en fast liste av felt (navn, Mål, Startpunkt-navn, lengde totalt, høydemeter, høyeste punkt, Vanskelighetsgrad), og svaret er `{ tekst: string|null }`, der `null` betyr at Regelteksten blir stående. `falsk.ts` lager svaret som en deterministisk omskriving av Regelteksten som består kontrollen, og bare Turforslag (ikke Alternativkortet) får kallet.»

## 14. Værord-grensene gjentar terskeltallene — medium

- **Enhet A (kalibrering, PRD §10, 10.–16. november):** Endrer «dårlig» nedbør fra 2,0 til 3,0 i `data/vaerterskler.json`, slik NFR-10 lover er nok.
- **Enhet B (`src/kjerne/vaerord.ts`, AD-8):** Har båndene fra EXPERIENCE.md ordrett: 0,5–1,9 «noe nedbør», ≥ 2,0 «nedbør opptil X mm/t», 8,0–10,7 «frisk vind», 10,8–17,1 og ≥ 17,2. Etter kalibreringen viser appen «Værklasse middels» sammen med «nedbør opptil 2,5 mm/t», ordet for dårlig vær. AD-8 sier at Værordene står på ett sted og tersklene på ett annet, men fire av sju grenser er *de samme tallene* på to steder. Det er også i strid med «Ingen andre filer inneholder tallgrenser for vær».
- **Foreslått AD (stramming av AD-8):** «`vaerord.ts` eier bare grensene under laveste terskel (0,1 mm/t og 5,5 m/s). Båndene fra «middels» og opp leses fra terskelobjektet, som værord-funksjonene får som argument, så en endring i `vaerterskler.json` flytter ord og klasse sammen.»

## 15. Soltider: hvilken «i morgen», og i hvilken form? — medium

- **Enhet A (`sok.ts`):** Følger sekvensdiagrammet, `sol(Turdag), sol(i morgen)`, og regner «i morgen» som Turdag + 1. Med Turdag = i morgen blir det overmorgen.
- **Enhet B (`bedreTidsvindu` i kjernen):** Leser `soltider.iMorgen` som i morgen *relativt til nå* (FR-19 leter i morgen bare når Turdag er i dag). Ved Turdag = i dag stemmer de to tolkningene, så ingen test feiler før noen legger til et nytt tilfelle. Formen (`{ opp: "08:30" }` i Oslo-tekst eller epoke-ms i UTC) står heller ikke noe sted. AD-11 sier bare «hele minutter».
- **Foreslått AD (stramming av AD-11):** «Kjernen får `soltider: Record<'YYYY-MM-DD' /* Oslo-dato */, { oppUtc: number, nedUtc: number }>` for hver dato den kan vurdere: Turdagen, og i morgen relativt til «nå» når Turdag er i dag. Den slår opp med `tid.ts` og kaster feil hvis datoen mangler. Skallet bygger objektet ett sted.»

## 16. Playwright mot Demomodus bruker det levende Turdatasettet — medium

- **Enhet A (e2e, AD-16):** Sjekker «Tusenårsvarden fra Damefallet står øverst» i `?demo=uj-1`, rett fra UJ-1.
- **Enhet B (datakurering, FR-26/FR-27):** Legger til en Tur eller retter høydemeter, slik det skjedde 6. og 9. november. Serveren laster `data/turer-moldemarka.json` også i Demomodus (AD-5-tabellen nevner ikke Turdatasettet), og e2e blir rød. Det er nettopp det NFR-2 og AD-9 skal hindre. Den motsatte løsningen, at `lagMiljo` laster `testdata/turer.json` i Demomodus, gir sensor et utdatert datasett. Begge følger AD-ene.
- **Foreslått AD (stramming av AD-9 og AD-16):** «Demomodus og Playwright bruker alltid `data/turer-moldemarka.json`. Playwright sjekker tilstand, antall kort og felt som er til stede, men aldri navn på Turer. Eksemplene med navn (UJ-1–UJ-3, FR-16–FR-21) testes bare i Vitest mot `testdata/turer.json`.»

## 17. Rå Tur «helt ut i API-et» mot ferdig formaterte strenger — medium

- **Enhet A:** Konvensjonen «Datafelt» lar Turdatasettets snake_case-felt gå «helt ut i API-et», så Turforslag får `tur: { lengde_km_totalt: 3.06, gradering: 'G', kilde: 'https://morotur.no/…' }`.
- **Enhet B (Kartinfoboks og kildelenke):** Trenger «3,06 km», «Enkel» og lenketeksten «morotur.no» / «Fjord Norway». Den formaterer `lengde_km_totalt` selv (bryter AD-7) eller utleder kildenavnet fra vertsnavnet (bryter AD-3). Det finnes to sannheter for Vanskelighetsgrad: `gradering` og `gradering_tekst`.
- **Foreslått AD (stramming av konvensjonen):** «Snake_case-feltene fra Turdatasettet stopper i skallets laster. Resultatet har bare `turId`, `rute`, `startpunkt` og ferdige visningsstrenger (`navn`, `lengdeTekst`, `vanskelighetsgradTekst`, `kildeNavn`, `kildeUrl`). UI-et leser aldri et snake_case-felt.»

## 18. Begge 400-feilene har samme form — medium-low

- **Enhet A (API):** Ukjent demo-ID og ugyldig Søk gir begge «400 med Zod-feilene» (konvensjonen «Validering»).
- **Enhet B (klient):** Skal vise «melding med de gyldige ID-ene» ved ukjent demo-ID (AD-5) og Kontaktfeil-kortet ved andre feil. Den må tolke Zod-stier for å vite hvilken feil det er.
- **Foreslått regel:** «Feilsvar er `{ feil: 'ukjent-demo', gyldigeDemoIder } | { feil: 'ugyldig-sok', detaljer }`. Klienten velger visning bare på `feil`.»

## 19. `symbol_code` → ord og ikonfil — low

- **Enhet A:** Kjernen setter `symbolKode: 'partlycloudy_day'` i `vaer.vurdert`.
- **Enhet B (Værsymbol-komponenten):** Bygger `/vaerikoner/${kode}.svg`, fjerner endelsen og slår opp «delvis skyet» i en tabell i `src/ui/`. Det er utledning i Visning, og tabellen havner i UI-et i stedet for ved Værordene. En ukjent kode gir et ødelagt bilde i stedet for «ingen ikon og ikke noe ord».
- **Foreslått regel:** «`vaer.vurdert.symbol` er `{ ord: string|null, ikonSti: string|null }`, laget av `src/kjerne/vaersymbol.ts`. UI-et viser ikonet bare når `ikonSti` finnes.»

## 20. `VaerCache`: synkron eller asynkron, og parallelle fornyelser — low

- **Enhet A:** Lager `VaerCache.get(key): Entry | undefined` (synkron Map).
- **Enhet B (den senere delte cachen, Deferred):** Redis/Runtime Cache er asynkron, så grensesnittet må endres, og «uten endringer utenfor `src/server/vaer/`» holder bare hvis det var asynkront fra start. To samtidige Søk etter `Expires` sender også to MET-kall.
- **Foreslått regel:** «`VaerCache` er asynkron (`get`/`set` returnerer `Promise`), og `met.ts` deler ett pågående kall per nøkkel.»

## 21. Avrunding i visning og klassifisering — low

- **Enhet A (Værscenario-forfatter):** Skriver `wind_speed: 10.75` i `uj-2/met.json` for å treffe en grense.
- **Enhet B (`format.ts` og terskler):** Viser «10,8 m/s» (én desimal), men klassifiserer 10,75 som middels («frisk vind»), så teksten og klassen er uenige. MET selv gir én desimal.
- **Foreslått regel:** «`parseMetCompact` avviser verdier med mer enn én desimal i Værscenarioer. Klassifisering og formatering bruker samme tall.»

---

## Hva spinen gjør godt (så det ikke rives ned)

- Én klokke, én MET-adapter, én solberegning og ett Tur-skjema er riktige valg, og Prevents-feltene er konkrete.
- AD-2 (én motor på serveren) fjerner den farligste klassen av to-implementasjoner.
- AD-11 har en målt begrunnelse (suncalc +3 min snur UJ-2).

Det som mangler, er kontraktene *mellom* disse stedene. Med funn 1–3 lukket (sidedata, Resultat-skjema, Søk-skjema) faller de fleste andre funnene på plass som felt i de tre skjemaene.
