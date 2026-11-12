# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G85 – G85-friedl |
| **PRD vurdert** | `_bmad-output/planning-artifacts/prds/prd-turplanlegger-app-2026-11-02/prd.md` (status `final`, sist endret 2026-11-10, commit aea5f5e) |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Dette er en sterk PRD med en tydelig tese: en regelbasert anbefaling der samme Søk og samme Værmelding alltid gir samme Turforslag, og der språkmodellen bare er et valgfritt lag oppå. FR-ene har tall og eksempler som kan bli testtilfeller direkte. Risikoen ligger mindre i kvaliteten enn i størrelsen: 29 FR og 11 NFR er mye for ett semester, og dokumentet bærer på mye endringshistorikk. Dessuten måler suksessmålene ikke selve tesen.

## 2. Dette fungerer godt

1. **Testbare konsekvenser med tall.** FR-8 («2,0 mm/t og 3 m/s gir dårlig; 1,9 mm/t og 3 m/s gir middels»), FR-14 (Tusenårsvarden 1 t 32 min, Storlihytta 16 min) og FR-21 (sluttid 15:30 uten Mørkevarsel, 15:31 med) kan skrives om til tester uten tolkning. Resultattabellen under FR-6 dekker alle kombinasjoner av Værklasse og treff.
2. **KI-kontroll er tenkt ferdig.** FR-22: «Språkmodellen kalles først når Turforslagene er valgt og rangert», Regelteksten blir stående ved timeout, manglende nøkkel eller tall som ikke stemmer, og alt kan testes med en falsk språkmodell. Kostnad (§6, av som standard), nøkler (NFR-7), testmodus (NFR-2, NFR-11) og personvern (NFR-6) er med.
3. **Avveininger er synlige.** Merknaden under FR-9 («strengere enn nødvendig når Turtiden er mye kortere enn Tilgjengelig tid»), begrunnelsen for at «enklere tur» er byttet ut i FR-18, og motmålene SM-C1/SM-C2 viser hva dere ga opp.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | sterk | Valg står som valg, med begrunnelse og avveining. Én reelt åpen oppgave (§10, spørsmål 1) er tydelig merket. |
| Substans | sterk | Persona, terskler og NFR-er er produktspesifikke. Ingen pynt eller boilerplate. |
| Strategisk sammenheng | god | Tesen er klar og funksjonene tjener den, men SM-1–SM-4 måler fart, testdekning og kjørbarhet, ikke om Begrunnelsen er til å stole på. |
| Testbarhet | sterk | De fleste FR-er har eksakte eksempler. Noen få (FR-11, FR-24, FR-29) mangler konsekvenser. |
| Scope og avgrensning | god | Ikke-mål og «Utenfor MVP» er konkrete. Alt i MVP har lik prioritet, bortsett fra FR-22. |
| Brukbarhet for neste fase | sterk | Glossar, ID-er og krysshenvisninger henger sammen. Addendum skiller «hvordan» fra «hva». |
| Formtilpasning | god | Forbrukerapp med navngitt person i UJ-ene: riktig form. Dokumentet er langt (ca. 5 700 ord) og blander krav med arbeidshistorikk. |

## 4. Viktigste forbedringer

### 4.1 Ingen skjæringslinje i MVP
- **Alvorlighet:** medium
- **Hvor:** §8.1 «Språkmodelltekst (FR-22) bygges sist»
- **Problem og hvorfor det betyr noe:** Bare FR-22 er rangert. Kart, Demomodus (NFR-11), validering av Turdatasettet (FR-27), konvertering av rutegeometri (FR-28) og kalibrering kommer på toppen av kjerneflyten. Er dere få på gruppa, er det sannsynlig at noe må kuttes. Da bør dere ha bestemt hva på forhånd, ikke i siste uke. Epics/stories trenger også en rekkefølge.
- **Forslag:** Legg til tre nivåer i §8.1: *Kjerne* (FR-1–FR-21, FR-26), *Skal være med* (kart FR-23–FR-25, NFR-11) og *Kan utgå* (FR-22, FR-24, FR-28). Eksempel: «Faller kartet bort, viser appen Startpunkt som tekst med lenke til kilden (FR-29).»

### 4.2 Bedre tidsvindu vurderer bare været
- **Alvorlighet:** medium
- **Hvor:** FR-19 «Det tidligste Starttidspunktet med bedre Værklasse vises»; UJ-2
- **Problem og hvorfor det betyr noe:** I UJ-2 foreslås kl. 14 med 3 t, men solnedgangen er 15:59, så Mørkevarsel rammer alle Turer over 1 t 29 min. Appen kan dermed anbefale et vindu der få eller ingen Turer passer uten Mørkevarsel, og brukeren ser det først etter å ha trykket.
- **Forslag:** Legg til en konsekvens, f.eks. «Et Bedre tidsvindu vises sammen med antall Turforslag uten Mørkevarsel i vinduet», eller velg vinduet som gir flest slike Turforslag blant vinduene med bedre Værklasse. Skriv hvilken regel dere velger, og hvorfor.

