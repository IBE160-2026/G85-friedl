# Valideringsrapport — turplanlegger-app (Kortstokken)

- **DESIGN.md:** `_bmad-output/planning-artifacts/ux/DESIGN.md`
- **EXPERIENCE.md:** `_bmad-output/planning-artifacts/ux/EXPERIENCE.md`
- **Kjørt:** 2026-11-10 12:29

## Samlet verdikt

Paret er nesten klart som kontrakt. Alle åtte celler i FR-6-tabellen har en tilstand, alle 51 tokenreferanser i DESIGN.md løses, alle fargetokens har hex, og seksjonene står i kanonisk rekkefølge. Beslutningene fra 2026-11-10 er ført inn. Det som stopper en story-utvikler, er seks huller: Regeltekst og værord er ikke entydige nok til å gi samme tekst hver gang (FR-20), det mangler en liste over værsymboler (FR-10), «Alternativ-kortet» betyr to ulike komponenter, PC-oppsettet passer bare ved nøyaktig 1440 px, det finnes ingen tilstand for når appens egen server ikke svarer, og kartfargene forutsetter et kart vi tegner selv, mens addendumet peker mot ferdige kartfliser.

Bare rubrikk-gjennomgangen ble kjørt (valgt 2026-11-10). Ingen funn er kritiske. De seks høye funnene bør rettes før dokumentene settes til final, fordi arkitekturen og story-utviklingen bygger direkte på dem: entydig Regeltekst og værsymboler (FR-10, FR-20), ett navn per komponent, et PC-oppsett som virker fra 1200 px, en tilstand for manglende kontakt med serveren, og et krav om dempet bakgrunnskart til arkitekturen.

## Verdikt per kategori

- 1. Flytdekning — tilstrekkelig
- 2. Tokenkomplettering — tilstrekkelig
- 3. Komponentdekning — tynn
- 4. Tilstandsdekning — tilstrekkelig
- 5. Dekning av visuelle referanser — tilstrekkelig
- 6. Oppblåsing og overspesifisering — tilstrekkelig
- 7. Arvedisiplin — tilstrekkelig
- 8. Formtilpasning — tilstrekkelig

## Funn etter alvorlighetsgrad

### Kritisk (0)

### Høy (6)

**2. Tokenkomplettering** — `map-land`, `map-contour`, `map-town`, `map-water`, `map-water-line` og `map-water-text` forutsetter et kart appen tegner selv. Addendumet (Kart) peker mot Leaflet med Kartverkets topografiske fliser eller OpenStreetMap, altså ferdige rasterfliser med faste farger. Da kan tokenene ikke brukes, og regelen om at «den grønne ruten alltid er det sterkeste på kartet» (DESIGN.md, Colors) kan ikke garanteres. Fire av tokenene brukes heller ikke av `components.kart` (DESIGN.md frontmatter og Components › Kart).
Fiks: Gjør det til et krav til kartvalget i arkitekturen at bakgrunnskartet skal være dempet (for eksempel Kartverkets gråtonekart), og merk `map-*` som farger bare for skissene og et eventuelt eget vektorkart. Behold `kart.route` og pin-tokenene, siden det er de appen selv tegner.

**3. Komponentdekning** — «Alternativ-kortet» betyr to ulike ting. I DESIGN.md › Components › Meldingskort er det Bedre tidsvindu-kortet i frarådet (stempel «→», «Bruk i morgen 11:00»). I EXPERIENCE.md › State Patterns (rad 6–8 fra bunnen) er det kortet med den korteste Turen. Samme ting har også to navn: «Bedre tidsvindu-kortet» (EXPERIENCE.md, State Patterns › Frarådet) og «Bedre tidsvindu-boksen» (DESIGN.md › Værvarsling og EXPERIENCE.md › State Patterns). Kortet med den korteste Turen har ingen egen visuell spesifikasjon. Bare overlinjen er nevnt (DESIGN.md › Turkort, punkt 7), mens merket «Alternativ» i stedet for «Turforslag 1 av 3», stempelet og primærknappen «Endre Tilgjengelig tid» bare finnes i skissene. Det har heller ingen rad i Component Patterns.
Fiks: Gi komponentene hvert sitt navn, for eksempel «Alternativkort (korteste Tur)» og «Bedre tidsvindu-kort» (frittstående, i frarådet) eller «Bedre tidsvindu-boks» (inne i Værvarsling). Gi hver av dem en rad i begge filene.

