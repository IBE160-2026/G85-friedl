---
title: "Felles brief for de 10 designkonseptene"
created: 2026-11-09
kilde: "PRD prd-turplanlegger-app-2026-11-02 (prd.md + addendum.md), data/turer-moldemarka.json"
---

# Felles brief: 10 designkonsepter for Turplanlegger (SVG-skisser)

Alle de 10 konseptene bygger på denne briefen. Den har det faktiske innholdet: tall, ordlyd og tilstander. Konseptene skal skille seg i form, struktur og ide, men ha det samme innholdet, slik at de kan sammenlignes.

## 1. Produktet på ett avsnitt

Turplanlegger veier værmeldingen og tiden du har opp mot 12 kuraterte fotturer i Moldemarka, og gir deg 1–3 konkrete **Turforslag** med en **Begrunnelse** du kan etterprøve. Du oppgir Turdag (i dag/i morgen), Starttidspunkt, Tilgjengelig tid, Vanskelighetsgrad og eventuelle Opplevelsespreferanser, og trykker «Finn tur». Anbefalingen følger faste regler, så samme Søk og samme Værmelding gir alltid samme svar. Primærbruker: **Ingrid**, 21 år, førsteårsstudent ved Høgskolen i Molde, som har bodd i byen i to måneder. Hun kjenner ikke Moldemarka, bruker oftest mobilen rett før hun går, av og til PC-en kvelden før. Hun vil være sikker på at turen er et fornuftig valg i dagens vær, og at hun er tilbake før det blir mørkt.

## 2. Begreper: bruk dem ordrett (PRD §3), med stor forbokstav der PRD-en har det

Tur · Turdatasett · Startpunkt · Adkomst · Mål · Rutesegment · **Omtrentlig rute** · **Søk** · **Turdag** · **Starttidspunkt** · **Tilgjengelig tid** · **Vanskelighetsgrad** (Enkel / Middels / Krevende) · **Opplevelsespreferanse** (utsikt, vann) · **Turtid** · **Tidsvindu** · Værpunkt · Værmelding · Værscenario · Værterskler · **Værklasse** (god / middels / dårlig / frarådet) · **Værvarsling** · **Lavtliggende tur** (høyeste punkt under 400 moh) · **Egnet i dårlig vær** (ja / nei / ukjent) · **Turforslag** (maks 3) · **Begrunnelse** · **Regeltekst** · Språkmodelltekst · **Alternativ** · **Bedre tidsvindu** · **Mørkevarsel** · **Demomodus**.

I UI-tekst kan begrepene stå med liten forbokstav der det er naturlig i en setning (Regelteksten i PRD-en skriver «passer tiden din»), men **etikettene i skjemaet og overskriftene skal bruke begrepene**: «Turdag», «Starttidspunkt», «Tilgjengelig tid», «Vanskelighetsgrad», «Opplevelsespreferanser», «Turforslag», «Bedre tidsvindu», «Mørkevarsel», «Værvarsling», «Omtrentlig rute».

## 3. Rammer (PRD §6, §7, §8.2): brudd her diskvalifiserer et konsept

- Appen kaller **aldri** en tur «trygg» eller «trygt», i ingen tekst.
- **Turtid vises alltid som uten pauser**, for eksempel «1 t 32 min gangtid, uten pauser» eller «Turtid 1 t 32 min (uten pauser)».
- **Ansvarsmerknad** under Turforslagene, for eksempel: «Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke føre (snø, is, gjørme). Følg MET sine farevarsler.»
- **Demomodus-merke** synlig på skjermene som kjører Demomodus (se tilstandene under), for eksempel «DEMOMODUS · Værscenario: Godt vær · «nå» = man. 9. nov. 13:30».
- **Kreditering** synlig på resultatskjermene, gjerne i bunnteksten og ved kartet: «Værdata: MET Norway» · «Turstier: Turrutebasen, Kartverket» · «Turer: morotur.no og Fjord Norway» · «Bakgrunnskart: © Kartverket» (kartleverandøren velges i arkitekturen; bruk Kartverket som plassholder). Hvert Turforslag har en kildelenke («Kilde: morotur.no»).
- Værsammendraget sier hvilken høyde det gjelder: «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.»
- Ruten på kartet er merket **«omtrentlig rute»**.
- **Ikke** ta med noe utenfor MVP: innlogging, konto, profil, favoritter/hjerter, lagrede søk, deling, GPS/«min posisjon», navigasjon/«start tur», reisetid/kollektiv, flere dager enn i dag/i morgen, andre aktiviteter, andre områder, «historie»-preferanse, bilder av turene (datasettet har ingen bilder), stjernevurderinger/anmeldelser og poeng/score-tall som ikke finnes i reglene.
- Norsk bokmål. Klokkeslett med kolon (13:30), desimalkomma (5,0 km, 3,5 mm/t), «t» og «min» (1 t 32 min).
- Ingen funksjon krever hover. Trykkflater minst 44 × 44 px. Tekstkontrast minst 4,5:1. Alle skjemafelt har synlige etiketter.

