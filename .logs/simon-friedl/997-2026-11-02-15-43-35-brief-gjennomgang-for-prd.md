# Brief-gjennomgang før PRD

## 2026-11-02 kl. 15:43 — Simon Friedl

### Oppgave
Brukeren byttet til Opus 5.5 med max effort og ba om en gjennomgang av om det er noe mer som bør gjøres med product brief før PRD-arbeidet starter. Avtalt: bare anbefalinger, ingen endringer i briefen uten godkjenning. Etter gjennomgangen godkjente brukeren rettelsene og tok tre valg: turforslag for **i dag og i morgen**, «tid til rådighet» = **bare turtid**, og **omtrentlig** rute på kartet.

### Plan
- Leste `brief.md`, `addendum.md`, `.memlog.md`, `tilbakemelding-product-brief.md` (faglærer, 2026-10-06), MET-researchen og `data/turer-moldemarka.json`/`.csv`.
- Krysssjekket briefen mot faglærers tilbakemelding, mot seg selv og mot dataene.
- Pakket ut Turrutebasen-GML-en i scratchpad og målte lengden på segmentene hver tur er koblet til, sammenlignet med turens oppgitte lengde (engangsskript i scratchpad, ikke i repoet).
- Etter godkjenning: oppdaterte briefen etter `bmad-product-brief` sin Update-modus. Beslutningene og endringene ble logget med `memlog.py`, så kom ferdigstillingen med redaksjonell gjennomgang (`bmad-review`, structure+prose, kjørt inline uten subagenter) og `status: final`.

### Resultat
**Briefen er oppdatert og ferdigstilt** i commit `97ef01d` (brief.md, addendum.md, .memlog.md):
- Tidsrom «i dag og i morgen» i sammendrag, Preferanseinput, «når ingen tur passer», Avgrensninger og et nytt suksesskriterium. Målgruppen har fått en setning om planlegging kvelden før.
- «Tid til rådighet» er definert som tid på selve turen. «I nærheten» er fjernet fra eksempelbegrunnelsen, og «Reisetid og kollektivtransport til startpunktet» står under Utenfor MVP.
- Kartvisningen beskriver startpunkt og omtrentlig rute, og «Eksakt turtrasé på kartet» står under Utenfor MVP. Segmentmålingene er lagt i addendumet under Rutesegment.
- Regelen om tregrensen er erstattet med «lavtliggende turer (lavt høyeste punkt; grensen settes i PRD)». Værtersklene er merket som produktets egne.
- Suksesskriteriene om værvarsling og begrunnelse er omskrevet. Faktafeilene er rettet (11 av 12 fra morotur.no, høydemeter «skal kontrolleres», MET-lisens NLOD 2.0 og CC BY 4.0).
- `.memlog.md` har fått 8 nye oppføringer, blant dem en etterregistrering av den ulogede oppdateringen 2026-10-29 (`ca80853`, `c3f186a`).
- Den redaksjonelle runden ga én språkfiks. Ikke tatt inn: forslaget om å korte ned Datakilder og flytte detaljene til addendumet (briefen er 1473 ord, over målet på 1–2 sider).
- Pushet til `origin/main` etter brukerens ønske, sammen med loggcommitene for økten.

Funn fra gjennomgangen (før oppdateringen):

- **Faglærers tilbakemelding er i hovedsak innarbeidet** (område valgt, Turrutebasen sjekket, regelbasert anbefaling, én primærbruker, testbare kriterier, «ingen tur passer», BMAD-mappe). Ikke tatt opp: «avstand»/«kjøretid» som faglærer nevnte i rangering og tidsberegning.
- **Selvmotsigelse om tidsrom:** Sammendraget lover bruk «kvelden før» på PC, mens primærbrukeren og addendumet sier «samme dag» / «nå eller senere i dag». Tidspunkt for turen står i addendumet, men mangler i briefens Preferanseinput.
- **«Tid til rådighet» er udefinert:** uklart om transport til startpunktet regnes med. Eksempelbegrunnelsen sier «i nærheten», men data har ingen avstand eller koordinater. Med bare turtid (Naismith) passer 3 turer ved 1 time (Storlihytta fra Vardeveien ~19 min, Bergsvatnet ~43 min, Skihytta ~54 min).
- **Regel uten data:** rangeringsregel 4 bruker «under tregrensen», men datasettet har ikke noe slikt felt (bare `hoyeste_punkt_moh`).
- **Suksesskriterier som kolliderer:** «minst én preferanse» i begrunnelsen, mens preferanser er valgfrie. «Kraftig nedbør / sterk vind» er ikke definerte begreper (researchen advarer mot å blande dem med MET-farevarsler). «Egnet i dårlig vær rangeres høyere» er testbart for bare 3 av 12 turer.
- **Kartgeometri ≠ turtrasé:** segmentene er nettverksbiter, ikke turer. Storlihytta fra Vardeveien (0,53 km én vei) er koblet til 4,55 km segmenter, Bergsvatnet (1,57 km) til 5,87 km, og Skihytta/Tusenårsvarden fra Damefallet til ~1,7× turlengden. Kartet vil vise mer sti enn turen hvis segmentene tegnes som de er.
- **Lengde for `tur_retur` er tvetydig:** for Tusenårsvarden fra Grua er `lengde_km_kilde` = `lengde_km_totalt` = 7,69, men segmentene alene er ~5,5 km én vei. Det påvirker beregnet turtid og dermed tidsfilteret.
- **Startkoordinater mangler** i datasettet. De trengs til kartmarkør og værkall.
- **Små faktafeil i briefen:** «hentet fra morotur.no» (11 av 12; Varden er fra Fjord Norway), «Høydemeter kontrolleres» (ikke gjort ennå), MET-lisens oppgitt bare som CC BY 4.0 (er NLOD 2.0 + CC BY 4.0). Datasettet har feltet `historie`, som verken briefen eller addendumet bruker.
- **Prosess:** `.memlog.md` har ingen oppføringer etter 2026-09-22, så oppdateringen etter tilbakemeldingen og research-tillegget er ikke logget der. `status: draft` står fortsatt.
- Lukket to punkter i `issues.md` som allerede var løst i commit `c3f186a` (språkfix i `_bmad/custom/config.toml`, og at data/addendum var ukommittert).

### Åpne punkter
- Data: legg inn startkoordinater for de 12 turene, avklar lengdesemantikken for `tur_retur` (Grua, Moldevatnet), og fjern eller bruk feltet `historie`.
- PRD: sett grensen for «lavtliggende tur» (høyeste punkt) og de endelige værtersklene. Bestem hva appen gjør når MET ikke svarer, og om været hentes for ett punkt eller per tur (høydeforskjell 0–705 moh).
- Valgfritt: kort ned Datakilder i briefen og flytt detaljene til addendumet (1473 ord).
