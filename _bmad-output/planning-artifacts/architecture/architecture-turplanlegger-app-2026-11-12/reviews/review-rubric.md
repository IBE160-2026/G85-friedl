---
type: review
target: ../ARCHITECTURE-SPINE.md
lens: good-spine-rubric
reviewer: uavhengig (Claude)
date: 2026-11-12
---

# Gjennomgang av arkitekturspinen mot rubrikken

## Dom

Spinen er solid og stort sett stram. Paradigmet er tydelig, grensene for avhengigheter kan håndheves, Demomodus og «nå» er samlet ett sted, alle FR og NFR er kartlagt, og memloggen viser at teknologien er sjekket. Det som mangler, ligger i **kontraktene over HTTP** (formen på Søk, hvem som justerer et Starttidspunkt som har passert, og hva `/api/begrunnelse` stoler på) og i noen få **driftsforhold på Vercel** (filsporing for `data/`, region, statisk prerendering). Det er nettopp der to stories som bygges hver for seg, kan komme til å gjøre ulike ting.

Totalt: 0 kritiske, 3 høye, 6 middels og 8 lave funn.

## Rubrikken punkt for punkt

| Kriterium | Vurdering |
| --- | --- |
| Fikser de reelle divergenspunktene | Delvis. Resultat, klokke, miljø, MET, tid/format, terskler og geometri er dekket. Søk-kontrakten, justering av et passert Starttidspunkt, grensen mellom tekst fra kjernen og tekst fra UI-et og datagrunnlaget for kartet før et Søk er ikke avgjort (H1, H2, M1, M3). |
| Reglene kan håndheves og hindrer divergensen | Stort sett. ESLint-håndhevingen i AD-1 er beskrevet unøyaktig (M6). AD-8 låser tallene, men ikke klassifiseringslogikken som Python-skriptet har en egen kopi av (M4). |
| Ingenting under Deferred lar enheter divergere | Stort sett. «Feltene i Resultat» er trygt bare hvis `resultat.ts` lages først (L7). Rate limiting er greit utsatt, men inputen til `/api/begrunnelse` er ikke det (H3). |
| Teknologien er sjekket | Ja for npm-pakkene, Node, Kartverket, ikonene og solberegningen. Mangler: modell-ID-en `claude-haiku-5-5` og ESLint-verktøyene (L6). |
| Dekker FR-1–FR-29 og NFR-1–NFR-11 | Ja, kartet er komplett. Hullene ligger i atferd (H1, M3), ikke i hvilke krav som er dekket. |
| Alle dimensjoner er avgjort, utsatt eller åpne | Hosting, miljøer, hemmeligheter, logging og CI er avgjort. Stille: region (M5), filsporing på Vercel (M2), dynamisk rendering (M2), at det ikke finnes noen database eller lagret tilstand (L2) og en seksjon for åpne spørsmål (L5). |
| Beslutninger, ikke begrunnelser; stramt; diagrammer | Godt. Noe begrunnelse og noen engangsdetaljer har sneket seg inn (L8). Det ene sekvensdiagrammet stemmer ikke med AD-3/AD-12 (L4). |

## Funn

### H1 — Ingen eier av justeringen når Starttidspunktet har passert [high]

- **Hvor:** AD-2, AD-4; mot EXPERIENCE.md › State Patterns («Starttidspunktet har passert», «Søk etter 22:00») og «Finn tur».
- **Problem:** EXPERIENCE.md sier at et passert Starttidspunkt «rundes opp før sending», at Turdag byttes til «i morgen» etter 22:00, og at det vises en hjelpetekst («Flyttet til 14:15, fordi 13:30 har passert.»). Dette skjer i nettleseren, ved sending, «Prøv igjen» og «Endre søk». For å gjøre det må klienten lese klokka og runde til kvarter. Det er akkurat det AD-4 («Nettleserens klokke brukes aldri til domenelogikk») og AD-7 forbyr. Spinen sier ikke hva serveren gjør med et Søk som har passert: avviser det med 400, justerer det i stillhet, eller justerer og melder fra. En fane som har stått åpen en stund, havner rett i dette. Skjema-storyen og `/api/sok`-storyen kommer til å løse det hver på sin måte.
- **Forslag:** Legg til i AD-4: «Serveren normaliserer hvert Søk mot sitt eget ‹nå› (rund opp til neste kvarter, tidligst 06:00, bytt til i morgen 10:00 etter 22:00) i `src/kjerne/tid.ts`. Resultatet har `sok` (det Søket som faktisk ble regnet) og `justering` (ferdig tekst eller fraværende). UI-et viser `justering` og fyller skjemaet fra `sok`. Klienten justerer aldri selv.» Da er hjelpeteksten i UX bare noe som vises etter at svaret har kommet.

