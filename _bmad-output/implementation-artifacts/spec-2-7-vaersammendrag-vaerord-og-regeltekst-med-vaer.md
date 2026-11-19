---
title: 'Story 2.7: Værsammendrag, Værord og Regeltekst med vær'
type: 'feature'
created: '2026-11-19'
status: 'done'
baseline_commit: '73acfe87ba87a8995c637ec31783d95bd3b0357c'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-2-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Når Værmeldingen finnes, har kjernen verken Værord, Værsymbol eller Værsammendrag, og Regelteksten og Vær-raden kan bare si «værdata mangler» (Story 2.7, FR-10, FR-20, AR-11, UX-DR16, UX-DR17).

**Approach:**
- `src/kjerne/vaerord.ts` lager værordene.
- `src/kjerne/vaer/sammendrag.ts` oppsummerer Tidsvinduet og lager Værsammendraget og Værsymbolet.
- `VaerGrunnlag` får varianten `vurdert`, slik at `lagRegeltekst` og Vær-raden i `turkort.ts` kan bruke den.
- `lagVisning` og serveren kobles ikke til før 2.8.

## Decisions

- **`vaerord.ts`:**
  - `nedborOrd(maksMmT)` og `vindOrd(maksMs)` følger tabellen i EXPERIENCE «Værord».
  - Konstantene `OPPHOLD_UNDER_MM_T = 0.1` og `LITE_VIND_UNDER_MS = 5.5` ligger her.
  - Grensene fra middels og opp hentes fra `VAERTERSKLER` (parameter med standardverdi), ikke som tall i koden.
  - `vaerord(maksNedbor, maksVind)` gir `"{nedbørsord} og {vindord}"`.
  - X formateres med `tall()`. Grensene er `>=` som i Værtersklene.
- **`oppsummerTidsvindu(melding, startUtc, sluttUtc, terskler?)`** gir `null` når en time mangler, med samme timer som `klasseForTidsvindu`. Ellers gir den `{ klasse, maksNedborMmT, maksVindMs, minTempC, maksTempC, symbolKode }`.
  - `symbolKode` er fra timen med dårligst `klasseForTime`, og den første ved likhet.
- **Temperatur:** `temperaturTekst(min, maks)` runder hver verdi til hele grader.
  - Like verdier gir «4 °C».
  - Er en av verdiene under null, gir den «−2 til 1 °C» (med U+2212).
  - Ellers gir den «3–5 °C» (med U+2013).
  - −0 skrives «0».
  - Den legges i `format.ts`.
- **Værsymbol:** `vaersymbol(kode)` gir `{ ord, ikonSti } | null`.
  - Endelsen (`_day`, `_night`, `_polartwilight`) fjernes før oppslaget.
  - `…andthunder` gir ordet for resten pluss « og torden».
  - En ukjent kode og `null` gir `null`.
  - `ikonSti` er `/vaerikoner/{kode med endelse}.svg`. Ikonfilene kommer i UI-storyen. Her lages bare stien.
- **`lagVaerVurdert({ melding, startUtc, sluttUtc })`** gir den `vurdert`-delen av `VaerSkjema` uten `vaervarsling` (2.8), eller `null`.
  - `klasseTekst` er «Værklasse {god|middels|dårlig|frarådet}».
  - `symbol` kommer fra `vaersymbol`.
  - `sammendrag` er `"{symbolord} · {temp} · nedbør {X} mm/t · vind opptil {Y} m/s"`. Uten symbolord faller den første delen bort.
  - `tidsvindu` er «HH:MM–HH:MM» i Oslo-tid.
  - `hoydemerknad` er den faste teksten «Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.».
  - Den gir også `grunnlag: VaerGrunnlag`.
- **`VaerGrunnlag`** blir `{ type: "mangler" } | { type: "vurdert"; klasse: Vaerklasse; vaerord: string; temperatur: string }`.
- **Regelteksten:**
  - Del 2 er `vaerord` når været er vurdert.
  - Del 3 er «lavtliggende tur (H moh)», og del 4 er «egnet i dårlig vær». Begge kommer bare ved `klasse === "darlig"`, og bare når regelen slo inn (Lavtliggende tur, eller `egnet_darlig_vaer === true`).
  - `RegeltekstInput` får `hoyestePunktMoh`, `lavtliggende` og `egnetDarligVaer`.
