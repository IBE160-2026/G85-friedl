---
title: 'technical research: MET Locationforecast API for turplanlegger-app'
type: 'technical'
topic: 'MET Locationforecast API for turplanlegger-app'
decision: 'PRD-krav til værintegrasjon (terskler, caching, lisens, oppløsning, nøyaktighet)'
source: 'run'
status: complete
preset: 'quick'
validation: 'normal'
created: '2026-10-29'
updated: '2026-10-29'
---

# technical research: MET Locationforecast API for turplanlegger-app

**Decision this research serves:** PRD-krav til værintegrasjon (terskler, caching, lisens, oppløsning, nøyaktighet)

## Sammendrag

MET sin Locationforecast 2.0 gir 9 dagers prognose (1-times oppløsning første ~60t, deretter 6-timers), krever obligatorisk, identifiserende `User-Agent` (403 ved brudd, permanent svarteliste ved forfalsking) og respons-caching via `Expires`/`If-Modified-Since` — ingen hardkodet TTL, men maks 4 desimaler på koordinater og HTTPS er harde krav. Data er dobbeltlisensiert NLOD 2.0 / CC BY 4.0 med en konkret, anbefalt kredittekst.

Den viktigste konklusjonen for PRD-en: **MET sitt offisielle farevarselsystem (ekstremvarsler for vind/nedbør) er feil verktøy for en daglig turrangering** — tersklene er region/sesong-avhengige og ment for sjeldne, ekstreme hendelser (f.eks. 33–45 m/s vindkast, >20mm/t styrtregn), ikke for å skille en «fin tur-dag» fra en «mindre fin tur-dag». PRD-en bør i stedet definere egne, eksplisitt produktbestemte terskler (anbefalt forankret i den generelle Beaufort/kuling-skalaen for vind, ≥10,8 m/s), og dokumentere at disse er en produktbeslutning — ikke en gjengivelse av MET sin offisielle grense. To tekniske detaljer (eksakt rutenett-oppløsning, og hvilken farevarselsone Molde tilhører) og én skala (radar-nedbørsintensitet) kunne ikke bekreftes mot primærkilde i denne raske runden og er flagget som åpne punkter.

## MET Locationforecast API: terskler, caching, lisens, oppløsning, nøyaktighet

### Forecast-horisont og tidsoppløsning

Locationforecast 2.0 leverer prognoser **9 dager fremover** for et gitt koordinat [1]. Tidsoppløsningen er ikke fast: de første ca. 60 timene kommer verdiene i **1-times steg** ("short range"), deretter i **6-times steg** for resten av 10-dagersperioden ("medium range") [2]. Feltene `next_1_hours`, `next_6_hours` og `next_12_hours` angir *hvilket tidsvindu* en verdi gjelder for — `precipitation_amount` og `probability_of_precipitation` rapporteres som sum/sannsynlighet over det vinduet, mens `wind_speed` er en punkt-/øyeblikksverdi, ikke et aggregat [2] (medium confidence — hentet via dokumentverktøyets tolkning av datamodell-siden, ikke verifisert mot en andre kilde).

**Konsekvens for PRD:** en app som viser "i dag" eller "de neste timene" kan bruke 1-timers data direkte; et flerdagers utsiktspunkt må forholde seg til 6-timers blokker og bør ikke late som det har finere oppløsning enn det.

### Caching, polling og rate-begrensning

MET krever at klienter **cacher responsen lokalt** og respekterer `Expires`-headeren, og bruker `If-Modified-Since` for betingede forespørsler (serveren svarer `304 Not Modified` når data ikke er endret) [3]. Det finnes ikke et eksplisitt numerisk kall-tak i dokumentasjonen — i stedet advares det direkte mot unødvendige kall ("Do not send a new request every time the GPS position changes by a meter!") [3], og for mye trafikk uten caching kan gi `429`. To konkrete, lett-å-implementere regler: **koordinater skal rundes til maks 4 desimaler** (ellers risiko for blokkering av cache-effektivitetshensyn) og trafikk skal gå over **HTTPS**, ikke HTTP [3]. Addendum-notatet om "maks 4 desimaler" i brief-dokumentasjonen stemmer altså med kilden.

**Konsekvens for PRD:** backend-proxyen bør implementere en enkel cache nøkkel på (avrundet koordinat, høyde) og la MET sin `Expires`-header styre TTL, ikke en hardkodet verdi — dette er «slik MET anbefaler», konkretisert.

### User-Agent og lisens

En identifiserende `User-Agent`-header er **obligatorisk** — appnavn pluss kontaktinfo (GitHub-URL, e-post eller nettsted). Mangler den, eller er den generisk, svarer API-et `403 Forbidden`; MET advarer eksplisitt mot å forfalske headeren: "Do not fake this or you are likely to be permanently blacklisted!" [3]. Data er dobbeltlisensiert under **Norwegian Licence for Open Government Data (NLOD) 2.0** og **Creative Commons 4.0 BY International** [4] — det bekrefter brief/addendum sin CC BY 4.0-referanse, men den formelt primære lisensen for norske offentlige data er NLOD 2.0, med CC BY 4.0 som det internasjonalt gjenkjennelige alternativet. Anbefalt kreditering: «Data from MET Norway» eller «Based on data from MET Norway», med lenke til datakilden [4].

**Konsekvens for PRD:** sett User-Agent til noe stabilt og eierskaps-identifiserende (f.eks. repo-URL + kontakt-e-post) fra dag én i backend-proxyen, og legg attribusjonsteksten i footer/om-siden.