### H2 — Formen på Søk over HTTP er ikke avgjort [high]

- **Hvor:** AD-2, AD-5, konvensjonen for Validering; Deferred-raden «De enkelte feltene i Resultat».
- **Problem:** Tre stories bruker Søk: skjemaet, `/api/sok` og «Bruk Bedre tidsvindu» (og indirekte `/api/begrunnelse`). Spinen avgjør ikke:
  1. om Turdag sendes relativt (`idag`/`imorgen`) eller som dato. Med relative verdier betyr et Søk sendt rett over midnatt, eller et `bedreTidsvindu` «i morgen» som tas i bruk etter midnatt, en annen dag enn brukeren så.
  2. hvor demo-ID-en står: i query-strengen, i body eller i en header («sender demo-ID-en med i hvert API-kall»).
  3. verdiene for Vanskelighetsgrad (`Enkel/Middels/Krevende` mot datasettets `G/B/R`) og enheten for Tilgjengelig tid.
  4. om `bedreTidsvindu.funnet` har med et ferdig Søk klienten kan sende uendret.
- **Forslag:** Ny AD eller et tillegg til AD-3: «`src/kjerne/sok.ts` eksporterer Zod-skjemaet `Sok`: `turdag` som `YYYY-MM-DD` (serveren godtar bare i dag og i morgen etter sitt ‹nå›), `starttidspunkt` `HH:mm`, `tilgjengeligTidMin` 15–300 i steg på 15, `vanskelighetsgrad` `'G'|'B'|'R'`, `utsikt` og `vann` som boolean. `demo` står alltid i body. `bedreTidsvindu.funnet.sok` er et komplett `Sok`.» Det er nok med fem linjer.

### H3 — `/api/begrunnelse` stoler på tekst og fakta fra klienten [high]

- **Hvor:** AD-12, AD-14, Deferred «Rate limiting».
- **Problem:** Klienten sender Regelteksten og «fakta om Turen», og serveren sender dem videre til Claude. Det betyr at:
  - alle som har lenken, kan bruke endepunktet som en åpen proxy til Claude med gruppens nøkkel (kostnad og prompt injection). Utgiftsgrensen begrenser skaden, men gjør ikke endepunktet lukket.
  - `kontrollerSprakmodelltekst()` sjekker tall mot det klienten har sendt, så kontrollen i FR-22 bare er så sterk som klienten er ærlig.
  - «fakta om Turen» ikke er definert, så klient-storyen og server-storyen velger hver sine felt.
  - Preview-deployene er offentlige, og spinen sier ikke hvilke Vercel-miljøer nøkkelen gjelder for.
- **Forslag:** Endre AD-12: «Forespørselen er `{ sok, turId, demo }`. Serveren regner Resultatet på nytt (det er deterministisk, og MET ligger i cachen), henter Regelteksten og fakta (fra Turdatasettet) selv og avviser en `turId` som ikke er blant Turforslagene. Språkmodellteksten rendres som ren tekst.» Legg til i AD-14: «`ANTHROPIC_API_KEY` settes bare for Production-miljøet på Vercel.»

### M1 — Uklart om setninger med domeneverdier lages i kjernen eller i UI-et [medium]

