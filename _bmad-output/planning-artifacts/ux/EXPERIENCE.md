---
name: Turplanlegger – Kortstokken
description: Struktur, atferd, tilstander, mikrotekst og tilgjengelighet for Turplanlegger i konseptet Kortstokken.
status: final
created: 2026-11-10
updated: 2026-11-12
sources:
  - ../prds/prd-turplanlegger-app-2026-11-02/prd.md
  - ../prds/prd-turplanlegger-app-2026-11-02/addendum.md
  - ../architecture/architecture-turplanlegger-app-2026-11-12/ARCHITECTURE-SPINE.md
  - ./konsept-brief.md
  - ./konsept-07-kortstokken/
---

# Turplanlegger – EXPERIENCE.md (Kortstokken)

Dette dokumentet beskriver hvordan appen virker: struktur, atferd, tilstander, mikrotekst og tilgjengelighet. Utseendet står i [DESIGN.md](DESIGN.md), og tokens refereres med navnet i krøllparentes, for eksempel `{colors.forest}`. Begrepene fra PRD §3 brukes ordrett. Skissene i [konsept-07-kortstokken/](konsept-07-kortstokken/) viser komposisjonen, og [konsept.json](konsept-07-kortstokken/konsept.json) har én setning per skjerm under `skjermer`. Ved konflikt mellom dette dokumentet og en skisse gjelder dokumentet. Kjente avvik står i egen seksjon.

## Foundation

- **Form:** én responsiv nettside, 360–1440 px (NFR-1). Mobil er primærflaten, fordi Ingrid oftest bruker mobilen rett før hun går. PC er for kvelden før.
- **UI-system:** ingen. Komponentene er egne og beskrevet i DESIGN.md. Kartet bruker Leaflet uten nøkkel (AD-15).
- **Bakgrunnskart:** Kartverkets topografiske gråtonekart, kreditert «© Kartverket» (AD-15). Det er dempet, slik at den grønne ruten alltid er det sterkeste på kartet (DESIGN.md › Colors).
- **Skrift:** Nunito Sans på alle enheter, selvhostet (AD-15). Haken og pila er SVG-ikoner, fordi skriften mangler tegnene ✓ og → (DESIGN.md › Typography).
- **Språk:** norsk bokmål (NFR-8), Europe/Oslo-tid (FR-1).
- **Personvern:** ingen kontoer, ingen posisjon, ingen lagring av Søk utover gjeldende side (NFR-6). Søket holdes bare i minnet og står ikke i URL-en. «Endre søk» bringer det tilbake med samme verdier, men ingenting overlever en omlasting.
- **Bare lys modus.** Mørk modus er ikke med i MVP.

## Information Architecture

Appen har to visninger på samme side. Det finnes ingen meny, ingen faner og ingen undersider. Logoen er ikke en lenke.

| Flate | Nås fra | Formål |
|---|---|---|
| **Søk** (startside) | Åpning av appen, «Endre søk», «Endre Tilgjengelig tid», nettleserens Tilbake fra Resultat | Forklare kort hva appen gjør, og ta imot Søket med standardverdier (FR-1–FR-6) |
| **Resultat** | «Finn tur», «Bruk …» (Bedre tidsvindu), «Prøv igjen» | Vise én av tilstandene i FR-6, alltid med Ditt søk øverst |

Resultat har fast rekkefølge ovenfra. Tilstandene som utelater en del, står i State Patterns.

| # | PC (fra 1200 px) | Mobil og nettbrett |
|---|---|---|
| 1 | Demomodus-merke (pille i toppfeltet) | Demomodus-merke (felt under toppfeltet) |
| 2 | Ditt søk (panel) | Ditt søk (én linje, «Endre søk» i toppfeltet) |
| 3 | Værsammendrag, Værvarsling eller Værmangel-linje | Værsammendrag, Værvarsling eller Værmangel-linje |
| 4 | Overskrift | Overskrift |
| 5 | Kart i full bredde, med Kartinfoboks | Stokken med Stokknavigasjon, eller et meldingskort |
| 6 | Turkortene side om side, eller et meldingskort | Kart, med Kartinfoboks over |
| 7 | – | Stokkoversikt («Alle tre i stokken») |
| 8 | Ansvarsmerknad | Ansvarsmerknad |
| 9 | Kreditering | Kreditering |

Meldingskort er Frarådet-kort, Alternativkort og Kontaktfeil-kort.

## Voice and Tone

Appen sier hva den har regnet ut og hvorfor, og den gir aldri garantier.

| Gjør | Ikke gjør |
|---|---|
| «Tre Turforslag som passer nå» | «Vi har funnet de perfekte turene for deg!» |
| «1 t 32 min av 2 t · gangtid, uten pauser» | «Ca. 1,5 t» eller Turtid uten «uten pauser» |
| «Værklasse frarådet» og «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).» | «Feil», «Oops», «Ingen resultater» |
| «Frarådet går foran tid og ønsker.» | En tom side eller en feilmelding (FR-12, FR-18) |
| «Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.» | «Noe gikk galt» |
| «Du har selv ansvaret for å vurdere forholdene.» | «Trygg», «trygt», «sikker tur» (PRD §6) |
| Klokkeslett 13:30, desimalkomma 5,0 km, «1 t 2 min» | 1:30 PM, 5.0 km, «62 min» |
| Begrepene fra PRD §3 i etiketter og overskrifter | Synonymer som «tidsrom», «nivå», «anbefaling» |