## 4. Skjema (FR-1–FR-6), standardverdier

| Felt | Valg | Standard |
|---|---|---|
| Turdag | I dag / I morgen | I dag (etter 22:00: i morgen) |
| Starttidspunkt | hele kvarter 06:00–22:00 | i dag: «nå», rundet opp til kvarter (i UJ-1: 13:30); i morgen: 10:00 |
| Tilgjengelig tid | 15 min – 5 t, steg på 15 min | 2 t. Hjelpetekst: tid til selve turen, uten reise til og fra Startpunktet |
| Vanskelighetsgrad | Enkel / Middels / Krevende (høyeste tillatte) | Middels |
| Opplevelsespreferanser | utsikt, vann (valgfritt, flere mulig) | ingen |
| Knapp | «Finn tur» | |

Startsiden skal kort forklare hva appen gjør (1–2 setninger), for eksempel: «Si når du vil gå og hvor lang tid du har. Vi veier værmeldingen og foreslår opptil tre turer i Moldemarka som passer, og forteller hvorfor.»

## 5. Tilstandene med de ekte tallene

Faste fakta: 9. november 2026 er en mandag. Sola går opp **08:30** og ned **15:59**. Mørkevarsel når Turen ender senere enn **15:29** (30 min før solnedgang). Turen ender ved Starttidspunkt + Turtid.

Værverdiene under er **illustrative Værscenario-verdier** (PRD-en gir bare klasse og «19 m/s»). Bruk dem likt i alle konsepter.

### Tilstand 1 – Søk (startside)
Demomodus: «Værscenario: Godt vær · «nå» = man. 9. nov. 13:30». Skjemaet med standardverdiene over: I dag, nå (13:30), 2 t, Middels, ingen Opplevelsespreferanser. Kort forklaring av hva appen gjør. Kreditering i bunnteksten.

### Tilstand 2 – Resultat i godt vær (UJ-1)
Søk: I dag (man. 9. nov.), 13:30, 2 t, Middels, utsikt. Tidsvindu 13:30–15:30.
Værsammendrag: **Værklasse god**, 3–5 °C, 0 mm nedbør, vind opptil 4 m/s, lettskyet. Værord: «oppholdsvær og lite vind». «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.»

| # | Turforslag | Startpunkt | Lengde totalt | Høydemeter | Høyeste punkt | Vanskelighetsgrad | Utsikt / vann | Turtid | Ender | Mørkevarsel |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Tusenårsvarden fra Damefallet | Parkering ved Damefallet, Vardeveien | 5,0 km | 318 m | 527 moh | Middels | utsikt ✓, vann ✓ | 1 t 32 min | 15:02 | nei |
| 2 | Storlihytta fra Romsdalsmuseet | Parkering ved Romsdalsmuseet (Adkomst ca. 500 m) | 3,46 km | 209 m | 270 moh | Enkel | utsikt ✓ | 1 t 2 min | 14:32 | nei |
| 3 | Skihytta fra Damefallet | Parkering ved Damefallet, Vardeveien | 3,06 km | 169 m | 391 moh | Enkel | utsikt ✓ | 54 min | 14:24 | nei |

Regeltekst nr. 1 (fra PRD, ordrett): **«passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt»**. Nr. 2: «passer tiden din (1 t 2 min av 2 t), oppholdsvær og lite vind, utsikt». Nr. 3: «passer tiden din (54 min av 2 t), oppholdsvær og lite vind, utsikt».
Kart: tre Startpunkter med markør og Omtrentlig rute, merket «omtrentlig rute». Nr. 1 er valgt i listen og uthevet på kartet med navn, lengde totalt, Vanskelighetsgrad og Startpunkt (FR-24). Valg i kartet uthever listen og omvendt.
Under listen: ansvarsmerknad. Hvert forslag: «Kilde: morotur.no».

