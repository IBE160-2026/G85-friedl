---
title: 'Story 2.2: Kalibrering av Værtersklene'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'f15c46640822ff62baeedc2607acd9b477cfb87f'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kalibreringen er ferdig, og startverdiene beholdes. Resultatet står i PRD §10 spm. 1. Men `scripts/kalibrering_vaerlogg.py` har fortsatt sine egne `TERSKLER`, så skriptet og appen kan få ulike grenser. Ingenting sjekker heller at skriptet setter samme Værklasse som kjernen. I tillegg er Værord-grensene under laveste terskel (0,1 mm/t og 5,5 m/s) ikke vurdert etter kalibreringen.

**Approach:**
- Skriptet leser tersklene fra `data/vaerterskler.json`.
- Skriptet får `--selvtest`, som kjører `testdata/vaerklasse-fasit.json`. CI kjører selvtesten, slik at Python og TypeScript ikke kan gli fra hverandre.
- Dokumentasjonen merker skriptets MET-kall som navngitt unntak fra AD-6.
- Værord-vurderingen føres i EXPERIENCE.md og PRD §10.

## Boundaries & Constraints

**Always:**
- Skriptet bruker bare standardbiblioteket og må kjøre på Python 3.9.
- Regelen er den samme som i kjernen:
  - `>=` for nedbør og vind, `<` for temperatur, og `null` betyr ingen grense.
  - Strengeste klasse vinner.
  - Tidsvinduet får klassen til den dårligste timen som overlapper `[start, slutt)`.
  - Mangler en time, eller er vinduet tomt, blir klassen `mangler`.
- JSON-navnene oversettes ett sted i skriptet: `fraradet` blir `frarådet` og `darlig` blir `dårlig`. Loggen og `--oppsummer` bruker fortsatt de norske navnene.
- `logg`, `--oppsummer` og CSV-formatet oppfører seg som før med de samme tersklene.
- User-Agent er `turplanlegger-ibe160-kalibrering/0.2 https://github.com/IBE160-2026/G85-friedl`. En kommentar navngir unntaket fra AD-6 (AD-8, AR-12). Det er ingen cache.

**Beslutning (2026-11-18): Værord-grensene beholdes.**
- «oppholdsvær» gjelder under 0,1 mm/t, og «lite vind» under 5,5 m/s.
- EXPERIENCE.md › Værord og PRD §10 spm. 1 får hver en linje om at grensene ble vurdert sammen med tersklene og beholdt. Linjen tar med fordelingen fra loggeuka:
  - nedbør: 6 «oppholdsvær», 6 «lite nedbør» og 2 «noe nedbør»
  - vind: 11 «lite vind» og 3 «noe vind»
  - Alle 14 vinduene ble vurdert som «ville gått».
- Ordene ble ikke vurdert direkte.

**Never:**
- Ikke endre tersklene, fasiten, `src/` eller `vaerlogg.csv`.
- `--selvtest` kaller ikke MET.
- Ikke rør `.logs/`. Hovedøkten lukker punktene i `issues.md` i sesjonsloggen.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Selvtest består | fasiten og tersklene fra repoet | én linje med antall rader som består (28 av 28), exit 0 | – |
| Selvtest feiler | en terskel er endret slik at en fasitrad gir en annen klasse | hver rad som feiler, skrives med beskrivelse, forventet og faktisk klasse, exit 1 | – |
| Vindu over flere timer | 13:30–15:30 med timene 12–16 i fasiten | bare timene 13, 14 og 15 teller | – |
| Time mangler | fasitvinduet uten timen 14 | `mangler` | – |
| Ugyldig terskelfil | ukjent nøkkel, `versjon` ≠ 1, eller feil klasse eller rekkefølge | – | avslutter med en melding som nevner `data/vaerterskler.json` og hva som er galt |
| `--oppsummer` | `vaerlogg.csv` | samme utskrift som før: 14 vurdert, 1 avvik | leser ikke terskelfila |

</frozen-after-approval>

## Code Map