**3. Komponentdekning** — Regeltekst-mønsteret (EXPERIENCE.md › Regeltekst-mønster og Værord) gir ikke alltid samme tekst, slik FR-20 og SM-2 krever: (a) Værord-tabellen sier at temperatur står «alltid», mens eksempelet for UJ-1 ikke har temperatur. (b) Det står ikke hvordan nedbørsord og vindord bindes sammen («oppholdsvær og lite vind» i Regelteksten, men «oppholdsvær, lite vind» i Flow 1, steg 4). (c) Det står ikke hvordan to treffede preferanser bindes sammen. (d) `[, lavtliggende tur (H moh)][, egnet i dårlig vær]` er ikke begrenset til Værklasse dårlig, så en utvikler kan ta dem med i godt vær. Det bryter «nevner aldri en regel som ikke slo inn». (e) «kuldegrader» foran et spenn som krysser 0 °C er udefinert.
Fiks: Skriv mønsteret som en formell mal med skilletegn, betingelser («bare ved Værklasse dårlig») og to eksempler til (dårlig vær og to preferanser), og si eksplisitt om temperatur står i Regelteksten.

**3. Komponentdekning** — FR-10 krever værsymbol i værsammendraget. DESIGN.md › Værsammendrag sier «himmel», og pc-2 viser «lettskyet», men ingen av filene har en tabell fra MET sin `symbol_code` til norske ord, og det står ikke om det skal være ikon eller ord. PC-skissen viser også rå tall («0 mm nedbør · vind opptil 4 m/s»), mens mobil og Flow 1 bruker værord («oppholdsvær, lite vind»). Det står ikke hva som gjelder hvor (EXPERIENCE.md › Værord og DESIGN.md › Værsammendrag).
Fiks: Legg en tabell fra symbolkode til ord ved siden av Værord-tabellen, slik at ordene ligger på ett sted (NFR-10), og bestem ett format for verdiene i værsammendraget.

**4. Tilstandsdekning** — Ingen tilstand dekker at appens egen server ikke svarer, at mobilen er uten nett, eller at svaret tar mer enn 3 s (NFR-5). FR-13 gjelder bare MET. «Venter på svar» har ingen tidsgrense og ingen vei videre (EXPERIENCE.md › State Patterns). For Ingrid i gangen med dårlig dekning er dette sannsynlig, og PRD-ens «aldri en tom side eller feilmelding» trenger et svar.
Fiks: Legg til tilstanden «Får ikke kontakt» med tidsgrense, rolig tekst («Vi fikk ikke kontakt. Søket ditt er tatt vare på.») og «Prøv igjen» som sender samme Søk.

**8. Formtilpasning** — PC-oppsettet passer ikke ved brytningspunktet. PC gjelder fra 1200 px (EXPERIENCE.md › Responsive & Platform), men geometrien er låst til 1440: 2 × 64 px marg + 3 × 416 px kort + 2 × 32 px mellomrom = 1440 px (DESIGN.md › Layout & Spacing, og `turkort.widthDesktop: 416px`). Mellom 1200 og 1439 px gir det horisontal rulling (NFR-1, SM-4), med mindre kortene krymper, og ingen regel sier at de gjør det. På nettbrett har kortet ingen maksbredde (ett kort i opptil 1135 px bredde), det står ikke hvordan Søk «som ark i tommelsonen» ser ut på 1199 px, og «større kartutsnitt» er ikke tallfestet.
Fiks: Bruk flytende kort (`minmax`) med en minstebredde som tåler 1200 px (cirka 330 px), eller flytt PC-brytningspunktet opp. Gi kortet en maksbredde på nettbrett (for eksempel 560 px, sentrert), og si hvordan Søk ser ut på nettbrett.

