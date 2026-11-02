---
title: "PRD: Turplanlegger"
status: final
created: 2026-11-02
updated: 2026-11-02
---

# PRD: Turplanlegger

*Arbeidstittel, som i briefen.*

## 0. Om dokumentet

Denne PRD-en beskriver hva Turplanlegger skal gjøre i MVP, slik at UX, arkitektur og epics/stories kan bygges direkte på den. Den bygger på [product brief](../../briefs/brief-turplanlegger-app-2026-09-04/brief.md) (status final) med addendum, på [MET-researchen](../../research/technical-met-locationforecast-api-for-turplanlegg-2026-10-29/research.md) og på `data/turer-moldemarka.json`, og gjentar dem ikke.

- Begrepene i §3 brukes ordrett i hele dokumentet, med stor forbokstav.
- Alt har faste nummer: brukerreiser UJ-1–UJ-3, funksjonelle krav FR-1–FR-29, tverrgående krav NFR-1–NFR-9 og suksessmål SM-1–SM-4.
- Antakelsene fra utkastet er godkjent (2026-11-02). Det som fortsatt er usikkert, står som åpne spørsmål i §10.
- Teknisk «hvordan» (mellomtjeneste for MET, caching, kart, solberegning, språkmodell) står i [addendum.md](addendum.md).

## 1. Visjon

Turplanlegger gjør jobben turgåere i dag gjør selv: den veier værmeldingen og tiden du har opp mot et kuratert utvalg turer i Moldemarka, og gir deg 1–3 konkrete Turforslag med en Begrunnelse du kan etterprøve. Du oppgir når du vil gå (i dag eller i morgen), hvor lang tid du har og hva du ønsker deg, og får svar på under ett minutt — på mobilen rett før du går, eller på PC kvelden før.

Anbefalingen er regelbasert: samme Søk og samme Værmelding gir alltid de samme Turforslagene. Det gjør appen testbar, og det gjør Begrunnelsen til noe brukeren kan stole på. En språkmodell kan gjøre Begrunnelsen mer naturlig, men velger aldri Turene.

## 2. Målgruppe

### 2.1 Jobs To Be Done

- **Funksjonell:** Når jeg har noen ledige timer, vil jeg raskt finne én tur som passer tiden og været, uten å sammenligne turlister og værmelding selv.
- **Kontekst:** Jeg kjenner ikke Moldemarka godt, og jeg bestemmer meg ofte rett før jeg går, eller kvelden før.
- **Emosjonell:** Jeg vil være trygg på at turen er et fornuftig valg i dagens vær, og at jeg er tilbake før det blir mørkt.

### 2.2 Ikke-brukere (MVP)

- Folk som trenger navigasjon eller sporing underveis.
- Ski-, sykkel- og flerdagsturer.
- Turgåere som vil gå utenfor Moldemarka.

### 2.3 Brukerreiser

Personen i reisene er Ingrid, 21 år, førsteårsstudent ved Høgskolen i Molde, som har bodd i byen i to måneder.

**UJ-1. Ingrid finner en ettermiddagstur rett før hun går.**
Klokka er 13:30 en fin dag, og forelesningene er over. Ingrid åpner Turplanlegger på mobilen; Turdag «i dag» og Starttidspunkt «nå» er allerede valgt. Hun setter Tilgjengelig tid til 2 t, Vanskelighetsgrad til Middels, krysser av for utsikt og trykker «Finn tur». Hun får tre Turforslag. Øverst står Tusenårsvarden fra Damefallet med Begrunnelsen «passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt». Hun trykker på forslaget, ser Startpunktet og den omtrentlige ruten på kartet, og drar. **Edge case:** Svarer ikke MET, får hun likevel Turforslag, med en tydelig melding om at været ikke er vurdert.

**UJ-2. Ingrid planlegger morgendagen kvelden før.**
En søndag kveld i november sitter Ingrid ved PC-en. Hun velger Turdag «i morgen», Starttidspunkt 10:00, 3 t, Krevende og utsikt. Værmeldingen gir dårlig vær på formiddagen, så appen viser en Værvarsling, rangerer Lavtliggende turer og Turer som er Egnet i dårlig vær øverst, med Moldevatnet fra Jensgurilia først, og opplyser om et Bedre tidsvindu fra kl. 14. Hun tar det i bruk og får Turer med utsikt øverst igjen. De lengste av dem får Mørkevarsel fordi de ender etter solnedgang, så hun velger en kortere. **Edge case:** Finnes det ikke noe Bedre tidsvindu, sier appen det rett ut.