**Unntak for radetikettene.** Kriterieradene har de korte etikettene Tid, Vær, Ønsker og Mørke, slik at de får plass ved 360 px. Det tilgjengelige navnet bruker PRD-begrepene: «Turtid», «Værklasse», «Opplevelsespreferanser» og «Mørkevarsel».

### Faste tekster

| Sted | Tekst |
|---|---|
| Søk, overskrift og ingress | «Hvor lenge vil du gå?» og «Si når du vil gå og hvor lang tid du har. Vi veier værmeldingen og foreslår opptil tre turer i Moldemarka som passer, og forteller hvorfor.» |
| Hjelpetekst, Starttidspunkt | «Hele kvarter, 06:00–22:00.» |
| Hjelpetekst, Tilgjengelig tid | «Tid til selve turen, uten reise til og fra Startpunktet.» |
| Hjelpetekst, Vanskelighetsgrad | «høyeste du vil gå» |
| Hjelpetekst, Opplevelsespreferanser | «valgfritt, velg gjerne flere» |
| Søk-kartet (PC) | «12 Turer fra 8 Startpunkter» (tallene følger Turdatasettet) |
| Ansvarsmerknad (FR-17) | «Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke føre (snø, is, gjørme). Følg MET sine farevarsler.» |
| Høydemerknad (FR-10) | «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.» |
| Under Alternativkortet | «Med {korteste Turtid rundet opp til kvarter} eller mer passer minst én Tur.» (UJ-3: «Med 30 min eller mer …») |
| Tips ved Mørkevarsel (FR-21) | «Lurt å ta med hodelykt.» |
| Antallslinje ved Bedre tidsvindu (FR-19) | «{N} Turer passer før mørket.» Én Tur: «1 Tur passer før mørket.» Ingen: «Ingen Tur passer før mørket.» (UJ-2: «5 Turer passer før mørket.») |
| Kreditering (FR-29) | «Værdata: Data fra MET Norway · Turstier: Turrutebasen, Kartverket · Turer: morotur.no og Fjord Norway · Bakgrunnskart: © Kartverket». «Data fra MET Norway» og «© Kartverket» er lenker som åpner i ny fane. |
| Bunntekst (PC) | «Turplanlegger er en prototype for Moldemarka.» |

Disse tekstene i skissene er bare merknader og skal ikke bygges: «skjermkant 844», «Tommelsonen: …», «Sveip kortet til siden, eller bruk pilene …», «Kort 1 er valgt og uthevet på kartet …», «Kortene med Turforslag legges ut her …» og «Kart og liste».

## Component Patterns

Her står hvordan komponentene oppfører seg. Utseendet står i DESIGN.md › Components, under samme navn. Kolonnen Token viser nøkkelen under `components` i DESIGN.md.

