# Addendum: Turplanlegger (arbeidstittel)

Utfyllende teknisk detalj til [brief.md](brief.md), til bruk i senere PRD-/arkitekturarbeid. Oppdatert 2026-10-29 etter gjennomgang av Turrutebasen for Molde.

## Eksempel på dataobjekter

### Tur (kuratert datasett, `data/turer-moldemarka.json`)

- ID
- Navn
- Startpunkt (navn)
- Retning (en vei, tur-retur eller rundtur)
- Lengde totalt (km)
- Høydemeter
- Høyeste punkt (moh)
- Vanskelighetsgrad (Enkel, Middels, Krevende — samme koder som Turrutebasen)
- Utsikt (ja/nei)
- Vann (ja/nei)
- Egnet i dårlig vær (ja/nei, der kilden sier noe om det)
- Segmenter i Turrutebasen (rutenummer, kobler turen til kartgeometrien)
- Kilde og merknad

### Rutesegment (fra Turrutebasen)

- Rutenavn og rutenummer
- Geometri (linje, konverteres fra EPSG:25833 til WGS84)
- Merking og vedlikeholdsansvarlig
- Vanskelighetsgrad (finnes sjelden)

### Værdata (fra MET Locationforecast, hentet dynamisk)

- Sted/koordinater (maks 4 desimaler)
- Tidspunkt (timesvarsel)
- Temperatur
- Nedbør (mm/t)
- Vind (m/s)
- Værsymbol

### Brukerpreferanse (per søk — ikke lagret i MVP)

- Tid til rådighet
- Ønsket vanskelighetsgrad
- Type opplevelse (utsikt, vann)
- Tidspunkt for turen (nå eller senere i dag)

## Plassering i repoet

| Hva | Hvor |
| --- | --- |
| Product brief og addendum | `_bmad-output/planning-artifacts/briefs/brief-turplanlegger-app-2026-09-04/` |
| Kuratert turdata | `data/turer-moldemarka.json` og `.csv` |
| Rådata fra Geonorge | `data/raw/` |
| Konverteringsskript (GML → GeoJSON) | `scripts/` (kommer) |
| Konvertert rutegeometri | `data/` som GeoJSON (kommer) |
| Hemmeligheter, f.eks. eventuell språkmodell-nøkkel | `.env`, som ikke committes (`.env.example` committes) |

## Referansegrunnlag

Konseptet er utviklet i dialog med Claude. Datatilgangen er bekreftet ved å laste ned Turrutebasen for Molde og lese produktspesifikasjonen, MET sin dokumentasjon (Getting Started, FAQ og Writing browser clients) og turbeskrivelser på morotur.no. UT.no (DNT/NRK) er et eksisterende produkt i samme rom, til inspirasjon og som referansepunkt for forventet funksjonalitet.

## Research-funn før PRD (2026-10-29)

Kjørt som forberedelse til PRD-arbeidet; se `.logs/` for sesjonskontekst.

### MET Locationforecast — konkrete krav (teknisk research-rapport)

Full rapport med kildesitater: `_bmad-output/planning-artifacts/research/technical-met-locationforecast-api-for-turplanlegg-2026-10-29/research.md`. Kort versjon:

- 9 dagers prognose, 1-times oppløsning første ~60t, deretter 6-timers.
- Caching via `Expires`/`If-Modified-Since`, ikke en fast TTL. Maks 4 desimaler på koordinater, HTTPS kreves.
- `User-Agent` er obligatorisk og må identifisere appen (kontaktinfo) — mangler/forfalsket gir 403/permanent blokkering.
- Lisens: NLOD 2.0 og CC BY 4.0, kreditering «Data from MET Norway».
- **Viktig for rangeringsalgoritmen:** MET sitt offisielle farevarselsystem (ekstremvarsler for vind/nedbør) er *ikke* egnet som terskel for en daglig "er dette en god tur-dag"-vurdering — det er laget for sjeldne, ekstreme hendelser (eks. 33–45 m/s vindkast, >20 mm/t styrtregn), region- og sesongavhengig. PRD-en bør definere egne, eksplisitt produktbestemte terskler (forslag: Beaufort/kuling-skala, ≥10,8 m/s for vind) og være tydelig på at dette er en produktbeslutning, ikke en MET-standard.
- Åpne punkter (ikke bekreftet): eksakt rutenett-oppløsning for Moldemarka, hvilken farevarselsone Molde tilhører, og en radar-nedbørsintensitetsskala som dukket opp i søk men ikke kunne spores til en primærkilde — bruk ikke sistnevnte i PRD uten egen bekreftelse.

### Lisens/bruksrett for morotur.no-data

morotur.no eies og driftes av Møre og Romsdal fylkeskommune; turbeskrivelsene er registrert av frivillige og godkjent av kommune/friluftsråd/fylke. **Siden har ingen publisert lisens, vilkår eller erklæring om gjenbruk av data** (ingen CC-lisens, ingen API-vilkår, ingen database-gjenbruksregler funnet). Eneste kontaktpunkt for spørsmål om datagjenbruk som ble funnet: Petter Jenset, petter.jenset@mrfylke.no (fylkeskommunen).

11 av 12 kurerte turer i `data/turer-moldemarka.json` har morotur.no som kilde. Det kurerte datasettet henter **fakta** (lengde, høydemeter, vanskelighetsgrad) fra beskrivelsene, ikke kildens originaltekst ordrett — det reduserer opphavsrettsrisiko (fakta er ikke opphavsrettslig vernet på samme måte som formulering), men det finnes ingen formell tillatelse. For et studentprosjekt (IBE160) er risikoen sannsynligvis lav, men dette bør nevnes som en kjent, ubekreftet risiko i PRD-en, med attribusjon til morotur.no/Møre og Romsdal fylkeskommune som avbøtende tiltak. Vurder å kontakte Petter Jenset dersom prosjektet går videre forbi MVP/skole-kontekst.

### Datakvalitet: «egnet i dårlig vær»

Per 2026-10-29 har kun 3 av 12 kurerte turer en verdi i `egnet_darlig_vaer` (1 `true`: Moldevatnet fra Jensgurilia; 2 `false`: Tusenårsvarden fra Damefallet og Tusenårsvarden om Moldedalen — begge pga. kildens eksplisitte «glatt i vått vær»/«glatt etter mye regn»). De resterende 9 har `null` (ukjent), ikke et reelt "nei". Et av briefens suksesskriterier sier at turer «egnet i dårlig vær» skal rangeres høyere — med denne dekningen må PRD-en definere en eksplisitt fallback-regel for `null` (anbefalt: behandle `null` som neutral, ikke straffet), ellers er kriteriet i praksis bare testbart for 3 av 12 turer.