### Tilstand 3a – Resultat i dårlig vær (UJ-2, kvelden før)
Demomodus: «Værscenario: Dårlig formiddag, bedre fra kl. 14 · «nå» = søn. 8. nov. 20:15». Søk: I morgen (man. 9. nov.), 10:00, 3 t, Krevende, utsikt. Tidsvindu 10:00–13:00.
**Værvarsling** (øverst, over Turforslagene, med verdiene som utløste den): **Værklasse dårlig**, «regn opptil 3,5 mm/t og vind opp mot 9 m/s», 2–4 °C. Forklaring: lavtliggende Turer og Turer som er egnet i dårlig vær står øverst.
**Bedre tidsvindu**: «I morgen fra kl. 14:00 er Værklassen god» med én knapp, for eksempel «Bruk 14:00» (sender nytt Søk med 14:00, samme 3 t).

| # | Turforslag | Startpunkt | Lengde | Høyeste punkt | Grad | Turtid | Ender | Hvorfor øverst |
|---|---|---|---|---|---|---|---|---|
| 1 | Moldevatnet fra Jensgurilia | Turparkering i Jensgurilia, Nordbyen (Adkomst 280 m) | 6,45 km | 340 moh | Middels | 1 t 33 min | 11:33 | Lavtliggende tur, Egnet i dårlig vær: ja, vann (ikke valgt) |
| 2 | Storlihytta fra Romsdalsmuseet | Parkering ved Romsdalsmuseet | 3,46 km | 270 moh | Enkel | 1 t 2 min | 11:02 | Lavtliggende tur, utsikt ✓ |
| 3 | Skihytta fra Damefallet | Parkering ved Damefallet, Vardeveien | 3,06 km | 391 moh | Enkel | 54 min | 10:54 | Lavtliggende tur, utsikt ✓ |

Regeltekst nr. 1, for eksempel: «passer tiden din (1 t 33 min av 3 t), regn opptil 3,5 mm/t og vind opp mot 9 m/s, lavtliggende tur (340 moh), egnet i dårlig vær». Moldevatnet har ikke utsikt, så utsikt nevnes ikke. Egnet i dårlig vær «ukjent» nevnes ikke i Regelteksten. Ingen av disse får Mørkevarsel.

### Tilstand 3b – Etter at Bedre tidsvindu er tatt i bruk (UJ-2)
Søk: I morgen, **14:00**, 3 t, Krevende, utsikt. Værklasse god. Tidsvindu 14:00–17:00. Mørkegrense 15:29.

| # | Turforslag | Turtid | Ender | Mørkevarsel |
|---|---|---|---|---|
| 1 | Storlihytta fra Romsdalsmuseet | 1 t 2 min | 15:02 | nei |
| 2 | Skihytta fra Damefallet | 54 min | 14:54 | nei |
| 3 | Bergsvatnet (Turparkering i Jensgurilia, 3,14 km, 281 moh, Enkel, vann) | 43 min | 14:43 | nei |

**Mørkevarsel** skal vises på et Turforslag. Etter FR-16 og FR-17 havner Turer med Mørkevarsel under de tre øverste i UJ-2, så vis Mørkevarselet som en tydelig merket **komponentdetalj** på skjerm 3b, med de ekte tallene: **Tusenårsvarden fra Damefallet**, Turtid 1 t 32 min, start 14:00, ender 15:32. «Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.» Merk detaljen for eksempel «Slik vises Mørkevarsel (Tusenårsvarden fra Damefallet er rangert lenger ned)». Mørkevarselet skal bruke klokkeslettet for solnedgang.

### Tilstand 4 – Frarådet (UJ-3)
Demomodus: «Værscenario: Sterk kuling · «nå» = lør. 14. nov. 09:40». Søk: I dag (lør. 14. nov.), 10:00, 2 t, Middels, ingen preferanser.
**Ingen Turforslag.** En melding (ikke feilmelding, aldri tom side) med verdiene som utløste klassen: «Værklasse frarådet: det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).» **Bedre tidsvindu** som Alternativ: «i morgen (søn. 15. nov.) fra kl. 11:00», med én knapp, for eksempel «Bruk i morgen 11:00». Gjerne en henvisning: «Sjekk også MET sine farevarsler.» Ingen den korteste Turen her (frarådet går foran alt).

