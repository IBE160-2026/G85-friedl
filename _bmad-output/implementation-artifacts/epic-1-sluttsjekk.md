# Sluttsjekk for Epic 1

Story 1.15 (AR-25, NFR-1, NFR-3, NFR-5, NFR-8, SM-4, UX-DR46, UX-DR47). Sjekket 2026-11-19 mot `main` på `e4ed5af` (story 1.14 og loggen), med endringene fra denne storyen i arbeidskopien.

## Oversikt

| Krav | Resultat |
|---|---|
| README (AR-25, NFR-3) | Bestått. Kom i gang, Demomodus, Tester og konverteringsskriptet er med, og README sier at appen virker uten `ANTHROPIC_API_KEY`. |
| Ren klone uten `.env` (NFR-3) | Bestått på `01ccb5c` (storyens commit). `npm install && npm run dev` slik README sier, uten `.env`, gir tre Turforslag med «Været er ikke vurdert.». |
| NFR-5 med «Fast 4G» | Bestått. Median 212 ms og maks 219 ms mot Production, grensen er 3 s. Funksjonen var varm i de fem målingene, og CPU-en var ikke strupet. Oppvarmingen tok 1032 ms, trolig med kaldstart. |
| SM-4 ved 360, 768 og 1440 px (NFR-1) | Bestått. 15 av 15 sjekker grønne i `e2e/sluttsjekk.spec.ts` (5 visninger × 3 bredder), pluss Kriterieradene ved 180 og 360 px. |
| Forbudene (UX-DR46) | Bestått. `src/ui/forbud.test.ts` er grønn. |
| Ordbruken (UX-DR47, NFR-8) | Bestått. Ingen avvik funnet. |
| Testene | Bestått etter gjennomgangen. `npm test` gir 1008/1008, `npm run lint` og `npx tsc --noEmit` er rene, og `CI=1 npx playwright test` gir 88/88. |

## README

`README.md` har fått tre nye seksjoner, og seksjonen om rutegeometrien er beholdt:

- **Kom i gang:** `npm install && npm run dev`, Node 26 fra `engines` i `package.json` (repoet har ingen `.nvmrc`), og at verken `.env`, `ANTHROPIC_API_KEY` eller andre nøkler trengs.
- **Demomodus:** `?demo=uten-vaer`, med fast «nå» (man. 9. nov. 2026 kl. 13:30) og Værscenarioet «Værmeldingen mangler». Seksjonen sier også hva standard-Søket og 15 min gir, og hva en ukjent demo-ID gir.
- **Tester:** `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run test:e2e` og `CI=1 npx playwright test`, pluss sluttsjekken og målingen av svartid (`npm run svartid`).
- **Rutegeometri og konverteringsskriptet:** den eksisterende seksjonen. Overskriften og første punkt kaller nå `scripts/konverter-rutegeometri.ts` for konverteringsskriptet.

README nevner ingen hemmeligheter. Lenkene til `uj-1`–`uj-3` og kalibreringen i AR-25 hører til Epic 2 (story 2.11) og er ikke med ennå.

## Ren klone

**Etter commit (gjeldende):** 2026-11-19 kl. 01:07, på `01ccb5c`. Repoet ble klonet til en midlertidig mappe, og README ble fulgt ordrett.

| Steg | Resultat |
|---|---|
| `git clone` | OK. Ingen `.env`, bare `.env.example`. |
| `npm install` | OK, exit 0. |
| `npm run dev` | OK, «Ready» på `http://localhost:3000`. |
| `GET /?demo=uten-vaer` | 200 |
| `POST /api/sok?demo=uten-vaer` (2026-11-09, 13:30, 2 t, Middels, utsikt) | «Tre Turforslag som passer tiden din», `vaer` er `mangler` med «Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.», og `utfall` er `turforslag` med 3 kort. |

Serveren ble stoppet, og mappa ble slettet etterpå.