### Nøyaktighet for koordinater i Moldemarka

Dokumentasjonen anbefaler å sende **høyde (altitude)** sammen med koordinatet for presise temperaturverdier — uten det bruker modellen sin egen topografimodell, som kan avvike i bratt terreng [1]. Den eksakte horisontale rutenett-oppløsningen til den underliggende værmodellen (typisk en kilometerskala-figur for MEPS) ble **ikke bekreftet** i denne research-runden — swagger-spesifikasjonen/datamodell-siden med det konkrete tallet ble ikke hentet. Dette er et åpent punkt.

### Terskler for "kraftig nedbør" og "sterk vind"

Her fant denne research-runden **to forskjellige systemer**, og ingen av dem er en direkte nøkkelferdig "er dette en god dag for tur"-terskel:

1. **MET sitt offisielle farevarselsystem** (ekstremvarsler) er region- og sesongavhengig og bygger på **vindkast**, ikke middelvind, for vind [5]. Eksempel, vinter: kysten Lindesnes–Grense Jakobselv har gult/oransje/rødt ved 33/38/45 m/s vindkast, mens indre strøk Østafjells ligger på 19/23/27 m/s [5]. For nedbør er "styrtregn" (kortvarig, konvektiv) definert med gult >20 mm/t og oransje >35 mm/t i én times varighet [6]; lengre varigheter (6/12/24t) er statistisk basert (gult/oransje/rødt ≈ 5-/10-/50-års returverdier) og oppgis bare grafisk per region på fastlandet — **ikke** som flate mm-tall i teksten [7]. Hvilken sone/kategori Møre-kysten/Molde konkret tilhører ble ikke bekreftet. **Disse tersklene er for ekte farevarsler — sjeldne, ekstreme hendelser — og vil nesten aldri utløses i en vanlig turplanleggings-kontekst.** De er feil verktøy for en daglig rangeringsalgoritme.
2. **Dagligdagse klasser** er mer relevante for "bør denne turen rangeres lavere i dag": Yr/MET sin Beaufort-baserte "kuling"-skala setter liten kuling ved 10,8 m/s, stiv kuling 13,9 m/s, sterk kuling 17,2 m/s [8] (medium confidence — siden selv gav 403 på direkte henting, dette er indirekte bekreftet via søk). Et formelt "sterk vind"-begrep med eget tall ble ikke funnet; det er trolig dagligtale. En radar-basert nedbørsintensitetsskala (svak/lett/moderat/kraftig/ekstremt, grovt 0,1–1/1–4/4–10/10–30/>30 mm/t) dukket opp i søk, men **kunne ikke bekreftes mot en primærkilde** i denne runden — **bruk den ikke i PRD-en uten egen bekreftelse**.

**Konsekvens for PRD:** anbefaling er å la rangeringsalgoritmen bruke egendefinerte, dokumenterte terskler (f.eks. "kuling" ved ≥10,8 m/s og en selvvalgt mm/t-grense som eksplisitt merkes som produktbeslutning, ikke MET-standard) — og eksplisitt beskrive i PRD-en at dette er en produktbeslutning inspirert av, men ikke identisk med, MET sine offisielle farevarselterskler. Å late som tallene er "MET sin offisielle grense" ville vært feil.

## Kildetabell

| # | Kilde | Utgiver | Dato hentet | Bruk |
|---|---|---|---|---|
| 1 | api.met.no/weatherapi/locationforecast/2.0/documentation | MET Norway | 2026-10-29 | Horisont, høyde/nøyaktighet |
| 2 | docs.api.met.no/doc/locationforecast/datamodel.html | MET Norway | 2026-10-29 | Tidsoppløsning, next_X_hours |
| 3 | api.met.no/doc/locationforecast/HowTO | MET Norway | 2026-10-29 | Caching, User-Agent, koordinat-presisjon |
| 4 | api.met.no/doc/License | MET Norway | 2026-10-29 | Lisens (NLOD 2.0 / CC BY 4.0) |
| 5 | met.no/.../vind-over-land | MET Norway | 2026-10-29 | Offisielle vind-farevarselterskler |
| 6 | met.no/.../styrtregn | MET Norway | 2026-10-29 | Styrtregn-terskler (mm/t) |
| 7 | met.no/.../farevarsel-for-nedbor | MET Norway | 2026-10-29 | Lengre-varighet nedbør, returverdier |
| 8 | hjelp.yr.no, "Vindpiler og Beaufortskalaen" (via søk) | Yr/MET Norway | 2026-10-29 | Kuling-skala (indirekte bekreftet) |

## Åpne punkter / staleness

- **Ubekreftet**: eksakt horisontal rutenett-oppløsning for Moldemarka-området (sjekk swagger/datamodel direkte).
- **Ubekreftet**: hvilken vind-farevarselsone Møre-kysten/Molde tilhører, og fastlands-mm-tall for 6/12/24t nedbør-farevarsel.
- **Ubekreftet, ikke bruk uten bekreftelse**: radar-nedbørsintensitetsskalaen (svak/lett/moderat/kraftig/ekstremt mm/t) — kun fra søkemotor-sammenstilling, ingen primærkilde funnet denne runden.
- Terskler for farevarsel endres av og til (sesongmessige/regionale justeringer) — hvis PRD-en siterer de konkrete m/s- eller mm-tallene direkte, bør de bekreftes på nytt før implementasjon, ikke bare ved PRD-skriving.
