# Input-avstemming — PRD Turplanlegger

Kjørt 2026-11-02, inline (uten subagenter), mot prd.md og addendum.md.

| Input | Funn | Håndtering |
|---|---|---|
| brief.md (final) | Alle fem kjernefunksjoner, rangeringsreglene, «når ingen tur passer» og alle suksesskriterier har motstykke i FR/NFR/SM. «Utsiktsturer lavere» i dårlig vær er tolket som at utsikt ikke teller (FR-16). «Enklere tur» er erstattet med korteste Tur (FR-18). | Begge tolkningene er godkjent av brukeren. |
| Briefens addendum | Datafeltene og segmentmålingene er brukt i §3, FR-26 og addendum (Kart). Feltet `historie` er ikke brukt. | `historie` står under Utenfor MVP (§8.2). |
| tilbakemelding-product-brief.md (faglærer) | Regelbasert valg, språkmodell bare til begrunnelse, testbare kriterier, kjørbar uten nøkler og mock-modus er dekket (FR-16, FR-22, NFR-2, NFR-3). Faglærer nevner «avstand» og «kjøretid» i rangeringen. | Bevisst utelatt: reisetid er utenfor MVP (§8.2), og Tilgjengelig tid gjelder bare turen (§3). |
| MET-researchen | User-Agent, caching, HTTPS, fire desimaler, lisens og Beaufort-grenser er dekket (NFR-4, addendum). Rutenettets oppløsning er ikke bekreftet. | Spørsmål 8 i §10. |
| data/turer-moldemarka.json | Turtid, inndelingen i lavtliggende turer og rangeringseksemplene i UJ-1, UJ-2, FR-16 og FR-18 er regnet ut på nytt fra datasettet og stemmer. Startkoordinater mangler, og lengden for tur–retur er tvetydig. | FR-26, FR-27, spørsmål 2, 3 og 5. |

Ingen krav eller kvalitative ønsker (tone, enkelhet) fra inputene har falt ut.
