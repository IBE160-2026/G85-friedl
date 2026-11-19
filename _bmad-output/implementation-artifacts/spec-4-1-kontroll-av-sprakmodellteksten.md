---
title: 'Story 4.1: Kontroll av Språkmodellteksten'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '19c36f01b965136fa0330d4103b797dfea4c08a8'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Før en Språkmodelltekst kan vises, må appen kunne avgjøre om den sier nøyaktig det samme som Regelteksten (Story 4.1, FR-22, NFR-2).

**Approach:**
- Den rene funksjonen `kontrollerSprakmodelltekst(tekst, regeltekst, fakta)` i `src/kjerne/begrunnelse/` godkjenner eller avviser teksten, og sier hvorfor.
- `lagTurfakta(tur)` gir den faste lista med fakta om Turen.

## Decisions

- **Fakta** (`src/kjerne/begrunnelse/fakta.ts`):
  - `lagTurfakta(tur: Tur): readonly string[]` gir en fast liste med ferdig formaterte fakta om Turen, laget med `format.ts`:
    - navn
    - Mål og «fra …»
    - lengde totalt («6,45 km»)
    - høydemeter
    - høyeste punkt («340 moh»)
    - Vanskelighetsgrad
    - Startpunkt
    - Adkomst hvis den finnes
  - Bruk de samme formateringene som faktalinjen i Turkortet, så tallene er like.
  - 4.2 sender lista til modellen.
- **Verdiene i Regelteksten:**
  - `formaterteVerdier(regeltekst)` finner de ferdig formaterte verdiene: varigheter («1 t 32 min», «2 t», «45 min») og målinger med enhet («3,5 mm/t», «9,2 m/s», «3–5 °C», «340 moh»).
  - Mønsteret står ved siden av formateringene i `format.ts` eller i modulen, med tester mot ekte Regeltekster fra `lagRegeltekst` (UJ-1, UJ-2, uten vær og Alternativ).
- **Resultat:** `{ godkjent: true } | { godkjent: false; grunner: Grunn[] }`. `Grunn` har typen:
  - `"mangler-verdi"` (med verdien)
  - `"ukjent-tall"` (med tallet)
  - `"tall-med-ord"` (med frasen)
  - `"trygg"`
- **Reglene:**
  1. **Hver formatert verdi** fra Regelteksten står ordrett i teksten. Mellomrom og vanlige mellomromsvarianter (NBSP og smalt NBSP) regnes som like, og tankestrek og bindestrek i intervaller regnes som like.
  2. **Hvert tall** i teksten (heltall og desimaltall med komma eller punktum) finnes som tall i Regelteksten eller i fakta. Sammenlign normalisert, så «3,5» og «3.5» er like. Tall som er del av en formatert verdi som er godkjent, er dekket av regel 1.
  3. **Tid eller mengde med ord:**
     - Et tallord (null, en, ett, ei, to, tre, fire, fem, seks, sju/syv, åtte, ni, ti, elleve, tolv, tjue, tretti, førti, femti, hundre) foran en enhet for tid eller mengde avvises. Enhetene er time/timer/t, minutt/minutter/min, kilometer/km, meter/m, millimeter/mm, grad/grader og sekund.
     - Ord for brøk avvises alltid: halv/halvannen/halvtime/kvarter.
     - Store og små bokstaver regnes som like.
     - «en Tur» og «ett Startpunkt» er lov, fordi det ikke er tid eller mengde.
  4. **«trygg», «trygt» og «trygge»** som hele ord avvises, med store eller små bokstaver.
- **Ren:** ingen nettverk, klokke eller `Date`. Lagreglene gjelder.

## Boundaries & Constraints

**Always:** én test per regel for avvisning (FR-22), og tester for godkjenning med de ekte Regeltekstene fra UJ-1 og UJ-2.

**Never:**
- Ingen endring av `lagRegeltekst` eller UI-et.
- Ingen nye npm-avhengigheter.
- Ikke kjør Playwright. En annen jobb bruker porten. Kjør `npm test`, `npm run lint` og `npx tsc --noEmit`.

## I/O & Edge-Case Matrix

