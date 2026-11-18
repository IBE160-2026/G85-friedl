# G85 — Irobot

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Simon Friedl

## Publisert app

Appen er publisert på Vercel: **https://g85-friedl.vercel.app**

- Push til `main` publiseres til Production. Push til andre greiner gir en Preview-URL.
- Vercels egen Git-kobling deployer. CI-workflowen deployer ikke.
- Funksjonene kjører i regionen `arn1` (Stockholm), satt i `vercel.json`. Siden rendres dynamisk per forespørsel.
- Tilgang (avklart 2026-11-18): Vercel-appen var allerede installert i GitHub-organisasjonen IBE160-2026 med tilgang til alle repoer, så ingen godkjenning trengtes. Reserven med deploy fra GitHub Actions og `VERCEL_TOKEN` brukes ikke.
