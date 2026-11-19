---
title: 'Story 2.8: Resultatmodell for dårlig og frarådet vær'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '8adb34415f8a7d50966ba3e54cc72afca0cd6018'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-6-bedre-tidsvindu.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-2-7-vaersammendrag-vaerord-og-regeltekst-med-vaer.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Delene fra 2.4–2.7 er ikke koblet sammen. Resultatet sier alltid «Været er ikke vurdert.», og frarådet vær gir fortsatt Turforslag (Story 2.8, FR-6, FR-11, FR-12, FR-13, SM-C1).

**Approach:**
- `svarPaSok` henter Værmeldingen, regner Værklassen for Tidsvinduet og sender den videre til `anbefal`, `lagVaerVurdert`, `finnBedreTidsvindu` og `lagVisning`.
- `lagVisning` lager Værsammendraget, Værvarslingen, Frarådet-utfallet og Bedre tidsvindu etter tabellen under FR-6.
- `lagMiljo(null)` bruker MET-adapteren fra 2.4.

## Decisions

- **`miljo.ts`:**
  - Én instans på modulnivå: `lagMetVaerkilde({ fetch: (u, i) => globalThis.fetch(u, i), klokke: () => Date.now() })`.
  - Den indirekte `fetch` gjør at testene kan bytte ut `globalThis.fetch`.
  - `lagMiljo(null)` gir denne værkilden. Klokka leses fortsatt bare her.
- **`svarPaSok`:**
  - `melding = await miljo.vaerkilde()`. Kaster den, blir `melding` `null`, og feilen logges uten forespørselsdata.
  - Tidsvinduet er `[osloTilUtc(dato, start), + tilgjengeligMin)`.
  - `klasse` er `klasseForTidsvindu`, eller `mangler` uten melding.
  - Ved `fraradet` kalles ikke `anbefal`.
  - Ellers kalles `anbefal(TURER, sok, sol, klasse)`.
  - `bedre` er `finnBedreTidsvindu(...)`.
  - `vurdert` er `lagVaerVurdert(...)`, eller `null` ved `mangler`.
- **`VisningInput`:**
  - `vaer` blir `{ type: "mangler" }` eller `{ type: "vurdert", ... }`, med det `lagVaerVurdert` gir pluss oppsummeringen av Tidsvinduet. Værvarslingen og meldingen trenger den.
  - `anbefaling` blir `Anbefaling | null`. Den er `null` bare ved `fraradet`.
  - `bedreTidsvindu` er `BedreTidsvindu | null`.
- **Overskriften** (EXPERIENCE «State Patterns»):

  | Situasjon | Overskrift |
  |---|---|
  | God eller middels, med Turforslag | «{Tre} Turforslag som passer nå» |
  | Dårlig, med Turforslag | «{Tre} Turforslag i dårlig vær» |
  | Mangler | «{Tre} Turforslag som passer tiden din», som før |
  | Korteste Tur, alle klasser utenom frarådet | «Ingen Tur passer {Tilgjengelig tid}.» |
  | Frarådet | «Ingen Turforslag» |

  `liveTekst` er lik overskriften.
- **Værvarslingen** (bare ved dårlig): `vaer.vaervarsling.tekst`, for eksempel «Værklasse dårlig i Tidsvinduet 10:00–13:00: nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.» (UJ-2-dataene).
  - Verdiene er nedbør, vind og temperatur.
  - De som nådde terskelen for dårlig, står først: høyeste nedbør ≥ terskelen, høyeste vind ≥ terskelen, eller laveste temperatur under terskelen.
  - Innenfor gruppene står verdiene i rekkefølgen nedbør, vind, temperatur.
- **Frarådet-utfallet:** `{ type: "fraradet", melding, kriterier: [vaer, tid] }`.
  - `melding` er «Det er meldt {deler} i Tidsvinduet ditt ({HH:MM–HH:MM}).».
  - `deler` er værordene for verdiene som nådde terskelen for frarådet, i rekkefølgen vind og nedbør, bundet med « og ». Vinden gir for eksempel «sterk kuling, vind opp mot 19 m/s».
  - Vær-raden: `se-opp`, «Værklasse frarådet», og `detalj` lik `[deler]`.
  - Tid-raden: `ingen`, «ikke vurdert», og `["Frarådet går foran tid og ønsker."]`.
- **Turkortene** får `VaerGrunnlag` fra 2.7, slik at Vær-raden og Regelteksten følger Værklassen.
- **Ansvarsmerknaden og kartet** endres ikke i modellen. UI-et skjuler dem ved frarådet (2.10).

## Boundaries & Constraints

**Always:**
- `ResultatvisningSkjema.parse` på svaret, som før. Reglene i skjemaet håndhever FR-6.
- Ingen test, verken i Vitest eller i Playwright, kaller ekte MET.
  - Testene uten demo bytter ut `globalThis.fetch`.
  - E2e sender aldri et Søk uten `?demo`.