**UJ-3. Ingrid får beskjed om å vente.**
En lørdag formiddag er det meldt sterk kuling. Ingrid vil gå før lunsj, men Værklassen for Tidsvinduet er «frarådet». Hun får ingen Turforslag, men en melding om at det er meldt vind opp mot 19 m/s, og et Bedre tidsvindu i morgen fra kl. 11. Hun tar det i bruk og får Turforslag som vanlig. **Edge case:** Med bare 15 minutter passer ingen Tur. Appen viser da den korteste Turen (19 min) og sier hvor mye mer tid hun trenger.

## 3. Begreper

- **Tur** — En kuratert fottur i Moldemarka med Startpunkt, lengde totalt, høydemeter, høyeste punkt, Vanskelighetsgrad, utsikt (ja/nei), vann (ja/nei) og Egnet i dårlig vær. Koblet til ett eller flere Rutesegmenter.
- **Turdatasett** — Alle Turer appen kan foreslå (12 i dag, 10–20 i MVP), lagret i repoet.
- **Startpunkt** — Navngitt sted med koordinater der Turen starter.
- **Rutesegment** — En linjebit i stinettverket fra Turrutebasen, identifisert med rutenummer.
- **Omtrentlig rute** — En Tur tegnet på kartet som alle Rutesegmentene den er koblet til. Kan vise mer sti enn selve Turen.
- **Søk** — Én forespørsel fra brukeren: Turdag, Starttidspunkt, Tilgjengelig tid, Vanskelighetsgrad og eventuelle Opplevelsespreferanser.
- **Turdag** — I dag eller i morgen.
- **Starttidspunkt** — Klokkeslettet på Turdagen da brukeren vil starte.
- **Tilgjengelig tid** — Tiden brukeren har til selve turen. Reise til og fra Startpunktet er ikke med.
- **Vanskelighetsgrad** — Enkel, Middels eller Krevende (Turrutebasens G, B og R). Brukerens valg er høyeste tillatte grad.
- **Opplevelsespreferanse** — Utsikt og/eller vann. Valgfri.
- **Turtid** — Beregnet tid for hele Turen etter Naismiths regel (FR-14).
- **Tidsvindu** — Fra Starttidspunktet til Starttidspunktet pluss Tilgjengelig tid.
- **Værpunkt** — Ett fast punkt med høyde som representerer hele Moldemarka.
- **Værmelding** — Timesverdier fra MET Locationforecast for Værpunktet: temperatur, nedbør, vind og værsymbol.
- **Værterskler** — Produktets egne grenser for nedbør, vind og temperatur (§4.2). Ikke MET sine farevarselgrenser.
- **Værklasse** — God, middels, dårlig eller frarådet. Settes per time og for Tidsvinduet.
- **Værvarsling** — En tydelig melding i appen om at Værklassen for Tidsvinduet er dårlig. Ikke det samme som MET sine farevarsler.
- **Lavtliggende tur** — En Tur med høyeste punkt under 400 moh.
- **Egnet i dårlig vær** — Ja, nei eller ukjent per Tur, ut fra hva kilden sier. Ukjent betyr at kilden ikke sier noe, ikke nei.
- **Turforslag** — En Tur som er valgt og rangert for et Søk, med Begrunnelse og eventuelle varsler. Maks tre per Søk.
- **Begrunnelse** — Teksten som forklarer hvorfor Turen er foreslått: enten Regeltekst eller Språkmodelltekst.
- **Regeltekst** — Begrunnelse satt sammen direkte fra reglene som slo inn. Alltid tilgjengelig.
- **Språkmodelltekst** — Valgfri omformulering av Regelteksten fra en språkmodell.
- **Alternativ** — Det appen viser i stedet for Turforslag: den korteste Turen eller et Bedre tidsvindu.
- **Bedre tidsvindu** — Det tidligste Starttidspunktet i dag eller i morgen der Tidsvinduet får en bedre Værklasse.
- **Mørkevarsel** — Varsel på et Turforslag om at Turen ender etter solnedgang eller starter før soloppgang.

## 4. Funksjoner

### 4.1 Søk

