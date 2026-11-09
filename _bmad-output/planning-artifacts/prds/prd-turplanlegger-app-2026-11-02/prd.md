---
title: "PRD: Turplanlegger"
status: final
created: 2026-11-02
updated: 2026-11-09
---

# PRD: Turplanlegger

*Arbeidstittel, som i briefen.*

## 0. Om dokumentet

Denne PRD-en beskriver hva Turplanlegger skal gjøre i MVP, slik at UX, arkitektur og epics/stories kan bygges direkte på den. Den bygger på [product brief](../../briefs/brief-turplanlegger-app-2026-09-04/brief.md) (status final) med addendum, på [MET-researchen](../../research/technical-met-locationforecast-api-for-turplanlegg-2026-10-29/research.md) og på `data/turer-moldemarka.json`, og gjentar dem ikke.

- Begrepene i §3 brukes ordrett i hele dokumentet, med stor forbokstav.
- Alt har faste nummer: brukerreiser UJ-1–UJ-3, funksjonelle krav FR-1–FR-29, tverrgående krav NFR-1–NFR-11, suksessmål SM-1–SM-4 og motmål SM-C1–SM-C2.
- Antakelsene fra utkastet er godkjent (2026-11-02). De åpne spørsmålene i §10 ble gått gjennom 2026-11-03; det som gjenstår, står der. Gjennomgangen 2026-11-06 rettet soltidene og la til en resultattabell (FR-6), Demomodus (NFR-11), regler for tid og en dataoppgave for Rutesegmentene. Den ble gjort samme dag, sammen med startkoordinatene (§10, spørsmål 5 og 9). 2026-11-09 ble høydemeterne kontrollert mot høydedata, som ga ny Turtid for to Turer (spørsmål 3). Samme dag ble koordinaten for Værpunktet valgt (spørsmål 4).
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
En søndag kveld i november sitter Ingrid ved PC-en; mandag går sola ned 15:59. Hun velger Turdag «i morgen», Starttidspunkt 10:00, 3 t, Krevende og utsikt. Værmeldingen gir dårlig vær på formiddagen, så appen viser en Værvarsling, rangerer Lavtliggende turer og Turer som er Egnet i dårlig vær øverst, med Moldevatnet fra Jensgurilia først, og opplyser om et Bedre tidsvindu fra kl. 14. Hun tar det i bruk og får Turer med utsikt øverst igjen, men bare slike hun rekker før mørket: Storlihytta fra Romsdalsmuseet står først. Tusenårsvarden fra Damefallet og de lengre utsiktsturene ville endt etter 15:29 og havner lenger ned. **Edge case:** Finnes det ikke noe Bedre tidsvindu, sier appen det rett ut.

**UJ-3. Ingrid får beskjed om å vente.**
En lørdag formiddag er det meldt sterk kuling. Ingrid vil gå før lunsj, men Værklassen for Tidsvinduet er «frarådet». Hun får ingen Turforslag, men en melding om at det er meldt vind opp mot 19 m/s, og et Bedre tidsvindu i morgen fra kl. 11. Hun tar det i bruk og får Turforslag som vanlig. **Edge case:** Med bare 15 minutter passer ingen Tur. Appen viser da den korteste Turen (16 min) og sier hvor mye mer tid hun trenger.

## 3. Begreper