- **Vær-raden:**
  - God og middels: `merke: "ok"`, `tekst` «Værklasse god» eller «Værklasse middels», og `detalj` `["{vaerord} · {temperatur}"]`.
  - Dårlig: `merke: "se-opp"` og «Værklasse dårlig». `detalj` har samme linje, og deretter «Øverst fordi: {del 3}, {del 4}», men bare når minst én av dem slo inn.
  - Frarådet: som dårlig, men uten «Øverst fordi»-linjen. Turkortet brukes ikke ved frarådet (2.8).
- Tekstene står som konstanter i kjernen. Ingen tekst inneholder «trygg» eller «trygt».

## Boundaries & Constraints

**Always:**
- Ren og deterministisk.
- `mangler` gir nøyaktig samme Regeltekst og Vær-rad som før.

**Never:**
- Ingen endring av `lagVisning`, serveren eller UI-et (2.8 og 2.9).
- Ingen ikonfiler i denne storyen.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-1 | `uj-1`, 9. nov. 13:30–15:30 | god, `vaerord` «oppholdsvær og lite vind», temperatur «3–5 °C», symbol «klarvær», sammendrag «klarvær · 3–5 °C · nedbør 0 mm/t · vind opptil {maks} m/s» (bruk tallet i dataene) |
| Nedbørsgrenser | 0, 0.09, 0.1, 0.4, 0.5, 1.9, 2, 3.5, 10 | oppholdsvær, oppholdsvær, lite, lite, noe, noe, «nedbør opptil 2 mm/t», «… 3,5 …», «… 10 …» |
| Vindgrenser | 5.4, 5.5, 7.9, 8, 10.7, 10.8, 17.1, 17.2, 19 | lite, noe, noe, frisk, frisk, «vind opp mot 10,8 m/s», «… 17,1 …», «sterk kuling, vind opp mot 17,2 m/s», «… 19 …» |
| Grenser fra Værtersklene | egne terskler med middels på 1 mm/t | «noe nedbør» fra 1 |
| Temperatur | (2.6, 4.6), (−2.4, 1.2), (4.2, 3.8), (−0.4, −0.2) | «3–5 °C», «−2 til 1 °C», «4 °C», «0 °C» |
| Symbol | `clearsky_day`, `fair_night`, `rainshowersandthunder_day`, `heavysnow`, `ukjent`, `null` | klarvær, lettskyet, «regnbyger og torden», kraftig snø, `null`, `null` |
| Dårligst time | timer med god, darlig, darlig | symbolet fra den første dårlige timen |
| Manglende time | et vindu over en time som mangler | `null` |
| Regeltekst UJ-1 | vurdert god, Turtid 92 av 120, utsikt | «passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt» |
| Regeltekst dårlig | darlig, Moldevatnet fra Jensgurilia (340 moh, egnet ja), 93 av 180, «nedbør opptil 3,5 mm/t og frisk vind» | «passer tiden din (1 t 33 min av 3 t), nedbør opptil 3,5 mm/t og frisk vind, lavtliggende tur (340 moh), egnet i dårlig vær» |
| Bare det som slo inn | darlig, høy Tur, egnet ukjent | verken del 3 eller 4, og Vær-raden uten «Øverst fordi» |
| God, lav Tur | god, lav og egnet | ingen del 3 eller 4 |
| Vær-rad god | god | ok, «Værklasse god», `["oppholdsvær og lite vind · 3–5 °C"]` |
| Vær-rad dårlig | darlig, lav og egnet | se-opp, «Værklasse dårlig», `[…, "Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær"]` |
| Mangler | `{ type: "mangler" }` | Regelteksten og Vær-raden som før |
| Skjema | `lagVaerVurdert` for UJ-1, UJ-2 og UJ-3 | består `vurdert`-grenen av `VaerSkjema` |
| Ord | alle tekstene | ingen «trygg» eller «trygt» |

</frozen-after-approval>

## Code Map