**Beskrivelse:** Brukeren fyller ut ett skjema og trykker én knapp. Alle felt har standardverdier, så et Søk kan sendes uten å endre noe. Realiserer UJ-1, UJ-2 og UJ-3.

#### FR-1: Velge Turdag

Brukeren kan velge Turdag «i dag» eller «i morgen». Realiserer UJ-2.

**Konsekvenser (testbare):**
- Bare de to valgene finnes; standard er «i dag».
- Etter kl. 22:00 kan «i dag» ikke velges, og Turdag står på «i morgen».
- Værmelding, Bedre tidsvindu og solnedgang gjelder valgt Turdag.

#### FR-2: Velge Starttidspunkt

Brukeren kan velge Starttidspunkt på Turdagen. Realiserer UJ-2.

**Konsekvenser:**
- Valgene er hele kvarter fra 06:00 til 22:00.
- For «i dag» er standard «nå», rundet opp til nærmeste kvarter, og tidspunkter som har passert kan ikke velges.
- For «i morgen» er standard 10:00.

#### FR-3: Oppgi Tilgjengelig tid

Brukeren kan oppgi Tilgjengelig tid fra 15 min til 5 t i steg på 15 min. Standard er 2 t.

**Konsekvenser:**
- Skjemaet sier at Tilgjengelig tid gjelder selve turen, uten reise.

#### FR-4: Velge Vanskelighetsgrad

Brukeren kan velge Enkel, Middels eller Krevende som høyeste tillatte Vanskelighetsgrad. Standard er Middels.

#### FR-5: Velge Opplevelsespreferanser

Brukeren kan krysse av for utsikt, vann, begge eller ingen. Standard er ingen.

#### FR-6: Sende Søk

Brukeren kan sende Søket med ett trykk og få Turforslag, et Alternativ, eller Turforslag sammen med et Bedre tidsvindu. Realiserer UJ-1.

**Konsekvenser:**
- Et Søk med bare standardverdier gir et gyldig resultat.
- Et nytt Søk erstatter det forrige resultatet helt.

### 4.2 Værvurdering

**Beskrivelse:** Appen henter Værmeldingen for Værpunktet og setter en Værklasse for hver time ut fra Værterskler. Den dårligste timen i Tidsvinduet bestemmer Værklassen for Søket. Tersklene er produktets egne, ikke MET sine farevarselgrenser. Vindgrensene følger Beaufort-skalaen, mens nedbørs- og temperaturgrensene er produktvalg; bakgrunnen står i addendum. Realiserer UJ-1, UJ-2 og UJ-3.

**Værterskler** (kalibreres etter spørsmål 1 i §10)

| Værklasse | Nedbør | Middelvind | Temperatur |
|---|---|---|---|
| Frarådet | ≥ 10 mm/t | ≥ 17,2 m/s (sterk kuling) | – |
| Dårlig | ≥ 2 mm/t | ≥ 10,8 m/s (liten kuling) | < −10 °C |
| Middels | ≥ 0,5 mm/t | ≥ 8,0 m/s (frisk bris) | < 0 °C |
| God | under alle grensene over | | |

#### FR-7: Hente Værmelding

Systemet henter Værmeldingen for Værpunktet for hele Turdagen.

**Konsekvenser:**
- Det finnes timesverdier for hver time i Tidsvinduet, både for «i dag» og «i morgen».
- Appen krediterer MET Norway der værdata vises (FR-29).

#### FR-8: Sette Værklasse per time

Systemet gir hver time den strengeste Værklassen der minst én verdi når grensen i tabellen.

**Konsekvenser:**
- 2,0 mm/t og 3 m/s gir dårlig; 1,9 mm/t og 3 m/s gir middels.
- 17,2 m/s gir frarådet uansett nedbør og temperatur.
- 0,4 mm/t, 7,9 m/s og 5 °C gir god.

#### FR-9: Sette Værklasse for Tidsvinduet

Systemet setter Værklassen for Tidsvinduet til Værklassen for den dårligste timen i vinduet.

**Konsekvenser:**
- Én frarådet time i et ellers godt Tidsvindu gir frarådet.
- En time teller med når den overlapper Tidsvinduet; 13:30–15:30 omfatter timene som starter 13, 14 og 15.

#### FR-10: Vise værsammendrag

For Tidsvinduet viser appen Værklasse, temperaturspenn, høyeste nedbør, høyeste vind og værsymbol. Realiserer UJ-1.