| Komponent | Token | Bruk | Regler for atferd |
|---|---|---|---|
| Skjemakort | – | Søk | Har feltene i FR-1–FR-5 og «Finn tur». Alle felt har standardverdier. |
| Segmentvelger | `segmentvelger` | Turdag, Vanskelighetsgrad | Ett valg. Etter 22:00 er «I dag» låst med hjelpeteksten «Etter kl. 22 kan du bare velge i morgen.» (FR-1). Velges «I morgen», settes Starttidspunkt til 10:00. Velges «I dag» igjen, settes det til nå, rundet opp til neste kvarter (FR-2). |
| Trinnvelger | `trinnvelger` | Starttidspunkt, Tilgjengelig tid | − og + endrer med 15 min. Starttidspunkt går fra 06:00 til 22:00, og tider som har passert, er låst (FR-2). Tilgjengelig tid går fra 15 min til 5 t (FR-3). Verdien i midten er en vanlig `<select>` med alle gyldige verdier, så Ingrid slipper mange trykk. På mobil åpner den telefonens egen velger. |
| Preferansebrikke | `preferansebrikke` | utsikt, vann | Av/på hver for seg. Ingen valgt er gyldig (FR-5). |
| «Finn tur» | `knapp-primaer` | Søk | Ett trykk sender Søket (FR-6). Knappen er aldri låst, fordi alle felt har standardverdier. Et passert Starttidspunkt rundes opp før sending (se State Patterns). |
| Ditt søk | `ditt-sok` | Resultat | Viser Søket som Resultat gjelder for: Turdag, Starttidspunkt, Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser. På PC står «ingen» når ingen Opplevelsespreferanse er valgt. På mobil utelates da det leddet. Ikke interaktivt bortsett fra «Endre søk». |
| «Endre søk» | `knapp-sekundaer` | Resultat | Går tilbake til Søk med verdiene fra forrige Søk. |
| Værsammendrag | `vaersammendrag` | Resultat | Vises ved god og middels Værklasse (FR-10), i formatet under Værord. Middels vises med ord, men endrer ingenting (§4.2). Høydemerknaden står under, også på mobil. |
| Værsymbol | `vaersymbol` | Værsammendrag, Værvarsling | Ikon og ord for symbolkoden (se Værsymbol). Ikonet har tomt alt, fordi ordet står ved siden av. |
| Værmangel-linje | `vaermangel-linje` | Resultat | Står der Værsammendraget ellers står, når Værmeldingen mangler (FR-13). Ikke interaktiv. |
| Værvarsling | `vaervarsling` | Resultat, Værklasse dårlig | Står over Turkortene eller Alternativkortet med verdiene som utløste den (FR-11), og har Bedre tidsvindu-boksen. |
| Bedre tidsvindu-boks | `bedre-tidsvindu-boks` | Værvarsling | «Bruk HH:MM» sender et nytt Søk med det nye Starttidspunktet og samme Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser (FR-19). Gjelder det i morgen, settes også Turdag. Antallslinjen under teksten sier hvor mange Turer som passer før mørket, regnet etter FR-19. Knappen vises også når antallet er null. Finnes det ikke noe Bedre tidsvindu, står teksten i State Patterns i stedet for antallslinjen og knappen. |
| Frarådet-kort | `fraradet-kort` | Resultat, Værklasse frarådet | Ikke interaktivt bortsett fra lenken «Sjekk også MET sine farevarsler.», som åpner MET i ny fane. Under DERFOR INGEN TUR står to Kriterierader (se under). |
| Bedre tidsvindu-kort | `bedre-tidsvindu-kort` | Ved Frarådet-kortet | Som Bedre tidsvindu-boksen, med samme antallslinje. «Bruk i morgen HH:MM» sender nytt Søk med Turdag og Starttidspunkt fra Bedre tidsvindu. |
| Alternativkort | `alternativkort` | Resultat, ingen Tur passer | Viser den korteste Turen innenfor valgt Vanskelighetsgrad (FR-18) med alle fire Kriterierader. Tid-raden er alltid warn. «Endre Tilgjengelig tid» går til Søk med verdiene fra Søket og fokus på Tilgjengelig tid. Kildelenken virker som på Turkortet. |
| Kontaktfeil-kort | `kontaktfeil-kort` | Resultat, ingen kontakt med appens server | «Prøv igjen» sender samme Søk på nytt. «Endre søk» går til Søk med verdiene. |
| Plassholderstokk | `plassholderstokk` | Resultat, venter på svar | Ikke interaktiv. Byttes med resultatet, eller med Kontaktfeil-kortet etter tidsgrensen. |
| Turkort | `turkort` | Resultat, ett per Turforslag (maks 3) | Rekkefølgen er rangeringen fra FR-16 og FR-17. Kort 1 er valgt fra start. På PC velger et trykk på kortet (eller «Vis på kartet») det, og kartet uthever ruten og viser Kartinfoboksen (FR-24). Et trykk på en rute eller et Startpunkt i kartet velger kortet. |
| Kriterierad | `kriterierad` | Turkort, Alternativkort, Frarådet-kort | Alltid fire på Turkort og Alternativkort, alltid i rekkefølgen Tid, Vær, Ønsker, Mørke. Reglene for ✓, ! og – står under. |
| Begrunnelse-boks | `begrunnelse-boks` | Turkort, Alternativkort | Etiketten er alltid «Begrunnelse». Teksten er Regelteksten, ordrett. Kommer Språkmodellteksten innen 5 s (FR-22), byttes teksten. Kortet kan da bli høyere, men radene endres aldri. |
| Kartutsnitt | – | Turkort og Alternativkort (mobil og nettbrett) | Statisk utsnitt av kortets egen rute. Et trykk ruller ned til Kart med kortet valgt. |
| Stokken | `stokk-kant` | Resultat, mobil og nettbrett | Ett kort synlig. Stokknavigasjon og sveip blar. Kortet som vises, er det valgte på Kart. |
| Stokknavigasjon | `stokknavigasjon` | Under Stokken | «Forrige» og «Neste tur» blar ett kort. «Forrige» er inaktiv på kort 1, og «Neste tur» er inaktiv på siste kort. Prikkene og «1 av 3» viser posisjonen. |
| Stokkoversikt | `stokkoversikt-rad` | Resultat, mobil og nettbrett | Et trykk på en rad velger kortet og ruller tilbake til Stokken. Raden viser «{Turtid} uten pauser · tilbake HH:MM» (FR-14). |
| Kart | `kart` | Søk (PC) og Resultat | Zoomer slik at alle Turforslagene synes (FR-23). Zoom og panorering med mus og berøring (FR-25). Kartet er aldri eneste kilde til informasjon. |
| Kartinfoboks | – | Kart | Viser navn, lengde totalt, Vanskelighetsgrad og Startpunkt for det valgte Turforslaget (FR-24). Ikke interaktiv. |
| «Kilde: morotur.no» | – | Turkort, Alternativkort | Åpner kilden for Turen i ny fane (FR-29). Lenketeksten følger kilden (morotur.no eller Fjord Norway). |
| Demomodus-merke | `demomodus-merke` | Alle flater i Demomodus | Ikke interaktivt. Viser Værscenario og fast «nå» (NFR-11). |
| Ansvarsmerknad | `ansvarsmerknad` | Resultat | Ikke interaktiv. Står under Turforslagene eller Alternativkortet (FR-17). |
| Fokusring | `fokusring` | Alle kontroller, kort og ruter | Vises ved tastaturfokus, på alle flater og i alle tilstander. |