- **Tur** — En kuratert fottur i Moldemarka med Startpunkt, lengde totalt, høydemeter, høyeste punkt, Vanskelighetsgrad, utsikt (ja/nei), vann (ja/nei) og Egnet i dårlig vær. Koblet til ett eller flere Rutesegmenter.
- **Turdatasett** — Alle Turer appen kan foreslå (12 i dag, 10–20 i MVP), lagret i repoet.
- **Startpunkt** — Navngitt sted med koordinater der Turen starter.
- **Adkomst** — Veien fra Startpunktet til stinettet i Turrutebasen, når Startpunktet ligger utenfor det, for eksempel gater fra kaia. Oppgis med lengde og en kort beskrivelse.
- **Mål** — Stedet Turen går til, for eksempel Tusenårsvarden eller Storlihytta. Flere Turer kan ha samme Mål fra ulike Startpunkter.
- **Rutesegment** — En navngitt rute i stinettverket fra Turrutebasen, identifisert med rutenummer og rutenavn sammen, siden samme rutenummer kan brukes for flere ruter. Består av én eller flere linjebiter.
- **Omtrentlig rute** — En Tur tegnet på kartet som alle Rutesegmentene den er koblet til. Kan vise mer sti enn selve Turen.
- **Søk** — Én forespørsel fra brukeren: Turdag, Starttidspunkt, Tilgjengelig tid, Vanskelighetsgrad og eventuelle Opplevelsespreferanser.
- **Turdag** — I dag eller i morgen.
- **Starttidspunkt** — Klokkeslettet på Turdagen da brukeren vil starte.
- **Tilgjengelig tid** — Tiden brukeren har til selve turen. Reise til og fra Startpunktet er ikke med. Pauser må brukeren regne med selv, siden Turtid ikke inkluderer dem (FR-14).
- **Vanskelighetsgrad** — Enkel, Middels eller Krevende (Turrutebasens G, B og R). Brukerens valg er høyeste tillatte grad.
- **Opplevelsespreferanse** — Utsikt og/eller vann. Valgfri.
- **Turtid** — Beregnet gangtid for hele Turen etter Naismiths regel (FR-14), uten pauser.
- **Tidsvindu** — Fra Starttidspunktet til Starttidspunktet pluss Tilgjengelig tid.
- **Værpunkt** — Ett fast punkt midt i Moldemarka (62,7617 N, 7,1679 Ø), med høyde 400 moh, som representerer hele området. 400 moh er medianen av høyeste punkt for de 12 Turene og samme grense som for lavtliggende Tur.
- **Værmelding** — Timesverdier fra MET Locationforecast for Værpunktet: temperatur, nedbør, vind og værsymbol.
- **Værscenario** — Faste timesverdier for Værpunktet som erstatter Værmeldingen i tester og Demomodus.
- **Værterskler** — Produktets egne grenser for nedbør, vind og temperatur (§4.2). Ikke MET sine farevarselgrenser.
- **Værklasse** — God, middels, dårlig eller frarådet. Settes per time og for Tidsvinduet.
- **Værvarsling** — En tydelig melding i appen om at Værklassen for Tidsvinduet er dårlig. Ikke det samme som MET sine farevarsler.
- **Lavtliggende tur** — En Tur med høyeste punkt under 400 moh.
- **Egnet i dårlig vær** — Ja, nei eller ukjent per Tur, ut fra hva kilden sier. Ukjent betyr at kilden ikke sier noe, ikke nei.
- **Turforslag** — En Tur som er valgt og rangert for et Søk, med Begrunnelse og eventuelle varsler. Maks tre per Søk.
- **Begrunnelse** — Teksten som forklarer hvorfor Turen er foreslått: enten Regeltekst eller Språkmodelltekst.
- **Regeltekst** — Begrunnelse satt sammen direkte fra reglene som slo inn. Alltid tilgjengelig.
- **Språkmodelltekst** — Omformulering av Regelteksten fra en språkmodell. Brukes bare når en nøkkel er satt opp (FR-22).
- **Alternativ** — Det appen viser i stedet for Turforslag: den korteste Turen eller et Bedre tidsvindu.
- **Bedre tidsvindu** — Det tidligste Starttidspunktet i dag eller i morgen der Tidsvinduet får en bedre Værklasse.
- **Mørkevarsel** — Varsel på et Turforslag om at Turen ender senere enn 30 min før solnedgang eller starter før soloppgang.
- **Demomodus** — Appen startet med et valgt Værscenario og et fast «nå» i stedet for MET og klokka (NFR-11).

## 4. Funksjoner

### 4.1 Søk

**Beskrivelse:** Brukeren fyller ut ett skjema og trykker én knapp. Alle felt har standardverdier, så et Søk kan sendes uten å endre noe. Realiserer UJ-1, UJ-2 og UJ-3.

#### FR-1: Velge Turdag

Brukeren kan velge Turdag «i dag» eller «i morgen». Realiserer UJ-2.

**Konsekvenser (testbare):**
- Bare de to valgene finnes; standard er «i dag».
- Etter kl. 22:00 kan «i dag» ikke velges, og Turdag står på «i morgen».
- Værmelding, Bedre tidsvindu og solnedgang gjelder valgt Turdag.
- Turdag og alle klokkeslett følger norsk tid (Europe/Oslo), også når enheten eller serveren står i en annen tidssone.

#### FR-2: Velge Starttidspunkt

Brukeren kan velge Starttidspunkt på Turdagen. Realiserer UJ-2.

**Konsekvenser:**
- Valgene er hele kvarter fra 06:00 til 22:00.
- For «i dag» er standard «nå», rundet opp til nærmeste kvarter og tidligst 06:00. Tidspunkter som har passert kan ikke velges.
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

Brukeren kan sende Søket med ett trykk. Hva Søket gir, avhenger av Værklassen for Tidsvinduet og av om minst én Tur passer (FR-15), slik tabellen viser. Realiserer UJ-1, UJ-2 og UJ-3.

| Værklasse for Tidsvinduet | Minst én Tur passer | Ingen Tur passer |
|---|---|---|
| God eller middels | Turforslag | Den korteste Turen som Alternativ (FR-18) |
| Dårlig | Værvarsling, Turforslag og Bedre tidsvindu (FR-11, FR-19) | Værvarsling, den korteste Turen og Bedre tidsvindu |
| Frarådet | Melding og Bedre tidsvindu, ingen Turforslag (FR-12) | Som til venstre |
| Værmeldingen mangler | Turforslag og melding om at været ikke er vurdert (FR-13) | Den korteste Turen og melding om at været ikke er vurdert |

