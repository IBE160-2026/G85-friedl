# Digest — MET Locationforecast API (round 1, inline, straightforward)

Spørsmål: terskler for nedbør/vind, caching/polling, User-Agent/lisens, tidsoppløsning/horisont, rutenett-nøyaktighet.

## Funn

1. **Forecast-horisont**: "This service delivers weather forecasts for any given coordinate for the next nine days" — 9 dager fremover.
   - Source: api.met.no/weatherapi/locationforecast/2.0/documentation, MET Norway, udatert (offisiell API-doc), hentet 2026-10-29. class=technical-spec, confidence=high.

2. **Tidsoppløsning**: "Short range (1 hour steps)" de første ~60 timene, deretter "Medium range (6 hour steps)" for 2–10 dager. `next_1_hours`/`next_6_hours`/`next_12_hours` angir aggregeringsvindu for precipitation_amount/probability_of_precipitation; wind_speed er en "instant variable" (punkttidspunkt, ikke aggregert).
   - Source: docs.api.met.no/doc/locationforecast/datamodel.html, MET Norway, hentet 2026-10-29. class=technical-spec, confidence=medium (hentet via fetch-verktøyets sammendrag av siden, ikke rå-HTML; ingen andre feltnavn i konflikt).

3. **Caching/polling**: Må lagre respons med `Expires`/`Last-Modified`, bruke `If-Modified-Since` for betinget forespørsel (→ 304 Not Modified ved uendret data), ikke polle oftere enn `Expires` tillater ("Do not send a new request every time the GPS position changes by a meter!"). Ingen eksakt numerisk rate-limit oppgitt — håndteres via riktig caching; for mye trafikk uten caching → 429. Koordinat-presisjon: maks 4 desimaler (ellers risiko for blokkering, pga. cache-effektivitet). HTTP (ukryptert) kan bli throttlet/blokkert — bruk HTTPS.
   - Source: api.met.no/doc/locationforecast/HowTO, MET Norway, hentet 2026-10-29. class=technical-spec/policy, confidence=high.

4. **User-Agent-krav**: Obligatorisk, identifiserende User-Agent (app/sidenavn + kontaktinfo: GitHub-URL, e-post, nettsted, eller app-navn). Mangler/generisk → 403 Forbidden. Eksplisitt advarsel: "Do not fake this or you are likely to be permanently blacklisted!"
   - Source: samme som (3), confidence=high.

5. **Lisens**: Data er dobbeltlisensiert under **NLOD 2.0** (Norwegian Licence for Open Government Data) og **CC BY 4.0 International**. Kreditering: "Credit should be given to The Norwegian Meteorological Institute, shortened MET Norway, as the source of data." Forslåtte formuleringer: «Data from MET Norway» / «Based on data from MET Norway», lenke til kildenedlasting anbefalt.
   - Source: api.met.no/doc/License, MET Norway, hentet 2026-10-29. class=legal/licensing, confidence=high.

6. **Høyde/nøyaktighet**: Dokumentasjonen anbefaler å oppgi høyde (altitude) i forespørselen for presise temperaturverdier, ellers bruker modellen sin egen topografimodell (kan gi avvik i bratt terreng som Moldemarka). Eksakt horisontal rutenett-oppløsning (f.eks. MEPS-modellens kilometer-oppløsning) ble **ikke bekreftet** i denne runden — swagger/datamodel-siden med konkret tall ble ikke hentet.
   - Source: api.met.no/weatherapi/locationforecast/2.0/documentation, confidence=medium; åpent punkt for eksakt rutenett-tall.

7. **Vind-terskler, offisielt farevarsel ("vind over land")**: Region- og sesongavhengig tabell basert på vindkast, ikke middelvind. Vinter, kysten Lindesnes–Grense Jakobselv: gult 33 m/s, oransje 38 m/s, rødt 45 m/s. Vinter, indre strøk Østafjells: gult 19 m/s, oransje 23 m/s, rødt 27 m/s (lavere sommerterskler også oppgitt). Møre-kysten sin spesifikke kategori/sone ble **ikke bekreftet** i denne runden.
   - Source: met.no/vaer-og-klima/.../vind-over-land, MET Norway, hentet 2026-10-29. class=policy/hazard-threshold, confidence=high (for de oppgitte tallene), men confidence=low for hvilken sone Molde faller i.

8. **Nedbør-terskler, offisielt farevarsel**: "Styrtregn" (kortvarig konvektiv nedbør): gult >20 mm/t, oransje >35 mm/t. Lengre varighet (6/12/24t) er statistisk basert (gult/oransje/rødt ≈ 5/10/50-års returverdier) og vises grafisk per region på fastlandet — eksakte mm-tall for fastlandet (inkl. Molde) ble **ikke funnet som tekst**, bare for Longyearbyen.
   - Source: met.no/.../styrtregn og met.no/.../farevarsel-for-nedbor, MET Norway, hentet 2026-10-29. class=policy/hazard-threshold, confidence=high (styrtregn-tall), confidence=low/unverified (fastlands-mm-tall for lengre varighet).

9. **Alternativ, "dagligdags" nedbørs-intensitetsskala** (svak 0,1–1 / lett 1–4 / moderat 4–10 / kraftig 10–30 / ekstremt >30 mm/t): kun funnet via søkemotorens sammenstilling, **ikke bekreftet direkte på en primærkilde** i denne runden. class=technical-spec, confidence=unverified — bør IKKE brukes i PRD uten egen bekreftelse.

10. **Vind, Beaufort/dagligdags skala**: "Kuling" (ikke identisk med "sterk vind") har tre grader: liten kuling 10,8–13,8 m/s, stiv kuling 13,9–17,1 m/s, sterk kuling 17,2–20,7 m/s. Et eksplisitt, offisielt "sterk vind"-begrep med eget tallintervall ble ikke funnet — det brukes trolig som dagligtale, ikke en formell klasse.
   - Source: hjelp.yr.no (Vindpiler og Beaufortskalaen, via søk — selve siden ga 403 på direkte fetch, så dette er søkemotorens sammenstilling av yr.no sitt innhold), confidence=medium (konsistent med Beaufort-skalaens kjente struktur, men ikke direkte sitert fra rå-HTML).

## Leads ikke fulgt opp (ville vært neste runde)
- Eksakt MEPS-grid-oppløsning (km) for Locationforecast i Moldemarka.
- Fastlands-mm-tall for farevarsel-nedbør ved 6/12/24t.
- Hvilken vindsone/kategori Molde/Møre kyst tilhører i farevarsel-tabellen.
- Primærkilde-bekreftelse av radar-nedbørsintensitetsskalaen (punkt 9).

## Ikke funnet
- Et eksplisitt, nummerert "sterk vind"-begrep i offisiell MET-terminologi.
- Eksplisitt lisenstekst for morotur.no (dekket i egen notis, ikke del av denne MET-spesifikke recon-en).
