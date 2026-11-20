# CI-typesjekk og risiko for /api/begrunnelse

## 2026-11-20 kl. 12:53 — Simon Friedl

### Oppgave
Etter `bmad-help`, der alle fire epics står som `done`, ba Simon om å legge `tsc --noEmit` inn i CI. Han godtar også at `/api/begrunnelse` ikke har noen grense for antall forespørsler, som kjent risiko. Begge deler skal føres i loggen og pushes. Retrospektiv skal ikke kjøres i denne økten.

### Plan
- Kjør `tsc --noEmit` lokalt og på en ren klone, som ikke har `next-env.d.ts` (den er git-ignorert) eller `.next/`.
- Legg til et typesjekksteg i `.github/workflows/ci.yml` før Vitest.
- Lukk de to punktene i `issues.md` og push.

### Resultat
- Lokalt består `tsc --noEmit`. På en ren klone feilet den med `TS2304: Cannot find name 'LayoutProps'` (`src/app/layout.tsx:16`) og `'PageProps'` (`src/app/page.tsx:14`). Det er globale typer som Next lager. Med `npx next typegen` først består den på den rene klonen.
- CI har fått steget «Typesjekk»: `npx next typegen && npx tsc --noEmit`, etter Lint og før Vitest (`c50c334`).
- Kjent risiko som er godtatt: `/api/begrunnelse` har ingen grense for antall forespørsler. Det som begrenser misbruk, er utgiftsgrensen i Anthropic-konsollen: maks 5 USD og ingen automatisk påfylling. Publisering er ikke et krav fra faglærer. Hvis grensen nås, svarer endepunktet uten Claude-tekst, og Regelteksten vises som før.
- Lukket i `issues.md`: CI-punktet fra story 2.1 og punktet om grense for forespørsler fra story 4.2.
- Skal pushes til `main`. CI-kjøringen bekrefter at det nye steget er grønt i GitHub Actions.

### Åpne punkter
- Ingen nye.