**Konsekvenser:**
- Frarådet går foran alt annet: da vises verken Turforslag eller den korteste Turen.
- Finnes det ikke noe Bedre tidsvindu, sier appen det i stedet (FR-19).
- Et Søk med bare standardverdier gir et gyldig resultat.
- Et nytt Søk erstatter det forrige resultatet helt.

### 4.2 Værvurdering

**Beskrivelse:** Appen henter Værmeldingen for Værpunktet og setter en Værklasse for hver time ut fra Værterskler. Den dårligste timen i Tidsvinduet bestemmer Værklassen for Søket. Tersklene er produktets egne, ikke MET sine farevarselgrenser. Vindgrensene følger Beaufort-skalaen, mens nedbørs- og temperaturgrensene er produktvalg; bakgrunnen står i addendum. Realiserer UJ-1, UJ-2 og UJ-3.

**Værterskler** (startverdier; kalibreres etter spørsmål 1 i §10)

| Værklasse | Nedbør | Middelvind | Temperatur |
|---|---|---|---|
| Frarådet | ≥ 10 mm/t | ≥ 17,2 m/s (sterk kuling) | – |
| Dårlig | ≥ 2 mm/t | ≥ 10,8 m/s (liten kuling) | < −10 °C |
| Middels | ≥ 0,5 mm/t | ≥ 8,0 m/s (frisk bris) | < 0 °C |
| God | under alle grensene over | | |

Middels påvirker verken utvalg, rangering eller varsler; den vises bare i værsammendraget (FR-10). Det er dårlig og frarådet som endrer hva appen foreslår.

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

**Merknad:** Værklassen gjelder hele Tidsvinduet, ikke bare Turtiden, slik at hvert Søk har én Værklasse. Det er et bevisst valg: det er enkelt og forutsigbart, men kan være strengere enn nødvendig når Turtiden er mye kortere enn Tilgjengelig tid.

#### FR-10: Vise værsammendrag

For Tidsvinduet viser appen Værklasse, temperaturspenn, høyeste nedbør, høyeste vind og værsymbol. Realiserer UJ-1.

**Konsekvenser:**
- Sammendraget sier hvilken høyde Værmeldingen gjelder for, for eksempel «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.»

#### FR-11: Vise Værvarsling

Er Værklassen dårlig, viser appen en Værvarsling over Turforslagene eller Alternativet, med verdiene som utløste den. Realiserer UJ-2.

#### FR-12: Fraråde tur

Er Værklassen frarådet, viser appen ingen Turforslag. I stedet viser den en melding med verdiene som utløste klassen, og et Bedre tidsvindu som Alternativ (FR-19). Realiserer UJ-3.

**Konsekvenser:**
- Meldingen sier hva som er meldt, f.eks. «vind opp mot 19 m/s».
- Aldri en tom side eller feilmelding.

#### FR-13: Turforslag uten Værmelding

Kan ikke Værmeldingen hentes, eller svarer ikke MET innen 2 s, gir appen Turforslag uten værregler og sier tydelig at været ikke er vurdert. Realiserer UJ-1 (edge case).

**Konsekvenser:**
- Ingen Værklasse, Værvarsling eller Bedre tidsvindu vises.
- Begrunnelsen sier at værdata mangler.
- Rangeringen følger reglene for god og middels vær (FR-16).

### 4.3 Anbefaling

**Beskrivelse:** Appen beregner Turtid, fjerner Turer som ikke passer, rangerer resten og viser de tre beste. Alt følger faste regler, slik at resultatet kan testes med faste Værscenarioer (NFR-2). Realiserer UJ-1, UJ-2 og UJ-3.

#### FR-14: Beregne Turtid

Systemet beregner Turtid med Naismiths regel: lengde totalt ÷ 5 km/t + høydemeter ÷ 600 m/t, avrundet til nærmeste hele minutt.

**Konsekvenser:**
- Tusenårsvarden fra Damefallet (5,0 km, 318 høydemeter) får Turtid 1 t 32 min.
- Storlihytta fra Vardeveien (1,06 km, 35 høydemeter) får Turtid 16 min.
- Der Turtid vises, står det at den er uten pauser. Ordlyden avgjøres i UX.

#### FR-15: Filtrere Turer

Systemet fjerner Turer med Turtid over Tilgjengelig tid og Turer som er vanskeligere enn valgt Vanskelighetsgrad.

**Konsekvenser:**
- Ved 1 t Tilgjengelig tid foreslås ingen Tur med Turtid over 60 min.
- Ved Enkel foreslås aldri en Tur med Vanskelighetsgrad Middels eller Krevende.
- Været fjerner aldri enkeltturer; det påvirker rangeringen (FR-16) eller fører til frarådet (FR-12).

#### FR-16: Rangere Turer

Systemet rangerer de gjenværende Turene ved å sammenligne dem på kriteriene under, i rekkefølge. Neste kriterium brukes bare når Turene står likt på det forrige.

Ved god eller middels Værklasse, og når Værmeldingen mangler:
1. Turer uten Mørkevarsel (FR-21) før Turer med.
2. Antall av brukerens Opplevelsespreferanser Turen treffer, flest først.
3. Turtid nærmest Tilgjengelig tid først.
4. Turens ID, alfabetisk.

