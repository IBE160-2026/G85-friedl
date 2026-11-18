# Story 1.7: Solberegning og Mørkevarsel

## 2026-11-18 kl. 15:50 — Simon Friedl

### Oppgave
Kjør story 1.7 med `bmad-build`. Kjernen skal regne ut sol opp og ned selv (NOAA, AD-11) og avgjøre om en Tur får Mørkevarsel (FR-21). Rangeringen (1.8) og Turkortet (1.9) trenger begge deler.

### Plan
- Endringene fra økten om 2.2 lå fortsatt i arbeidstreet. Jeg fortsatte parallelt som for 1.6 og committet bare filene til 1.7.
- Oneshot-ruten: ingen åpne spørsmål og en liten endring. Spec: [spec-1-7-solberegning-og-morkevarsel.md](../../_bmad-output/implementation-artifacts/spec-1-7-solberegning-og-morkevarsel.md).
- «Tidsvindu over midnatt» er tolket slik at soltidene for Turdagen (`sok.dato`) alltid gjelder, også når Turen ender etter midnatt.
- Implementert direkte og gjennomgått av blind-hunter.

### Resultat
- **`src/kjerne/vaerpunkt.ts`**: Værpunktet (62,7617 N, 7,1679 Ø, 400 moh).
- **`src/kjerne/sol.ts`**: `soltider(dato)` regner med NOAA (senit 90,833°, havnivå, hele minutter) og bruker ikke suncalc.
  - 9. november 2026 gir 08:30 og 15:59, eksakt som kontrollverdiene.
  - 21. juni 2026 gir 03:28 og 23:38, 1 min fra kontrollverdien 23:37 og innenfor ±2.
  - Dagens verdier er også låst eksakt i testene.
- **`src/kjerne/morke.ts`**: `vurderMorke(sok, turtidMin, soltider)` gir varsel når Turen ender senere enn 30 min før solnedgang, eller starter før soloppgang. Varselet har klokkeslett og «Lurt å ta med hodelykt.».
  - Det kaster når Turdagen mangler i `soltider`.
  - Slår begge reglene inn, gjelder solnedgang.
- **Tester:**
  - 15:30 gir ikke varsel og 15:31 gir varsel ved solnedgang 16:00, og start før soloppgang gir varsel
  - Turer over midnatt, sommertidsskiftet og manglende dato
  - UJ-1 mot `testdata/turer.json`: Storlihytta fra Vardeveien uten varsel, Skihytta fra Damefallet og Bergsvatnet med
- **Gjennomgangen** (blind-hunter) ga 7 små rettelser:
  - doc-kommentaren gjelder nå Værpunktet
  - egne feilmeldinger for midnattssol og mørketid
  - `Math.floor` for klokkeslettet
  - tydeligere testnavn
  - låste verdier og test av mørketid
  - nytt navn på hjelperen i testen
  - en kommentar om `hoydeMoh`

  Tre funn ble avvist. Ingenting ble utsatt.
- **Verifisering:** lint er ren, Vitest gir 450/450, og `npx tsc --noEmit` er ren.
- **Status:** committet i `1761e62`. Specen er `done`, og sprint-status står på `review`.

### Åpne punkter
- Story 1.7 står som `review` i sprint-status: se over endringen (eventuelt `bmad-walkthrough`) og sett den til `done`.
- Story 1.8: test at Mørkevarselet ikke fjerner Turer gjennom rangeringen (i dag er det bare strukturelt sikret, fordi `filtrerTurer` ikke tar soltider inn).
- Neste steg: `bmad-build` for story 1.8 (Rangering, utvalg og den korteste Turen).