| Scenario | Tekst | Forventet |
|---|---|---|
| Godkjent | «Turen passer tiden din godt: 1 t 32 min av 2 t, med oppholdsvær og lite vind, og fin utsikt.» mot UJ-1-Regelteksten | godkjent |
| Mangler verdi | uten «1 t 32 min» | `mangler-verdi` «1 t 32 min» |
| Ukjent tall | «… på 7 km …» når fakta har 6,45 km | `ukjent-tall` «7» |
| Tall fra fakta | «… 340 moh …» som står i fakta | godkjent |
| Tid med ord | «halvannen time», «to timer» | `tall-med-ord` |
| Mengde med ord | «tre millimeter» | `tall-med-ord` |
| Lov ord | «en fin Tur» | ingen `tall-med-ord` |
| Trygg | «trygg tur», «Trygt» | `trygg` |
| Flere feil | mangler verdi og «trygt» | begge grunnene |
| UJ-2 | ordrett med «3,4 mm/t» og «340 moh» | godkjent |
| Mellomrom | NBSP i «1 t 32 min» | godkjent |

</frozen-after-approval>

## Code Map

- `src/kjerne/regeltekst.ts` -- `lagRegeltekst` for testene.
- `src/kjerne/format.ts` -- formateringene.
- `src/kjerne/turkort.ts` -- faktalinjen, for de samme formateringene.
- `src/kjerne/turdata/skjema.ts` -- `Tur`.
- `src/kjerne/vaer/testscenarioer.ts` -- UJ-scenarioene.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/begrunnelse/fakta.ts` med test.
- [x] `src/kjerne/begrunnelse/kontroll.ts` med `kontrollerSprakmodelltekst` og test for matrisen.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint` og `npx tsc --noEmit`, når de kjøres, så er alle grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

**Avvik fra Decisions:** grunnen `"trygg"` heter `"forbudt-ord"` med feltet `ord`. Grunnen er at `src/ui/forbud.test.ts` (UX-DR46) forbyr ordet i strenger i kjernen. Story 4.2 må bruke det nye navnet.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| EC1, EC2, EC11 | En kort verdi treffer inne i en lengre («16 min» i «1 t 16 min»), og rekkefølgen styrer fjerningen | high | Bekreftet. «trenger 16 min mer» kan mangle, og teksten godkjennes likevel. | patch |
| BH1 | Regel 2 sjekker tallet, men ikke enheten («152 km») | high | Bekreftet. | patch |
| BH2, EC3, EC9 | Minus håndteres ulikt, og fortegnet forsvinner | medium | Bekreftet. | patch |
| BH3, EC4 | Desimalpunktum og tusenskilletegn tolkes ulikt i regel 1 og 2 | medium | Bekreftet. Appen skriver desimalkomma, og punktum avvises. | patch |
| BH4, VG1 | Ukjente tall slås ikke sammen etter normalisering, og det er ikke testet | low | Bekreftet. | patch |
| EC5 | Tall med andre tegn («½») | medium | Bekreftet. | patch |
| BH5, EC6, EC7, EC8 | Regel 3 mangler tallord, sammensatte tall, enheter og bøyninger | medium | Bekreftet. | patch |
| BH6 | Regel 3 gir lite presise grunner, og de kommer ikke i tekstrekkefølge | low | Bekreftet. | patch |
| BH7 | Regel 4 mangler formene tryggere, tryggest og utrygg | low | Bekreftet. De er utvidet. | patch |
| BH8, BH9 | Kommentarene til `TRYGG` og `BOKSTAV` er feil, og samiske bokstaver mangler | low | Bekreftet. | patch |
| BH10, EC10 | Myk bindestrek, nullbreddetegn og NFD | low | Bekreftet. | patch |
| BH11 | Hull i testene | low | Bekreftet. | patch |
| VG2 | `Grunn` avviker fra specen | false | Avviket er bevisst og står notert over. | avvist |

## Implementation Notes

- **`lagTurfakta(tur)`** gir fakta med etiketter: navn, Mål med «fra»/«via», lengde, stigning, høyeste punkt, Vanskelighetsgrad, Startpunkt og lengden på Adkomst. Fritekst fra Adkomst er ikke med, slik at tall derfra ikke regnes som kjente.
- **`kontrollerSprakmodelltekst`** gir grunnene i rekkefølgen regel 1–4: `mangler-verdi`, `ukjent-tall`, `tall-med-ord` og `forbudt-ord`.
  - Verdiene må stå hele.
  - Et tall med enhet må finnes som verdi med enhet i Regelteksten eller i fakta.
  - Tall sammenlignes slik de er skrevet, med desimalkomma. Fortegn telles med, og andre tegn for tall (som «½») regnes som ukjente.
- **Regexene** bruker `\p{L}` og `u`-flagget.
- **Bivirkninger:**
  - «en min …» som eiendomsord blir avvist av regel 3.
  - En bindestrek foran et siffer tolkes som minus.
