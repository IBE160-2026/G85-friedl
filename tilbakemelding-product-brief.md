# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G85 – G85-friedl |
| **Product brief** | `brief.md` (commit `b3f2aac`) |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

Vi har vurdert `brief.md` for «Turplanlegger (arbeidstittel)» sammen med `addendum.md` i repoets rot.

**Det som er bra:**

1. Problemet og differensieringen er tydelige og ærlige. UT.no er en søkbar database, mens dere vil gjøre «koblingsjobben»: å veie dagens vær og tilgjengelig tid opp mot turvalget og gi 1–3 konkrete forslag med begrunnelse. Det er et godt avgrenset verdiforslag.
2. Dere har valgt reelle, gratis og åpne datakilder (Turrutebasen og MET/Yr, der MET ikke krever API-nøkkel), og avgrenset MVP til ett geografisk område. Det er klokt både for omfang og for at sensor skal kunne kjøre appen.

**De viktigste endringene:**

1. Kontroller tidlig hva Turrutebasen faktisk inneholder. Preferanser som «utsikt», «vann/fiske» og «historie», og felt som vanskelighetsgrad og høydemeter, finnes ikke nødvendigvis i datasettet. Hvis de mangler, må dere enten berike dataene selv for det valgte området eller fjerne preferansene.
2. Beskriv hvordan «AI-anbefaling» skal fungere. Skal en språkmodell velge turene, eller skal en regelbasert poengberegning velge, mens språkmodellen bare skriver begrunnelsen? Valget avgjør om dere kan teste at anbefalingene er riktige.
3. Gjør suksesskriteriene mer testbare. «Ser ryddig ut» og «enkel å demonstrere live» er ikke kriterier som kan sjekkes. Legg til kriterier for hvordan vær og tid faktisk påvirker forslagene.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Middels**

**Sammenlignbart med:** 7) Kurs-FAQ-chatbot (middels). Begge henter relevante elementer fra en strukturert kunnskapsbase og gir et begrunnet svar. Her kommer i tillegg integrasjon mot to eksterne datakilder, geodata og kartvisning.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | middels | Regler for hva som er «passende vær», tidsberegning (turlengde, høydemeter og kjøretid mot tilgjengelig tid) og rangering etter preferanser. |
| Datamodell – antall entiteter og relasjoner mellom dem | lav | Tur, værdata og søkepreferanser, slik addendum beskriver. Lite lagring i MVP. |
| Brukere, roller og innlogging | lav | Ingen innlogging i MVP. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | middels | Anbefaling med begrunnelse. Uavklart om en språkmodell velger turene eller bare forklarer valget. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | middels | MET Locationforecast (krever identifiserende User-Agent og hurtigbuffer etter vilkårene) og Turrutebasen som nedlastbare geodata. Eventuelt et språkmodell-API. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | lav | Ingen. Værdata hentes ved søk. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | middels | Ingen opplasting, men Turrutebasen må lastes ned og konverteres (for eksempel fra GML/SOSI til GeoJSON) og filtreres til ett område. Det kan være arbeidskrevende. |
| Sikkerhet og personvern | lav | Ingen personopplysninger i MVP. Eventuell posisjon fra nettleseren bør bare brukes lokalt. |

**Hva vanskelighetsgraden betyr for dere:**