**Første kjøring, før commit (erstattet):** Første kjøring var 2026-11-19 ca. kl. 00:55–00:56, rett etter den første NFR-5-målingen. Den brukte en klone fra GitHub på `e4ed5af` i en midlertidig mappe, altså uten endringene fra denne storyen. Mappa hadde ingen `.env`, bare `.env.example`.

| Steg | Resultat |
|---|---|
| `git clone` | OK |
| `npm ci` | OK. npm varslet at installasjonsskriptene til `fsevents` og `unrs-resolver` ikke ble kjørt («Run `npm install-scripts ls` to review»). Det stoppet verken bygg eller start. |
| `npm run build` | OK. `/` og `/api/sok` er dynamiske (ƒ). |
| `npm start -- -p 3300` | OK, «Ready in 91ms». |
| `GET /?demo=uten-vaer` | 200. Siden har «Hvor lenge vil du gå?» og «DEMOMODUS». |
| `POST /api/sok?demo=uten-vaer` (2026-11-09, 13:30, 2 t, Middels) | 200. `utfall.type` er `turforslag` med 3 kort, overskriften er «Tre Turforslag som passer tiden din», og `vaer` er `mangler` med «Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.» |
| `POST /api/sok` uten demo | 200. |
| «Finn tur» i Chromium ved 390 px | Overskriften «Tre Turforslag som passer tiden din», Værmangel-linjen «Været er ikke vurdert. …» og Turkortene vises. |

Serveren ble stoppet etterpå.

## NFR-5: svartid med «Fast 4G»

Målt 2026-11-19 kl. 01:04 med `npm run svartid` (`node scripts/mal-svartid.ts`, Node 26.8.1, Playwrights Chromium) mot `https://g85-friedl.vercel.app/?demo=uten-vaer`. Production hadde story 1.14: 15 min ga Alternativkortet, ikke den gamle plassholderen.

**Struping:** CDP `Network.emulateNetworkConditions` med verdiene Chrome DevTools bruker for «Fast 4G» (`front_end/core/sdk/NetworkManager.ts`):

| Verdi | Utregning | CDP-verdi |
|---|---|---|
| Ventetid | 60 ms × 2,75 | 165 ms |
| Nedlasting | 9 Mbit/s × 0,9 | 1 012 500 B/s |
| Opplasting | 1,5 Mbit/s × 0,9 | 168 750 B/s |

Bare nettverket er strupet, ikke CPU-en. Visningen er 390 × 844 px (mobil), og Søket er standard-Søket (I dag 13:30, 2 t, Middels). Tiden går fra klikket på «Finn tur» til første bilde der Begrunnelsen (Regelteksten) i et Turkort er synlig. Det måles med `performance.now()` i siden og med `checkVisibility({ opacityProperty: true, visibilityProperty: true })`, fordi kortet i Stokken tones inn. Viser siden Alternativet eller Kontaktfeil, stopper skriptet med feil. Siden lastes på nytt før hver måling. Medianen er snittet av de to midterste når antallet er partall.

| Måling | Tid |
|---|---|
| Oppvarming | 1032 ms |
| 1 | 206 ms |
| 2 | 219 ms |
| 3 | 219 ms |
| 4 | 211 ms |
| 5 | 212 ms |
| **Median** | **212 ms** |
| **Maks** | **219 ms** |

Begge er godt under 3 s. Funksjonen var varm i de fem målingene, og CPU-en var ikke strupet. Oppvarmingen tok 1032 ms, trolig fordi funksjonen hadde vært i ro i ca. 9 minutter og startet kaldt. Det er også under 3 s, men det er bare én måling. Målingen tar ikke med lasting av selve siden, bare tiden fra trykket.

En første måling kl. 00:55, med `npx tsx` og stopp på første synlige Turkort, ga median 199 ms og maks 211 ms. Den er erstattet av målingen over, fordi stoppvilkåret er endret til Regelteksten.

## SM-4: responsivt oppsett (NFR-1)

`e2e/sluttsjekk.spec.ts` sjekker fem visninger ved 360 × 800, 768 × 1024 og 1440 × 1000 px:

