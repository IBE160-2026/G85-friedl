# Epic 3: beslutninger og rettelser etter manuell sjekk

## 2026-11-20 kl. 12:04 — Simon Friedl

### Oppgave
Simon ba om en sjekkliste over de manuelle punktene fra walkthroughene for 3.1–3.5 og 4.1 (storyene ble godkjent uten walkthrough, se [954](954-2026-11-20-10-00-00-godkjenning-uten-walkthrough.md)). Han sjekket punktene på Production og tok stilling til hvert av dem. To avvik skulle rettes: trykk på kartet på mobil ruller ikke til kortet (3.5), og Startpunktene på Søk-kartet mangler navn (3.3). Han ba også om å ta CI-feilen i `e2e/stokk.spec.ts:204`, føre alt i loggen og pushe når CI er grønn.

### Plan
- Sjekklisten ble satt opp fra sesjonsloggene for hver story.
- Simons beslutninger, tatt 2026-11-20:
  - **Sjekket på Production, alt OK:**
    - ekte fliser og kontrasten mot den grønne ruten, og stiplede inaktive ruter (3.1)
    - Kartutsnittene i kortene, og at stempelet ikke dekker utsnittet (3.2)
    - linjer mellom fliser ved zoom (3.3)
    - etiketten «omtrentlig rute» på mobil (3.5)
  - **Godtatt som kjente avvik:**
    - teksten «Zoom inn/ut», tegnforklaringen på to linjer og etiketten over Startpunktet (3.1)
    - Kartverket-merket nederst, `zoomSnap 0.25` og små ruter ved 104 px (3.2)
    - det smalere Skjemakortet (3.3)
    - grensen på 3 feil / 8 s, at skjermlesere kan lese meldingen to ganger, og plasseringen av pillen (3.4)
    - animasjonen der kortet senkes, og 14/17 px uten tokens (3.5)
    - språkreglene i 4.1: «en min …» avvises, og bindestrek foran et siffer tolkes som minus
  - **Rettes:** trykk på kartet på mobil skal rulle til kortet (3.5), og navnene på Startpunktene skal vises (3.3). Simon valgte korte visningsnavn (`kortnavn`, valg B) som i pc-1.
  - **Droppet:** setningen under kartet i pc-1 («Kortene med Turforslag legges ut her …»). EXPERIENCE.md linje 89 sier at den er en skissemerknad, og Simon valgte å droppe den.
- CI-feilen i `stokk.spec.ts:204` var allerede rettet og grønn på `main` (`59d43fc`, se [953](953-2026-11-20-11-19-19-ci-stokk-sveip.md)).
- bmad-build ble brukt med spec [spec-3-x-rettelser-etter-walkthrough.md](../../_bmad-output/implementation-artifacts/spec-3-x-rettelser-etter-walkthrough.md). Gjennomgangen ble gjort av tre subagenter (blind hunter, edge-case hunter og verification gap).

### Resultat
- **3.5:** Under 1200 px gjør et valg i hovedkartet nå det samme som et valg i Stokkoversikten: kortet velges, Stokken får fokus, og siden ruller opp til den (`velgIStokken` i `Resultat.tsx`). PC er uendret.
- **3.3:**
  - Hvert Startpunkt har fått `kortnavn` i `data/turer-moldemarka.json` og `testdata/turer.json`. Skjemaet og valideringen krever feltet, og valideringen avviser at to ulike Startpunkter har samme kortnavn. Sidedataene sender feltet.
  - Søk-kartet viser kortnavnet ved hver prikk. `plasserEtiketter` i `kart-data.ts` velger blant 4 rette og 4 diagonale plasser, med forbedringsrunder og fire startrekkefølger.
  - En skjult liste «Startpunkter» gir skjermlesere de fulle navnene.
  - FR-26 i epics.md og ARCHITECTURE-SPINE.md er oppdatert.
- **Gjennomgangen:** 12 funn ble rettet og 5 avvist. Ingenting ble utsatt. Det viktigste funnet var at plasseringen kunne la et navn dekke en annen prikk ved zoom z − 1. Det er rettet, og testen dekker det.
- **Verifisering:** Vitest gir 1768/1768, lint og tsc er rene, og Playwright gir 229/229 i CI-modus. CI var grønn på greinen `fiks/epic-3-walkthrough`.
- **Commit:** `a85643f` på `main` (squash), pushet. Greinen er slettet lokalt og på origin.
- **Lukket i `issues.md`:**
  - «De manuelle sjekkpunktene fra walkthroughene for 3.1–3.5 og 4.1 er ikke sett»
  - «Se kartet med ekte Kartverket-fliser på Production»

### Åpne punkter
Ingen.