Ved dårlig Værklasse:
1. Turer uten Mørkevarsel (FR-21) før Turer med.
2. Lavtliggende tur før andre Turer.
3. Egnet i dårlig vær: ja før ukjent, ukjent før nei.
4. Antall av brukerens Opplevelsespreferanser Turen treffer, flest først. Utsikt teller ikke.
5. Turtid nærmest Tilgjengelig tid først.
6. Turens ID, alfabetisk.

**Konsekvenser:**
- Samme Søk, Værmelding og Turdatasett gir alltid samme rekkefølge.
- Middels og god Værklasse gir samme Turforslag i samme rekkefølge.
- UJ-1 (god Værklasse, 9. november, start 13:30, 2 t, Middels, utsikt) gir med dagens Turdatasett Tusenårsvarden fra Damefallet, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet, i den rekkefølgen og uten Mørkevarsel.
- Ved dårlig Værklasse står Moldevatnet fra Jensgurilia (lavtliggende, egnet: ja) over Bergsvatnet (lavtliggende, egnet: ukjent) når begge passer og ingen av dem får Mørkevarsel.
- UJ-2 med Bedre tidsvindu (god Værklasse, 9. november, start 14:00, 3 t, Krevende, utsikt, solnedgang 15:59) gir Storlihytta fra Romsdalsmuseet, Skihytta fra Damefallet og Bergsvatnet. Tusenårsvarden fra Damefallet ender 15:32, etter grensen på 15:29, og får Mørkevarsel. Uten Mørkevarsel-kriteriet ville Tusten, Frænavarden og Varden stått øverst, alle med Mørkevarsel.

#### FR-17: Vise opptil tre Turforslag

Appen viser opptil tre Turforslag. Den går nedover rangeringen fra FR-16 og velger først den høyest rangerte Turen for hvert Mål. Gir det færre enn tre Turforslag, fylles listen med de neste Turene i rangeringen, også om Målet allerede er vist.

**Konsekvenser:**
- Passer to Turer, vises to; appen fyller ikke på med Turer som ikke passer.
- Variasjonsregelen gir aldri færre Turforslag enn rangeringen alene ville gitt.
- God Værklasse, 9. november, start 10:00, 2 t 30 min, Krevende, utsikt og vann gir med dagens Turdatasett Tusenårsvarden fra Grua, Varden via Den grønne korridor og Moldevatnet fra Jensgurilia, i den rekkefølgen og uten Mørkevarsel. Uten variasjonsregelen ville alle tre gått til Tusenårsvarden.
- Passer bare tre Turer, to av dem til samme Mål, vises alle tre, med Turen til det andre Målet som nummer to.
- Under Turforslagene står en kort merknad om at brukeren selv har ansvaret for å vurdere forholdene (§6).

#### FR-18: Når ingen Tur passer

Fjerner FR-15 alle Turer, viser appen en forståelig melding med den korteste Turen innenfor valgt Vanskelighetsgrad som Alternativ, og sier hvor mye mer tid den krever. Realiserer UJ-3 (edge case).

**Konsekvenser:**
- Med 15 min Tilgjengelig tid og dagens Turdatasett vises Storlihytta fra Vardeveien (16 min), med «trenger 1 min mer».
- Den korteste Turen får Mørkevarsel etter samme regel som Turforslagene (FR-21).
- Aldri en tom side eller feilmelding.

**Merknad:** Briefen nevner «enklere tur» som alternativ. Siden Vanskelighetsgrad er en øvre grense, kan et lavere valg aldri gi flere treff, så alternativet er erstattet med den korteste Turen.

#### FR-19: Foreslå Bedre tidsvindu

Er Værklassen dårlig eller frarådet, leter appen etter et Bedre tidsvindu med samme Tilgjengelig tid. Den prøver hele timer i dagslys, fra soloppgang til 30 min før solnedgang og innenfor valgene i FR-2 (06:00–22:00), på Turdagen og, når Turdag er «i dag», også i morgen. Det tidligste Starttidspunktet med bedre Værklasse vises slik tabellen under FR-6 sier. Realiserer UJ-2 og UJ-3.

**Konsekvenser:**
- Bare Starttidspunkt som ikke har passert, vurderes.
- 9. november (sol opp 08:30, ned 15:59) prøves 09:00–15:00.
- 21. juni (sol opp ca. 03:30, ned ca. 23:40) prøves 06:00–22:00, ikke 04:00–23:00.
- Finnes det ikke noe Bedre tidsvindu, sier appen det.
- Brukeren kan ta i bruk Bedre tidsvindu med ett trykk; det sender et nytt Søk med det nye Starttidspunktet og Turdagen.

### 4.4 Begrunnelse og varsler

**Beskrivelse:** Hvert Turforslag forklarer seg selv med en Regeltekst og får varsler når det er grunn til det. Språkmodellen er et lag oppå Regelteksten som bare brukes når en nøkkel er satt opp, og den bygges sist. Realiserer UJ-1 og UJ-2.