### Kriterieradene: når ✓, ! og –

Radene er den visuelle formen på Regelteksten (FR-20). De viser bare regler som faktisk slo inn.

| Rad | ✓ (skoggrønn) | ! (rust) | – (nøytral) |
|---|---|---|---|
| **Tid** | Turtid ≤ Tilgjengelig tid: «1 t 32 min av 2 t», detalj «gangtid, uten pauser», med Tidsstolpe | Bare på Alternativkortet: «16 min av 15 min», detalj «trenger 1 min mer, uten pauser» | Bare på Frarådet-kortet: «ikke vurdert», detalj «Frarådet går foran tid og ønsker.» |
| **Vær** | Værklasse god eller middels: «Værklasse god», detalj «oppholdsvær og lite vind · 3–5 °C» | Værklasse dårlig: «Værklasse dårlig», detalj med værordene og «Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær». Bare reglene som slo inn, nevnes. Værklasse frarådet (bare Frarådet-kortet): «Værklasse frarådet», detalj «sterk kuling, vind opp mot 19 m/s» | Værmeldingen mangler: «ikke vurdert», detalj «Værmeldingen fra MET mangler» |
| **Ønsker** | Treffer minst én valgt Opplevelsespreferanse: «utsikt ✓» (to valgt, én truffet: «utsikt ✓ · vann –») | Aldri | Treffer ingen av de valgte: «ikke utsikt –». Ingen valgt: «ingen valgt». Detaljen kan nevne det Turen har: «har vann (ikke valgt)». |
| **Mørke** | Ender senest 30 min før solnedgang: «tilbake 15:02», detalj «sola går ned 15:59», med Dagslysstolpe | Mørkevarsel (FR-21): «Mørkevarsel: tilbake ca. 15:32», detalj «Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.» Starter Turen før soloppgang: «Mørkevarsel: starter før soloppgang 08:30». I begge tilfeller er siste detaljlinje tipset «Lurt å ta med hodelykt.» | – |

Frarådet-kortet har bare radene Vær og Tid, i den rekkefølgen.

### Værord (FR-20, NFR-10)

FR-20 sier at værordene og grensene avgjøres i UX og ligger på ett sted, slik Værtersklene gjør. Tabellene under er tilpasset Værtersklene i PRD §4.2 og gir «oppholdsvær og lite vind» for UJ-1. Grensene må kalibreres sammen med tersklene (PRD §10, spørsmål 1).

| Størrelse (høyeste i Tidsvinduet) | Grense | Ord |
|---|---|---|
| Nedbør | < 0,1 mm/t | «oppholdsvær» |
| | 0,1–0,4 mm/t | «lite nedbør» |
| | 0,5–1,9 mm/t (middels) | «noe nedbør» |
| | ≥ 2,0 mm/t (dårlig og frarådet) | «nedbør opptil X mm/t» |
| Middelvind | < 5,5 m/s | «lite vind» |
| | 5,5–7,9 m/s | «noe vind» |
| | 8,0–10,7 m/s (middels) | «frisk vind» |
| | 10,8–17,1 m/s (dårlig) | «vind opp mot X m/s» |
| | ≥ 17,2 m/s (frarådet) | «sterk kuling, vind opp mot X m/s» |

Værordene appen lager selv, sier alltid «nedbør», fordi Værmeldingen gir mengde og ikke type.

**Tallformat** (Værsammendrag, Værvarsling, Frarådet-kort og X i tabellen over): nedbør og vind med én desimal, uten «,0» (0 mm/t, 3,5 mm/t, 4 m/s, 10,8 m/s). Temperatur i hele grader. Temperaturspennet skrives «3–5 °C». Er en av verdiene under null, skrives «−2 til 1 °C». Er verdiene like, skrives «4 °C».

**Værsammendrag:** `{symbolord} · {temperatur} · nedbør {høyeste} mm/t · vind opptil {høyeste} m/s`, for eksempel «lettskyet · 3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s». Værklassen står foran, med Kriteriemerket. **Værvarsling:** samme verdier, med verdien som utløste varslingen først.

### Værsymbol (FR-10)

Værsymbolet er METs eget ikon for `symbol_code` (fra `next_1_hours` i Locationforecast). Ikonene ligger i `public/vaerikoner/` sammen med `LICENSE`, siden de har MIT-lisens (AD-15). Ordet står alltid ved siden av ikonet. Symbolet hentes fra timen med dårligst Værklasse i Tidsvinduet. Er flere timer like dårlige, gjelder den første. Endelsene `_day`, `_night` og `_polartwilight` gir riktig ikonfil, men endrer ikke ordet.

