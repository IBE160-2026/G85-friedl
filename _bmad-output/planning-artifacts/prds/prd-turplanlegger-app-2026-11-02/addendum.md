# Addendum: PRD Turplanlegger

Teknisk detalj og bakgrunn til [prd.md](prd.md), til bruk i arkitektur og stories. Kravene står i PRD-en; her står hvordan de kan løses og hvorfor tallene er valgt.

## Værintegrasjon (FR-7, NFR-4)

- **Mellomtjeneste:** Nettleseren kan ikke sette `User-Agent`, så værkallene går via appens egen server. Den eier cachen og er det eneste stedet som kaller MET.
- **User-Agent:** appnavn pluss kontakt, f.eks. repo-URL eller e-post. Mangler den, svarer MET 403; forfalsket kan gi permanent blokkering.
- **Caching:** Svar lagres per (avrundet koordinat, høyde). `Expires` bestemmer levetiden, og `If-Modified-Since` brukes ved fornyelse (MET svarer 304 når ingenting er endret). Ingen fast TTL.
- **Koordinater:** maks fire desimaler. Værpunktet er `lat=62.7617&lon=7.1679` (PRD §3, valgt 2026-11-09). Send `altitude=400`; da blir temperaturen mer presis.
- **Felt (compact-formatet):** `air_temperature` og `wind_speed` under `instant.details`, `precipitation_amount` og `symbol_code` under `next_1_hours`.
- **Horisont:** timesoppløsning de første ca. 60 timene, som dekker hele «i dag» og «i morgen».
- **Tidsgrense:** svarer ikke MET innen 2 s, gjelder FR-13, slik at NFR-5 holder.
- **Tid:** MET oppgir tidspunkter i UTC. Appen regner dem om til norsk tid (Europe/Oslo) med et tidssonebibliotek, så sommertid og døgn med 23 eller 25 timer blir riktige (FR-1).
- **Kreditering og lisens:** «Data fra MET Norway» med lenke; NLOD 2.0 og CC BY 4.0.

Kilde: [MET-researchen](../../research/technical-met-locationforecast-api-for-turplanlegg-2026-10-29/research.md).

## Værterskler — bakgrunn (§4.2)

- Vindgrensene følger Beaufort-skalaen: frisk bris 8,0–10,7 m/s, liten kuling 10,8–13,8, stiv kuling 13,9–17,1 og sterk kuling 17,2–20,7 (Yr/MET, middels sikkerhet i researchen).
- MET sine farevarselgrenser (f.eks. 33–45 m/s vindkast, over 20 mm/t styrtregn) gjelder sjeldne, ekstreme hendelser og passer ikke for daglig turvurdering.
- Nedbørsgrensene (0,5, 2 og 10 mm/t) og temperaturgrensene er produktvalg uten ekstern kilde. Radarskalaen for nedbør fra researchen er ubekreftet og ikke brukt.
- Tersklene bør ligge i én konfigurasjon, slik at de kan justeres etter kalibreringen (spørsmål 1 i PRD §10) uten kodeendring andre steder.

## Rangering — tenkt som sortering (FR-16)

Kriteriene i FR-16 er en ren sortering på en nøkkel per Tur, så det trengs ingen vekter:

- God, middels eller ukjent vær: (mørkevarsel, −antall treff, |Tilgjengelig tid − Turtid|, ID)
- Dårlig vær: (mørkevarsel, ikke lavtliggende, egnet [ja=0, ukjent=1, nei=2], −antall treff uten utsikt, |Tilgjengelig tid − Turtid|, ID)
- Variasjon (FR-17): gå gjennom den sorterte listen og ta første Tur per `mal`. Er det færre enn tre, fyll på med de neste i sortert rekkefølge.

## Turtid for dagens Turdatasett (FR-14)

Regnet ut 2026-11-02 fra `data/turer-moldemarka.json`. Lengde og høydemeter ble avklart 2026-11-03 uten at tallene endret seg (PRD §10, spørsmål 2 og 3). 2026-11-06 ble Midtveishuken rettet til en rundtur på 2,47 km, så Turtiden gikk fra 1 t 5 min til 35 min. 2026-11-09 ble høydemeterne kontrollert (se Høydemeter under), og Turtiden ble 16 min for Storlihytta fra Vardeveien (var 19) og 33 min for Midtveishuken (var 35). Datasettet kan endres igjen, så testene bør bruke et eget, fast testdatasett.