#### FR-20: Lage Regeltekst

Hvert Turforslag har en Regeltekst som nevner:
- Turtid og Tilgjengelig tid,
- værsammendraget for Tidsvinduet, eller at Værmeldingen mangler,
- hvilke av brukerens Opplevelsespreferanser Turen treffer, når brukeren har valgt noen,
- reglene for dårlig vær som slo inn (Lavtliggende tur, Egnet i dårlig vær).

**Konsekvenser:**
- Samme Søk og Værmelding gir samme Regeltekst.
- Regelteksten nevner aldri en regel som ikke slo inn.
- Værord som «oppholdsvær» og «lite vind» følger faste grenser, så samme værdata alltid gir samme ord. Ordene og grensene avgjøres i UX og ligger på ett sted, slik Værtersklene gjør (NFR-10).
- Regelteksten bruker aldri ordene «trygg» eller «trygt» (§6).

#### FR-21: Vise Mørkevarsel

Ender Turen senere enn 30 min før solnedgang, eller starter den før soloppgang, får Turforslaget et Mørkevarsel med klokkeslettet for solnedgang eller soloppgang. Marginen på 30 min veier opp for at Turtid er uten pauser. Realiserer UJ-2.

**Konsekvenser:**
- Turen ender ved Starttidspunkt + Turtid; sol opp og ned gjelder Turdagen.
- Med solnedgang 16:00 får en Tur som ender 15:30 ikke Mørkevarsel, mens en Tur som ender 15:31 får det.
- Mørkevarselet fjerner ingen Turer, men Turer uten Mørkevarsel rangeres først (FR-16).
- Solnedgang og soloppgang beregnes i appen, uten ekstern tjeneste eller nøkkel. Beregningen gjelder Værpunktets koordinat, bruker havnivå som horisont (ingen høydekorreksjon) og avrundes til nærmeste hele minutt.
- For 9. november 2026 gir beregningen sol opp 08:30 og ned 15:59, med høyst 2 min avvik.

#### FR-22: Språkmodelltekst (krever nøkkel, bygges sist)

Er en API-nøkkel satt opp, kan systemet erstatte Regelteksten med en Språkmodelltekst som sier det samme i mer naturlig språk.

**Konsekvenser:**
- Turforslagene vises med en gang med Regelteksten. Kommer Språkmodellteksten innen 5 s, erstatter den Regelteksten. Kommer den senere, mangler nøkkelen eller feiler kallet, blir Regelteksten stående.
- Språkmodellen kalles først når Turforslagene er valgt og rangert, og får bare Regelteksten og fakta om Turen. Den påvirker aldri utvalg eller rekkefølge.
- Regelteksten blir også stående når Språkmodellteksten mangler et tall fra Regelteksten (Turtid, Tilgjengelig tid, værverdier), har et tall som verken står i Regelteksten eller i fakta om Turen, eller bruker ordene «trygg» eller «trygt».
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

Hver Tur har ID, navn, Mål, Startpunkt med navn og koordinater, retning, lengde totalt, høydemeter, høyeste punkt, Vanskelighetsgrad, utsikt, vann, Egnet i dårlig vær, Rutesegmenter (rutenummer og rutenavn), kilde og eventuell Adkomst.

**Konsekvenser:**
- Lengde totalt betyr alltid hele turen, også for tur–retur og rundtur.
- Høydemeter er samlet stigning for hele turen. Tallet er kontrollert mot høydedata eller merket som anslag, og merkingen kan leses maskinelt, slik at testen i FR-27 kan sjekke den. Et kontrollert tall har den målte verdien ved siden av seg.
- Startpunktet oppgir hvor koordinatene er hentet fra (kilden eller Kartverket, for eksempel norgeskart.no).
- Turer som starter på samme sted, har samme Startpunkt med samme navn og koordinater.
- Ligger Startpunktet mer enn 200 m fra Turens Rutesegmenter, oppgir Turen Adkomst. Det gjelder fem Turer: Varden via Den grønne korridor (fra kaia), Storlihytta fra Romsdalsmuseet (fra museet) og de tre Turene fra Jensgurilia.
- Turdatasettet ligger i én fil i repoet. Andre formater, som CSV, lages fra den.

#### FR-27: Validere Turdatasettet

En automatisk test feiler når en Tur:
- mangler et påkrevd felt eller har en verdi utenfor gyldig område,
- viser til et Rutesegment som ikke finnes i den konverterte rutegeometrien,
- har Rutesegmenter som ikke henger sammen, det vil si hull på mer enn 50 m mellom linjebitene, eller
- har et Startpunkt for langt fra alle Turens Rutesegmenter: mer enn 200 m, eller mer enn Adkomstens lengde pluss 200 m når Turen har Adkomst, eller
- har høydemeter som verken er kontrollert eller merket som anslag, eller som avviker mer enn 20 m fra den målte verdien.