### Tilstand 5 – Ingen Tur passer, og Værmeldingen mangler (FR-13 + FR-18)
**Live-modus, ikke Demomodus**: MET svarte ikke innen 2 s. Vis derfor **ikke** Demomodus-merket her. Søk: I dag (man. 9. nov.), 13:30, **15 min**, Middels.
Melding: ingen Tur passer 15 min. **Alternativ: den korteste Turen**, **Storlihytta fra Vardeveien** (HC-parkering ved Vardeveien, 1,06 km, 35 høydemeter, 301 moh, Enkel, utsikt), Turtid **16 min**, «**trenger 1 min mer**». Ender 13:46, ingen Mørkevarsel.
Melding om at **været ikke er vurdert**: «Vi fikk ikke hentet Værmeldingen fra MET, så været er ikke vurdert.» Ingen Værklasse, Værvarsling eller Bedre tidsvindu vises. Kartet viser Startpunktet og Omtrentlig rute for denne ene Turen.

### Tilstand 6 – Mobil (360–390 px)
Søk og Resultat på mobil, kart og liste **stablet**, trykkflater ≥ 44 × 44 px. Ingrid står i gangen med jakka på: det viktigste må stå over brettekanten.

## 6. Kartet (skissenivå)

Moldefjorden ligger i sør, Molde sentrum langs fjorden, og Moldemarka stiger nordover bak byen. Startpunktene (lat, lon):
- Kaia i Molde sentrum (62,7345, 7,1559), helt sør ved sjøen
- Parkering ved Romsdalsmuseet (62,7397, 7,1473)
- Parkering ved Hatlelitunnelen (Grua) (62,7428, 7,1510)
- HC-parkering ved Vardeveien (62,7512, 7,1476)
- Parkering ved Damefallet, Vardeveien (62,7533, 7,1619)
- Fjellbrudammen (62,7537, 7,1710)
- Turparkering i Jensgurilia, Nordbyen (62,7550, 7,2049), lenger øst
- Parkering ved Tusten skisenter (62,7641, 7,2715), lengst nordøst

Målene (Storlihytta, Skihytta, Varden, Tusenårsvarden, Moldevatnet osv.) ligger nord for Startpunktene. Plasseringen trenger bare være omtrentlig. Tegn kartet som en stilisert skisse: kystlinje, noen høydekurver, vann, stier. Ikke kopier et virkelig kartprodukt, og bruk ingen logoer.

## 7. Det viktigste: anbefalingsøyeblikket

For hvert Turforslag skal Ingrid på et blikk se, og kunne etterprøve, **hvorfor akkurat denne Turen passer nå**:
1. **Turtid mot Tilgjengelig tid** (1 t 32 min av 2 t, uten pauser),
2. **Værklassen for Tidsvinduet** (og hva den bygger på),
3. **Opplevelsespreferansene** den treffer, og de den ikke treffer,
4. **Mørkevarsel** eller at hun er tilbake i god tid før mørket (ender 15:02, sola ned 15:59).

Regelteksten skal stå som tekst, men konseptet bør gi den en visuell form som gjør den etterprøvbar. Dette er der konseptene skal skille seg mest.

## 8. Leveransen per konsept

Mappe: `_bmad-output/planning-artifacts/ux/konsept-NN-<slug>/`

| Fil | Innhold | Bredde |
|---|---|---|
| `pc-1-sok.svg` | Tilstand 1 | 1440 |
| `pc-2-godt-vaer.svg` | Tilstand 2 | 1440 |
| `pc-3a-darlig-vaer.svg` | Tilstand 3a | 1440 |
| `pc-3b-bedre-tidsvindu.svg` | Tilstand 3b med Mørkevarsel-detalj | 1440 |
| `pc-4-fraradet.svg` | Tilstand 4 | 1440 |
| `pc-5-ingen-tur-uten-vaer.svg` | Tilstand 5 | 1440 |
| `mob-1-sok.svg` | Tilstand 1, mobil | 390 |
| `mob-2-godt-vaer.svg` | Tilstand 2, mobil, kart og liste stablet | 390 |
| `mob-3-darlig-vaer.svg` | Tilstand 3a, mobil (gjerne med Mørkevarsel-detaljen) | 390 |
| `mob-4-fraradet.svg` | Tilstand 4, mobil | 390 |
| `mob-5-ingen-tur-uten-vaer.svg` | Tilstand 5, mobil | 390 |
| `konsept.json` | beskrivelse (se under) | |