#### FR-11: Vise Værvarsling

Er Værklassen dårlig, viser appen en Værvarsling over Turforslagene, med verdiene som utløste den. Realiserer UJ-2.

#### FR-12: Fraråde tur

Er Værklassen frarådet, viser appen ingen Turforslag. I stedet viser den en melding med verdiene som utløste klassen, og et Bedre tidsvindu som Alternativ (FR-19). Realiserer UJ-3.

**Konsekvenser:**
- Meldingen sier hva som er meldt, f.eks. «vind opp mot 19 m/s».
- Aldri en tom side eller feilmelding.

#### FR-13: Turforslag uten Værmelding

Kan ikke Værmeldingen hentes, gir appen Turforslag uten værregler og sier tydelig at været ikke er vurdert. Realiserer UJ-1 (edge case).

**Konsekvenser:**
- Ingen Værklasse, Værvarsling eller Bedre tidsvindu vises.
- Begrunnelsen sier at værdata mangler.
- Rangeringen følger reglene for god og middels vær (FR-16).

### 4.3 Anbefaling

**Beskrivelse:** Appen beregner Turtid, fjerner Turer som ikke passer, rangerer resten og viser de tre beste. Alt følger faste regler, slik at resultatet kan testes med faste værdata (NFR-2). Realiserer UJ-1, UJ-2 og UJ-3.

#### FR-14: Beregne Turtid

Systemet beregner Turtid med Naismiths regel: lengde totalt ÷ 5 km/t + høydemeter ÷ 600 m/t, avrundet til nærmeste hele minutt.

**Konsekvenser:**
- Tusenårsvarden fra Damefallet (5,0 km, 318 høydemeter) får Turtid 1 t 32 min.
- Storlihytta fra Vardeveien (1,06 km, 58 høydemeter) får Turtid 19 min.

#### FR-15: Filtrere Turer

Systemet fjerner Turer med Turtid over Tilgjengelig tid og Turer som er vanskeligere enn valgt Vanskelighetsgrad.

**Konsekvenser:**
- Ved 1 t Tilgjengelig tid foreslås ingen Tur med Turtid over 60 min.
- Ved Enkel foreslås aldri en Tur med Vanskelighetsgrad Middels eller Krevende.
- Været fjerner aldri enkeltturer; det påvirker rangeringen (FR-16) eller fører til frarådet (FR-12).

#### FR-16: Rangere Turer

Systemet rangerer de gjenværende Turene ved å sammenligne dem på kriteriene under, i rekkefølge. Neste kriterium brukes bare når Turene står likt på det forrige.

Ved god eller middels Værklasse, og når Værmeldingen mangler:
1. Antall av brukerens Opplevelsespreferanser Turen treffer, flest først.
2. Turtid nærmest Tilgjengelig tid først.
3. Turens ID, alfabetisk.

Ved dårlig Værklasse:
1. Lavtliggende tur før andre Turer.
2. Egnet i dårlig vær: ja før ukjent, ukjent før nei.
3. Antall av brukerens Opplevelsespreferanser Turen treffer, flest først. Utsikt teller ikke.
4. Turtid nærmest Tilgjengelig tid først.
5. Turens ID, alfabetisk.

**Konsekvenser:**
- Samme Søk, Værmelding og Turdatasett gir alltid samme rekkefølge.
- UJ-1 (god Værklasse, 2 t, Middels, utsikt) gir med dagens Turdatasett Tusenårsvarden fra Damefallet, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet, i den rekkefølgen.
- Ved dårlig Værklasse står Moldevatnet fra Jensgurilia (lavtliggende, egnet: ja) over Bergsvatnet (lavtliggende, egnet: ukjent) når begge passer.

#### FR-17: Vise opptil tre Turforslag

Appen viser de tre høyest rangerte Turene som Turforslag, eller færre hvis færre passer.

**Konsekvenser:**
- Passer to Turer, vises to; appen fyller ikke på med Turer som ikke passer.

#### FR-18: Når ingen Tur passer

Fjerner FR-15 alle Turer, viser appen en forståelig melding med den korteste Turen innenfor valgt Vanskelighetsgrad som Alternativ, og sier hvor mye mer tid den krever. Realiserer UJ-3 (edge case).

**Konsekvenser:**
- Med 15 min Tilgjengelig tid og dagens Turdatasett vises Storlihytta fra Vardeveien (19 min), med «trenger 4 min mer».
- Aldri en tom side eller feilmelding.

