# Prøvekjøring av README fra ren klone

## 2026-11-20 kl. 13:52 — Simon Friedl

### Oppgave
Følge README ordrett i en ny klone (`~/Desktop/test-klone`), som om prosjektet var ukjent. Ingen `.env.local` og ingen kunnskap fra prosjektmappen. Appen skulle kjøres i Demomodus, og et Søk skulle gi Turforslag. Alt som var uklart, manglet eller feilet, skulle rapporteres og rettes i README. Etterpå skulle endringen pushes og klonen slettes.

### Plan
- Sjekk at port 3000 er ledig, og kjør `npm install` og `npm run dev` slik «Kom i gang» sier.
- Søk med `?demo=uj-1` i Chromium, styrt av Playwright: I dag 13:30, 2 t, Middels, utsikt.
- Prøv kommandoene under «Tester» (`npm run lint`, `npx tsc --noEmit`, `npm test`).
- Rett README og slett klonen.

### Resultat
- Port 3000 var ledig. Klonen var på `9335029`, med Node 26.8.1 og npm 11.19.0. Bare `.env.example` fantes.
- `npm install` virket og endret ikke `package-lock.json`. Det kom advarsler om install-skript i `fsevents` og `unrs-resolver` som ikke er godkjent (`allowScripts`), og `npm audit` meldte 7 moderate funn i `minimatch`. Ingen av delene stopper noe, men README nevnte dem ikke.
- `npm run dev` var klar på under ett sekund. Søket i `?demo=uj-1` ga det README lover: «Værklasse god», klarvær, 3–5 °C og tre Turforslag med kart (Tusenårsvarden fra Damefallet, Storlihytta fra Romsdalsmuseet og Skihytta fra Damefallet), og ingen konsollfeil.
- `npm run lint` var grønn. `npm test` ga 52 testfiler og 1768 tester, alle grønne.
- **Feil i README:** `npx tsc --noEmit` feiler på en ny klone med «Cannot find name 'PageProps'/'LayoutProps'» til `next dev`, `next build` eller `next typegen` har kjørt (vist i en ren klone tidligere i dag, se [ci-typesjekk-og-begrunnelse-risiko](950-2026-11-20-12-53-01-ci-typesjekk-og-begrunnelse-risiko.md)). Etter `npm run dev` besto den.
- README er rettet i `9e2e4d1`: typesjekken er `npx next typegen && npx tsc --noEmit`, med en forklaring, og install- og audit-advarslene står som noe som kan ignoreres.
- Ikke prøvd: `npx playwright install chromium` og `npm run test:e2e`. Chromium fra Playwright lå allerede i den delte cachen på maskinen, så steget kunne ikke prøves som på en ny maskin.
- Dev-serveren fra klonen er stoppet, og `~/Desktop/test-klone` er slettet.
- Prøven ble kjørt av Claude, ikke av en person utenfor gruppa, og teller derfor ikke som SM-3 (se [avgrensning-for-innlevering](949-2026-11-20-13-46-50-avgrensning-for-innlevering.md)).

### Åpne punkter
- Ingen.
