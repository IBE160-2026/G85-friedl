---
title: 'Story 2.10: Bedre tidsvindu og Frarådet i Resultatet'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '58f75b400bf7bfd01e5c74b85fcb04bd7b28e854'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-9-vaer-delen-i-resultatet.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Bedre tidsvindu og Frarådet finnes i modellen, men vises ikke. Ved frarådet står bare overskriften, og ingenting kan tas i bruk med ett trykk (Story 2.10, FR-6, FR-12, FR-19, UX-DR20, UX-DR21, UX-DR22).

**Approach:**
- Bedre tidsvindu-boksen står i Værvarslingen ved dårlig vær.
- Frarådet-kortet og Bedre tidsvindu-kortet vises ved frarådet.
- Knappen sender `nyttSok` gjennom den samme flyten som «Finn tur».
- Playwright dekker alle radene i tabellen under FR-6.

## Decisions

- **Modellen:** `BedreTidsvindu` `funnet` får `dag` og `detalj`, slik at UI-et ikke formaterer noe selv.
  - `dag` er for eksempel «I morgen, søn. 15. nov.», laget med `dag()` og I dag/I morgen.
  - `detalj` er «fra kl. 11:00 · samme 2 t, Middels», laget med `varighet` og `GRADERINGSTEKST`.
  - Oppdater skjemaet, `bedre-tidsvindu.ts` og testene.
- **Bedre tidsvindu-boksen** (`src/ui/BedreTidsvinduBoks.tsx`, flaten `bedre-tidsvindu-boks`) står i Værvarslingen: til høyre på PC (fra 1200 px), og under på mobil.
  - Den har overlinjen BEDRE TIDSVINDU, `tekst`, `antallTekst` og primærknappen `knappTekst`.
  - Ved `ingen` vises bare `tekst`, uten knapp.
- **Frarådet** (`utfall.type === "fraradet"`):
  - **Frarådet-kortet** (`src/ui/FraradetKort.tsx`) har form som et Turkort, med:
    - en papirflate med vindstreker (CSS eller inline SVG) der Kartutsnittet ellers står
    - Nummerstempelet «!» (warn)
    - «Ingen Turforslag»
    - `vaer.klasseTekst` i rust
    - `vaer.verdier`
    - `melding`
    - overlinjen DERFOR INGEN TUR med `kriterier` (Vær og Tid) gjennom eksisterende `Kriterierad`
    - lenken «Sjekk også MET sine farevarsler.» til `https://www.met.no/vaer-og-klima/ekstremvaervarsler-og-andre-farevarsler`, med `target="_blank"` og `rel="noopener noreferrer"`
  - **Bedre tidsvindu-kortet** (`src/ui/BedreTidsvinduKort.tsx`, skoggrønn kant) står ved siden av på PC og under på mobil.
    - Det har stempelet «→», overlinjen ALTERNATIV · BEDRE TIDSVINDU, `dag` i `page-title`, `detalj`, `antallTekst` og knappen.
    - Ved `ingen` vises `tekst` uten knapp.
  - Kartet, Ansvarsmerknaden og Værsammendraget eller Værvarslingen vises ikke ved frarådet.
  - Ditt søk med «Endre søk» vises som ved andre Resultater. Flytt værdelen og Ditt søk ut av kravet `harKort`, så frarådet får dem.
  - Live-området leser `liveTekst`, og overskriften er «Ingen Turforslag».
- **Knappen:**
  - `Resultat` får en ny prop `onBrukBedreTidsvindu(sok: Sok)`.
  - `SokFlate` kobler den til `send(nyttSok)` og oppdaterer skjemaet til `nyttSok`.
  - Det nye Resultatet erstatter det forrige, som ved «Finn tur» fra Resultatet (`replaceState`).
- **Tekstene** (overlinjene, «Ingen Turforslag», «DERFOR INGEN TUR» og lenketeksten) står i `src/ui/tekster.ts`.

## Boundaries & Constraints

**Always:**
- SM-4 ved 360, 768 og 1440 px også for `uj-3` og `ingen-bedre`: ingen horisontal rulling og trykkflater på 44 px.
- Ingen Turnavn i e2e (AR-26). E2e bruker alltid `?demo=`.
- Lenken til MET er den eneste eksterne lenken som legges til.

**Never:**
- Ingen nye npm-avhengigheter.
- Ingen ekte kart i Frarådet-kortet (Story 3.2).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Dårlig med vindu | `?demo=uj-2`, 9. nov. 10:00, 3 t, Krevende, utsikt | boksen i Værvarslingen med «I morgen fra kl. 14:00 er Værklassen god.», «5 Turer passer før mørket.» og knappen «Bruk 14:00». Trykk gir et nytt Resultat for 14:00, og Ditt søk viser 14:00. |
| Ingen vindu | `?demo=ingen-bedre`, standard-Søk | boksen viser «Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.» uten knapp |
| Frarådet | `?demo=uj-3`, 14. nov. 10:00, 2 t, Middels | Frarådet-kortet med «!», «Ingen Turforslag», «Værklasse frarådet», meldingen, DERFOR INGEN TUR med Vær og Tid, og lenken med `target=_blank`. Bedre tidsvindu-kortet med «I morgen, søn. 15. nov.», «fra kl. 11:00 · samme 2 t, Middels» og «Bruk i morgen 11:00». Ingen kart, ingen Ansvarsmerknad og ingen Turkort. |
| Frarådet, tatt i bruk | trykk «Bruk i morgen 11:00» | vanlige Turforslag. Ditt søk viser i morgen 11:00. |
| Frarådet, 15 min | UJ-3 med 15 min, så «Bruk i morgen 11:00» | først frarådet uten korteste Tur, så Alternativkortet med 16 min |
| God og mangler | `uj-1` og `uten-vaer`, med Turforslag og med 15 min | som før, uten boks og uten kort |
| PC og mobil | uj-2 og uj-3 ved 1440 og 360 px | boksen til høyre eller under, og kortene ved siden av hverandre eller under hverandre |
| Live | uj-3 | live-området har «Ingen Turforslag» |