| `symbol_code` (uten endelse) | Ord |
|---|---|
| `clearsky` | klarvær |
| `fair` | lettskyet |
| `partlycloudy` | delvis skyet |
| `cloudy` | skyet |
| `fog` | tåke |
| `lightrain` / `rain` / `heavyrain` | lett regn / regn / kraftig regn |
| `lightrainshowers` / `rainshowers` / `heavyrainshowers` | lette regnbyger / regnbyger / kraftige regnbyger |
| `lightsleet` / `sleet` / `heavysleet` | lett sludd / sludd / kraftig sludd |
| `lightsleetshowers` / `sleetshowers` / `heavysleetshowers` | lette sluddbyger / sluddbyger / kraftige sluddbyger |
| `lightsnow` / `snow` / `heavysnow` | lett snø / snø / kraftig snø |
| `lightsnowshowers` / `snowshowers` / `heavysnowshowers` | lette snøbyger / snøbyger / kraftige snøbyger |
| `…andthunder` | ordet for koden uten `andthunder`, pluss «og torden» (`rainshowersandthunder` → «regnbyger og torden») |
| ukjent kode | ingen ikon og ikke noe ord |

Symbolordet er METs beskrivelse og kan si regn, sludd eller snø. Værordene i tabellen over sier fortsatt «nedbør».

### Regeltekst-mønster (FR-20)

Regelteksten bygges av delene under, i fast rekkefølge, skilt med «, ». Den har liten forbokstav og ikke punktum til slutt. Den har ikke temperatur, for temperaturen står i Værsammendraget og i Vær-raden.

| # | Del | Når | Tekst |
|---|---|---|---|
| 1 | Tid | alltid | «passer tiden din (T av A)». For Alternativkortet: «passer ikke tiden din: trenger X min mer (T av A)» |
| 2 | Vær | alltid | Værmelding finnes: «{nedbørsord} og {vindord}». Værmeldingen mangler: «værdata mangler» |
| 3 | Lavtliggende tur | bare ved Værklasse dårlig, og bare når Turen er en Lavtliggende tur | «lavtliggende tur (H moh)», der H er høyeste punkt |
| 4 | Egnet i dårlig vær | bare ved Værklasse dårlig, og bare når verdien er «ja» | «egnet i dårlig vær» |
| 5 | Opplevelsespreferanser | bare når minst én valgt Opplevelsespreferanse treffer | de som treffer, i rekkefølgen utsikt, vann, bundet med « og » |

Eksempler:
- UJ-1, godt vær: «passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt»
- UJ-2, dårlig vær: «passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,5 mm/t og frisk vind, lavtliggende tur (340 moh), egnet i dårlig vær»
- To Opplevelsespreferanser (FR-17-eksempelet, med værordene fra UJ-1): «passer tiden din (2 t 16 min av 2 t 30 min), oppholdsvær og lite vind, utsikt og vann»
- Alternativkortet, UJ-3 edge case: «passer ikke tiden din: trenger 1 min mer (16 min av 15 min), værdata mangler»

## State Patterns

Tilstandene følger tabellen under FR-6. Ingen tilstand gir en tom side. Kreditering står alltid nederst.