**Merknad:** Briefen nevner «enklere tur» som alternativ. Siden Vanskelighetsgrad er en øvre grense, kan et lavere valg aldri gi flere treff, så alternativet er erstattet med den korteste Turen.

#### FR-19: Foreslå Bedre tidsvindu

Er Værklassen dårlig eller frarådet, leter appen etter et Bedre tidsvindu med samme Tilgjengelig tid. Den prøver hele timer fra 06:00 til 22:00 på Turdagen og, når Turdag er «i dag», også i morgen. Det tidligste Starttidspunktet med bedre Værklasse vises sammen med Turforslagene (dårlig) eller som Alternativ (frarådet). Realiserer UJ-2 og UJ-3.

**Konsekvenser:**
- Bare Starttidspunkt som ikke har passert, vurderes.
- Finnes det ikke noe Bedre tidsvindu, sier appen det.
- Brukeren kan ta i bruk Bedre tidsvindu med ett trykk; det sender et nytt Søk med det nye Starttidspunktet og Turdagen.

### 4.4 Begrunnelse og varsler

**Beskrivelse:** Hvert Turforslag forklarer seg selv med en Regeltekst og får varsler når det er grunn til det. Språkmodellen er et valgfritt lag oppå Regelteksten og bygges sist. Realiserer UJ-1 og UJ-2.

#### FR-20: Lage Regeltekst

Hvert Turforslag har en Regeltekst som nevner:
- Turtid og Tilgjengelig tid,
- værsammendraget for Tidsvinduet, eller at Værmeldingen mangler,
- hvilke av brukerens Opplevelsespreferanser Turen treffer, når brukeren har valgt noen,
- reglene for dårlig vær som slo inn (Lavtliggende tur, Egnet i dårlig vær).

**Konsekvenser:**
- Samme Søk og Værmelding gir samme Regeltekst.
- Regelteksten nevner aldri en regel som ikke slo inn.

#### FR-21: Vise Mørkevarsel

Ender Turen etter solnedgang, eller starter den før soloppgang, får Turforslaget et Mørkevarsel med klokkeslettet. Realiserer UJ-2.

**Konsekvenser:**
- Turen ender ved Starttidspunkt + Turtid; sol opp og ned gjelder Turdagen i Moldemarka.
- Mørkevarselet endrer verken utvalg eller rekkefølge.
- Solnedgang og soloppgang beregnes i appen, uten ekstern tjeneste eller nøkkel.

#### FR-22: Språkmodelltekst (valgfritt, bygges sist)

Er en API-nøkkel satt opp, kan systemet erstatte Regelteksten med en Språkmodelltekst som sier det samme i mer naturlig språk.

**Konsekvenser:**
- Uten nøkkel, ved feil eller når svaret tar mer enn 5 s, vises Regelteksten.
- Språkmodellen kalles først når Turforslagene er valgt og rangert, og får bare Regelteksten og fakta om Turen. Den påvirker aldri utvalg eller rekkefølge.
- Mangler Språkmodellteksten et tall fra Regelteksten (Turtid, Tilgjengelig tid, værverdier), vises Regelteksten.
- Funksjonen kan testes med en falsk (mock) språkmodell, uten nøkkel.

### 4.5 Kartvisning

**Beskrivelse:** Kartet viser hvor Turforslagene starter og omtrent hvor de går. Ruten er merket som omtrentlig fordi Rutesegmentene ofte dekker mer sti enn selve Turen (målinger i addendum). Realiserer UJ-1.

#### FR-23: Vise Turforslag på kartet

Kartet viser Startpunkt og Omtrentlig rute for hvert Turforslag, merket «omtrentlig rute».

**Konsekvenser:**
- Hvert Turforslag har én markør og én rute på kartet.
- Kartet zoomer slik at alle Turforslagene synes.

#### FR-24: Koble liste og kart

Velger brukeren et Turforslag i listen, uthever kartet det og viser navn, lengde totalt, Vanskelighetsgrad og Startpunkt. Velger brukeren et Turforslag på kartet, uthever listen det.

#### FR-25: Navigere i kartet

Brukeren kan zoome og panorere med mus (rulle og dra) og med berøring (knipe og dra).

**Konsekvenser:**
- Bakgrunnskartet krever ingen API-nøkkel, og krediteringen synes.

