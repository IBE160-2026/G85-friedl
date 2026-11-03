# Addendum: PRD Turplanlegger

Teknisk detalj og bakgrunn til [prd.md](prd.md), til bruk i arkitektur og stories. Kravene står i PRD-en; her står hvordan de kan løses og hvorfor tallene er valgt.

## Værintegrasjon (FR-7, NFR-4)

- **Mellomtjeneste:** Nettleseren kan ikke sette `User-Agent`, så værkallene går via appens egen server. Den eier cachen og er det eneste stedet som kaller MET.
- **User-Agent:** appnavn pluss kontakt, f.eks. repo-URL eller e-post. Mangler den, svarer MET 403; forfalsket kan gi permanent blokkering.
- **Caching:** Svar lagres per (avrundet koordinat, høyde). `Expires` bestemmer levetiden, og `If-Modified-Since` brukes ved fornyelse (MET svarer 304 når ingenting er endret). Ingen fast TTL.
- **Koordinater:** maks fire desimaler. Send `altitude=400` for Værpunktet (PRD §3); da blir temperaturen mer presis.
- **Felt (compact-formatet):** `air_temperature` og `wind_speed` under `instant.details`, `precipitation_amount` og `symbol_code` under `next_1_hours`.
- **Horisont:** timesoppløsning de første ca. 60 timene, som dekker hele «i dag» og «i morgen».
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

Regnet ut 2026-11-02 fra `data/turer-moldemarka.json`. Lengde og høydemeter ble avklart 2026-11-03 uten at tallene endret seg (PRD §10, spørsmål 2 og 3). Datasettet kan likevel endres senere, så testene bør bruke et eget, fast testdatasett.

| Tur | Vanskelighetsgrad | Turtid | Høyeste punkt | Lavtliggende |
|---|---|---|---|---|
| Storlihytta fra Vardeveien | Enkel | 19 min | 301 moh | ja |
| Bergsvatnet | Enkel | 43 min | 281 moh | ja |
| Skihytta fra Damefallet | Enkel | 54 min | 391 moh | ja |
| Storlihytta fra Romsdalsmuseet | Enkel | 1 t 2 min | 270 moh | ja |
| Midtveishuken rundt Øverlandsvatnet | Enkel | 1 t 5 min | 266 moh | ja |
| Tusenårsvarden fra Damefallet | Middels | 1 t 32 min | 527 moh | nei |
| Moldevatnet fra Jensgurilia | Middels | 1 t 33 min | 340 moh | ja |
| Tusenårsvarden rundtur om Moldedalen | Krevende | 2 t 10 min | 527 moh | nei |
| Tusenårsvarden fra Grua | Middels | 2 t 16 min | 524 moh | nei |
| Varden via Den grønne korridor | Middels | 2 t 26 min | 407 moh | nei |
| Frænavarden fra Grua | Krevende | 2 t 47 min | 584 moh | nei |
| Tusten fra Tusten skisenter | Middels | 2 t 48 min | 705 moh | nei |

Ved 1 t Tilgjengelig tid passer altså tre Turer, og ved 3 t passer alle.

## Kart (FR-23–FR-25, FR-28)

- **Kartbibliotek og bakgrunnskart** velges i arkitekturen. Kravene er: ingen nøkkel, støtte for berøring og synlig kreditering. Aktuelle kandidater er Leaflet med Kartverkets åpne topografiske kart eller OpenStreetMap. Vilkårene for kartflisene må sjekkes før valget.
- **Rutegeometri:** GML (EPSG:25833) konverteres til GeoJSON (WGS84) med ett objekt per Rutesegment, nøklet på rutenummer. Turene viser til rutenumrene.
- **Omtrentlig rute:** Målt 2026-11-02 er Rutesegmentene for Storlihytta fra Vardeveien 4,55 km (turen er 0,53 km én vei), for Bergsvatnet 5,87 km (1,57 km), og for turene fra Damefallet omtrent 1,7 ganger turlengden. Detaljer står i briefens addendum.

## Solnedgang og soloppgang (FR-21)

Beregnes lokalt med en standard algoritme for solposisjon (f.eks. NOAA-formlene eller et lite bibliotek som SunCalc) for et fast punkt i Moldemarka og Turdagen. Ingen nettverkskall, så funksjonen kan testes med faste datoer.

## Språkmodell (FR-22)

- Leverandør og modell velges i arkitekturen. Nøkkelen ligger i `.env` (NFR-7).
- **Inndata:** Regelteksten og fakta om Turen, ingenting om brukeren.
- **Instruks:** én til to setninger på bokmål, uten nye fakta.
- **Kontroll:** Alle tall fra Regelteksten må finnes i svaret; ellers vises Regelteksten.
- **Kostnad:** maks ett kall per Turforslag (tre per Søk), og bare når nøkkelen er satt.
- **Test:** En mock-modus gir deterministiske svar, så testene virker uten nøkkel.

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