</frozen-after-approval>

## Code Map

- `src/kjerne/bedre-tidsvindu.ts` og testen, og `src/kjerne/visning/skjema.ts` -- `dag` og `detalj`.
- `src/ui/Resultat.tsx`, `Resultat.module.css` og `Resultat.test.tsx` -- plassering, frarådet og prop.
- `src/ui/SokFlate.tsx` -- `send` og skjemaet.
- `src/ui/Vaervarsling.tsx` -- plassen for boksen.
- `src/ui/Turkort.tsx`, `Nummerstempel.tsx`, `Kriterierad.tsx` og `Knapp.tsx` -- byggeklosser.
- `src/ui/tekster.ts` og `src/ui/tokens.css` -- `--components-fraradet-kort-*` og `--components-bedre-tidsvindu-*`.
- `e2e/` -- ny `e2e/tilstander-vaer.spec.ts` og `sluttsjekk.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] Modellen -- `dag` og `detalj`.
- [x] `BedreTidsvinduBoks`, `FraradetKort` og `BedreTidsvinduKort`, med CSS og tester.
- [x] `Resultat.tsx` og `SokFlate.tsx` -- frarådet, plassering og knappen.
- [x] E2e -- matrisen og SM-4.

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
| BH2, EC1, VG-a | `brukBedreTidsvindu` går forbi sjekken `kanVises` | medium | Bekreftet. Siden kan stå åpen over midnatt. | patch |
| EC2 | «Bruk …» mens et `history.back()` venter | low | Bekreftet. Avbryter nå når `tilbakePagar` er satt. | patch |
| VG1, BH3 | «Endre søk» i toppfeltet ved frarådet på mobil er ikke testet | medium | Bekreftet. Det er den eneste «Endre søk» på mobil. | patch |
| BH4 | Uj-2-testen lover en sjekk av Tilbake som den ikke gjør | low | Bekreftet. | patch |
| EC4, BH5 | Cellen «dårlig + ingen Tur passer» mangler e2e | medium | Bekreftet. Dekkes nå av uj-2 med 15 min. | patch |
| BH1 | Boksen i Værvarslingen kan forsvinne uten feil | low | Bekreftet. Gjort påkrevd. | patch |
| BH7, BH8 | Tilgjengelighet: nestet region, dagen leses ikke opp ved knappen, og overskriften mangler ved `ingen` | low | Bekreftet. | patch |
| BH10, EC3 | Frarådet sjekkes to ganger og har ingen reserve | low | Bekreftet. Ditt søk med «Endre søk» står alltid. | patch |
| BH13 | Formelen for mellomrom er duplisert | low | Bekreftet. | patch |
| BH9 | Kortet bruker en token for valgt Turkort | low | Bekreftet. Har fått egne tokens. | patch |
| BH12 (fixture) | Fixturen i `skjema.test.ts` har gammelt format | low | Bekreftet. | patch |
| BH12 | `detalj` nevner ikke Opplevelsespreferanser, og skjemaet sjekker ikke `dag`/`detalj` mot `nyttSok` | low | Teksten følger DESIGN («samme 2 t, Middels»). Modellen lager begge fra `nyttSok`. | avvist |
| BH6 | Frarådet + `ingen` mangler e2e | low | Ingen demo har den kombinasjonen. Enhetstesten dekker den, og Ditt søk med «Endre søk» står. | avvist |
| BH11 | `FraradetKort` avhenger av CSS-en til Turkort | low | Perforeringen er Turkortets signatur, og Frarådet-kortet skal ha samme form. Kan trekkes ut senere. | avvist |

## Implementation Notes

- **`BedreTidsvindu.funnet`** har fått `dag` og `detalj`.
- **Nye komponenter:** `BedreTidsvinduBoks`, `FraradetKort` (med vindflate i inline-SVG og perforeringen fra Turkort) og `BedreTidsvinduKort`. Knappen sender `nyttSok` gjennom `send`, med `replaceState`.
- **`DESIGN.md`** har fått fem tokens under `components.bedre-tidsvindu-kort`: background, baseColor, baseOffset, padding og paddingMobile. De peker på verdier som finnes fra før. `tokens.test.ts` krever at tokens.css og DESIGN.md stemmer overens. Endringen bør godkjennes av Simon.
- **Designvalg til walkthrough:**
  - Knappen i boksen brytes under teksten på mobil.
  - Stempelet «!» overlapper vindflaten med halv høyde.
  - Vindflaten er 104, 160 og 200 px høy.
  - Knappen på kortet har automatisk bredde fra 768 px.
