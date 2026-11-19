---
title: 'Story 2.9: Vær-delen i Resultatet'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: 'cf0c544eb7e40e6b8883704f211660379069e620'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-8-resultatmodell-for-darlig-og-fraradet-vaer.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Resultatmodellen har været siden 2.8, men UI-et viser det ikke. Uten Værmeldingen står ingenting der Værmangel-linjen sto, og Værvarslingen meldes ikke (Story 2.9, AR-20, UX-DR16, UX-DR17, UX-DR19).

**Approach:**
- METs værikoner legges i `public/vaerikoner/`.
- Ved god og middels vises Værsammendraget der Værmangel-linjen står.
- Ved dårlig vises Værvarslingen.
- Live-området leser `liveTekst`.
- Vær-raden i Turkortet bruker modellen, som før.

## Decisions

- **Ikonene:**
  - Hent SVG-filene fra METs offisielle repo `github.com/metno/weathericons` (mappa `weather/svg`), sammen med `LICENSE` (MIT), med `git clone --depth 1` til en midlertidig mappe.
  - Kopier filene til `public/vaerikoner/` med filnavn lik `symbol_code` (for eksempel `clearsky_day.svg`).
  - Sjekk at lisensen er MIT før du kopierer.
  - Skriv kilden og commit-hashen i `public/vaerikoner/KILDE.md`.
  - Er lisensen ikke MIT, eller kan repoet ikke hentes: stopp og rapporter.
- **Modellen:** `vaer.vaervarsling` blir `{ tittel, tekst }`.
  - `tittel` er «Værvarsling: Værklasse dårlig i Tidsvinduet HH:MM–HH:MM».
  - `tekst` er verdiene med den utløsende først og stor forbokstav, for eksempel «Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.».
  - Oppdater skjemaet, `lag-visning.ts` og testene.
- **`liveTekst`** er `"{overskrift}. {vaervarsling.tittel}."` ved dårlig, og ellers lik overskriften.
- **Live-området** i `Resultat.tsx` viser `liveTekst` for skjermlesere. Overskriften (`h1`) vises og får fokus som før. Lukk punktet om `liveTekst` i `deferred-work.md`.
- **Værsammendraget** (`src/ui/Vaersammendrag.tsx`, flaten `vaersammendrag`) er et papirpanel med:
  - Kriteriemerket (`ok`)
  - `klasseTekst`
  - Værsymbolet: `<img src={ikonSti} alt="">` på 32 px (24 px på mobil) og ordet
  - verdiene fra `sammendrag` uten symbolordet foran, fordi ordet står ved ikonet
  - `tidsvindu` helt til høyre
  - `hoydemerknad` under

  På mobil står klassen og symbolet på én linje og verdiene på neste. Uten symbol vises verken ikon eller ord. Komponenten står der `Vaermangel` står i dag.
- **Værvarslingen** (`src/ui/Vaervarsling.tsx`, flaten `vaervarsling`) har:
  - merket `se-opp`
  - `tittel` i rust
  - `tekst`
  - forklaringen «Derfor står lavtliggende Turer og Turer som er egnet i dårlig vær øverst i stokken.» som fast tekst i `tekster.ts`
  - Værsymbolet og Høydemerknaden

  Den står over Turforslagene eller Alternativet. Plassen for Bedre tidsvindu-boksen er tom. Boksen kommer i 2.10.
- **Vær-raden** i Turkortet viser `merke`, `tekst` og `detalj` fra modellen. Ved `se-opp` står verdien i rust. Bruk eksisterende `Kriterierad`, og endre bare det som trengs.
- **Tokens:** bruk de eksisterende i `tokens.css` (`--components-vaersammendrag-*`, `--components-vaervarsling-*`, `--components-vaersymbol-*`). Legg dem til fra DESIGN.md hvis de mangler.

## Boundaries & Constraints

**Always:**
- Tom `alt` på ikonet, og ordet står ved siden av (UX-DR17).
- Trykkflater og responsivitet som i SM-4. `e2e/sluttsjekk.spec.ts` skal bestå, også med `uj-1` og `uj-2` lagt til der det passer.
- Ingen horisontal rulling ved 360, 768 og 1440 px.
- Nettleseren kontakter bare vår egen server (og Kartverket senere). Ikonene ligger lokalt.