### 4.6 Turdatasett

**Beskrivelse:** Turdatasettet er grunnlaget for alle Turforslag. Det ligger ferdig i repoet, slik at appen virker uten nedlasting, og det sjekkes automatisk.

#### FR-26: Innhold per Tur

Hver Tur har ID, navn, Startpunkt med navn og koordinater, retning, lengde totalt, høydemeter, høyeste punkt, Vanskelighetsgrad, utsikt, vann, Egnet i dårlig vær, Rutesegmenter og kilde.

**Konsekvenser:**
- Lengde totalt betyr alltid hele turen, også for tur–retur og rundtur.
- Høydemeter er kontrollert mot høydedata eller merket som anslag.

#### FR-27: Validere Turdatasettet

En automatisk test feiler når en Tur mangler et påkrevd felt, har en verdi utenfor gyldig område, eller viser til et Rutesegment som ikke finnes i den konverterte rutegeometrien.

#### FR-28: Konvertert rutegeometri

Rutegeometrien fra Turrutebasen ligger ferdig konvertert til WGS84 i repoet, og konverteringen kan gjentas med et skript som README beskriver.

#### FR-29: Kildehenvisning og kreditering

Hvert Turforslag lenker til kilden for Turen. Appen krediterer MET Norway, Turrutebasen (Kartverket), morotur.no og leverandøren av bakgrunnskartet.

## 5. Tverrgående krav

- **NFR-1 Responsivt design.** Appen er brukbar fra 360 px til 1440 px bredde uten horisontal scrolling. På brede skjermer står kart og liste side om side; på smale stables de. Trykkflater er minst 44 × 44 px, og ingen funksjon krever hover. Brytningspunktet avgjøres i UX.
- **NFR-2 Testbarhet.** Turtid, Værklasse, filtrering, rangering, Regeltekst, Bedre tidsvindu og Mørkevarsel kan testes uten nettverk og uten brukergrensesnitt, med faste værdata og et fast testdatasett.
- **NFR-3 Kjørbar for sensor.** Appen kan startes lokalt etter README uten gruppens nøkler eller betalte kontoer. Uten språkmodellnøkkel virker alt unntatt Språkmodelltekst.
- **NFR-4 MET-vilkår.** Værkall går via appens egen server med identifiserende User-Agent, følger cache-headerne fra MET og bruker HTTPS og maks fire desimaler i koordinatene. Nettleseren kaller aldri MET direkte.
- **NFR-5 Ytelse.** Turforslag vises innen 3 s etter trykk, målt med nettleserens nettverksstruping «Fast 4G».
- **NFR-6 Personvern.** Appen lagrer ingen persondata, ber ikke om posisjon, har ingen kontoer og bruker ingen sporings- eller analyseverktøy.
- **NFR-7 Hemmeligheter.** Nøkler ligger i `.env`, som ikke committes; `.env.example` committes.
- **NFR-8 Språk.** Brukergrensesnittet er på norsk bokmål.
- **NFR-9 Grunnleggende tilgjengelighet.** Skjemaet kan brukes med tastatur, alle felt har synlige etiketter, og tekst har en kontrast på minst 4,5:1 mot bakgrunnen.

## 6. Rammer og risiko

**Sikkerhet.** Værvurderingen er informativ. Appen kaller aldri en tur «trygg», vurderer ikke føre (snø, is, gjørme) og erstatter ikke MET sine farevarsler. Ved Turforslagene står en kort merknad om at brukeren selv har ansvaret.

**Kostnad.** Datakildene er gratis. Språkmodellen koster per kall når den er slått på, og er av som standard.

| Risiko | Konsekvens | Tiltak |
|---|---|---|
| morotur.no har ingen publisert lisens (kilde for 11 av 12 Turer) | Lav i skolesammenheng | Bare fakta, ikke kildetekst; kildelenke per Tur (FR-29); kontakt Møre og Romsdal fylkeskommune før bruk utover IBE160 |
| Feil i turdata (lengde for tur–retur, høydemeter) | Feil Turtid gir feil filtrering | FR-26 og FR-27; spørsmål 2 og 3 i §10 |
| Ett Værpunkt for hele Moldemarka | Temperaturen på toppene (opptil 705 moh) kan avvike flere grader | Akseptert i MVP; spørsmål 4 i §10 |
| MET er nede eller endrer API-et | Ingen værvurdering | FR-13 |