- **Hvor:** AD-7, konvensjonen «Faste UI-tekster» (`src/ui/tekster.ts`).
- **Problem:** AD-7 sier at UI-et aldri formaterer domeneverdier. Likevel har mange UX-tekster verdier inni seg: overskriften («Tre Turforslag som passer i morgen fra kl. 14:00», med tallord etter antallet), Mørkevarselet med klokkeslett, «trenger 1 min mer», Værvarslingslinja, frarådet-meldingen («vind opp mot 19 m/s»), «5 av 12 Turer passer før mørket», «12 Turer fra 8 Startpunkter» og Demo-merket med fast «nå». Én story vil bygge setningen i kjernen, en annen vil fylle en mal i `tekster.ts` med formaterte verdier.
- **Forslag:** Én linje i AD-7: «Alle setninger som inneholder en domeneverdi, bygges i kjernen og kommer ferdig i Resultatet. `src/ui/tekster.ts` har bare tekster uten verdier.» (Eller motsatt, men velg én.)

### M2 — Vercel-driften: filsporing av `data/` og statisk rendering [medium]

- **Hvor:** AD-4, AD-9, AD-13, AD-14; Structural Seed.
- **Problem:**
  1. Skallet leser `data/` ved kjøring, også `data/vaerscenarioer/<id>/` med en dynamisk sti. Next.js sporer bare filer det kan se statisk når serverless-funksjonen pakkes. Dynamiske `fs`-stier kan derfor virke lokalt og gi 500 på Vercel, akkurat i Demomodus, som testpersonene skal bruke.
  2. AD-4 forutsetter at siden rendres per forespørsel. Next 16 kan prerendere eller cache siden, og da fryses «nå» og standardverdiene til tidspunktet for bygget.
- **Forslag:** Legg til i AD-9/AD-13: «All lesing av `data/` skjer i `src/server/data.ts` med statiske JSON-importer (ett kjent sett med scenario-ID-er), ikke med `fs` og dynamiske stier.» Legg til i AD-4: «`page.tsx` rendres dynamisk (`await connection()` eller lesing av `searchParams`). Ingenting som bruker miljøet, ligger bak `use cache`.» Legg til i AD-14: «Playwright i CI kjører mot `next build && next start`.»

### M3 — Kartet før Søk og Mål-markørene har ingen datakilde [medium]

- **Hvor:** AD-3, AD-10, AD-15; mot EXPERIENCE.md (Søk-kartet på PC med «de 8 Startpunktene», «tegner fortsatt ruter, Startpunkter og Mål»).
- **Problem:** Rutegeometrien kommer bare med Resultatet. Søk-visningen viser derimot alle Startpunkter før noe Søk er sendt, og kartet tegner Mål. Spinen sier ikke hvordan siden får Startpunktene (server-props eller et eget endepunkt). Turdatasettet har ingen koordinater for Mål (bare `mal` som navn), så Mål-posisjonen finnes ikke noe sted.
- **Forslag:** I AD-4/AD-10: «Siden får `kartgrunnlag` (Startpunkter og antall) som server-props fra skallet.» For Mål: avgjør det (for eksempel siste punkt i geometrien eller et nytt felt `mal_punkt` i Turdatasettet med Zod-skjema), eller før det opp som åpent spørsmål.

### M4 — Python-skriptet har en egen kopi av FR-8/FR-9, og terskelfila har ingen form [medium]

- **Hvor:** AD-8; `scripts/kalibrering_vaerlogg.py`.
- **Problem:** AD-8 sier at skriptet ikke har egne terskler. I dag har det det: `TERSKLER` er hardkodet på linje 38–42. Det har også sin egen `klasse_for_time` og sin egen logikk for den dårligste timen. Selv når tallene er flyttet til `data/vaerterskler.json`, lever reglene (≥ mot <, det strengeste vinner, hvilke timer som telles) videre i to språk. Det er den samme divergensen AD-2 forbyr for nettleser og server. Formen på `vaerterskler.json` er heller ikke bestemt, og den deles av to enheter i to språk.
- **Forslag:** Legg formen inn i AD-8 (for eksempel `{ "frarådet": { "nedborMm": 10, "vindMs": 17.2, "tempUnderC": null }, … }`, Zod-skjema i kjernen) og velg ett av to: (a) skriptet logger bare råverdier, og Værklassen regnes av kjernen (`npx tsx scripts/klassifiser.ts`), eller (b) det finnes én felles tabell med testtilfeller (`testdata/vaerklasse-tilfeller.json`) som både Vitest og skriptet kjører. Lag også en story for å skrive om skriptet.

### M5 — Ingen funksjonsregion på Vercel [medium]

