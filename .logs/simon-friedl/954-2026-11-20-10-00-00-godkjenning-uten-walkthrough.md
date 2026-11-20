# Godkjenning uten walkthrough

## 2026-11-20 kl. 10:00 — Simon Friedl

### Oppgave
Simon ba om å hoppe over walkthrough og godkjenne storyene som sto igjen i `review` etter at story 2.1 var godkjent.

### Plan
- Sett alle storyer i `review` til `done` i `sprint-status.yaml`, og epicene som da er fullført.
- Lukk walkthrough-punktene i `issues.md`.
- Samme fremgangsmåte som for 2.8–2.10 (`b19a287`).

### Resultat
- Story 2.2, 2.11, 3.1–3.5 og 4.1–4.3 er satt til `done` uten walkthrough. Epic 2, 3 og 4 er satt til `done` (`00dbcef`). Ingen storyer står igjen i `review`.
- Lukket i `issues.md`: «Story 2.2 står som `review`» og walkthrough-punktene for 2.11, 3.1–3.5 og 4.1–4.3 (10 punkter).
- Retrospektivene for epicene er fortsatt `optional`.

### Åpne punkter
- Det som walkthroughene skulle se på manuelt, er ikke sett: zoomtekstene og tegnforklaringen på mobil (3.1), små ruter ved 104 px (3.2), linjer mellom fliser ved halve zoomtrinn (3.3), plasseringen av pillen og grensen på 3 feil / 8 s (3.4), animasjonen og Kartinfoboksen (3.5), «en min …» og bindestrek foran siffer (4.1). Detaljene står i de lukkede punktene i `issues.md`.

## 2026-11-20 kl. 10:03 — Simon Friedl

### Oppgave
Push av godkjenningene til origin.

### Plan
- `git push origin main`.

### Resultat
- Pushet `1c8e8d5..3b5200e` til `origin/main` (4 commits: `c3f8127`, `88316e2`, `00dbcef`, `3b5200e`).

### Åpne punkter
Ingen nye.