**Never:**
- Ingen Bedre tidsvindu-boks eller Frarådet-kort (2.10).
- Ingen Turnavn i e2e (AR-26).
- Ingen nye npm-avhengigheter.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-1 PC | `?demo=uj-1`, Søk 13:30, 2 t, B, utsikt, 1440 px | Værsammendraget med «Værklasse god», ikonet `clearsky_day.svg` med tom `alt`, «klarvær», «3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s», «13:30–15:30» og Høydemerknaden. Ingen Værmangel-linje og ingen Værvarsling. |
| UJ-1 mobil | samme ved 360 px | klasse og symbol på én linje, og verdiene under |
| UJ-2 | `?demo=uj-2`, Søk 9. nov. 10:00, 3 t, Krevende, utsikt | Værvarslingen med tittelen i rust, den utløsende verdien først og forklaringen. Vær-raden på kort 1 har «Værklasse dårlig» med se-opp. |
| Live | UJ-2 | live-området har «Tre Turforslag i dårlig vær. Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00.» |
| uten-vaer | `?demo=uten-vaer` | Værmangel-linjen som før |
| Ikonene | alle koder i `vaersymbol`-tabellen med endelsene MET har | filen finnes i `public/vaerikoner/`, og `LICENSE` finnes |
| SM-4 | uj-1 og uj-2 ved 360, 768 og 1440 px | ingen horisontal rulling og trykkflater på 44 px |

</frozen-after-approval>

## Code Map

- `src/kjerne/visning/skjema.ts` og `lag-visning.ts`, med tester -- `vaervarsling` og `liveTekst`.
- `src/ui/Resultat.tsx`, `Resultat.module.css` og `Resultat.test.tsx` -- plassering og live-området.
- `src/ui/Vaermangel.tsx` -- mønster for papirpanelet.
- `src/ui/Kriteriemerke.tsx`, `Kriterierad.tsx` og `Turkort.tsx` -- Vær-raden.
- `src/ui/tekster.ts` og `src/ui/tokens.css`.
- `e2e/resultat.spec.ts` og `e2e/sluttsjekk.spec.ts`.
- `_bmad-output/implementation-artifacts/deferred-work.md` -- punktet om `liveTekst`.

## Tasks & Acceptance

**Execution:**
- [x] `public/vaerikoner/` -- ikonene, `LICENSE` og `KILDE.md`, med en Vitest-test for filene.
- [x] Modellen -- `vaervarsling { tittel, tekst }` og `liveTekst`.
- [x] `src/ui/Vaersammendrag.tsx` og `src/ui/Vaervarsling.tsx`, med CSS og tester.
- [x] `Resultat.tsx` -- plassering og live-området.
- [x] `e2e/vaer.spec.ts` -- matrisen på PC og mobil.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC1, VG1 | `liveTekst` får doble punktum ved dårlig vær og den korteste Turen | medium | Bekreftet. Tilfellet kan nås og er ikke testet. | patch |
| BH3, EC2 | `vaersymbol` peker på ikonfiler som ikke finnes | medium | Bekreftet. Gir ødelagt bilde og 404. Ordet beholdes uten ikon. | patch |
| BH4 | UI-et klipper symbolordet ut av `sammendrag` | low | Bekreftet. Modellen har nå et eget felt, `verdier`. | patch |
| BH2 | `stil.verdier` har ingen CSS-regel | low | Bekreftet. | patch |
| BH8 | Tidsvinduet mangler etikett for skjermlesere | low | Bekreftet. | patch |
| BH9 | Værvarslingen kan ikke nås via landemerker | low | Bekreftet. Er nå en `section` med `aria-labelledby`. | patch |
| BH5 | Frarådet-grenen i `Vaerdelen` kan aldri nås | low | Bekreftet. Kommentaren er rettet, og 2.10 flytter den. | patch |
| BH6 | Været sammen med Alternativet er ikke testet | medium | Bekreftet. | patch |
| BH10, BH11 | Små navnesaker, middels, og e2e som kopierer tekstene | low | Bekreftet. | patch |
| BH7 | Skjermlesere hører overskriften to ganger | low | Formatet til `liveTekst` står i specen, og slik var det før også. Kan tas opp med UX. | avvist |
| BH12 | Patchen manglet `deferred-work.md` | false | Fila er endret i arbeidskopien og blir med i commiten. | avvist |

## Implementation Notes

- **Ikonene** er hentet fra `metno/weathericons` på commit `89e3173756248b4696b9b10677b66c4ef435db53` (MIT). Det er 83 SVG-filer i `public/vaerikoner/`, med `LICENSE` og `KILDE.md`. `VAERIKONER` i kjernen er lista over filene som finnes.
- **Modellen** har fått `verdier` i `vurdert`. `vaervarsling` er `{ tittel, tekst }`. `ikonSti` kan være `null`, og da står ordet uten ikon.
- **Live-området** har en skjult `liveTekst`. `h1` står rett etter og får fokus som før.