- Søk, Turforslag (standard-Søket), Alternativ (15 min) og Kontaktfeil (`/api/sok` avbrutt med `route.abort()`), alle på `?demo=uten-vaer`
- panelet for en ukjent demo-ID på `?demo=finnes-ikke`

For hver av de 15 kombinasjonene sjekkes:

1. at `scrollWidth <= clientWidth` på `<html>`, altså ingen horisontal rulling.
2. at alle synlige lenker, knapper, skjemafelt og fokuserbare elementer er minst 44 × 44 px. Bare radioknapper og avkrysningsbokser kan i stedet ligge i en etikett som er det, fordi de trykkes via etiketten.
3. at siden ikke har noen `title`-attributter og ingen SVG-`<title>`.
4. at ingen `:hover`-regel i de innlastede stilarkene endrer `display`, `visibility`, `opacity`, `max-height`, `height`, `transform`, `clip-path` eller `pointer-events`. Sjekken går også inn i `@import` og `@media`, og hopper over stilark som ikke kan leses. Kildekoden har ingen `:hover`-regler i det hele tatt, og `src/ui/forbud.test.ts` holder det slik.

| Visning | 360 px | 768 px | 1440 px |
|---|---|---|---|
| Søk | OK | OK | OK |
| Turforslag | OK | OK | OK |
| Alternativ | OK | OK | OK |
| Kontaktfeil | OK | OK | OK |
| Ukjent demo | OK | OK | OK |

Ingenting feilet. Samme fil har en regresjonstest for rettingen av Kriterieradene:

- Ved 180 px starter verdien i hver synlige rad i Turkortet ved etiketten (±2 px) og er bredere enn halve raden.
- Ved 360 px står verdien til høyre for etiketten.

Med rettingen slått av feiler testen ved 180 px, som den skal. Testen kjører i CI sammen med de andre Playwright-testene.

## Forbudene (UX-DR46)

`src/ui/forbud.test.ts` leser `.ts`-, `.tsx`-, `.js`-, `.jsx`-, `.mjs`- og `.css`-filene rekursivt under `src/ui/` og `src/app/` med `fs`, og sjekker dem med `RegExp`, så testen ikke avhenger av `grep` på maskinen. Testfilene er unntatt. Ingen av disse mønstrene finnes:

- dialog og popup: `<dialog`, `"dialog"`, `"alertdialog"`, `showModal`, `window.open`, `alert(`, `confirm(` og `prompt(`
- varsler: `Notification`, `PushManager` og `serviceWorker`
- deling: `navigator.share` og `navigator.clipboard`
- posisjon: `geolocation`, `getCurrentPosition` og `watchPosition`
- lagring i nettleseren: `localStorage`, `sessionStorage`, `indexedDB` og `document.cookie`
- innlogging: «logg inn», «logg ut», «innlogging», «login», «sign in» (med ordgrenser), «passord» og `type="password"`
- `title=` og SVG-`<title>`
- `:hover` i CSS-filene

Testen sjekker også ordene i UX-DR47: «trygg», «trygt», «Oops» og «Noe gikk galt» står ikke i `src/ui/tekster.ts` og ikke i strenglitteralene i `src/kjerne/` (uten testfiler og uten kommentarer).

Testen ble prøvd med midlertidige filer: en `.tsx` med alle mønstrene, en `.css` med `:hover` og en kjernefil med «trygg» i en streng. 9 av 11 tester feilet da, som de skal. «trygg» i en kommentar ga ikke feil. Filene ble slettet. Karusell, tellere og favoritter finnes ikke i UI-et. Stokken blar bare når brukeren trykker eller sveiper. Sveip er en snarvei ved siden av Stokknavigasjonen, så ingenting krever sveip, dobbelttrykk eller langt trykk.

## Ordbruken (UX-DR47, NFR-8)

`src/ui/tekster.ts` og tekstene fra kjernen (`overskrift` i `lag-visning.ts`, `turkort.ts`, `regeltekst.ts`, `format.ts` og `sok.ts`) er lest mot begrepene i PRD §3 og Voice and Tone i EXPERIENCE.md.

