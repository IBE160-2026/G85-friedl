---
title: Turplanlegger (arbeidstittel)
status: draft
created: 2026-09-04
updated: 2026-10-29
---

# Product Brief: Turplanlegger (arbeidstittel)

## Sammendrag

Å velge riktig tur for akkurat denne dagen er vanskeligere enn det høres ut som. Værforhold endrer seg, tilgjengelig tid varierer, og ønsket vanskelighetsgrad eller type opplevelse — utsikt, vann, kort tur — er personlig. I dag må man enten forholde seg til statiske turlister og selv krysssjekke dette mot værmeldingen, eller stole på egen lokalkunnskap.

Turplanlegger er en responsiv nettside der brukeren oppgir noen enkle preferanser — tid til rådighet, ønsket vanskelighetsgrad, type opplevelse — og får konkrete turforslag tilbake, basert på faktisk turdata og faktisk værmelding for området. Ikke en statisk liste å bla i, men et verktøy som kobler dagens forhold direkte til et konkret valg. Nettsiden skal fungere like godt på PC hjemme kvelden før som på mobil rett før man drar.

Prosjektet gjennomføres som del av IBE160 og bygger på reelle, gratis og offentlige norske datakilder: Turrutebasen (Kartverket/Geonorge) for turdata, beriket med et eget kuratert datasett, og MET Norway for værdata. MVP-området er Moldemarka i Molde kommune.

## Problemet

Det finnes ikke i dag et samlet verktøy som dynamisk foreslår "den beste turen for deg akkurat i dag" basert på faktiske, oppdaterte forhold. Brukeren må selv gjøre jobben med å veie turalternativer opp mot værmelding og tilgjengelig tid.

UT.no (drevet av DNT) er allerede etablert som en omfattende turplanlegger, men er i praksis en søkbar database med tusenvis av turforslag som brukeren selv må filtrere og sammenligne. Den gjør ikke selve koblingsjobben — å veie dagens værmelding opp mot tilgjengelig tid og treffe et konkret valg blant alle alternativene er fortsatt opp til brukeren.

## Løsningen

En responsiv nettside der brukeren oppgir preferanser, og løsningen kombinerer dette med turdata og faktisk værmelding for å foreslå 1–3 konkrete turer — hver med en kort begrunnelse for hvorfor akkurat denne turen passer nå (f.eks. "kort tur i nærheten siden du har begrenset tid, og finvær utover ettermiddagen").

Kjernefunksjoner (MVP):

- **Preferanseinput** — tid til rådighet, ønsket vanskelighetsgrad, og eventuelle preferanser (utsikt, vann).
- **Værintegrasjon** — henter værmelding fra MET Locationforecast for turområdet og vurderer om forholdene passer for tur i den aktuelle perioden.
- **Turdata** — et kuratert sett med turer i Moldemarka med lengde, høydemeter, vanskelighetsgrad, utsikt og vann. Rutegeometrien kommer fra Turrutebasen.
- **Anbefaling** — en regelbasert poengberegning velger og rangerer 1–3 turer. Begrunnelsen genereres fra de samme reglene. En språkmodell kan eventuelt formulere begrunnelsen i mer naturlig språk, men velger aldri turene, og appen fungerer fullt ut uten den.
- **Kartvisning** — viser anbefalte turer på et kart, med grunnleggende informasjon (lengde, vanskelighetsgrad, startpunkt).

### Slik fungerer anbefalingen

Anbefalingen er regelbasert, slik at den kan testes med faste værdata:

1. **Filtrering (harde krav):** Turer med beregnet turtid over tilgjengelig tid fjernes. Turer som er vanskeligere enn valgt vanskelighetsgrad fjernes.
2. **Turtid** beregnes med Naismiths regel: 5 km/t pluss 1 time per 600 høydemeter.
3. **Værvurdering:** Værmeldingen for tidsvinduet klassifiseres som god, middels eller dårlig ut fra nedbør, vind og temperatur. Foreløpige terskler, som justeres i PRD: dårlig vær = nedbør over 2 mm/t eller vind over 10 m/s.
4. **Poeng og rangering:** Turer som matcher ønsket opplevelse (utsikt, vann) får høyere poeng. Ved dårlig vær får turer under tregrensen og turer merket som egnet i dårlig vær høyere poeng, og utsiktsturer lavere.
5. **Begrunnelse:** Hvert forslag viser hvilke regler som slo inn, for eksempel "passer tiden din (1 t 20 min), lite nedbør, utsikt over fjorden".

**Når ingen tur passer** (for eksempel styrtregn hele dagen eller svært kort tid), viser appen en forståelig melding og foreslår det nærmeste alternativet — kortere tur, enklere tur eller et bedre tidsvindu samme dag.

## Teknisk krav: responsivt design

Dette er et hardt krav, ikke en "nice to have". Nettsiden skal fungere godt på tre ulike skjermstørrelser og input-metoder:

- Layout som tilpasser seg fra bred skjerm (kart og turliste side om side) til smal skjerm (stables vertikalt).
- Touch-vennlige kontroller på mobil/nettbrett — store trykkflater, ikke avhengig av hover-tilstander som kun fungerer med mus.
- Kartvisning som fungerer både med mus/scroll og med touch-navigering (pinch-to-zoom, dra for å panorere).

## Hva gjør dette annerledes

Kjernen i prosjektet er koblingsjobben, ikke oppslagsjobben: fra "her er alt som finnes" (UT.no) til "her er de tre som passer deg akkurat nå". Det er kombinasjonen av sanntids værdata og tur-metadata i én anbefaling — fremfor to separate ting brukeren selv må sammenholde — som er differensieringen. Dette er ingen påstand om en teknisk voll; fordelen ligger i å faktisk løse koblingsproblemet ende-til-ende, med data som allerede finnes åpent tilgjengelig.

## Målgruppe

**Primærbruker:** En student i Molde som har en ledig ettermiddag og vil på tur samme dag. Hun kjenner ikke nødvendigvis Moldemarka godt, har mellom 1 og 4 timer til rådighet, og vil vite hvilken tur som passer med tiden hun har og været i dag — uten å sammenligne turlister og værmelding selv. Hun bruker mobilen, ofte rett før hun går.

Lokalbefolkning og besøkende kan også ha nytte av løsningen, men designet og prioriteringene i MVP tas ut fra primærbrukeren.

## Suksesskriterier

Kriteriene er formulert slik at de kan testes:

- Brukeren kan gå fra å oppgi preferanser til å få et konkret turforslag på under ett minutt.
- Ved 1 time tilgjengelig foreslås ingen tur med beregnet turtid over 1 time.
- Ingen tur som er vanskeligere enn valgt vanskelighetsgrad blir foreslått.
- Ved meldt kraftig nedbør eller sterk vind i tidsvinduet vises en tydelig værvarsling, og turer som er egnet i dårlig vær rangeres høyere.
- Når ingen tur passer, vises en forståelig melding med et alternativ, aldri en tom side eller feilmelding.
- Hvert forslag har en begrunnelse som nevner tid, vær og minst én preferanse.
- Rangeringen gir samme resultat for samme input og samme værdata (testes med faste værdata).
- Appen fungerer uten API-nøkler, og kan kjøres lokalt etter README.
- Nettsiden er brukbar på skjermbredder fra 360 px (mobil) til 1440 px (PC), uten horisontal scrolling.

## Omfang

**Med i MVP** er de fem kjernefunksjonene listet under Løsningen over.

**Utenfor MVP, kan diskuteres:**

- Lagrede favoritter (krever enkel brukerkonto)
- Flerdagers turplanlegging/ruteoptimalisering
- Deling av turforslag (lenke/sosiale medier)
- Filtrering på aktivitetstype (fottur, skitur, sykkeltur)
- Kollektivtransport til startpunktet
- Flere områder enn Moldemarka

**Avgrensninger:**

- MVP er avgrenset til **Moldemarka i Molde kommune**, med et kuratert utvalg på 10–20 fotturer.
- Kun fotturer i MVP.
- Ingen brukerkontoer/innlogging i MVP.
- Ingen sanntids GPS-sporing underveis på selve turen — dette er et planleggingsverktøy, ikke en treningsapp.
- Værvarsel er informativt, ikke en garanti — brukeren har fortsatt selv ansvar for å vurdere forholdene før og under turen.

## Datakilder

- **Turrutebasen** (Kartverket/Geonorge) — åpne geodata med turruter. Lastet ned for Molde kommune (GML, EPSG:25833). Filen har 94 navngitte fotruter, men vanskelighetsgrad finnes bare på 15 av dem, og høydemeter mangler helt. Ruter i datasettet er ofte segmenter i et nettverk, ikke hele turer. Turrutebasen brukes derfor til rutegeometri på kartet.
- **Kuratert turdatasett** — 12 turer i Moldemarka med lengde, høydemeter, vanskelighetsgrad, utsikt og vann, hentet fra morotur.no (Møre og Romsdal fylkeskommunes turdatabase) og koblet til segmentene i Turrutebasen. Høydemeter kontrolleres mot høydedata.
- **MET Norway Locationforecast** — gratis værdata under åpen lisens (CC BY 4.0), uten API-nøkkel. Krever en identifiserende User-Agent og caching. Siden nettleseren ikke kan sette User-Agent, går værkallene via en liten backend-proxy med caching, slik MET anbefaler.

Detaljer om dataobjektene og hvor dataene ligger i repoet står i [addendum.md](addendum.md).

## Visjon

Hvis konseptet treffer, er neste steg å utvide fra Moldemarka til flere områder, og å bygge ut anbefalingsmotoren med lagrede preferanser og favoritter. Kjerneverdien forblir den samme: å gjøre koblingen mellom vær, tid og turvalg til noe verktøyet gjør for brukeren, ikke noe brukeren må gjøre selv.