| Tur | Vanskelighetsgrad | Turtid | Høyeste punkt | Lavtliggende |
|---|---|---|---|---|
| Storlihytta fra Vardeveien | Enkel | 16 min | 301 moh | ja |
| Midtveishuken rundt Øverlandsvatnet | Enkel | 33 min | 266 moh | ja |
| Bergsvatnet | Enkel | 43 min | 281 moh | ja |
| Skihytta fra Damefallet | Enkel | 54 min | 391 moh | ja |
| Storlihytta fra Romsdalsmuseet | Enkel | 1 t 2 min | 270 moh | ja |
| Tusenårsvarden fra Damefallet | Middels | 1 t 32 min | 527 moh | nei |
| Moldevatnet fra Jensgurilia | Middels | 1 t 33 min | 340 moh | ja |
| Tusenårsvarden rundtur om Moldedalen | Krevende | 2 t 10 min | 527 moh | nei |
| Tusenårsvarden fra Grua | Middels | 2 t 16 min | 524 moh | nei |
| Varden via Den grønne korridor | Middels | 2 t 26 min | 407 moh | nei |
| Frænavarden fra Grua | Krevende | 2 t 47 min | 584 moh | nei |
| Tusten fra Tusten skisenter | Middels | 2 t 48 min | 705 moh | nei |

Ved 1 t Tilgjengelig tid passer altså fire Turer, og ved 3 t passer alle.

## Høydemeter (FR-26, FR-27)

Kontrollert 2026-11-09 (PRD §10, spørsmål 3).

- **Definisjon:** Høydemeter er samlet stigning for hele turen, det vil si den samme strekningen som lengde totalt. For en Tur med retning `en_vei` går man samme vei tilbake, så stigningen er summen av stigning og fall langs sporet én vei. For tur–retur og rundtur er den stigningen langs hele sporet.
- **Metode:** Kildesporet fra morotur.no (`https://morotur.no/api/v2/geojson/<id>`) deles opp i punkter med 10 m avstand. Høyden for hvert punkt hentes fra Kartverkets terrengmodell (DTM1, `https://ws.geonorge.no/hoydedata/v1/punkt`). En stigning eller et fall telles først når det er minst 3 m, så støy i terrengmodellen ikke summeres opp.
- **Regel:** Er avviket fra kildens tall maks 20 m, beholdes kildens tall. Er det større, brukes målt verdi. Turdatasettet har `hoydemeter_kontroll` per Tur: `{"status": "kontrollert", "malt_m": <målt>}` eller `{"status": "anslag"}`. FR-27-testen sjekker at feltet finnes og at et kontrollert tall ligger innenfor 20 m av `malt_m`.
- **Resultat:**

| Tur | Før | Målt | Brukes |
|---|---|---|---|
| Storlihytta fra Romsdalsmuseet | 209 | 208 | 209 |
| Storlihytta fra Vardeveien | 58 | 35 | **35** |
| Skihytta fra Damefallet | 169 | 171 | 169 |
| Tusenårsvarden fra Damefallet | 318 | 316 | 318 |
| Tusenårsvarden fra Grua | 438 | 445 | 438 |
| Tusenårsvarden rundtur om Moldedalen | 392 | 386 | 392 |
| Frænavarden fra Grua | 500 (anslag) | 504 | 500 |
| Moldevatnet fra Jensgurilia | 152 | 150 | 152 |
| Midtveishuken rundt Øverlandsvatnet | 58 | 36 | **36** |
| Bergsvatnet | 55 | 62 | 55 |
| Tusten fra Tusten skisenter | 605 | 621 | 605 |
| Varden via Den grønne korridor | 407 | – | 407 (anslag) |

- **Følsomhet:** Med 5 m i stedet for 3 m blir de fleste tallene lavere, med opptil 35 m (Tusenårsvarden fra Grua), mest på de lange turene med mye opp og ned. Da ville også Tusenårsvarden fra Grua og rundturen om Moldedalen avvike mer enn 20 m fra kilden. Med 3 m stemmer ni av elleve Turer med kilden innenfor 16 m, så 3 m er valgt.
- **Storlihytta fra Vardeveien:** Sporet på morotur.no er tegnet fra hytta (ca. 270 moh) til Vardeveien (ca. 298 moh). Startpunktet ligger altså høyere enn hytta, så turen går mest nedover og har stigningen på veien tilbake.
- **Varden** har ikke noe kildespor (kilden er Fjord Norway). 407 m er høydeforskjellen fra havnivå til toppen og er merket som anslag.
- **Høyeste punkt** ble målt samtidig og ligger innenfor 5 m av datasettet for alle 11 Turer. Det er ikke endret.