| Tilstand | Flate | Behandling |
|---|---|---|
| Søk, standardverdier | Søk | I dag, nå (rundet opp til neste kvarter, tidligst 06:00), 2 t, Middels, ingen Opplevelsespreferanser. PC: Skjemakort og kart med de 8 Startpunktene ([pc-1](konsept-07-kortstokken/pc-1-sok.svg)). Mobil: forklaring øverst og Skjemakortet som ark i tommelsonen ([mob-1](konsept-07-kortstokken/mob-1-sok.svg)). |
| Søk etter 22:00 | Søk | Turdag står på «I morgen», «I dag» er låst med forklaring, og Starttidspunkt er 10:00. |
| Starttidspunktet har passert | Søk | Ved sending, ved «Prøv igjen» og når «Endre søk» henter Søket tilbake, rundes et passert Starttidspunkt opp til neste kvarter. Hjelpeteksten sier «Flyttet til 14:15, fordi 13:30 har passert.» Har klokka passert 22:00 og Turdag er «I dag», settes Turdag til «I morgen» og Starttidspunkt til 10:00, med samme type hjelpetekst. |
| Venter på svar | Resultat | Plassholderstokken med «Finner turer …». Den har ingen spinner uten tekst. NFR-5 krever svar innen 3 s. |
| Får ikke kontakt | Resultat | Kommer det ikke svar fra appens server innen 10 s, eller feiler kallet (for eksempel uten nett), byttes Plassholderstokken med Kontaktfeil-kortet: «Vi fikk ikke kontakt.» og «Søket ditt er tatt vare på.», med «Prøv igjen» og «Endre søk». Kart og Ansvarsmerknad vises ikke. |
| God eller middels + minst én Tur passer | Resultat | Værsammendrag, «Tre Turforslag som passer nå», Turkortene og Kart ([pc-2](konsept-07-kortstokken/pc-2-godt-vaer.svg), [mob-2](konsept-07-kortstokken/mob-2-godt-vaer.svg)). |
| Dårlig + minst én Tur passer | Resultat | Værvarsling med Bedre tidsvindu-boksen øverst, deretter «Tre Turforslag i dårlig vær» med Vær-raden som «!» og «Øverst fordi …» ([pc-3a](konsept-07-kortstokken/pc-3a-darlig-vaer.svg), [mob-3](konsept-07-kortstokken/mob-3-darlig-vaer.svg)). |
| Bedre tidsvindu tatt i bruk | Resultat | Vanlig resultat for det nye Søket, uten eget merke. Ditt søk viser det nye Starttidspunktet ([pc-3b](konsept-07-kortstokken/pc-3b-bedre-tidsvindu.svg)). |
| Mørkevarsel på et Turforslag | Turkort | Mørke-raden har «!» i rust med solnedgangen, sluttidspunktet og tipset «Lurt å ta med hodelykt.» Turer med Mørkevarsel ligger etter Turene uten Mørkevarsel i Stokken (FR-16). Resten av kortet er uendret. |
| Frarådet (med og uten Tur som passer) | Resultat | Ingen Turforslag og ingen korteste Tur. Frarådet-kortet og Bedre tidsvindu-kortet med «Bruk i morgen 11:00» ([pc-4](konsept-07-kortstokken/pc-4-fraradet.svg), [mob-4](konsept-07-kortstokken/mob-4-fraradet.svg)). Kart og Ansvarsmerknad vises ikke, fordi det ikke er noen Tur å vise, og fordi FR-17 knytter merknaden til Turforslagene. |
| Ingen Bedre tidsvindu | Værvarsling, Bedre tidsvindu-kortet | Boksen eller kortet viser «Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.» uten knapp. Når Turdag er i morgen, står det «Det finnes ikke noe bedre tidsvindu i dagslys i morgen.» (FR-19). |
| Bedre tidsvindu uten Tur før mørket | Bedre tidsvindu-boksen, Bedre tidsvindu-kortet | Bedre tidsvindu vises som ellers, med antallslinjen «Ingen Tur passer før mørket.» og knappen (FR-19). |
| God eller middels + ingen Tur passer | Resultat | Værsammendrag, «Ingen Tur passer {Tilgjengelig tid}.», Alternativkortet med den korteste Turen og «Endre Tilgjengelig tid». Kart viser ruten til den korteste Turen. |
| Dårlig + ingen Tur passer | Resultat | Værvarsling med Bedre tidsvindu-boksen, «Ingen Tur passer {Tilgjengelig tid}.» og Alternativkortet. |
| Værmeldingen mangler + minst én Tur passer | Resultat | Værmangel-linjen der Værsammendraget ellers står, og «Tre Turforslag som passer tiden din». Vær-raden er «–» «ikke vurdert». Ingen Værklasse, Værvarsling eller Bedre tidsvindu (FR-13). Rangeringen følger reglene for godt vær. |
| Værmeldingen mangler + ingen Tur passer | Resultat | Som over, med «Ingen Tur passer 15 min.» og Alternativkortet: Storlihytta fra Vardeveien, 16 min, «trenger 1 min mer» ([pc-5](konsept-07-kortstokken/pc-5-ingen-tur-uten-vaer.svg), [mob-5](konsept-07-kortstokken/mob-5-ingen-tur-uten-vaer.svg)). |
| Færre enn tre Turforslag | Resultat | Så mange kort som passer. Overskriften tilpasses: «To Turforslag …», «Ett Turforslag …». Ved to kort heter Stokkoversikt «Begge i stokken». Ved ett kort vises verken Stokk-kanter, Stokknavigasjon eller Stokkoversikt. |
| Bakgrunnskartet lastes ikke | Kart | Kartflaten er papirfarget, og appen tegner fortsatt ruter, Startpunkter og Mål. Teksten «Bakgrunnskartet kunne ikke lastes.» står på kartet. Kortene virker som før. |
| Demomodus | Alle | Merket er alltid synlig. Ellers ser alt ut som i live-modus (NFR-11). |

**Overskrifter.** Tallordet følger antallet (Ett, To, Tre). Er Turdag «I dag» og Starttidspunkt nå, slutter overskriften med «som passer nå». Ellers slutter den med Turdag og klokkeslett: «Tre Turforslag som passer i morgen fra kl. 14:00». I dårlig vær er overskriften «Tre Turforslag i dårlig vær».

## Interaction Primitives

- **Trykk** er alltid nok. Ingen funksjon krever hover, dobbelttrykk, langt trykk eller sveip (NFR-1, utvidet i UX).
- **Sveip** mellom kortene på mobil er en snarvei. Stokknavigasjon er hovedveien.
- **Tastatur:** Tab følger leserekkefølgen. I Stokken blar ← og → når Stokken har fokus. Enter eller mellomrom velger et kort på PC.
- **Ett trykk = nytt Søk** for «Finn tur», «Bruk …» og «Prøv igjen». Et nytt Søk erstatter resultatet helt (FR-6), og siden ruller til overskriften.
- **Nettleserens Tilbake:** Resultat legger én historikkoppføring. Tilbake fra Resultat går til Søk med verdiene, som «Endre søk». Et nytt Søk fra Resultat («Bruk …», «Prøv igjen») erstatter oppføringen, så Tilbake går alltid til Søk.
- **Kart:** dra, rulle eller knipe for zoom og panorering (FR-25). Et trykk på en rute eller et Startpunkt velger Turforslaget.
- **Bevegelse:** kortet glir ut til siden, og neste løftes fra Stokken (ca. 250 ms). På PC senkes det valgte kortet ned på den grønne foten. Med «Reduser bevegelse» byttes kortene uten animasjon.
- **Ikke tillatt:** karuseller som går av seg selv, popup-vinduer, varsler, tellere, delingsknapper, favoritter, innlogging og «Min posisjon» (PRD §7, §8.2).

