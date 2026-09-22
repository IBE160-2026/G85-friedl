---
title: Turplanlegger (arbeidstittel)
status: draft
created: 2026-09-04
updated: 2026-09-22
---

# Product Brief: Turplanlegger (arbeidstittel)

## Sammendrag

Å velge riktig tur for akkurat denne dagen er vanskeligere enn det høres ut som. Værforhold endrer seg, tilgjengelig tid varierer, og ønsket vanskelighetsgrad eller type opplevelse — utsikt, fiske, historie, kort biltur — er personlig. I dag må man enten forholde seg til statiske turlister og selv krysjekke dette mot værmeldingen, eller stole på egen lokalkunnskap.

Turplanlegger er en responsiv nettside der brukeren oppgir noen enkle preferanser — tid til rådighet, ønsket vanskelighetsgrad, type opplevelse — og får konkrete turforslag tilbake, basert på faktisk turdata og faktisk værmelding for området. Ikke en statisk liste å bla i, men et verktøy som kobler dagens forhold direkte til et konkret valg. Nettsiden skal fungere like godt på PC hjemme kvelden før som på mobil rett før man drar.

Prosjektet gjennomføres som del av IBE160 og bygger på to reelle, gratis og offentlige norske datakilder: Turrutebasen (Kartverket/Geonorge) for turdata, og MET Norway/Yr for værdata.

## Problemet

Det finnes ikke i dag et samlet verktøy som dynamisk foreslår "den beste turen for deg akkurat i dag" basert på faktiske, oppdaterte forhold. Brukeren må selv gjøre jobben med å veie turalternativer opp mot værmelding og tilgjengelig tid.

UT.no (drevet av DNT) er allerede etablert som en omfattende turplanlegger, men er i praksis en søkbar database med tusenvis av turforslag som brukeren selv må filtrere og sammenligne. Den gjør ikke selve koblingsjobben — å veie dagens værmelding opp mot tilgjengelig tid og treffe et konkret valg blant alle alternativene er fortsatt opp til brukeren.

## Løsningen

En responsiv nettside der brukeren oppgir preferanser, og løsningen kombinerer dette med faktisk turdata og faktisk værmelding for å foreslå 1–3 konkrete turer — hver med en kort begrunnelse for hvorfor akkurat denne turen passer nå (f.eks. "kort tur i nærheten siden du har begrenset tid, og finvær utover ettermiddagen").

Kjernefunksjoner (MVP):

- **Preferanseinput** — tid til rådighet, ønsket vanskelighetsgrad, og eventuelle preferanser (utsikt, vann/fiske, kort kjøretur, rolig/aktiv).
- **Værintegrasjon** — henter værmelding for aktuelle områder og vurderer om forholdene passer for tur i den aktuelle perioden.
- **Turdatabase-oppslag** — henter faktiske turer/stier med lengde, vanskelighetsgrad og høydemeter fra et strukturert turdatasett.
- **AI-anbefaling** — kombinerer preferanser, vær og turdata til 1–3 konkrete forslag med kort begrunnelse.
- **Kartvisning** — viser anbefalte turer på et kart, med grunnleggende informasjon (lengde, vanskelighetsgrad, startpunkt).

## Teknisk krav: responsivt design

Dette er et hardt krav, ikke en "nice to have". Nettsiden skal fungere godt på tre ulike skjermstørrelser og input-metoder:

- Layout som tilpasser seg fra bred skjerm (kart og turliste side om side) til smal skjerm (stables vertikalt).
- Touch-vennlige kontroller på mobil/nettbrett — store trykkflater, ikke avhengig av hover-tilstander som kun fungerer med mus.
- Kartvisning som fungerer både med mus/scroll og med touch-navigering (pinch-to-zoom, dra for å panorere).

## Hva gjør dette annerledes

Kjernen i prosjektet er koblingsjobben, ikke oppslagsjobben: fra "her er alt som finnes" (UT.no) til "her er de tre som passer deg akkurat nå". Det er kombinasjonen av sanntids værdata og tur-metadata i én anbefaling — fremfor to separate ting brukeren selv må sammenholde — som er differensieringen. Dette er ingen påstand om en teknisk voll; fordelen ligger i å faktisk løse koblingsproblemet ende-til-ende, med data som allerede finnes åpent tilgjengelig.

## Målgruppe

Primær bruker er enkeltpersoner som planlegger en tur eller friluftslivsaktivitet — studenter, lokalbefolkning, eller besøkende — som ønsker ett konkret forslag tilpasset dagen, ikke en generell liste over alle turer i området.

## Suksesskriterier

- Brukeren kan gå fra å oppgi preferanser til å få et konkret turforslag på under ett minutt.
- Anbefalingen tar hensyn til faktisk værmelding for riktig område og dato, ikke bare statisk turdata.
- Nettsiden er fullt brukbar og ser ryddig ut på PC, nettbrett og mobil.
- Løsningen er enkel å demonstrere live, f.eks. i en kurspresentasjon.

## Omfang

**Med i MVP** er de fem kjernefunksjonene listet under Løsningen over.

**Utenfor MVP, kan diskuteres:**

- Lagrede favoritter (krever enkel brukerkonto)
- Flerdagers turplanlegging/ruteoptimalisering
- Deling av turforslag (lenke/sosiale medier)
- Filtrering på aktivitetstype (fottur, skitur, sykkeltur)

**Avgrensninger:**

- MVP avgrenses trolig til ett geografisk område (f.eks. ett fylke) fremfor hele Norge, for å holde datamengden håndterbar — konkret område er ikke bestemt ennå.
- Ingen brukerkontoer/innlogging i MVP, med mindre lagrede favoritter prioriteres.
- Ingen sanntids GPS-sporing underveis på selve turen — dette er et planleggingsverktøy, ikke en treningsapp.
- Værvarsel er informativt, ikke en garanti — brukeren har fortsatt selv ansvar for å vurdere forholdene før og under turen.

## Datakilder

To reelle, offentlige og gratis norske datakilder er identifisert som godt egnet:

- **Turrutebasen** (Kartverket/Geonorge) — offisielt datasett med turruter, skiløyper og sykkelruter over hele Norge, tilgjengelig som åpne geodata, uttrykkelig laget for bruk i turplanlegging.
- **MET Norway / Yr Weather API** — gratis værdata under åpen lisens (CC BY 4.0), krever ikke API-nøkkel.

Eksempler på dataobjektene fra disse kildene er samlet i [addendum.md](addendum.md).

## Visjon

Hvis konseptet treffer, er neste steg å utvide fra ett avgrenset område til flere fylker eller hele Norge, og å bygge ut anbefalingsmotoren med lagrede preferanser og favoritter. Kjerneverdien forblir den samme: å gjøre koblingen mellom vær, tid og turvalg til noe verktøyet gjør for brukeren, ikke noe brukeren må gjøre selv.