### Middels (15)

**2. Tokenkomplettering** — Flere komponenttokens er norsk prosa med bokstavelige farger, ikke referanser som kan løses: `kriteriemerke.ok` «sirkel {colors.forest} med hvit hake», `preferansebrikke.on` «hvit tekst, hvitt kriteriemerke ok», `turkort.perforation`, `stokk-kant.offset` «… per lag, maks 2 lag» og alle verdiene under `kart.*` (DESIGN.md frontmatter, linje 152–259). Kode som speiler tokenene, får ikke tolket dette.
Fiks: Del opp i egne nøkler (`iconColor: '{colors.on-forest}'`, `dash: '2 6'`, `notchRadius: 10px`, `maxLayers: 2`) og la beskrivelsene stå i prosaen under Components.

**2. Tokenkomplettering** — Noen verdier står fast utenfor skalaene: radiene 13 px (`nummerstempel`), 14 px (`begrunnelse-boks`) og 24 px (`kart`, Shapes) ligger ikke i `rounded`. Fra-linja på mobil (16 px, Typography-tabellen) har ingen token. Fokusringen (2 px papir + 3 px skoggrønn) står bare i prosa (DESIGN.md, Layout & Spacing, og EXPERIENCE.md, State Patterns).
Fiks: Legg til `rounded.stamp`/`rounded.panel` (eller rund av til nærmeste trinn), `typography.card-from-mobile` og en `focus-ring`-komponenttoken.

**3. Komponentdekning** — Meldingskortet for frarådet har en visuell spesifikasjon (DESIGN.md › Components), men ingen rad i Component Patterns. Radene under «DERFOR INGEN TUR» (pc-4: «Vær frarådet», «Tid ikke vurdert · frarådet går foran alt annet») er ikke definert i tabellen over kriterieradene, og mob-4 har dem ikke.
Fiks: Legg til en rad for meldingskortet og bestem hvilke rader som vises, med ordlyd, eller stryk «DERFOR INGEN TUR».

**3. Komponentdekning** — «Ditt søk», søkesammendraget, står øverst på hvert Resultat (EXPERIENCE.md › IA, punkt 2), men er ikke spesifisert noe sted. PC viser et panel med overlinjen DITT SØK og fem merkede felt, mens mobil viser én linje. Bare «Endre søk» har en atferdsrad.
Fiks: Legg til «Ditt søk» i DESIGN.md › Components (begge variantene) og i Component Patterns, og si at feltet for Opplevelsespreferanser viser «ingen» når ingen er valgt, slik pc-4 og pc-5 gjør.

**3. Komponentdekning** — Linja «Været er ikke vurdert …» (EXPERIENCE.md › State Patterns › Værmeldingen mangler) og ventetilstanden «tomme kortkanter og «Finner turer …»» (State Patterns › Venter på svar) har ingen visuell spesifikasjon. Det står ikke hvilken flate, hvilket merke eller hvilken tone de har.
Fiks: Legg til to korte oppføringer i DESIGN.md › Components, for eksempel «Værmangel-linje: papirpanel med none-merke» og «Plassholderstokk: stokk-kanter uten innhold + `body`-tekst».

**3. Komponentdekning** — Trinnvelgeren åpner «en liste over alle gyldige verdier» når man trykker på verdien (EXPERIENCE.md › Component Patterns › Trinnvelger), men listen har verken utseende eller tilgjengelighetsmønster (egen select, popover eller listbox).
Fiks: Bestem mønsteret (en vanlig `<select>` er enklest og tilgjengelig) og beskriv det i begge filene.