**SVG-regler**
- `viewBox="0 0 1440 H"` med `width="1440"` (PC), og `viewBox="0 0 390 H"` med `width="390"` (mobil). H velger du selv: helsidesskisse, gjerne 900–1800 for PC og 844–2000 for mobil. På mobil markerer du skjermkanten ved y = 844 med en tynn stiplet linje og etiketten «skjermkant 844».
- Selvstendig: ingen eksterne referanser, bilder, skrifter eller skript. Bruk skrifter som finnes på macOS (for eksempel Helvetica Neue, Avenir Next, Avenir Next Condensed, Futura, Gill Sans, DIN Alternate, DIN Condensed, Optima, Georgia, Iowan Old Style, Charter, Baskerville, Didot, Palatino, Rockwell, American Typewriter, Menlo, SF Mono), alltid med generisk reserve (`sans-serif`, `serif`, `monospace`).
- Ekte `<text>`-elementer, ikke konverterte konturer. SVG bryter ikke tekst selv, så del linjene manuelt og sjekk at ingen tekst renner over eller kolliderer.
- Ha med `<title>` i hver fil. Hold hver fil under ca. 400 kB.
- Anbefalt: lag SVG-ene med et lite Python-skript (felles stilkonstanter og komponenter), lagt i scratchpad-mappa, ikke i leveransemappa.
- **Visuell sjekk er påkrevd:** gjengi hver SVG til PNG med headless Chrome, for eksempel `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --screenshot=/sti/ut.png --window-size=1440,H "file:///sti/til/fil.svg"` (390,H for mobil), og se på PNG-en med Read-verktøyet. Rett opp overlapp, avkappet tekst og dårlig kontrast før du leverer. PNG-ene skal i scratchpad, ikke i leveransemappa.

**`konsept.json`** (UTF-8, norsk):
```json
{
  "nummer": 1,
  "slug": "tidslinja",
  "navn": "Tidslinja",
  "slagord": "kort, under 8 ord",
  "ide": "2–3 setninger om konseptets grunnidé og hvorfor det passer Ingrid",
  "anbefalingsoyeblikket": "1–3 setninger: hvordan Turtid mot Tilgjengelig tid, Værklasse, Opplevelsespreferanser og Mørkevarsel vises sammen og kan etterprøves",
  "mobil": "1–2 setninger om mobilgrepet",
  "styrker": ["…", "…", "…"],
  "risiko": ["…", "…"],
  "palett": [{"navn": "…", "hex": "#……"}],
  "typografi": "skrifter og hierarki i én setning",
  "bevegelse": "valgfritt: tenkt animasjon/overgang i én setning, eller tom streng",
  "skjermer": {"pc-1-sok.svg": "én setning om hva skissen viser", "…": "…"}
}
```

## 9. Designkvalitet (gjelder alle konseptene)

Skillene /impeccable og higgsfield er ikke installert i dette miljøet, så disse prinsippene gjelder i stedet:
- **Et tydelig standpunkt.** Hvert konsept har én bærende idé som merkes på alle skjermene, ikke en generisk app med en ny palett.
- **Unngå klisjéene i KI-generert UI:** lilla/blå gradienter, glassmorfisme uten grunn, alt i like store kort med skygge, emoji som ikoner, Inter overalt, sentrert alt, ikoner uten funksjon, «✨».
- **Hierarki:** én primærhandling per skjerm. En tydelig typografisk skala (for eksempel 4–6 trinn). Tall i tabellsiffer der de sammenlignes.
- **Ekte innhold:** bare tallene og ordlyden fra denne briefen, ingen lorem ipsum.
- **Rytme og luft:** et konsekvent avstandssystem (for eksempel 4/8 px-trinn) og justering mot et grid.
- **Farge med mening:** Værklassene og Mørkevarsel trenger farger som tåler fargeblindhet. Bruk aldri farge alene: ha alltid tekst eller ikon i tillegg. Kontrast minst 4,5:1.
- **Tilstander som føles ferdige:** frarådet og ingen Tur passer er riktige svar, ikke feil (PRD SM-C1). De skal se omtenksomme ut, ikke som feilsider.
- **Mobil først for Ingrid:** svaret og Begrunnelsen skal være synlig uten å scrolle langt, med tommelvennlige trykkflater.