- `src/kjerne/regeltekst.ts` og testen -- `VaerGrunnlag` og delene.
- `src/kjerne/turkort.ts` og testen -- `vaerRad` og kallet til `lagRegeltekst` (bruker `RangertTur.lavtliggende` og `egnetDarligVaer` fra 2.5).
- `src/kjerne/format.ts` -- `tall`, `klokke` og den nye `temperaturTekst`.
- `src/kjerne/vaer/vaerklasse.ts`, `terskler.ts` og `typer.ts`.
- `src/kjerne/tid.ts` -- `timerITidsvindu`.
- `src/kjerne/visning/skjema.ts` -- `VaerSkjema`.
- `src/kjerne/vaer/testscenarioer.ts` -- scenarioene.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/vaerord.ts` og testen.
- [x] `src/kjerne/vaer/sammendrag.ts` og testen -- `oppsummerTidsvindu`, `vaersymbol` og `lagVaerVurdert`.
- [x] `src/kjerne/format.ts` -- `temperaturTekst` med tester.
- [x] `src/kjerne/regeltekst.ts` og `src/kjerne/turkort.ts`, med tester -- `vurdert`, del 3 og 4, og Vær-raden.

**Acceptance Criteria:**
- Gitt `npm test`, `npm run lint`, `npx tsc --noEmit` og `CI=1 npx playwright test`, når de kjøres, så er alle grønne.
- Gitt UJ-1-scenarioet, når testen kjører, så gir det «oppholdsvær og lite vind». Gir dataene noe annet, stopp og rapporter det.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC2 | Alternativkortet sier «Øverst fordi», men Alternativet er ikke rangert | medium | Bekreftet. Linjen er fjernet fra Alternativkortet, mens del 3 og 4 i Regelteksten står. | patch |
| VG1 | Alternativkortet er aldri testet med `egnet_darlig_vaer: true` | medium | Bekreftet. | patch |
| BH11 | Rutenettestet sammenligner koden med seg selv | low | Bekreftet. | patch |
| BH6 | Ingen test fra ende til ende med ekte data for UJ-2 | medium | Bekreftet. | patch |
| EC4 | METs feilstavede koder for sludd- og snøbyger med torden | low | Bekreftet. Har fått alias. | patch |
| BH9, BH10 | `lesetekst` fjerner tekst fra visningsstrengen, og «·» blir lest opp | low | Bekreftet. | patch |
| BH12 | `KLASSEORD` ligger i feil modul | low | Bekreftet. | patch |
| BH7 | De faste grensene sjekkes ikke mot konfigurasjonen | low | Bekreftet. | patch |
| BH8 | Doc-kommentaren om like timer har ingen test | low | Bekreftet. | patch |
| BH13 | Temperatur (−0,4; 2) er ikke testet | low | Bekreftet. | patch |
| BH5 | `lag-visning.ts` er endret mot grensen i specen | low | Nødvendig for at `tsc` skal gå gjennom. Grenen kaster til 2.8 tar over. Se Implementation Notes. | avvist |
| BH2, EC1 | En Værklasse som bare skyldes temperaturen, forklares ikke med værord | low | EXPERIENCE bestemmer at Regelteksten ikke har temperatur. Vær-raden viser temperaturen, og Værvarslingen i 2.8 setter den utløsende verdien først. | defer |
| BH3 | Avrundede tall kan avvike fra ordene ved grensene | low | MET gir én desimal for vind og nedbør, så avviket kan ikke oppstå med ekte data. | avvist |
| BH4 | Detaljen ved frarådet avviker fra EXPERIENCE | low | Frarådet-kortet og radene lages i 2.8. Turkortet brukes ikke ved frarådet. | avvist |
| EC3 | «Øverst fordi» står på hvert lavtliggende kort | low | EXPERIENCE viser linjen per kort der regelen slo inn. | avvist |
| EC5 | `ikonSti` peker på filer som ikke finnes | low | Ikonene legges inn i 2.9 (AR-20). | defer |

## Implementation Notes

- **UJ-1** gir «klarvær · 3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s» med dataene. EXPERIENCE bruker «lettskyet» og «4 m/s» som eksempel.
- **`lag-visning.ts`** har en `case "vurdert"` som kaster, så `switch` er uttømmende. 2.8 erstatter den.
- **`lesetekst`** i Turkortet sier nå «Værklasse: god.», ikke «Værklasse: Værklasse god.».
- **UJ-2** gir med dataene «nedbør opptil 3,4 mm/t og frisk vind», 5–7 °C og vind opptil 9,2 m/s. EXPERIENCE bruker 3,5 mm/t og 2–4 °C som eksempel. Testene sjekker det dataene gir.