- **Hvor:** AD-14, Structural Seed › Drift.
- **Problem:** Vercel kjører funksjoner i `iad1` (USA øst) hvis ingenting annet er valgt. Da går hvert Søk fra Norge til USA, derfra til MET i Norge og hele veien tilbake. Sammen med kald start og MET-budsjettet på 2 s blir NFR-5 (3 s på «Fast 4G») unødvendig stramt.
- **Forslag:** Legg til i AD-14: «Funksjonsregion `arn1` (Stockholm), satt i `vercel.json`.» Sjekk at Hobby tillater å velge én region, og skriv det i memloggen.

### M6 — Håndhevingen i AD-1 er unøyaktig og ufullstendig [medium]

- **Hvor:** AD-1, Design Paradigm-tabellen, Stack.
- **Problem:** ESLint sin innebygde `no-restricted-imports` skiller ikke `import type` fra vanlige importer. Det krever `@typescript-eslint/no-restricted-imports` med `allowTypeImports: true`. Forbudene i kjernen mot `fetch`, `Date.now()`, `new Date()` uten argument og `process.env` håndheves ikke av noen regel, selv om tabellen lister dem. ESLint og typescript-eslint står ikke i Stack, og Next 16 har ikke lenger `next lint`.
- **Forslag:** Skriv i AD-1: «`@typescript-eslint/no-restricted-imports` (`allowTypeImports`) for visningen. `no-restricted-globals` (`fetch`, `process`) og `no-restricted-syntax` (`Date.now`, `new Date()` uten argument) for `src/kjerne/**`. `eslint` kjøres direkte.» Legg til ESLint og typescript-eslint med versjoner i Stack.

### L1 — Gamle Språkmodelltekster kan overskrive et nytt Resultat [low]

- **Hvor:** AD-12; FR-6 («Et nytt Søk erstatter det forrige resultatet helt»).
- **Problem:** Svar fra `/api/begrunnelse` kan komme etter at et nytt Søk har gitt nye kort.
- **Forslag:** «Begrunnelseskall avbrytes (`AbortController`) når et nytt Søk sendes, og svaret brukes bare hvis `turId` og Søket stemmer med det som vises.»

### L2 — Spinen sier ikke at det ikke finnes lagret tilstand [low]

- **Hvor:** Invariants (mangler); står bare i memloggen og i EXPERIENCE.md › Foundation.
- **Problem:** Spinen sier aldri «ingen database, Søket holdes bare i minnet og står ikke i URL-en». En UI-story kan lett legge Søket i query-strengen (det er det vanlige i Next.js) eller i `localStorage`.
- **Forslag:** Én linje under Invariants eller Konfigurasjon: «Ingen database eller lagring i nettleseren. Søket holdes i React-tilstand, og bare `demo` står i URL-en (NFR-6).»

### L3 — AD-10 stenger FR-27-testen ute, og geometrihjelperne mangler en plass [low]

- **Hvor:** AD-10 («Bare skallet leser fila»), AD-16.
- **Problem:** FR-27-testen må lese `data/rutegeometri.geojson` (hull over 50 m, avstand til Startpunkt). Spinen sier ikke hvor avstands- og hullberegningene ligger, så testen og eventuell kode i skallet kan få hver sin haversine.
- **Forslag:** «I appen leser bare skallet fila. Tester og skript har lov.» Legg også til at geometrifunksjonene ligger i `src/kjerne/geo.ts`.

### L4 — Sekvensdiagrammet stemmer ikke med AD-3 og AD-12 [low]

- **Hvor:** Structural Seed › Ett Søk.
- **Problem:** Løkka sender `/api/begrunnelse` til deltakeren A, som heter `/api/sok`. Kontrollen i kjernen og kallet til språkmodellen vises ikke. «S->>S: legg til rutegeometri» etter at kjernen har returnert, betyr at det finnes to former for Resultat, mens AD-3 sier én type. Jeg fikk ikke lov til å rendre diagrammene (mermaid-cli ble stoppet). Syntaksen ser gyldig ut, men i diagrammet «Drift» brukes `vercel` i en kant før `subgraph vercel` er deklarert. Det er tryggest å flytte subgraphen over kantene.
- **Forslag:** Legg til deltakeren `B as /api/begrunnelse`, og vis `B->>K: kontrollerSprakmodelltekst` og `B->>LLM`. Skriv i AD-3 at kjernen returnerer `Resultat` uten geometri og skallet gir `ResultatMedKart` (eller la kjernen få geometrien som argument). Flytt subgraphen.