**4. Tilstandsdekning** — Det står ikke om kartet og ansvarsmerknaden vises i frarådet. IA-rekkefølgen sier at Resultat alltid har «6. Kart» og «8. Ansvarsmerknad» (EXPERIENCE.md › IA). pc-4 og mob-4 har ingen av dem, og FR-23 («zoomer slik at alle Turforslagene synes») er udefinert når det er null Turforslag.
Fiks: Si eksplisitt i State Patterns › Frarådet om kartet (oversikt over Moldemarka eller ikke noe kart) og ansvarsmerknaden vises.

**4. Tilstandsdekning** — Starttidspunktet kan bli utdatert. Hvis siden står åpen, eller «Endre søk» henter tilbake et Starttidspunkt som har passert, kan Søket sendes med et tidspunkt FR-2 sier ikke kan velges, og «Finn tur» er «aldri låst». Det samme gjelder «I dag» når klokka passerer 22:00 mens siden er åpen (EXPERIENCE.md › Component Patterns › «Finn tur», «Endre søk» og Segmentvelger).
Fiks: Én regel, for eksempel: «Ved sending og ved Endre søk rundes et passert Starttidspunkt opp til neste gyldige kvarter, med hjelpetekst.»

**4. Tilstandsdekning** — Det står ikke hva nettleserens tilbakeknapp gjør. Appen har to visninger på samme side, og Søket ligger bare i minnet (EXPERIENCE.md › Foundation og IA). Uten en regel kan Tilbake fra Resultat forlate appen og miste Søket.
Fiks: Bestem at Resultat legger en historikkoppføring, slik at Tilbake går til Søk med verdiene, eller at det ikke gjør det. Arkitekturen trenger svaret.

**5. Dekning av visuelle referanser** — DESIGN.md lenker bare til mappa og `lag.py` (innledningen), ikke til én enkelt skisse ved Components eller Layout. EXPERIENCE.md › IA lister alle 11 som nakne lenker uten å si hva de viser. pc-1 lenkes aldri med innhold (State Patterns › Søk, standardverdier lenker bare mob-1). `konsept.json`, som har én beskrivende setning per skjerm, nevnes ikke.
Fiks: Lenk pc-1 i Søk-raden, lenk pc-2 og mob-2 ved Turkort og Layout i DESIGN.md, og erstatt den nakne lista i IA med en henvisning til `konsept.json › skjermer`.

**5. Dekning av visuelle referanser** — Tre motsigelser mellom skisser og spines er ikke merket. Skissene bruker etiketten «REGELTEKST» (pc-2, pc-3a, pc-3b) og «Regeltekst: «…»» (mob-2, mob-3), mens spines sier «Begrunnelse». Skissene skriver «vind opp mot 9 m/s» (pc-3a, mob-3), mens Værord-tabellen gir «frisk vind» for 8,0–10,7 m/s. pc-3b har overskriften «Tre Turforslag fra kl. 14:00» og merket «Bedre tidsvindu tatt i bruk», mens spines sier «Vanlig resultat» (EXPERIENCE.md › State Patterns). Bare «regn»/«nedbør» er merket (EXPERIENCE.md › Værord).
Fiks: Utvid merknaden ved Værord til en kort liste over kjente avvik i skissene: REGELTEKST → Begrunnelse, regn → nedbør, «vind opp mot 9 m/s» → «frisk vind», og overskriften i pc-3b.

**6. Oppblåsing og overspesifisering** — Pikselmål fra skissene står i prosa uten tokens: 1312 px innholdsbredde, kart 340 px høyt, 3 × 416 px, skjemakort 600 px (DESIGN.md › Layout & Spacing), mobilnavigasjon 140 × 52, rader på 64 px, stempel 40 px og kartutsnitt 92–118 px (DESIGN.md › Components). Det låser 1440-geometrien og fører rett til bruddet i funn 8.
Fiks: Gi tallene som min-, maks- eller relative regler («kortene deler bredden likt, minst X px»), og legg de faste målene som tokens.