**Merknad:** Med Rutesegmentene fra spørsmål 9 og Startpunktene fra spørsmål 5 i §10 består alle 12 Turer sjekken av Rutesegmenter og Startpunkt (målt 2026-11-06). Høydemeterne ble kontrollert 2026-11-09 (spørsmål 3): 11 Turer er kontrollert og innenfor 20 m, og Varden er merket som anslag.

#### FR-28: Konvertert rutegeometri

Rutegeometrien fra Turrutebasen ligger ferdig konvertert til WGS84 i repoet, og konverteringen kan gjentas med et skript som README beskriver.

#### FR-29: Kildehenvisning og kreditering

Hvert Turforslag lenker til kilden for Turen. Appen krediterer MET Norway, Turrutebasen (Kartverket), kildene for Turene (morotur.no og Fjord Norway) og leverandøren av bakgrunnskartet.

## 5. Tverrgående krav

- **NFR-1 Responsivt design.** Appen er brukbar fra 360 px til 1440 px bredde uten horisontal scrolling. På brede skjermer står kart og liste side om side; på smale stables de. Trykkflater er minst 44 × 44 px, og ingen funksjon krever hover. Brytningspunktet avgjøres i UX.
- **NFR-2 Testbarhet.** Turtid, Værklasse, filtrering, rangering, Regeltekst, Bedre tidsvindu og Mørkevarsel kan testes uten nettverk og uten brukergrensesnitt, med et fast Værscenario, et fast «nå», faste tider for sol opp og ned og et fast testdatasett. Solberegningen testes for seg (FR-21).
- **NFR-3 Kjørbar for sensor.** Appen kan startes lokalt etter README uten gruppens nøkler eller betalte kontoer. Uten språkmodellnøkkel virker alt unntatt Språkmodelltekst.
- **NFR-4 MET-vilkår.** Værkall går via appens egen server med identifiserende User-Agent, følger cache-headerne fra MET og bruker HTTPS og maks fire desimaler i koordinatene. Nettleseren kaller aldri MET direkte.
- **NFR-5 Ytelse.** Turforslag med Regeltekst vises innen 3 s etter trykk, målt med nettleserens nettverksstruping «Fast 4G». Språkmodellteksten kan komme etterpå (FR-22).
- **NFR-6 Personvern.** Appen lagrer ingen persondata, ber ikke om posisjon, har ingen kontoer og bruker ingen sporings- eller analyseverktøy.
- **NFR-7 Hemmeligheter.** Nøkler ligger i `.env`, som ikke committes; `.env.example` committes.
- **NFR-8 Språk.** Brukergrensesnittet er på norsk bokmål.
- **NFR-9 Grunnleggende tilgjengelighet.** Skjemaet kan brukes med tastatur, alle felt har synlige etiketter, og tekst har en kontrast på minst 4,5:1 mot bakgrunnen.
- **NFR-10 Justerbare terskler.** Værtersklene kan endres på ett sted uten at filtrering, rangering eller andre regler må endres.
- **NFR-11 Demomodus.** Appen kan startes i Demomodus, uten MET. Det finnes minst ett Værscenario per brukerreise: godt vær (UJ-1), dårlig vær om formiddagen som blir bedre fra kl. 14 (UJ-2) og sterk kuling (UJ-3). Scenariene er de samme som testene bruker (NFR-2). I Demomodus kan Språkmodelltekst vises med den falske språkmodellen (FR-22). Appen viser tydelig at den er i Demomodus, og README forklarer hvordan den startes.

## 6. Rammer og risiko

**Sikkerhet.** Værvurderingen er informativ. Appen kaller aldri en tur «trygg» (FR-20, FR-22), vurderer ikke føre (snø, is, gjørme) og erstatter ikke MET sine farevarsler. Ved Turforslagene står en kort merknad om at brukeren selv har ansvaret (FR-17).

**Kostnad.** Datakildene er gratis. Språkmodellen koster per kall når den er slått på, og er av som standard.

| Risiko | Konsekvens | Tiltak |
|---|---|---|
| morotur.no har ingen publisert lisens (kilde for 11 av 12 Turer) | Lav i skolesammenheng | Bare fakta, ikke kildetekst; kildelenke per Tur (FR-29); kontakt Møre og Romsdal fylkeskommune før bruk utover IBE160 |
| Feil i turdata (lengde for tur–retur, høydemeter) | Feil Turtid gir feil filtrering | Lengde avklart 2026-11-03 og høydemeter kontrollert mot høydedata 2026-11-09 (§10, spørsmål 2 og 3); FR-26 og FR-27 |
| Ett Værpunkt for hele Moldemarka | Temperaturen på toppene (opptil 705 moh) kan være ca. 2 °C lavere enn ved Værpunktet, og lavtliggende Turer ca. 2 °C høyere | Akseptert i MVP: Værpunktet ligger på 400 moh, og værsammendraget sier hvilken høyde det gjelder (FR-10) |
| MET er nede eller endrer API-et | Ingen værvurdering | FR-13 |
| Feil i rutegeometrien: samme rutenummer for flere ruter, eller hull | Misvisende rute på kartet | Rutesegment med rutenummer og rutenavn (§3); FR-27; spørsmål 9 i §10 |
| Sensor eller testpersoner prøver appen i godt vær eller i mørket | UJ-2 og UJ-3 kan ikke vises, og nesten alle Turforslag får Mørkevarsel | Demomodus (NFR-11) |