- `scripts/kalibrering_vaerlogg.py`:
  - `:30` `USER_AGENT`
  - `:36-43` `TERSKLER` og `RANG`. `TERSKLER` erstattes.
  - `:52-63` `klasse_for_time` returnerer `(klasse, grunner)`.
  - `:121-127` er løkka for dårligste time i `logg()`. Den skal flyttes til en felles vindusfunksjon som `logg` og `--selvtest` begge bruker.
  - `:188-194` er argparse.
- `data/vaerterskler.json`:
  - Formen er `{versjon: 1, klasser: [{klasse, nedbor_mm_t_minst, vind_ms_minst, temp_c_under}]}`, med fraradet, darlig og middels i den rekkefølgen.
  - `src/kjerne/vaer/terskler.ts` er Zod-skjemaet som Python-sjekken skal speile.
- `testdata/vaerklasse-fasit.json`:
  - `timer[]` har `{beskrivelse, nedborMmT, vindMs, tempC, klasse}`. Det er 20 rader.
  - `tidsvinduer[]` har `{beskrivelse, start, slutt, timer[{start, nedborMmT, vindMs, tempC}], klasse}`. Det er 8 vinduer.
  - Tidene er ISO med `+01:00`, som `fromisoformat` i 3.9 kan lese.
  - Klassene er `god|middels|darlig|fraradet|mangler`.
  - Vinduene kan ha timer utenfor vinduet. De skal ikke telle.
- `src/kjerne/vaer/vaerklasse.ts` og `src/kjerne/tid.ts` (`timerITidsvindu`) er fasiten for semantikken. Les dem, men ikke endre dem.
- `.github/workflows/ci.yml`: `ubuntu-latest` har python3. Legg til et steg etter Vitest.
- `_bmad-output/planning-artifacts/kalibrering/README.md`:
  - «Slik gjør du det» skal nevne `--selvtest`.
  - Under «Når uka er ferdig» sier en linje at `TERSKLER` i skriptet skal oppdateres. Den er nå feil.
- `_bmad-output/planning-artifacts/ux/EXPERIENCE.md:143`: «Grensene må kalibreres sammen med tersklene». Erstattes med vurderingen.
- `_bmad-output/planning-artifacts/prds/prd-turplanlegger-app-2026-11-02/prd.md:512-521`: §10 spm. 1. Legg til punktet **Værord**.

## Tasks & Acceptance

**Execution:**
- [x] `scripts/kalibrering_vaerlogg.py`:
  - `les_terskler()` leser og validerer JSON-fila.
  - `klasse_for_time` tar tersklene som parameter.
  - En felles `klasse_for_vindu` brukes av både `logg` og selvtesten.
  - `--selvtest` kjører hele fasiten.
  - Ny User-Agent og unntakskommentar. Docstringen viser `--selvtest`.
  - Tersklene leses bare når `logg` eller `--selvtest` kjører.
- [x] `.github/workflows/ci.yml`: steget «Selvtest kalibreringsskript» kjører `python3 scripts/kalibrering_vaerlogg.py --selvtest`. Formålet er AD-8: fasiten kjøres av begge.
- [x] `_bmad-output/planning-artifacts/kalibrering/README.md`:
  - Vis `--selvtest`.
  - Tersklene endres i `data/vaerterskler.json`, og deretter kjøres `--selvtest` og `npm test`.
- [x] `_bmad-output/planning-artifacts/ux/EXPERIENCE.md` og `prd.md` §10 spm. 1: før inn Værord-vurderingen som i beslutningen over.

**Acceptance Criteria:**
- Gitt repoet, når `python3 scripts/kalibrering_vaerlogg.py --selvtest` kjøres, består alle radene i fasiten.
- Gitt en midlertidig kopi av tersklene der grensen for dårlig nedbør er 3,0, når selvtesten kjøres mot kopien, feiler bare radene med nedbør i [2,0, 3,0). Kopien slettes etterpå.
- Gitt `vaerlogg.csv`, når `--oppsummer` kjøres, er utskriften den samme som før endringen.
- Gitt hele repoet, når lint og tester kjøres, er de grønne, og `git diff` viser ingen endring i `data/`, `testdata/`, `src/` eller `vaerlogg.csv`.

