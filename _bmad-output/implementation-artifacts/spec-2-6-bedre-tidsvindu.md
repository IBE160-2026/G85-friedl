---
title: 'Story 2.6: Bedre tidsvindu'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: 'd4d57b3f904ed89be4d724f931b347c55b312867'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-5-rangering-i-darlig-vaer.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ved dårlig eller frarådet vær foreslår appen ikke noe annet tidspunkt (Story 2.6, FR-19, UJ-2, UJ-3).

**Approach:**
- En ren funksjon `finnBedreTidsvindu` i `src/kjerne/bedre-tidsvindu.ts` leter etter det tidligste Starttidspunktet med bedre Værklasse.
- Den gir `BedreTidsvindu` fra `src/kjerne/visning/skjema.ts` (`funnet` eller `ingen`) med ferdige tekster.
- Ved `god`, `middels` og `mangler` gir den `null`.
- `lagVisning` kobles ikke til før 2.8.

## Decisions

- **Signatur:** `finnBedreTidsvindu({ sok, klasse, na, melding, soltider, turer, terskler? }): BedreTidsvindu | null`.
  - `sok` er det normaliserte Søket.
  - `klasse` er `VindusKlasse` for Søkets Tidsvindu.
  - `na` er epoke-ms.
  - `soltider` har Turdagen, og dagen etter når Turdag er i dag.
  - `turer` er hele Turdatasettet.
- **Bedre** betyr en strengt bedre Værklasse enn `klasse`, med rangen god < middels < darlig < fraradet.
  - Ved `darlig` er god og middels bedre.
  - Ved `fraradet` er god, middels og darlig bedre.
  - Et vindu som gir `mangler`, hoppes over (AR-6).
- **Kandidater**, dag for dag (Turdagen først, så i morgen når Turdag er `osloDato(na)`), hver dag i stigende rekkefølge:
  - hele timer `h` der `h ≥ soloppgang` og `h ≤ solnedgang − 30 min` (`MARGIN_FOR_SOLNEDGANG_MIN`)
  - og der `06:00 ≤ h ≤ 22:00` (`TIDLIGST_MIN`, `SENEST_MIN`)
  - og der Starttidspunktet ikke har passert (`erPassert` er usann, så lik `na` regnes ikke som passert)
  - Alle timer på Turdagen prøves, også de før Søkets Starttidspunkt.
  - Tidsvinduet er `[start, start + tilgjengeligMin)`, og klassen kommer fra `klasseForTidsvindu`.
- **Første treff vinner.** Appen bytter ikke til i morgen fordi i morgen gir flere Turer.
- **`funnet`:**
  - `nyttSok` er `{ ...sok, dato, start: "HH:MM" }`.
  - `tekst` er `"{I dag|I morgen} fra kl. HH:MM er Værklassen {klasse}."`. Dagordet er relativt til `osloDato(na)`, og klassen er ordet `god`, `middels`, `dårlig` eller `frarådet`.
  - `antallTekst` er «{N} Turer passer før mørket.», «1 Tur passer før mørket.» eller «Ingen Tur passer før mørket.» (EXPERIENCE).
  - `knappTekst` er «Bruk HH:MM» når `dato === sok.dato`, ellers «Bruk i morgen HH:MM».
- **Antallet** er Turene i `filtrerTurer(turer, sok)` der `vurderMorke(nyttSok, turtidMin, soltider) === null`. Opplevelsespreferanser teller ikke.
- **`ingen`:** `tekst` er «Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.» når Turdag er i dag, ellers «Det finnes ikke noe bedre tidsvindu i dagslys i morgen.».
- **Tekster:** tekster med tall lages i `format.ts`, eller med `klokkeTekst`. Tekstene står som konstanter i modulen.

## Boundaries & Constraints

**Always:**
- Ren og deterministisk. Klokka, Værmeldingen og soltidene kommer inn som argumenter.
- Resultatet består `BedreTidsvinduSkjema`.