## 7. Ikke-mål

Dette skal appen ikke gjøre, heller ikke etter MVP. Det som kan komme senere, står i §8.2.

- Ingen navigasjon, GPS-sporing eller posisjon fra brukeren.
- Ingen vurdering av føre (snø, is, gjørme).
- Språkmodellen velger eller rangerer aldri Turer.
- Appen erstatter ikke MET sine farevarsler.

## 8. MVP-omfang

### 8.1 Med i MVP

- Søk (FR-1–FR-6), Værvurdering (FR-7–FR-13), Anbefaling (FR-14–FR-19), Regeltekst og Mørkevarsel (FR-20–FR-21), Kartvisning (FR-23–FR-25), Turdatasett (FR-26–FR-29) og NFR-1–NFR-11.
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
- Værmelding per Tur i stedet for ett Værpunkt. Oppløsningen i MET-rutenettet for Moldemarka må da sjekkes først.
- Opplevelsespreferansen «historie»; feltet finnes i datasettet, men brukes ikke.

## 9. Suksessmål

**Primære**
- **SM-1 Raskt nok:** Minst 4 av 5 testpersoner går fra åpnet side til første Turforslag på under ett minutt i en enkel brukertest. Testen kjøres i Demomodus med Værscenarioet for UJ-1, så resultatet ikke avhenger av dagens vær. Validerer FR-1–FR-6 og FR-17.
- **SM-2 Reglene holder:** Alle konsekvensene under FR-6 og FR-8–FR-21 har automatiske tester med faste Værscenarioer, og alle passerer. Det gjelder også hver rute i tabellen under FR-6. Konsekvenser for hva som vises, testes gjennom brukergrensesnittet. Validerer FR-6, FR-8–FR-21 og NFR-2.

**Sekundære**
- **SM-3 Kjørbar:** En person utenfor gruppa starter appen etter README på egen maskin, uten hjelp og uten nøkler, og viser alle tre brukerreisene i Demomodus. Validerer NFR-3 og NFR-11.
- **SM-4 Responsivt:** En manuell sjekkliste ved 360, 768 og 1440 px viser ingen horisontal scrolling og ingen funksjon som krever hover. Validerer NFR-1.

**Motmål (skal ikke optimaliseres)**
- **SM-C1 Andel Søk med Turforslag:** Skal ikke presses opp. «Frarådet» og «ingen Tur passer» er riktige svar, ikke feil. Motvekt til SM-1.
- **SM-C2 Antall Turer:** Flere Turer er ikke et mål i seg selv; hver Tur må bestå FR-27. Motvekt mot å utvide Turdatasettet for å få flere treff.

## 10. Åpne spørsmål

Spørsmål 2, 3, 4, 6 og 7 ble avklart og spørsmål 8 lukket 2026-11-03. Samme dag ble fire funn fra gjennomgangen avgjort: Mørkevarsel påvirker rangeringen (FR-16, FR-21), Bedre tidsvindu prøver bare dagslys (FR-19), Værklassen gjelder hele Tidsvinduet (FR-9) og middels er bare informativ (§4.2). Gjennomgangen 2026-11-06 la til spørsmål 9, og spørsmål 5 og 9 ble avklart samme dag. 2026-11-09 ble høydemeterne kontrollert (spørsmål 3) og koordinaten for Værpunktet valgt (spørsmål 4). Én oppgave gjenstår: spørsmål 1 (kalibreringen). Simon eier den. Den hindrer ikke UX eller arkitektur, men må være gjort før Værvurderingen regnes som ferdig.