### L5 — Ingen seksjon for åpne spørsmål, og antakelser vises som vedtatt [low]

- **Hvor:** hele spinen; memloggen linje 50–51 (`[ASSUMPTION]`).
- **Problem:** CSS Modules, Nunito Sans og ESLint-oppsettet, og valget om ikke å bruke utløpt MET-data, er markert som antakelser til gjennomgang i memloggen. I spinen står de som `[ADOPTED]` uten merknad. Kalibreringen (PRD §10, spørsmål 1) og Mål-koordinatene (M3) er åpne, men spinen har ingen seksjon for åpne spørsmål.
- **Forslag:** Legg til «Open Questions» med disse punktene, eller la brukeren bekrefte antakelsene og oppdater memloggen.

### L6 — Hull i versjonssjekken [low]

- **Hvor:** Stack; memloggen.
- **Problem:** Det finnes ingen `(version)`-oppføring som bekrefter at modell-ID-en `claude-haiku-5-5` finnes og kan brukes med `@anthropic-ai/sdk` 1.3.0. ESLint, typescript-eslint og `tsx` (for `scripts/konverter-rutegeometri.ts`) mangler.
- **Forslag:** Sjekk modell-ID-en med ett kall eller i dokumentasjonen og skriv det i memloggen. Legg til de manglende verktøyene i Stack.

### L7 — «Feltene i Resultat» er trygt å utsette bare med en rekkefølge [low]

- **Hvor:** Deferred, rad 4.
- **Problem:** Resultat er kontrakten mellom alle server- og UI-stories. Når typen først finnes, fanger kompilatoren avvik. Før den finnes, fanger ingenting dem.
- **Forslag:** Endre «Tas opp igjen når» til: «Første story i epic 1 lager `resultat.ts` og `sok.ts`. Ingen UI-story starter før de finnes.»

### L8 — Noen regler er overspesifisert, og noe begrunnelse har sneket seg inn [low]

- **Hvor:** AD-6, AD-11, AD-15, AD-14.
- **Problem:** Spinen skal fikse det flere enheter kan gjøre ulikt. Noen punkter angår bare én story, eller gjentar PRD/addendum:
  - AD-11: senitvinkel, havnivå, avrunding og ±2 min står allerede i FR-21 og addendumet. «Kontrollert 2026-11-12: suncalc …» under Prevents er begrunnelse og hører hjemme i memloggen.
  - AD-15: den fulle URL-en til kartflisene, skriften og stien til ikonene angår bare kart- og layout-storyen. Det som binder flere enheter, er «`ssr: false`» og «nettleseren kontakter bare Kartverket».
  - AD-6: HTTPS, fire desimaler og `altitude` gjentar NFR-4 og addendumet. Det som hører hjemme i spinen, er «én adapter, `no-store`, cache-semantikken og `null` ved feil».
  - AD-14: «nøkkelen settes bare mens det testes» er en rutine for drift, ikke en regel for kode (greit å beholde, men det kan stå i README).
- **Forslag:** Trim disse til én linje hver og vis til addendumet, så spinen holder seg til det som kan divergere. Det sparer kontekst for Claude Code i hver story.

## Det som fungerer godt (behold)

- Paradigmetabellen med «Får ikke» per lag, sammen med AD-1, gjør reglene mulige å sjekke mekanisk.
- AD-5 bruker en tabell for miljøet og har en eksplisitt rad for ukjent demo-ID. Det er presist og kan testes.
- AD-6 forklarer hvorfor `cache: 'no-store'` trengs (fetch-cachen i Next) og har `VaerCache`-grensesnittet. Det tar en reell felle tidlig.
- AD-13 lar tester og Demomodus dele de samme MET-formede filene gjennom samme parsing.
- AD-11 bygger på en faktisk måling av suncalc. Det er god verifisering (selve detaljen bør flyttes til memloggen, se L8).
- Capability-kartet dekker FR-1–FR-29 og NFR-1–NFR-11 uten hull.