## 7. Ikke-mål

Dette skal appen ikke gjøre, heller ikke etter MVP. Det som kan komme senere, står i §8.2.

- Ingen navigasjon, GPS-sporing eller posisjon fra brukeren.
- Ingen vurdering av føre (snø, is, gjørme).
- Språkmodellen velger eller rangerer aldri Turer.
- Appen erstatter ikke MET sine farevarsler.

## 8. MVP-omfang

### 8.1 Med i MVP

- Søk (FR-1–FR-6), Værvurdering (FR-7–FR-13), Anbefaling (FR-14–FR-19), Regeltekst og Mørkevarsel (FR-20–FR-21), Kartvisning (FR-23–FR-25), Turdatasett (FR-26–FR-29) og NFR-1–NFR-9.
- Språkmodelltekst (FR-22) bygges sist, etter at kjerneflyten er ferdig og testet.

### 8.2 Utenfor MVP

- Brukerkontoer, lagrede favoritter og lagrede Søk.
- Turforslag lenger fram enn i morgen.
- Flerdagers turplanlegging og ruteoptimalisering.
- Deling av Turforslag.
- Andre aktiviteter enn fottur.
- Reisetid og kollektivtransport til Startpunktet.
- Eksakt turtrasé på kartet.
- Flere områder enn Moldemarka.
- Værmelding per Tur i stedet for ett Værpunkt.
- Opplevelsespreferansen «historie»; feltet finnes i datasettet, men brukes ikke.

## 9. Suksessmål

**Primære**
- **SM-1 Raskt nok:** Minst 4 av 5 testpersoner går fra åpnet side til første Turforslag på under ett minutt i en enkel brukertest. Validerer FR-1–FR-6 og FR-17.
- **SM-2 Reglene holder:** Alle konsekvensene under FR-8, FR-9 og FR-14–FR-21 har automatiske tester med faste værdata, og alle passerer. Validerer FR-8–FR-21 og NFR-2.

**Sekundære**
- **SM-3 Kjørbar:** En person utenfor gruppa starter appen etter README på egen maskin, uten hjelp og uten nøkler. Validerer NFR-3.
- **SM-4 Responsivt:** En manuell sjekkliste ved 360, 768 og 1440 px viser ingen horisontal scrolling og ingen funksjon som krever hover. Validerer NFR-1.

**Motmål (skal ikke optimaliseres)**
- **SM-C1 Andel Søk med Turforslag:** Skal ikke presses opp. «Frarådet» og «ingen Tur passer» er riktige svar, ikke feil. Motvekt til SM-1.
- **SM-C2 Antall Turer:** Flere Turer er ikke et mål i seg selv; hver Tur må bestå FR-27. Motvekt mot å utvide Turdatasettet for å få flere treff.

## 10. Åpne spørsmål

Ingen av spørsmålene hindrer UX eller arkitektur. Simon eier alle. Spørsmål 2, 3 og 5 må være løst før Turdatasettet regnes som ferdig (FR-26, FR-27), og spørsmål 1 før værtersklene låses i koden. De andre kan vente til implementasjonen.

1. **Værterskler:** Stemmer tersklene i §4.2 med opplevd turvær? Sjekk dem mot 5–10 virkelige dager før implementasjon.
2. **Lengde for tur–retur:** Er 7,69 km for Tusenårsvarden fra Grua hele turen eller én vei? Rutesegmentene alene er ca. 5,5 km én vei. Samme sjekk for Moldevatnet fra Jensgurilia.
3. **Høydemeter:** Frænavarden er et anslag (ca. 500 m), og for Storlihytta fra Vardeveien oppgir kilden både 58 og 25 m.
4. **Værpunkt:** Holder ett punkt for hele Moldemarka, eller trengs ett per Tur for å treffe temperaturen på toppene?
5. **Startkoordinater:** Hvor skal koordinatene for de 12 Startpunktene hentes fra (kart, kilden eller endepunktene til Rutesegmentene)?
6. **Pauser:** Skal Turtid ha et tillegg for pauser? Naismith regner bare gangtid.
7. **Variasjon:** Skal appen unngå tre Turforslag til samme mål? Tre Turer går til Tusenårsvarden.
8. **MET-oppløsning:** Rutenettets oppløsning for Moldemarka er ikke bekreftet (lav prioritet).