1. **Værterskler (kalibreringsoppgave):** Tersklene i §4.2 er startverdier. Logg Værmeldingen for Værpunktet i 7 dager for to Tidsvinduer (formiddag og ettermiddag), og noter egen vurdering hver gang: «ville jeg gått, og ville jeg valgt en lavtliggende Tur?». Juster tersklene hvis Værklassen avviker fra vurderingen i mer enn 2 av 14 tilfeller. Prioriter grensene for dårlig og frarådet, siden middels bare vises (§4.2). Må være gjort før Værvurderingen (§4.2) regnes som ferdig. Loggingen tar en kalenderuke og bør derfor gå parallelt med UX og arkitektur. Den er klar til å starte (2026-11-09): Tidsvinduene er formiddag 10:00–12:00 og ettermiddag 13:00–15:00, og skriptet `scripts/kalibrering_vaerlogg.py` henter Værmeldingen og fører den i et loggark. Fremgangsmåten står i [kalibreringsmappa](../../kalibrering/README.md).
2. **Lengde for tur–retur (avklart 2026-11-03):** 7,69 km for Tusenårsvarden fra Grua og 6,45 km for Moldevatnet fra Jensgurilia regnes som hele turen. Det ble utledet fra naboturer i datasettet og bekreftet 2026-11-06 av kildesporene på morotur.no, som går fram og tilbake (7,73 og 6,48 km). Det står i `merknad` for begge Turene. Samme sjekk viste at Midtveishuken rundt Øverlandsvatnet er en rundtur på 2,47 km i alt, ikke 2,47 km hver vei. Turdatasettet og eksempelet i FR-16 er rettet.
3. **Høydemeter (avklart 2026-11-03, kontrollert 2026-11-09):** Høydemeter er samlet stigning for hele turen. 2026-11-09 ble 11 Turer kontrollert mot Kartverkets terrengmodell (DTM1) langs kildesporene på morotur.no. Ni lå innenfor 20 m og beholder tallet fra kilden, også anslaget på 500 m for Frænavarden (målt 504 m). To lå mer enn 20 m unna og er rettet til målt verdi: Storlihytta fra Vardeveien fra 58 til 35 m (Turtid 19 → 16 min) og Midtveishuken fra 58 til 36 m (35 → 33 min). For Vardeveien bygde valget 2026-11-03 på en starthøyde på ca. 243 moh, men Startpunktet ligger på ca. 298 moh og ruta går ned til hytta. Varden har ikke noe kildespor og er merket som anslag. Turdatasettet merker hvert tall maskinlesbart (FR-26), og FR-27 sjekker merkingen. Rettingene endrer bare eksemplene i FR-14 og FR-18; UJ-1, UJ-2 og eksemplene i FR-16 og FR-17 er kontrollert med skript og gir samme resultat. Metoden står i addendum (Høydemeter).
4. **Værpunkt (avklart 2026-11-03, koordinat valgt 2026-11-09):** Ett Værpunkt i MVP, på 400 moh midt i Moldemarka (§3). Værsammendraget sier hvilken høyde Værmeldingen gjelder for (FR-10). Koordinaten er 62,7617 N, 7,1679 Ø. Terrenget ligger der på 401 moh, 220 m fra midtpunktet av alle kildesporene. Koordinaten brukes for kalibreringen (spørsmål 1), MET-kallet (med `altitude=400`) og sol opp og ned (FR-21), som gir de samme kontrollverdiene som før, 08:30 og 15:59 for 9. november 2026. Værmelding per Tur er utenfor MVP (§8.2).
5. **Startkoordinater (avklart 2026-11-06):** Koordinatene er hentet fra kilden, og Startpunktet sier hvor de kommer fra (FR-26). For ti Turer er det første punkt i et kildespor på morotur.no. For Storlihytta fra Vardeveien er sporet tegnet fra hytta, så der brukes GPS-koordinatene på turpagen. Kilden for Varden har ingen koordinater. Kaia er derfor Storkaia fra Kartverkets stedsnavnregister, som norgeskart.no søker i. Den ligger ved Scandic Hotel Alexandra, der skiltingen starter. «Parkering ved Hatlelitunnelen/Grua» og «Parkering ved Grua» er samme parkering: sporet for Frænavarden starter på den, og sporet for Tusenårsvarden 85 m nordvest for den, der turveien begynner. Begge Turene har nå Startpunktet «Parkering ved Hatlelitunnelen (Grua)». De 12 Turene har åtte Startpunkter, og alle ligger innenfor avstandsgrensen i FR-27. Adkomsten er målt på nytt fra Startpunktene: 1,9 km for Varden og 260 m for Midtveishuken og Bergsvatnet (addendum, Kart).
6. **Pauser (avklart 2026-11-03):** Turtid har ikke pausetillegg. Appen sier at Turtid er uten pauser (FR-14), og Mørkevarselet har en margin på 30 min før solnedgang (FR-21).
7. **Variasjon (avklart 2026-11-03):** Appen viser først ett Turforslag per Mål og fyller deretter på i rangeringsrekkefølge (FR-17). Mål er nytt felt per Tur (FR-26).
8. **MET-oppløsning (lukket 2026-11-03):** Ikke relevant for MVP. Med ett Værpunkt brukes én rute i rutenettet, og høyden korrigeres med `altitude`. Oppløsningen må sjekkes hvis Værmelding per Tur blir aktuelt (§8.2).
9. **Rutesegmenter (avklart 2026-11-06):** Turdatasettet viser til Rutesegmenter med rutenummer og rutenavn (§3, FR-26), siden `1506_MM_0312` brukes for to ruter. Rutesegmentene er sjekket mot kildesporene på morotur.no. Frænavarden fra Grua viste til `F_20170227_2` (Frænavarden/ Valltua), som ikke er del av turen. Den er byttet med `1506_MM_0303` og `1506_MM_0304`. Tusenårsvarden rundtur om Moldedalen har fått `1506_MM_0313`, som sporet følger, i stedet for `1505-1`. Fem Turer har fått Adkomst (FR-26), og alle 12 består sjekken i FR-27. Detaljer i addendum.
