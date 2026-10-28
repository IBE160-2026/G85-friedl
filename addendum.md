# Addendum: Turplanlegger (arbeidstittel)

Utfyllende teknisk detalj til [brief.md](brief.md), til bruk i senere PRD-/arkitekturarbeid.

## Eksempel på dataobjekter

### Tur (fra Turrutebasen)

- ID
- Navn
- Lengde (km)
- Vanskelighetsgrad
- Høydemeter
- Startpunkt (koordinater)
- Område/fylke
- Type (fottur/skiløype/sykkeltur)

### Værdata (fra MET/Yr, hentet dynamisk)

- Sted/koordinater
- Dato/tidsrom
- Temperatur
- Nedbør
- Vind

### Brukerpreferanse (per søk — ikke nødvendigvis lagret i MVP)

- Tid til rådighet
- Ønsket vanskelighetsgrad
- Maks avstand/kjøretid
- Type opplevelse (utsikt, fiske, rolig, aktiv)

## Referansegrunnlag

Konseptet er utviklet i dialog med Claude, med søk som bekreftet reell datatilgang: Kartverkets åpne geodata (inkl. Turrutebasen) og MET Norway/Yr sitt gratis vær-API. UT.no (DNT/NRK) er identifisert som et eksisterende produkt i samme rom, til inspirasjon og som referansepunkt for forventet funksjonalitet.