**7. Arvedisiplin** — Etikettene på kriterieradene, «Tid», «Vær», «Ønsker» og «Mørke», er ikke begreper fra §3. «Ønsker» er et synonym for Opplevelsespreferanse og bryter spinens egen regel «Begrepene fra PRD §3 i etiketter og overskrifter» (EXPERIENCE.md › Voice and Tone, siste rad), og konsept-briefen §2.
Fiks: Enten gjør dere et eksplisitt unntak for de fire korte radetikettene, med begrepene i det tilgjengelige navnet («Opplevelsespreferanser», «Mørkevarsel»), eller så endrer dere etikettene.

**7. Arvedisiplin** — I raden for «Alle tre i stokken» vises Turtid uten «uten pauser» («Turtid · tilbake HH:MM», DESIGN.md › Components, og mob-2: «1 t 32 min · tilbake 15:02»). Det bryter FR-14 («Der Turtid vises, står det at den er uten pauser») og spinens egen Do's and Don'ts.
Fiks: Legg «uten pauser» inn i raden, eller la raden vise bare «tilbake HH:MM».

**7. Arvedisiplin** — Komponentene har ulike navn i de to filene: «Mobilnavigasjon» (DESIGN.md) mot «Stokken (mobil)» (EXPERIENCE.md), «Kriterierad» mot «Kriterierader», `begrunnelse-boks` mot «Begrunnelse», «Kartutsnitt i kortet» (bare EXPERIENCE.md, i DESIGN.md bare som punkt 1 under Turkort), og «Alternativ-tur» (EXPERIENCE.md › State Patterns › Frarådet), som ikke er et PRD-begrep.
Fiks: Lag en kort navneliste og bruk de samme navnene i YAML-nøklene, i DESIGN.md › Components og i EXPERIENCE.md › Component Patterns. Bytt «Alternativ-tur» med «den korteste Turen».

### Lav (17)

**1. Flytdekning** — FR-24 (velg kort på PC → kartet uthever det, og omvendt) og FR-22 (Regeltekst byttes med Språkmodelltekst) finnes i Component Patterns, men ingen flyt går gjennom dem. Flow 2 foregår på PC uten å velge et kort (EXPERIENCE.md, Key Flows).
Fiks: Legg til et steg i Flow 2 der Ingrid trykker på kort 2 og ruten utheves med infoboks, og et steg i Flow 1 der Begrunnelsen byttes etter et par sekunder (eller blir stående).

**1. Flytdekning** — Climax i Flow 2, steg 5, forklarer noe brukeren ikke ser («Tusenårsvarden ville endt 15:32 … ligger lenger ned»). Det er FR-16 fortalt på nytt, ikke noe som vises i UI-et (EXPERIENCE.md, Flow 2).
Fiks: La climax være det hun ser: Storlihytta først og tre grønne Mørke-rader. Flytt forklaringen til en merknad, eller stryk den.

**2. Tokenkomplettering** — Typografitokenene bruker nøkler som spesifikasjonen ikke har: `fontFeature` (criterion-value, detail), `fontStyle` (rule-text) og `textTransform` (overline). En resolver som følger design.md-spesifikasjonen, kan forkaste dem (DESIGN.md frontmatter).
Fiks: Flytt dem til en `note` eller til komponenttokens, eller dokumenter at prosjektet utvider spesifikasjonen med dem.