## Implementation Notes

- Implementert av underagent fra spec-en. Verifisert i hovedøkten:
  - `--selvtest` ga 28 av 28 og exit 0. Med grensen for dårlig nedbør satt til 3,0 feilet nøyaktig de 2 radene i [2,0, 3,0), med exit 1.
  - Terskelfiler med ukjent nøkkel, `versjon` 2 og omvendt rekkefølge stoppet med tydelig melding og exit 1.
  - `--oppsummer` ga 14 vurderte og 1 avvik, som før.
  - `npm run lint` ga 0 feil.
  - `npm test` hadde 1 feil, i `src/kjerne/turtid.test.ts`, som er story 1.6 i en parallell økt og ikke er rørt her.
  - Ingen endring i `data/`, `testdata/`, `src/`, `vaerlogg.csv` eller `.logs/` fra denne storyen.
- Fordelingen i den låste beslutningen (6/6/2) er en tellefeil fra planleggingen. `vaerlogg.csv` gir 6 «oppholdsvær», 5 «lite nedbør» og 3 «noe nedbør» (1,0, 0,9 og 0,7 mm/t). EXPERIENCE.md og PRD §10 bruker de riktige tallene, og den låste delen av spec-en må rettes av mennesket.
- Valg spec-en ikke dekket:
  - `--terskler STI` velger terskelfil for `logg` og `--selvtest`.
  - `klasse_for_vindu` tar én liste per time, slik at doble timer kan telle.
  - `visningssti` viser stien relativt til repoet i feilmeldinger.
- Agenten sjekket `logg` mot det gamle skriptet med tre falske MET-svar uten nettkall. CSV, utskrift og stderr var identiske.

## Spec Change Log

## Review Triage Log