**Never:**
- Ingen endring av `lagVisning`, serveren eller UI-et (2.8 og 2.10).
- Ingen nye tekster i UI-et.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-2 | `uj-2`, na 8. nov. 20:00, Søk 9. nov. 10:00, 3 t, R, utsikt, `darlig` | `funnet`, `nyttSok` 9. nov. 14:00, «I morgen fra kl. 14:00 er Værklassen …», «5 Turer passer før mørket.», «Bruk 14:00» |
| UJ-3 | `uj-3`, na 14. nov. 10:00, Søk i dag 10:00, 2 t, B, `fraradet` | `funnet` 15. nov. 11:00, «Bruk i morgen 11:00» |
| I dag til 15 | na 9. nov. 08:00, Værmelding dårlig til 15:00 og god etter, Søk i dag 10:00, 3 t, R, `darlig` | `funnet` i dag 15:00, «1 Tur passer før mørket.» |
| ingen-bedre | `ingen-bedre`, Søk i dag, `darlig` | `ingen`, «… i dag eller i morgen.» |
| Ingen, i morgen | Turdag i morgen, ingenting bedre | `ingen`, «… i dagslys i morgen.» |
| Ingen før mørket | bedre vindu der ingen Tur rekker ned før mørket | `funnet`, «Ingen Tur passer før mørket.» |
| 9. nov. | god hele dagen, `darlig` ellers ikke, alle timer | kandidatene er 09:00–15:00 |
| 21. juni | samme | kandidatene er 06:00–22:00 |
| Passert | na 9. nov. 12:10, i dag | 12:00 prøves ikke, 13:00 prøves |
| Manglende time | et vindu som overlapper en time som mangler | hoppes over, neste time prøves |
| Frarådet → dårlig | `fraradet`, et vindu med `darlig` | `funnet` |
| Dårlig → dårlig | `darlig`, bare `darlig` | `ingen` |
| God, middels, mangler | `klasse` er en av dem | `null` |
| Skjema | alle `funnet` og `ingen` over | består `BedreTidsvinduSkjema` |

</frozen-after-approval>

## Code Map

- `src/kjerne/vaer/vaerklasse.ts` -- `klasseForTidsvindu`.
- `src/kjerne/morke.ts` -- `vurderMorke`, `MARGIN_FOR_SOLNEDGANG_MIN` og `Soltider`.
- `src/kjerne/sol.ts` -- `soltider(dato)`.
- `src/kjerne/sok.ts` -- `TIDLIGST_MIN`, `SENEST_MIN` og `erPassert`.
- `src/kjerne/filtrering.ts` -- `filtrerTurer`.
- `src/kjerne/tid.ts` og `src/kjerne/format.ts` -- tid og tekst.
- `src/kjerne/visning/skjema.ts` -- `BedreTidsvinduSkjema`.
- `src/kjerne/vaer/testscenarioer.ts` -- scenarioene for testene.
- `testdata/turer.json` -- Turene.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/bedre-tidsvindu.ts` -- `finnBedreTidsvindu` og tekstene.
- [x] `src/kjerne/bedre-tidsvindu.test.ts` -- matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.
- Gitt UJ-2-scenarioet, når testen kjører, så gir det 14:00 og 5 Turer. Gir dataene noe annet, stopp og rapporter det. Ikke juster testen.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1, BH1, BH2 | Antallet avhenger ikke av `filtrerTurer` i noen test | medium | Bekreftet. Mutasjonen besto. Antallet for UJ-3 og et filtertilfelle er lagt til. | patch |
| VG2 | En dårligere klasse avvises ikke i noen test | medium | Bekreftet. Med `erBedre` redusert til `!==` besto alle testene. | patch |
| EC1, BH6 | Forutsetningen om normalisert Søk er ikke sikret | low | Bekreftet. Kaster nå. | patch |
| EC2, BH4, VG-a | Skjematesten avhenger av rekkefølgen | low | Bekreftet. `-t skjemaet` feilet. | patch |
| BH3 | Terskelen i «Ingen Tur før mørket» stemmer bare tilfeldig | low | Bekreftet. | patch |
| BH7–BH11 | Tester mangler for at tidligst går foran best, soloppgang 09:01, `terskler`, kast ved manglende soltider og hele teksten for UJ-2 | low | Bekreftet. | patch |
| BH12 | Rangen er gjentatt i en kommentar | low | Bekreftet. `erBedreKlasse` er nå i `vaerklasse.ts`. | patch |
| BH5 | Antallsteksten går utenom `format.ts` | low | Bekreftet (AD-7). Bruker nå `heltall`. | patch |