## Accessibility Floor

Her står kravene til atferd. Kontrastverdiene står i DESIGN.md › Colors.

- Skjemaet kan brukes med tastatur, og alle felt har synlige etiketter (NFR-9). Segmentvelgere er radiogrupper. Trinnknappene har tilgjengelige navn («Reduser Starttidspunkt med 15 min»), og verdien er en `<select>` med feltets etikett. Brikkene er avkrysningsbokser.
- Trykkflater er minst 44 × 44 px (NFR-1, `{spacing.touch-min}`). Høydene per komponent står som tokens i DESIGN.md. Det gjelder også lenken «Kilde: morotur.no».
- **Mening bæres aldri av farge alene:** hver Kriterierad har merke (✓, !, –), et ord og tall.
- Haken og pila er SVG-ikoner. Bærer ikonet mening i en tekstlinje («utsikt ✓»), har det tekstalternativ («utsikt: ja»). Ellers er det skjult for skjermlesere.
- Skjermlesere leser et Turkort som én artikkel: «Turforslag 1 av 3: Tusenårsvarden fra Damefallet. Turtid: 1 t 32 min av 2 t, gangtid uten pauser. Værklasse: god …». Radene leses med PRD-begrepene (se Voice and Tone). Kriteriemerkene har tekstalternativ («passer», «se opp», «ikke vurdert»).
- Når resultatet kommer, meldes overskriften i et høflig live-område, for eksempel «Tre Turforslag som passer nå». Værvarsling, frarådet og «Vi fikk ikke kontakt.» meldes også.
- Stokken på mobil har «Turforslag 1 av 3» som tilgjengelig navn. Pilknappene heter «Forrige Turforslag» og «Neste Turforslag».
- Kartet har en tekstlig ekvivalent: alt kartet viser (Startpunkt, Mål, lengde, Vanskelighetsgrad), står også i kortet.
- Reduser bevegelse respekteres (se Interaction Primitives).
- Teksten tåler 200 % zoom uten horisontal rulling ved 360 px.

## Responsive & Platform

| Bredde | Oppsett |
|---|---|
| 360–767 px | **Mobil** (skissene er tegnet ved 390 px): stablet. Ett kort om gangen i Stokken, Kart og Stokkoversikt under. Søk med Skjemakortet som ark i tommelsonen. |
| 768–1199 px | **Nettbrett:** mobiloppsettet i full bredde, med sidemarg `{spacing.margin-tablet}` og tekst innenfor `{spacing.text-max-width}`. Kartutsnittet er 160 px høyt. Søk har forklaringen øverst og Skjemakortet under, uten kart. Referansen er mob-2 strukket til 704 px innhold (768 − 2 × 32). |
| ≥ 1200 px | **PC:** Kart i full bredde, og Turkortene side om side under, i like brede kolonner på minst `{spacing.card-min-width-desktop}`. Søk med Skjemakortet til venstre og kart til høyre. |

Oppsettet følger NFR-1 slik den ble justert 2026-11-10.

Ingen horisontal rulling ved noen bredde (SM-4: sjekkliste ved 360, 768, 1200 og 1440 px).

## Inspiration & Anti-patterns

- **Valgt bort, konsept 01–06 og 08–10 (2026-11-10):** Kortstokken ble valgt uten lån fra de andre konseptene. Skissene ligger i [oversikt.html](oversikt.html).
- **Valgt bort, poengsum og «match %»:** reglene er ikke en poengskala, og en prosent ville skjult hvilken regel som slo inn.
- **Valgt bort, bilder av turene:** datasettet har ingen, og stemningsbilder ville gitt et inntrykk av forhold appen ikke vurderer.

## Key Flows

### Flow 1: Ingrid finner en ettermiddagstur rett før hun går (UJ-1, mobil, man. 9. nov. kl. 13:30)

1. Ingrid åpner Turplanlegger. Søk viser I dag, 13:30 (nå), 2 t og Middels.
2. Hun lar 2 t og Middels stå og trykker på «utsikt».
3. Hun trykker «Finn tur» nederst i tommelsonen.
4. Resultat: «I dag 13:30 · 2 t · Middels · utsikt», og under det «Værklasse god · lettskyet · 3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s». Kort 1 av 3 fyller skjermen.
5. **Climax:** kort 1, Tusenårsvarden fra Damefallet, har fire grønne haker over brettekanten: «1 t 32 min av 2 t», «Værklasse god», «utsikt ✓» og «tilbake 15:02». Under radene står «Begrunnelse: «passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt»».
6. Uten språkmodellnøkkel blir Begrunnelsen stående slik. Med nøkkel og svar innen 5 s byttes teksten med Språkmodellteksten, mens radene står (FR-22).
7. Hun blar med «Neste tur» for å sammenligne, går tilbake til kort 1 og trykker på Kartutsnittet. Siden ruller til Kart med Startpunktet, den omtrentlige ruten og Kartinfoboksen.

Edge case: MET svarer ikke innen 2 s. Hun får likevel tre kort under Værmangel-linjen «Været er ikke vurdert.», med overskriften «Tre Turforslag som passer tiden din» og Vær-raden «– ikke vurdert».