### 4.3 Suksessmålene måler ikke tesen
- **Alvorlighet:** medium
- **Hvor:** §9; SM-C1 «Andel Søk med Turforslag: Skal ikke presses opp»; NFR-6 «ingen sporings- eller analyseverktøy»
- **Problem og hvorfor det betyr noe:** Visjonen lover en «Begrunnelse du kan etterprøve», men ingen SM sjekker at brukere forstår eller stoler på den. SM-C1 kan ikke måles når NFR-6 forbyr analyse; Søk telles ingen steder.
- **Forslag:** Legg til SM-5: «Minst 4 av 5 testpersoner kan i Demomodus forklare hvorfor første Turforslag ble valgt, ut fra Begrunnelsen alene.» Gjør SM-C1 til en kontroll i testene («Værscenario UJ-3 gir null Turforslag og ingen feilmelding») eller fjern målingen.

### 4.4 Eksempler i FR-16/17 er knyttet til dagens datasett
- **Alvorlighet:** lav
- **Hvor:** FR-16 «UJ-1 (…9. november, start 13:30…) gir med dagens Turdatasett Tusenårsvarden fra Damefallet…»
- **Problem og hvorfor det betyr noe:** Rekkefølgen endres hvis en Tur eller et tall i datasettet endres (det skjedde 2026-11-09). Addendum sier selv at testene bør ha et eget, fast testdatasett, men PRD-en sier ikke det.
- **Forslag:** Legg til i NFR-2: «Eksemplene i FR-16 og FR-17 testes mot `testdata/` (et fast datasett), ikke mot produksjonsdatasettet.»

### 4.5 §0 og §10 er arbeidslogg
- **Alvorlighet:** lav
- **Hvor:** §0 («Gjennomgangen 2026-11-06 rettet soltidene…») og §10 (åtte av ni spørsmål er avklart)
- **Problem og hvorfor det betyr noe:** Den som skal lage UX eller stories, må lese forbi mye historikk for å finne det som fortsatt gjelder. «Åpne spørsmål» har nesten ingen åpne spørsmål.
- **Forslag:** Flytt de avklarte spørsmålene og endringshistorikken til addendum (f.eks. «Beslutningslogg»). La §10 inneholde spørsmål 1 og de uløste detaljene under.

## 5. Mekaniske funn

- ID-er (UJ-1–3, FR-1–29, NFR-1–11, SM-1–4, SM-C1–2) er sammenhengende, og krysshenvisningene løser seg. Ingen `[ASSUMPTION]` er igjen.
- **UJ-3, edge case:** «Med bare 15 minutter passer ingen Tur. Appen viser da den korteste Turen» kan leses som at dette skjer under frarådet vær, men FR-6 og FR-12 sier at den korteste Turen da ikke vises. Presiser «etter at hun har tatt i bruk Bedre tidsvindu».
- **Mangler konsekvenser:** FR-11 (hvilke verdier vises?), FR-24 («uthever» er uklart) og FR-29 (hvor står krediteringen?). Én testbar setning hver.
- **FR-22 og tallsjekken:** Sjekken gjelder tall, men en modell kan skrive «halvannen time» eller «to timer». Si om slike ord skal avvises, eller at Regelteksten skal gi ferdig formaterte verdier.
- **FR-2 og midnatt:** Start kl. 22:00 med 5 t gir et Tidsvindu etter midnatt, men FR-7 henter bare Turdagen. Avgrens enten Starttidspunkt eller Tilgjengelig tid, eller si hva som skjer.
- **Felt og begrep:** Addendum bruker `mal`, PRD-en «Mål» (FR-26). Bruk ett navn.
- §10, spørsmål 1 oppgir en eier ved navn. Bruk rolle eller oppgavefordeling i stedet.

## 6. Før dere går videre

**Må avklares før UX, arkitektur og epics:**
- Prioritering i MVP (4.1), slik at epics kan rekkefølgesettes.
- Regelen for Bedre tidsvindu (4.2), siden den påvirker UX for UJ-2 og UJ-3.
- Ordene og grensene for «oppholdsvær» og «lite vind» (FR-20, «avgjøres i UX»). SM-2 krever dem for å teste Regelteksten. Sjekk at UX-dokumentene faktisk fastsetter dem.

**Kan vente:**
- Kalibrering av Værterskler (spørsmål 1). Dere har sagt selv at den ikke hindrer UX og arkitektur.
- Valg av kartbibliotek og solbibliotek (arkitektur).
- Lisensspørsmålet for morotur.no hvis appen skal brukes utover kurset.

**Oppfølging av tilbakemeldingen på product brief: ja.** Datagrunnlaget er kontrollert (FR-26–FR-28, høydemeter målt mot terrengmodell), anbefalingen er regelbasert og språkmodellen bare formulerer (§1, FR-22), suksessmål er gjort testbare (FR-15, SM-2), og én primærbruker er valgt (Ingrid). Briefen ligger i BMAD-strukturen.

## 7. Refleksjonsspørsmål

1. Eksemplene i FR-16 og FR-17 ble kontrollert med skript (§10, spørsmål 3). Hva fanget skriptet som dere ikke hadde sett selv, og hva vil dere gjøre automatisk når datasettet endres igjen?
2. Hvilke av tersklene i §4.2 er dere minst sikre på, og hvordan vil dere avgjøre om kalibreringen er «god nok» til å regne Værvurderingen som ferdig?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