**Never:**
- Ingen endring av UI-komponentene (2.9 og 2.10), utover at UI-et ikke krasjer på `vurdert` eller `fraradet`.
- Ingen ny tekst i UI-et.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-1 | `uj-1`, 9. nov. 13:30, 2 t, B, utsikt | `vaer.type` er `vurdert` med `god`, ingen `vaervarsling` og ingen `bedreTidsvindu`, «… Turforslag som passer nå», og Vær-raden «Værklasse god» |
| UJ-2 | `uj-2`, 9. nov. 10:00, 3 t, R, utsikt | `darlig`, `vaervarsling` med den utløsende verdien først, `bedreTidsvindu` `funnet` 14:00 med «5 Turer passer før mørket.», «Tre Turforslag i dårlig vær», og Moldevatnet fra Jensgurilia først |
| UJ-3 | `uj-3`, 14. nov. 10:00, 2 t, B | `utfall.type` er `fraradet`, med melding «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).», kriteriene Vær og Tid, `bedreTidsvindu` i morgen 11:00, og overskriften «Ingen Turforslag» (SM-C1) |
| UJ-3, 15 min | samme med 15 min | `fraradet`, ingen korteste Tur |
| UJ-3, tatt i bruk | `nyttSok` fra UJ-3 med 15 min | `kortesteTur`, 16 min, «trenger 1 min mer» |
| ingen-bedre | `ingen-bedre`, standard-Søk | `bedreTidsvindu.type` er `ingen` |
| uten-vaer | `uten-vaer` | uendret fra Epic 1 |
| Uten demo, MET svarer | `globalThis.fetch` byttet ut med et 200-svar fra `uj-1/met.json` med `Expires` | `vurdert` |
| Uten demo, MET feiler | `fetch` kaster | `mangler`, som i FR-13 |
| Værkilden kaster | værkilden kaster | `mangler`, og ingen 500 |
| Manglende time | Værmeldingen dekker ikke Tidsvinduet | `mangler` |
| Kontrakt | alle demoene, med standard-Søk og med Søkene over | `ResultatvisningSkjema` består |

</frozen-after-approval>

## Code Map

- `src/server/sok.ts` og `src/app/api/sok/route.test.ts` -- orkestreringen og kontrakttesten. Den midlertidige sjekken av `mangler` for værdemoene fra 2.3 skal endres.
- `src/server/miljo.ts` og testen -- MET-instansen.
- `src/server/vaer/met.ts` -- `lagMetVaerkilde`.
- `src/kjerne/visning/lag-visning.ts` og testen -- overskriften, været, utfallet og Bedre tidsvindu.
- `src/kjerne/visning/skjema.ts` -- invariantene.
- `src/kjerne/bedre-tidsvindu.ts`, `src/kjerne/vaer/sammendrag.ts`, `src/kjerne/vaerord.ts` og `src/kjerne/vaer/vaerklasse.ts`.
- `e2e/api-sok.spec.ts` -- sjekker `mangler` for `uj-1` og `uj-3` (fra 2.3). Oppdateres.
- `src/ui/Resultat.tsx` -- skal ikke krasje på `fraradet`. Visningen kommer i 2.10.

## Tasks & Acceptance

**Execution:**
- [x] `src/server/miljo.ts` -- MET-instansen og test.
- [x] `src/server/sok.ts` -- orkestreringen.
- [x] `src/kjerne/visning/lag-visning.ts` -- overskriften, `vaer` (`vurdert` og `vaervarsling`), `fraradet` og `bedreTidsvindu`, med tester.
- [x] `src/app/api/sok/route.test.ts` og `e2e/api-sok.spec.ts` -- matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne, og ingen test har kalt MET.
- Gitt de navngitte eksemplene, når testene kjører, så stemmer de. Avviker dataene, stopp og rapporter. Ikke juster testen.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, BH2, BH4, EC4 | Værklassen regnes tre ganger, flyten er kopiert inn i testen, og `terskler` sendes bare videre noen steder | medium | Bekreftet. Flyten er flyttet til én ren kjernefunksjon, som `svarPaSok` og testene begge kaller. | patch |
| BH3, EC1 | Frarådet som skyldes temperaturen, kaster og gir 500 | medium | Bekreftet. Skjemaet tillater det. En del for temperaturen er lagt til i meldingen. | patch |
| VG1 | Klokka til den delte MET-instansen er ikke sjekket | medium | Bekreftet. `klokke: () => 0` besto. | patch |
| EC6, BH8 | Cachen på modulnivå gjør testene avhengige av rekkefølgen | low | Bekreftet. | patch |
| VG2 | Temperaturgrensen i rekkefølgen i Værvarslingen er ikke låst | low | Bekreftet. | patch |
| BH5 | Regex i testen for kast skiller ikke de to tilfellene | low | Bekreftet. | patch |
| BH9 | Testen for manglende time avhenger av rekkefølgen i fixturen | low | Bekreftet. | patch |
| BH11 | Ingen test uten demo for dårlig eller frarådet | low | Bekreftet. | patch |
| BH10, BH12 | Svake feilmeldinger fra påstandene, og tekstene er sjekket tre steder | low | Bekreftet. Tekstene sjekkes nå i kjernen. | patch |
| BH6 | UI-et viser ikke `vurdert`/`fraradet` ennå | low | Kjent mellomtilstand. Specen sier at UI-et ikke skal krasje, og det gjør det ikke. 2.9 og 2.10 bygger visningen. 2.8 pushes ikke før det er avgjort. | avvist |
| BH7 | Bare konvensjon hindrer e2e i å kalle MET | low | Alle e2e-testene bruker `?demo`, og gjennomgangen bekreftet det. Et miljøflagg ville endre produksjonen. | defer |
| EC2, EC3 | Avrundede verdier ved grensene | low | MET gir én desimal. Temperaturen vises i hele grader etter UX. | avvist |
| EC5 | Ingen invariant for `bedreTidsvindu` i `lagVisning` | false | `ResultatvisningSkjema` håndhever det, og svaret parses. | avvist |

## Implementation Notes

- **Flyten** ligger i kjernen som `lagResultatvisning`. `svarPaSok` henter bare været, kaller den og validerer svaret.
- **Frarådet som skyldes temperaturen**, gir «temperatur ned mot X °C» i meldingen.
- **UI-et** viser foreløpig ikke `vurdert` eller `fraradet`. Værmangel-linjen forsvinner, og ved frarådet står bare overskriften. 2.9 og 2.10 bygger visningen.