## Kart (FR-23–FR-25, FR-28)

- **Kartbibliotek og bakgrunnskart** velges i arkitekturen. Kravene er: ingen nøkkel, støtte for berøring og synlig kreditering. Aktuelle kandidater er Leaflet med Kartverkets åpne topografiske kart eller OpenStreetMap. Vilkårene for kartflisene må sjekkes før valget.
- **Rutegeometri:** GML (EPSG:25833) konverteres til GeoJSON (WGS84) med ett objekt per Rutesegment, nøklet på rutenummer og rutenavn. Linjebitene til hvert Rutesegment slås sammen til ett objekt (MultiLineString), og en linje som hører til flere Rutesegmenter, tas med i hvert av dem. Turene viser til rutenummer og rutenavn.
- **Omtrentlig rute:** Med rutenavn i nøkkelen (målt 2026-11-06) er Rutesegmentene 4,22 km for Storlihytta fra Vardeveien (turen er 0,53 km én vei) og 2,63 km for Bergsvatnet (1,57 km). For turene fra Damefallet er de omtrent 1,7 ganger turlengden. Målingen 2026-11-02 i briefens addendum (4,55 og 5,87 km) tok med den feile delen av `1506_MM_0312`.
- **Målt 2026-11-06 mot GML-fila:**
  - Alle 14 rutenumrene Turene da viste til, finnes.
  - Et rutenummer består av opptil 15 linjebiter, og 39 linjer hører til flere ruter.
  - `1506_MM_0312` brukes for både «Vardenveien» og «Øverlandsvatnet_Bergsvatnet», minst 1,5 km fra hverandre. Tre andre rutenumre i fila, utenfor Moldemarka, har også flere rutenavn.
  - Med bare rutenummer som nøkkel fikk fem Turer hull eller biter langt unna. Med rutenavn i nøkkelen hadde to Turer hull: Frænavarden fra Grua (ca. 1,4 km og 100 m) og Tusenårsvarden rundtur om Moldedalen (399 m).
- **Sjekket mot kildesporene 2026-11-06 (PRD §10, spørsmål 9):** morotur.no har et GeoJSON-spor per tur (`https://morotur.no/api/v2/geojson/<id>`; id-en står på turpagen). Sporene er sammenlignet med GML-fila: hvilke ruter sporet følger innenfor 25 m, og hvor langt starten ligger fra Rutesegmentene.
  - Frænavarden fra Grua følger `0302`, `0303`, `0304` og `0306`. `F_20170227_2` (Frænavarden/ Valltua) går videre fra toppen og er ikke del av turen. Det var den som ga hullet på 100 m, og den er byttet med `0303` og `0304`.
  - Rundturen om Moldedalen følger 1,1 km av `1506_MM_0313` og bare 0,1 km av `1505-1`, så `0313` er lagt til.
  - For de ni andre Turene fra morotur.no stemmer Rutesegmentene med sporet. Rutesegmentene dekker 59–100 % av hvert spor. Resten er strekninger som ikke finnes i Turrutebasen.
  - Varden når toppen på de siste ca. 400 m av `0312 Vardenveien` og beholder derfor den. Storlihytta fra Vardeveien trenger den også, siden parkeringen ligger ved den.
  - Stinettet begynner ved Grua. Strekningen fra Romsdalsmuseet dit (ca. 500 m) og veien fra turparkeringen i Jensgurilia (260–280 m) finnes ikke i fila, så disse fire Turene og Varden har Adkomst (FR-26). For Varden er Adkomsten 1,9 km. Det er 1,44 km fotruting langs gangveiene i OpenStreetMap (routing.openstreetmap.de) fra Storkaia via Rekneskaia og Reknesparken til parkeringen ved Romsdalsmuseet, og 0,50 km langs kildesporet derfra til Grua. Det stemmer med kildens 4,4 km minus ca. 2,4 km langs Rutesegmentene fra Grua til toppen.
  - Startkoordinatene (PRD §10, spørsmål 5) er første punkt i kildesporet. Unntakene er Storlihytta fra Vardeveien, som bruker GPS-koordinatene på turpagen (12 m fra slutten av sporet), og Varden, som bruker Storkaia i Kartverkets stedsnavnregister. Turer som deler Startpunkt, bruker samme punkt: Damefallet (sporene starter 21 m fra hverandre), Grua (85 m, der Frænavarden starter på parkeringen og Tusenårsvarden der turveien begynner) og Jensgurilia (24–25 m). Adkomsten er målt fra det felles Startpunktet, så Midtveishuken og Bergsvatnet har 260 m.
  - Rutesegmentet for Tusten slutter ca. 350 m før toppen, og for Frænavarden ca. 90 m før, så Omtrentlig rute når ikke helt opp for disse to.
  - Sporene viste også at Midtveishuken er en rundtur på 2,47 km, og de bekreftet tur–retur-lengdene for Tusenårsvarden fra Grua og Moldevatnet (PRD §10, spørsmål 2).