**2. Tokenkomplettering** — Noen bærende kombinasjoner har ingen oppgitt kontrast: skoggrønn på kort (lenken «Kilde: morotur.no» og sekundærknappen, 9,7:1), skoggrønn på `forest-tint` (tonet knapp, 8,2:1), rust på `rust-tint` (tittelen i Værvarsling, 5,3:1) og `map-water-text` på `map-water` (5,5:1). Alle består NFR-9. Kanten på en ikke-valgt preferansebrikke (`border-chip` på kort) har bare 2,2:1 som ikke-tekstkontrast (DESIGN.md, Colors).
Fiks: Legg de fire parene inn i Colors-lista. Vurder en mørkere `border-chip` (minst 3:1) hvis dere vil oppfylle WCAG 1.4.11. NFR-9 krever det ikke.

**3. Komponentdekning** — Logoen og toppfeltet («Turplanlegger · Moldemarka») finnes bare i DESIGN.md. Det står ikke om logoen er en lenke eller tilbakestiller Søket. Nummerstempelet «→» har ingen farge (DESIGN.md › Shapes; `nummerstempel` har bare `background`/`backgroundWarn`).
Fiks: Én linje om atferden (ikke interaktiv, eller går til Søk) og en `backgroundAlt`-token for «→».

**4. Tilstandsdekning** — Mindre huller: Hvilket Starttidspunkt gjelder når Turdag byttes tilbake fra «I morgen» til «I dag»? «Alle tre i stokken» heter det samme når det bare er to kort. Overskriftene for «Værmeldingen mangler + passer» og «Dårlig + ingen passer» er ikke gitt. Dagslysstolpen når Turen starter før soloppgang er ikke tegnet. Det står ikke hva som skjer når kartflisene ikke lastes (EXPERIENCE.md › State Patterns).
Fiks: Én linje for hver i State Patterns.

**5. Dekning av visuelle referanser** — Det er ikke skilt mellom tekst som er merknader i skissene, og tekst som skal bygges: «skjermkant 844», «Tommelsonen: …», «Sveip kortet til siden, eller bruk pilene …» (mob-2), «Kort 1 er valgt og uthevet på kartet …» (pc-2), «Kortene med Turforslag legges ut her …» (pc-1), «Turplanlegger er en prototype for Moldemarka» (alle PC-skissene), «12 Turer fra 8 Startpunkter», «Hele kvarter, 06:00–22:00.», «Med 30 min eller mer passer minst én Tur.» (pc-5, mob-5), «Kart og liste» (mob-2) og feltsuffiksene «høyeste du vil gå» og «valgfritt, velg gjerne flere».
Fiks: Ta med de tekstene som skal bygges, i Voice and Tone › Faste tekster, og si at resten er merknader i skissene.

**5. Dekning av visuelle referanser** — Nettbrett (768–1199 px) har ingen skisse, så SM-4-sjekken ved 768 px har ikke noe å sammenligne med (EXPERIENCE.md › Responsive & Platform). Se også funn 8.
Fiks: En enkel skisse ved 768 px, eller en setning om at mob-2 skalert til 704 px innhold er referansen.

**5. Dekning av visuelle referanser** — `kilde/patch1.py`–`patch7.py` lenkes ikke fra noe sted. `lag.py` har allerede patchene i seg (inneholder `mob_tag`) og skriver til en absolutt sti, så skriptene kan ikke kjøres på nytt slik de ligger (DESIGN.md, innledningen).
Fiks: Slett patchfilene eller nevn dem, og gjør `OUT` relativ.

**5. Dekning av visuelle referanser** — pc-1 tegner skjemakortet med stokk-kanter, mens kortene i Resultat på PC ikke har stokk-kanter. Regelen «bak et kort som har søsken» (DESIGN.md › Elevation & Depth) sier ikke at den bare gjelder mobil. mob-2 legger høydemerknaden under brettekanten, langt fra værsammendraget, og kartet på mobil har ingen FR-24-infoboks.
Fiks: Skriv «bare mobil» i stokk-kant-regelen, og si hvor høydemerknaden og infoboksen står på mobil.

**6. Oppblåsing og overspesifisering** — Typografitabellen gjentar størrelse og vekt fra YAML, så det finnes to kilder som kan komme i utakt (DESIGN.md › Typography).
Fiks: Behold kolonnene Rolle, Token og Bruk.