| # | Lag | Funn | Dom | Begrunnelse | Rute |
|---|-----|------|-----|-------------|------|
| 1 | blind | `logg` bruker ikke `timer_i_vindu`, og README påstår at selvtesten sjekker samme Værklasse som appen | low | `logg` bygger hele timer med `range(start, slutt)`, som gir samme timer for vinduene 10–12 og 13–15. Påstanden i README er likevel for vid, fordi selvtesten bare dekker `klasse_for_time` og `klasse_for_vindu`. | patch (README-teksten) |
| 2 | blind, kant, verifisering | `epoke()` tåler ikke `Z` på Python 3.9/3.10, og Zod godtar `Z` | low | Verifisert: `fromisoformat` i 3.9 avviser `Z`. Fasiten bruker `+01:00` i dag, men `timer_for_dato` har allerede `.replace("Z", "+00:00")`, så rettingen er direkte. | patch |
| 3 | blind | Fasiten valideres ikke i Python, og en tom fasit gir 0 av 0 og exit 0 | low | En manglende nøkkel krasjer med høylytt traceback, som er riktig oppførsel. En tom fasit er usannsynlig, og en vakt ville vært en ny gren. | avvist |
| 4 | blind | «28 av 28» står hardkodet i README | low | Teksten blir utdatert når fasiten får nye rader. Rettingen er direkte. | patch |
| 5 | blind, verifisering | Python-valideringen av terskelfila har ingen automatisk test | medium | Verifisert av verifiseringslaget: valideringen av rekkefølge kan fjernes uten at CI feiler. Den kanoniske fila er vernet av Zod i Vitest, så bare `--terskler`-stien er åpen. | defer |
| 6 | blind, kant | `None` fra MET behandles som under grensen, og `max()` krasjer da i `logg` | low | Fantes før: både `is not None`-sjekkene og `max()` er fra det gamle skriptet. Ikke forårsaket av denne storyen. | defer |
| 7 | blind, kant | Flagg som ikke hører sammen, ignoreres i stillhet (`--oppsummer --selvtest`) | low | Usannsynlig i vanlig bruk, og rettingen endrer CLI-strukturen. | avvist |
| 8 | blind | Værord-vurderingen står både i PRD og EXPERIENCE.md | low | Den låste beslutningen ber om en linje i hver. Rettingen ville endret spec-en. | avvist |
| 9 | blind | Værord-vurderingen nevner ikke avviket 10. nov. i «noe nedbør» | false | Teksten sier allerede at ordene ikke ble vurdert direkte, og avviket gjaldt klassen og står i Avviket-punktet rett over. | avvist |
| 10 | blind | Den låste delen av spec-en (6/6/2) motsier dokumentene (6/5/3) | low | Den låste delen er feil og dokumentene riktige. Bare mennesket kan rette den låste delen, og rettingen er en endring av spec-en. | avvist (tas opp med brukeren) |
| 11 | blind | README og kommentaren nevner `src/server/vaer/met.ts`, som ikke finnes ennå | low | Verifisert: `src/server/vaer/` finnes ikke. Rettingen er direkte: merk fila som planlagt (story 2.4). | patch |
| 12 | kant | `timer_i_vindu` gir `[13:00]` for 13:30–13:30, men TS gir `[]` | low | Verifisert: `floor(13:30) = 13:00 < 13:30`. Avviker fra `timerITidsvindu` og fra regelen om at et tomt vindu gir `mangler`. | patch |
| 13 | kant | En terskelfil som ikke er UTF-8, gir traceback | low | Høylytt feil på en fil ingen lager. Riktig oppførsel. | avvist |
| 14 | kant | En fasit som mangler eller er ugyldig JSON, gir traceback | low | Høylytt feil i CI er riktig oppførsel. | avvist |
| 15 | kant | En fasitrad uten nøkkel gir dobbel KeyError, og `null` behandles som ingen grense | false | Fasitskjemaet i `vaerklasse.test.ts` krever tall, så en slik fasit feiler Vitest i samme CI-kjøring. KeyError-en er høylytt. | avvist |
| 16 | kant | Tom fasit gir 0 av 0 og exit 0 | low | Samme som #3. | avvist |
| 17 | kant | `--selvtest` sammen med andre flagg | low | Samme som #7. | avvist |
| 18 | kant | Valideringen godtar terskler som ikke blir strengere fra middels til frarådet | false | Skal speile Zod-skjemaet, som heller ikke sjekker dette. Ble avvist på samme grunnlag i 2.1. | avvist |
| 19 | verifisering | `--selvtest` dekker ikke `logg()` (vindusbygging og `grunner`) | medium | Forhåndsverifisert av laget. Loggeuka er ferdig, og `logg` trenger ekte MET. Laget foreslo defer. | defer |
| 20 | verifisering | Python-valideringen er ikke testet | medium | Samme rotårsak som #5. | defer (med #5) |
| 21 | verifisering, annet | `epoke()` og `Z` | low | Samme som #2. | patch (med #2) |

## Design Notes

- Valideringen i Python er en kort speiling av Zod-skjemaet: eksakte nøkler, `versjon == 1`, klassene i rekkefølge, og tall eller `null`. Den skal stoppe en feilskrevet fil, ikke være en full skjemamotor.
- For å la selvtesten velge terskelfil (som AC-en med 3,0 krever) kan `--terskler <sti>` legges til. Standard er `data/vaerterskler.json`.
- Timer i selvtesten:
  - Regn i epoke-sekunder. Første time er `floor(start / 3600) * 3600`, og så går det i steg på 3600 mens tiden er mindre enn `slutt`.
  - Har flere fasittimer samme start, teller alle, og den dårligste vinner.

## Verification

**Commands:**
- `python3 scripts/kalibrering_vaerlogg.py --selvtest`: forventet 28 av 28 og exit 0.
- `python3 scripts/kalibrering_vaerlogg.py --oppsummer`: forventet 14 vurderte og 1 avvik.
- `npm run lint && npm test`: forventet grønt.
- `git status --short`: forventet ingen endring i `data/`, `testdata/`, `src/`, `vaerlogg.csv` eller `.logs/`.