## Solnedgang og soloppgang (FR-21)

- **Beregning:** lokalt med en standard algoritme for solposisjon (f.eks. NOAA-formlene eller et lite bibliotek som SunCalc), for Værpunktets koordinat og Turdagen. Ingen nettverkskall.
- **Definisjon:** solas øvre kant ved havnivå med standard refraksjon (senitvinkel 90,833°), avrundet til nærmeste hele minutt. Høydekorreksjon for 400 moh brukes ikke. Den gjør solnedgangen 9. november ca. 6 min senere (16:05) og snur eksempelet i FR-16.
- **Kontrollverdier:** NOAA-formlene for Molde sentrum, regnet ut 2026-11-06 og kontrollert mot kjente tider for Oslo og London:
  - 9. november 2026: sol opp 08:30, ned 15:59.
  - 21. juni 2026: sol opp 03:28, ned 23:37.
  - Andre punkter i Moldemarka avviker mindre enn ett minutt. Værpunktet (62,7617 N, 7,1679 Ø) gir 08:30 og 15:59 for 9. november, regnet ut med de samme formlene 2026-11-09. PRD-ens tidligere 08:28 og 16:02 var tallene for 8. november.
- **Test:** Testene av rangering, Mørkevarsel og Bedre tidsvindu får sol opp og ned som input (NFR-2). Selve solberegningen testes for seg mot kontrollverdiene, med toleranse ±2 min.

## Språkmodell (FR-22)

- Leverandør og modell velges i arkitekturen. Nøkkelen ligger i `.env` (NFR-7).
- **Inndata:** Regelteksten og fakta om Turen, ingenting om brukeren.
- **Instruks:** én til to setninger på bokmål, uten nye fakta. Tallene skal stå nøyaktig som i Regelteksten, og ordene «trygg» og «trygt» skal ikke brukes.
- **Kontroll:** Svaret må ha med alle tall fra Regelteksten og kan ikke ha andre tall enn dem i Regelteksten og fakta om Turen. Det kan heller ikke inneholde «trygg» eller «trygt». Ellers vises Regelteksten.
- **Visning:** Turforslagene vises straks med Regeltekst. Kommer Språkmodellteksten innen 5 s, byttes den inn (FR-22, NFR-5).
- **Kostnad:** maks ett kall per Turforslag (tre per Søk), og bare når nøkkelen er satt.
- **Test:** En mock-modus gir deterministiske svar, så testene virker uten nøkkel.

## Demomodus (NFR-11)

- **Valg av Værscenario:** ved oppstart, f.eks. med en miljøvariabel eller en parameter i adressen. Valget gjøres i arkitekturen.
- **Værscenarioer:** filer med timesverdier i samme format som MET-svaret, felles med testene (NFR-2). Hvert Værscenario har sitt eget faste «nå», f.eks. søndag 8. november 2026 kl. 20:00 for UJ-2.
- **Språkmodell:** den falske språkmodellen fra testene (FR-22).
- **Merking:** et synlig merke i appen, så faste værdata ikke kan forveksles med en ekte Værmelding.

## Åpne punkter fra brief-fasen som PRD-en tar stilling til

| Punkt (`.logs/simon-friedl/issues.md`) | Hvor i PRD-en |
|---|---|
| Fallback når `egnet_darlig_vaer` er `null` | Begrepet Egnet i dårlig vær (ukjent ≠ nei) og FR-16 |
| Grense for «lavtliggende tur» | §3 Lavtliggende tur (400 moh) |
| Endelige værterskler | §4.2 og spørsmål 1 |
| Når MET ikke svarer | FR-13 |
| Ett Værpunkt eller ett per Tur | §3 Værpunkt (400 moh) og spørsmål 4 |
| Lisensrisiko for morotur.no | §6 Rammer og risiko |
| Startkoordinater og lengdesemantikk | FR-26, FR-27 og spørsmål 2 og 5 |