**6. Oppblåsing og overspesifisering** — Open Questions har fire avgjorte punkter med gjennomstreking, som også står i `.memlog.md` (EXPERIENCE.md › Open Questions).
Fiks: Behold bare punkt 4.

**6. Oppblåsing og overspesifisering** — EXPERIENCE.md har noen setninger med redaksjonell stemme: «Appen snakker som en rolig venn som kjenner marka» (Voice and Tone) og «Hun ser hvorfor turen passer, uten å regne selv» (Flow 1).
Fiks: Stryk dem, eller flytt dem til DESIGN.md › Brand & Style.

**7. Arvedisiplin** — Flyttitlene skriver om UJ-titlene i stedet for å gjengi dem: «Ettermiddagstur rett før hun går» mot PRD-ens «Ingrid finner en ettermiddagstur rett før hun går», og «Morgendagen kvelden før» mot «Ingrid planlegger morgendagen kvelden før». ID-ene står der, så sporingen holder (EXPERIENCE.md › Key Flows).
Fiks: Bruk PRD-titlene ordrett.

**7. Arvedisiplin** — «Ingen funksjon krever hover, dobbelttrykk, langt trykk eller sveip (NFR-1)» tillegger NFR-1 mer enn den sier, siden den bare nevner hover (EXPERIENCE.md › Interaction Primitives).
Fiks: Skriv «(NFR-1, utvidet i UX)».

**7. Arvedisiplin** — Krediteringen har «Bakgrunnskart: © Kartverket» som fast tekst (DESIGN.md › Ansvarsmerknad og bunntekst), mens briefen §3 og addendumet (Kart) sier at kartleverandøren velges i arkitekturen.
Fiks: Skriv «Bakgrunnskart: © {leverandør}», og merk Kartverket som plassholder.

**8. Formtilpasning** — DESIGN.md › Layout & Spacing kaller mobil «360–390 px», mens EXPERIENCE.md › Responsive & Platform sier 360–767 px.
Fiks: Bruk 360–767 px begge steder, og si at skissene er tegnet ved 390 px.

## Mekaniske notater

- Begge filene har `status: draft`, selv om alle beslutninger unntatt skrift er tatt (frontmatter i DESIGN.md og EXPERIENCE.md). EXPERIENCE.md har ikke `description` i frontmatter. Det er ikke påkrevd.
- `[ASSUMPTION]` står fortsatt i DESIGN.md › Typography (Avenir Next). Den burde vise til Open Questions 4 i EXPERIENCE.md i stedet for å stå som en åpen antakelse.
- `{path.to.token}` i innledningen til EXPERIENCE.md er en plassholder og ikke en ekte referanse. Et skript som sjekker referansene, vil flagge den.
- Shapes sier `{rounded.sm}` for Demomodus-flaten på mobil, men komponenttokenen `demomodus-merke.rounded` er `{rounded.full}` (DESIGN.md).
- Høyder som står som spenn i prosaen, har én verdi som token: sekundærknapp «44–46 px» mot `height: 44px`, og brikker «46–48» (EXPERIENCE.md › Accessibility Floor) mot `height: 48px`.
- Teksten for frarådet er skrevet på to måter: «Værklasse frarådet: det er meldt …» (EXPERIENCE.md › Voice and Tone) og «Værklasse frarådet. Det er meldt …» (Flow 3, steg 2). mob-4 deler den i overskrift og setning.
- Mobil-IA-en lister «Kart» etter stokken, og PC-unntaket står i en egen setning under lista (EXPERIENCE.md › IA). Det er riktig, men lett å overse. Én kolonne for PC og én for mobil ville vært tydeligere.
- Ingen Mermaid-diagrammer, så ingen syntaks å sjekke.

## Gjennomgangsfiler

- `review-rubric.md`