Edge case: hun kommer senere ut og søker kl. 15:00 med 1 t, Middels og utsikt. Sola går ned 15:59, så grensen er 15:29. Kort 1 er Storlihytta fra Vardeveien med grønn hake i Mørke-raden: «tilbake 15:16». Kort 2 og 3, Skihytta fra Damefallet (ender 15:54) og Bergsvatnet (ender 15:43), har «!» i Mørke-raden, for eksempel «Mørkevarsel: tilbake ca. 15:54» på kort 2, sammen med solnedgangen og tipset «Lurt å ta med hodelykt.» (FR-21).

### Flow 2: Ingrid planlegger morgendagen kvelden før (UJ-2, PC, søn. 8. nov. kveld)

1. Søk: hun velger I morgen (Starttidspunkt hopper til 10:00), 3 t, Krevende og utsikt, og trykker «Finn tur».
2. Resultat: Værvarsling øverst med «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00» og «nedbør opptil 3,5 mm/t · vind opptil 9 m/s · 2–4 °C». Til høyre står Bedre tidsvindu-boksen: «I morgen fra kl. 14:00 er Værklassen god», «5 Turer passer før mørket.» og «Bruk 14:00».
3. Kortene: Moldevatnet fra Jensgurilia, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet, med Vær-raden «!» og «Øverst fordi: lavtliggende tur …».
4. Hun trykker på kort 3. Kartet uthever ruten, og Kartinfoboksen viser «Skihytta fra Damefallet · 3,06 km · Enkel · Startpunkt: Parkering ved Damefallet, Vardeveien» (FR-24).
5. Hun trykker «Bruk 14:00».
6. **Climax:** nytt resultat med overskriften «Tre Turforslag som passer i morgen fra kl. 14:00». Storlihytta fra Romsdalsmuseet står først med «utsikt ✓», og alle tre Mørke-rader har grønn hake.

Edge case: finnes det ikke noe Bedre tidsvindu, står «Det finnes ikke noe bedre tidsvindu i dagslys i morgen.» i boksen, fordi Turdag er i morgen.

### Flow 3: Ingrid får beskjed om å vente (UJ-3, mobil, lør. 14. nov. formiddag)

1. Hun sender Søket: I dag 10:00, 2 t, Middels.
2. **Climax:** i stedet for Turkort får hun Frarådet-kortet: «Værklasse frarådet» og «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).» Under står Bedre tidsvindu-kortet: «I morgen (søn. 15. nov.) fra kl. 11:00», antallslinjen med Turene som passer før mørket, og «Bruk i morgen 11:00» i tommelsonen.
3. Hun trykker på knappen og får Turforslag som vanlig.

Edge case: med 15 min passer ingen Tur. Alternativkortet viser Storlihytta fra Vardeveien, «16 min av 15 min» og «trenger 1 min mer», og «Endre Tilgjengelig tid» tar henne til Søk med fokus på det feltet.

## Kjente avvik i skissene

Skissene ble tegnet før disse avgjørelsene. Ved bygging gjelder høyre kolonne.

| Skisse | I skissen | Skal være |
|---|---|---|
| pc-2, pc-3a, pc-3b, mob-2, mob-3 | Etiketten «REGELTEKST» og «Regeltekst: «…»» | «BEGRUNNELSE» og «Begrunnelse: «…»» |
| pc-3a, mob-3 | «regn opptil 3,5 mm/t» | «nedbør opptil 3,5 mm/t» |
| pc-3a, mob-3 | «vind opp mot 9 m/s» i værordene | «frisk vind» i værordene, og «vind opptil 9 m/s» i verdiene |
| pc-2, mob-2 | Værsammendrag med «0 mm nedbør» eller værord | Formatet under Værord: «lettskyet · 3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s» |
| pc-3b | Overskriften «Tre Turforslag fra kl. 14:00» og merket «Bedre tidsvindu tatt i bruk» | «Tre Turforslag som passer i morgen fra kl. 14:00», uten merke |
| mob-2 | Stokkoversikt-rad «1 t 32 min · tilbake 15:02» | «1 t 32 min uten pauser · tilbake 15:02» |
| mob-2 | Høydemerknaden under brettekanten, og ingen Kartinfoboks | Høydemerknaden under Værsammendraget, og Kartinfoboksen over Kart |
| mob-4 | Ingen Kriterierader under Frarådet-teksten | Radene Vær og Tid, som i pc-4 |
| pc-1, mob-1 | Kanten rundt preferansebrikker `#B9A98C` | `{colors.border-chip}` |
| alle | Skriften Avenir Next, og ✓ og → som teksttegn | Nunito Sans, og haken og pila som SVG-ikoner |
| pc-3a, mob-3, pc-4, mob-4 | Bedre tidsvindu uten antallslinje | Antallslinjen «{N} Turer passer før mørket.» over knappen |
| pc-3b | Mørkevarsel uten tips | Tipset «Lurt å ta med hodelykt.» som siste detaljlinje i Mørke-raden |
| alle | Kreditering «Værdata: MET Norway» uten lenker | «Værdata: Data fra MET Norway», med lenker til MET og Kartverket |

## Open Questions

Ingen åpne spørsmål.
