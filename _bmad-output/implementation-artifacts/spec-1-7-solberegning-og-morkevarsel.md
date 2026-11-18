---
title: 'Story 1.7: Solberegning og Mørkevarsel'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '2904ff3cc571b309793721e2e41034b04e31040a'
route: 'oneshot'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kjernen kan ikke regne ut sol opp og ned, og kan ikke avgjøre om en Tur får Mørkevarsel. Rangeringen (1.8) og Turkortet (1.9) trenger begge deler (FR-21, AD-11).

**Approach:**
- **`src/kjerne/vaerpunkt.ts`:** Værpunktet `{ lat: 62.7617, lon: 7.1679, hoydeMoh: 400 }`.
- **`src/kjerne/sol.ts`:**
  - `soltider(dato, punkt = VAERPUNKT): { oppUtc, nedUtc }` regner med NOAA-formlene for Oslo-datoen `dato`. Senitvinkelen er 90,833°, horisonten er havnivå uten høydekorreksjon, og instantene rundes til nærmeste hele minutt.
  - Kontrollverdier ±2 min: 9. november 2026 gir sol opp 08:30 og ned 15:59, og 21. juni 2026 gir 03:28 og 23:37.
  - Ingen suncalc.
- **`src/kjerne/morke.ts`:**
  - `type Soltider = Record<string, { oppUtc: number; nedUtc: number }>`, nøklet på Oslo-dato (AD-11).
  - `vurderMorke(sok: Pick<Sok, 'dato' | 'start'>, turtidMin, soltider)` gir `null` eller `{ arsak: 'solnedgang' | 'soloppgang', tidspunktUtc, klokkeslett ('HH:MM' i Oslo), tips: 'Lurt å ta med hodelykt.' }`.
  - Turen starter ved `osloTilUtc(dato, start)` og ender ved start + Turtid. Varsel gis når slutt > `nedUtc` − 30 min (solnedgang) eller start < `oppUtc` (soloppgang).
  - Soltidene for Turdagen `sok.dato` brukes alltid, også når Turen ender etter midnatt. Mangler datoen i `soltider`, kaster funksjonen en feil.
  - Slår begge reglene inn, gjelder solnedgang.
- **Tester** med faste soltider som input:
  - Med ned 16:00 gir slutt 15:30 ingen varsel, og 15:31 gir varsel med klokkeslett og tipset.
  - Start før soloppgang gir varsel.
  - En Tur som starter 22:00 den 21. juni og varer 3 t, bruker 21. juni (varsel med 23:37), selv om `soltider` også har 22. juni.
  - En manglende dato kaster.
  - UJ-1 mot `testdata/turer.json` (9. nov. 15:00, sol ned 15:59): Storlihytta fra Vardeveien er uten varsel, og Skihytta fra Damefallet og Bergsvatnet får varsel.
  - `filtrerTurer` beholder Turer med Mørkevarsel.
  - `sol.ts` testes for seg mot kontrollverdiene.

</frozen-after-approval>

## Implementation Notes

- **Nye filer:** `src/kjerne/vaerpunkt.ts`, `sol.ts`, `morke.ts` og testene `sol.test.ts` og `morke.test.ts`.
- **NOAA-beregningen** gir 08:30/15:59 for 9. november 2026 (eksakt) og 03:28/23:38 for 21. juni 2026 (1 min avvik, innenfor ±2). Solposisjonen regnes to ganger, ved det anslåtte tidspunktet for soloppgang eller solnedgang. `soltider` kaster når sola ikke går opp eller ned (midnattssol), noe som ikke skjer ved Værpunktet.
- **`Soltid`** er `{ oppUtc, nedUtc }`. `Soltider` er `Record<'YYYY-MM-DD', Soltid>` (AD-11), og orkestreringen i 1.10 bygger den.
- **Mørkevarselet** sammenligner UTC-instanter. Starttidspunktet følger Oslo-tid via `osloTilUtc`, også ved sommertidsskiftet, og Turer over midnatt bruker soltidene for Turdagen. Formateringen av klokkeslettet bruker `klokkeTekst(osloKlokke(...))` fra `tid.ts`.
- **Retting under testingen:** testen for «begge reglene» brukte en Tur som bare traff soloppgang-regelen. Testen er rettet, ikke koden.

## Review Triage Log

Pass 1 (blind-hunter BH). Edge-case-hunter og verification-gap er ikke med i oneshot-ruten.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1 | Doc-kommentaren til `soltider` lover samme Oslo-dato i hele Norge sør for polarsirkelen | low | Bekreftet: med refraksjon når midnattssola sør for 66,56°. Kommentaren gjelder nå Værpunktet og sier hva som skjer lenger nord. | patch |
| BH3 | Polarfeilen skiller ikke midnattssol fra mørketid og mangler datoen | low | Bekreftet. To meldinger med dato, og testet for begge. | patch |
| BH4 | `varsel` kaster når et sekund-presist klokkeslett rundes opp til 24:00 | low | Bekreftet for input som ikke er hele minutter, noe `sol.ts` aldri gir. `Math.floor` retter det uten ny gren. | patch |
| BH6 | Testen «Mørkevarselet fjerner ingen Turer» kan ikke feile på grunn av `vurderMorke` | low | Bekreftet: egenskapen er strukturell, fordi `filtrerTurer` ikke tar soltider inn. Testen har fått et navn som sier det. Rangeringen (1.8) får den virkelige testen. | patch (navn) |
| BH7 | Kontrollverdiene er bare låst med ±2 min, og mørketid er ikke testet | low | Bekreftet. Dagens verdier for 9. nov., 21. juni og 21. des. er låst eksakt, og mørketid er testet. Et sammenligningspunkt fra en almanakk krever kildedata og er avvist. | patch |
| BH8 | Hjelperen `soltider` i testen har samme navn som funksjonen i `sol.ts` | low | Bekreftet. Hjelperen heter nå `fasteSoltider`. Flyttingen av `Soltider` til `sol.ts` er avvist, fordi typen ligger der Mørkevarselet bruker den. | patch |
| BH9 | `hoydeMoh` i `VAERPUNKT` brukes ikke, så noen kan finne på å «rette» solberegningen | low | Bekreftet. En kommentar forklarer hvorfor høyden ikke brukes. | patch (kommentar) |
| BH2 | Umulige datoer (`2026-02-30`) godtas, og `MINUTT_MS` er duplisert | low | Datoen kommer fra `SokSkjema` (`z.iso.date`). Dupliseringen gjelder én konstant i to filer. | avvist |
| BH5 | NaN eller negativ `turtidMin` gir `null` uten feil | false | `turtidMin` kommer fra Turer som har gått gjennom `TurdatasettSkjema` (positiv lengde, høydemeter ≥ 0). | avvist |
| BH10 | Ingen vakt mot ugyldig `punkt` | low | `punkt` er Værpunktet-konstanten i appen. Ny vakt for input som ikke kan nå fram. | avvist |