- _Middels:_ Et godt balansert valg. Pass på at kjerneflyten blir ferdig og stabil før dere legger til mer. Her er kjerneflyten: oppgi tid, vanskelighetsgrad og preferanser → hent vær → få 1–3 turforslag med begrunnelse → se dem på kartet.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | OK | Fem kjernefunksjoner med ett geografisk område er realistisk. Favoritter, deling og flerdagersturer er riktig plassert utenfor MVP. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | risiko | Funksjonene er konkrete, men datagrunnlaget og anbefalingslogikken er ikke avklart. Det kan gi hull i PRD og arkitektur. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En webapp med kart (for eksempel Leaflet) og API-kall er godt egnet. Konvertering av norske geodataformater kan kreve litt prøving. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | OK | Dere kan selv vurdere om et forslag er fornuftig, gitt vær og tid, særlig hvis dere velger et område dere kjenner. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | risiko | Med en regelbasert rangering kan dere teste med faste værdata, for eksempel at turer over to timer aldri foreslås ved én time tilgjengelig. Overlates valget til en språkmodell, blir det vanskeligere. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | OK | MET krever ikke nøkkel, og turdataene kan ligge ferdig konvertert i repoet. Bruker dere en språkmodell til begrunnelsen, trengs en reserve uten nøkkel. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | OK | Datakildene er gratis. Eventuell språkmodell gir en liten kostnad per søk, og den kan dekkes med en mock-modus. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart som beskrevet.**

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. La en regelbasert poengberegning (tid, vanskelighetsgrad, vær og avstand) velge og rangere turene. Bruk eventuelt språkmodellen bare til å skrive begrunnelsen i klart språk. Da blir anbefalingene testbare, og appen virker også uten nøkkel.
2. Velg geografisk område nå. Last ned og konverter Turrutebasen for det området, og lag et lite, eget tilleggsdatasett for preferanser som mangler i kildedataene, for eksempel «utsikt» og «vann».

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Klart: en responsiv nettside som kobler preferanser, turdata og værmelding til konkrete turforslag. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Konkret, med en tydelig sammenligning med UT.no. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | Juster | Brukeropplevelsen og eksempelbegrunnelsen er gode. Presiser hvordan anbefalingen lages, og hva som skjer når ingen tur passer, for eksempel ved styrtregn hele dagen. |
| What Makes This Different – er vurderingen ærlig og realistisk? | OK | Ærlig om at fortrinnet er koblingen ende-til-ende, ikke en teknisk voll. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | Juster | «Studenter, lokalbefolkning eller besøkende» er tre ganske ulike grupper. Velg én primærbruker, for eksempel en student i Molde som vil på tur samme ettermiddag, og beskriv situasjonen. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | Juster | «Under ett minutt» og «tar hensyn til faktisk værmelding» er gode. Legg til kriterier som «ved én time tilgjengelig foreslås ingen tur med beregnet tid over én time», «ved meldt kraftig nedbør vises en tydelig advarsel eller kortere alternativer» og «ingen treff gir en forståelig melding». Bytt «enkel å demonstrere» med noe som kan sjekkes. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | OK | Tydelig MVP, tydelige ting utenfor og gode avgrensninger (ett område, ingen GPS-sporing, ingen kontoer). Bestem området. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Flere fylker og favoritter er tydelig satt etter MVP. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | Juster | Briefen er presis, men ble lastet opp via «Add files via upload» i én commit. Flytt den inn i en BMAD-struktur (for eksempel `_bmad-output/planning-artifacts/briefs/`), og commit videre arbeid i mindre steg fra deres eget miljø. Da blir prosessen sporbar. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | OK | Tydelig kjerneflyt og nok reell funksjonalitet med to integrasjoner og kart. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | Juster | Med regelbasert rangering og faste testdata for vær blir dette godt testbart. Det må komme fram i suksesskriteriene. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | OK | Det responsive kravet er konkret og godt beskrevet (side om side eller stablet, touch og pinch-to-zoom). Skisser gjerne de to visningene. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | OK | Teknologi er ikke låst. Hold datainnhenting, rangering og visning i hver sin del, så rangeringen kan testes alene. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | OK | Gode forutsetninger. Legg ferdig konverterte turdata i repoet og beskriv hvordan de ble laget. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | Bestem hvor de konverterte turdataene skal ligge (og hvor store de blir), og hvor rådata og konverteringsskript skal ligge. Eventuell nøkkel til språkmodell skal i `.env` som ikke committes. |

## 3. Neste steg for gruppen

1. Velg område, last ned Turrutebasen for det, og sjekk hvilke felt som faktisk finnes. Oppdater preferansene i briefen etter det dere finner.
2. Beskriv anbefalingslogikken (regelbasert rangering, eventuelt språkmodell for begrunnelsen), og legg til testbare suksesskriterier for hvordan vær og tid påvirker forslagene.
3. Flytt briefen inn i BMAD-strukturen, velg én primærbruker, og gå videre til PRD.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
