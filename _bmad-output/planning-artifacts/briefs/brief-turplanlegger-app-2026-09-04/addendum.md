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