- Begrepene brukes ordrett: Søk, Turdag, Starttidspunkt, Tilgjengelig tid, Vanskelighetsgrad, Opplevelsespreferanser, Turforslag, Turtid, Begrunnelse, Alternativ, Mørkevarsel, Startpunkt, Adkomst og Værmeldingen.
- Ingen tekst inneholder «trygg», «trygt», «sikker», «tidsrom», «nivå», «anbefaling», «Oops», «Noe gikk galt» eller «Ingen resultater». «Anbefaling» finnes bare som identifikator i koden.
- Klokkeslett er 24-timers, desimalkomma brukes («5,0 km», «3,46 km»), og varighet skrives «1 t 32 min».
- Faste tekster i JSX står i `tekster.ts`, og `<html lang="nb">` er satt.
- Merknadstekstene fra skissene («skjermkant 844», «Tommelsonen: …», «Sveip kortet til siden …», «Kort 1 er valgt …», «Kortene med Turforslag legges ut her …» og «Kart og liste») er ikke bygget.

Ingen avvik funnet, så ingenting ble rettet. «Finner turer …» har liten t, slik den faste teksten i EXPERIENCE.md er skrevet.

## Utsatte saker for 1.15 (deferred-work.md)

| Sak | Vurdering | Utfall |
|---|---|---|
| Trange Kriterierader ved 180 px (200 % zoom ved 360 px), fra 1.13 | Verdikolonnen var bare noen få tegn bred, og verdiene ble brutt tegn for tegn («1 / t / 3 / 3 …»). Rettingen er én CSS-regel. | **Rettet** i `src/ui/Kriterierad.module.css`: under 360 px står verdien og detaljene under etiketten, og de går fra etikettkolonnen til høyre kant. Fra 360 px er oppsettet uendret. Sjekket med skjermbilder ved 180 og 360 px og med regresjonstesten «Kriterieradene ved 180 px / 360 px» i `e2e/sluttsjekk.spec.ts`. Ingen horisontal rulling ved 180 px. |
| Største bredde på skjermer bredere enn 1440 px, fra 1.12 | Ved 1920 px står de tre kortene i like brede kolonner på ca. 575 px, og alt leses godt. NFR-1 gjelder 360–1440 px, og det finnes ingen token for største bredde. | **Ikke rettet.** Står som åpent punkt, fordi det krever et designvalg om en ny token. |
| Overlappende etiketter i Dagslysstolpen når andelene ligger tett, fra 1.12 | Synlig ved 180 px: «13:30» og «sol ned 15:59» skrives over hverandre. Ved 360 px og bredere overlapper de ikke i demoen. Stolpen er `aria-hidden`, og Mørke-raden sier det samme med tekst. | **Ikke rettet.** Det krever logikk for kollisjon eller en ny regel for når merkene skjules, og det er ikke triviell CSS. |

## Åpne punkter

- Største bredde for Resultat over 1440 px. Krever en token i DESIGN.md.
- Etikettene i Dagslysstolpen kan overlappe ved smal bredde eller når andelene ligger tett.
- NFR-5 er målt med varm funksjon og uten CPU-struping. Kaldstart ble bare sett i oppvarmingen (1032 ms) og er ikke målt for seg.
- SM-4 i EXPERIENCE.md nevner også 1200 px. Spec-en for 1.15 ber om 360, 768 og 1440 px, så 1200 px er ikke med i sluttsjekken. `e2e/stokk.spec.ts` dekker PC-oppsettet ved 1200 px.
- `npm ci` i en ren klone hopper over installasjonsskriptene til `fsevents` og `unrs-resolver`. Det påvirket ikke bygg eller start i første kjøring.
- `node scripts/mal-svartid.ts` gir advarselen `MODULE_TYPELESS_PACKAGE_JSON`, fordi `package.json` ikke har `"type"`. Node leser fila som ES-modul, og målingen virker.
- README mangler fortsatt lenkene til `?demo=uj-1`–`uj-3` og seksjonen om kalibreringen (AR-25). De kommer med Epic 2.
