---
title: 'Story 1.9: Regeltekst og innholdet i Turkortet'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '9d14a87283e9ae57b213a6b6905f4b24fc7cb1f7'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Kjernen kan velge Turforslag og Alternativ (1.8), men lager ingen tekst. Serveren (1.10) trenger ferdige Turkort som validerer mot `TurkortSkjema`: Regeltekst, fire Kriterierader, faktalinje, stolpeandeler, Stokkoversikt-rad, lesetekst, kilde og kart (FR-20, UX-DR23–26, UX-DR43, UX-DR47).

**Approach:** `format.ts` blir eneste sted for tall i tekst. `regeltekst.ts` og `turkort.ts` bygger kortet av en `RangertTur` eller et `Alternativ` (1.8), Søket, soltidene og rutegeometrien. Rent og deterministisk. Været er bare `{ type: 'mangler' }` her, og værord og Værklasse kommer i 2.7.

## Boundaries & Constraints

**Always:**
- Tekstene følger EXPERIENCE.md ordrett: Regeltekst-mønsteret, Kriterieradene, Faste tekster og Voice and Tone.
- Merket bruker skjemaets verdier: ok → `ok`, warn → `se-opp`, none → `ingen`.
- Kortet har ingen snake_case-felt, og hver streng har tall formatert av `format.ts`.
- Ingen tekst inneholder «trygg» eller «trygt».

**Never:**
- Ingen Værklasse, værord eller regler for dårlig vær (2.5, 2.7).
- Ingen overskrift, `dittSok` eller `liveTekst` (1.10).
- Ingen endring av `TurkortSkjema` eller Turdatasettet.
- Ingen UI-kode.

## Decisions

- **Lengde** (`format.km`) står som i Turdatasettet, med minst én og høyst to desimaler: «5,0 km», «3,46 km», «8,8 km». Det følger Voice and Tone og skissene. Regelen «én desimal uten ,0» gjelder `format.tall`, altså tallene for vær.
- **Dagslysstolpen** går alltid fra start til den seneste av solnedgang og slutt. Merket for solnedgang og skumringen står alltid med. Merket for soloppgang står bare når Turen starter før soloppgang. Andelene er posisjoner langs stolpen.
- **«fra …»** er resten av navnet når Målet er tatt bort fra starten: «fra Damefallet», «via Den grønne korridor», «rundtur om Moldedalen», «rundt Øverlandsvatnet». Er resten tom, brukes «fra {startpunkt.navn}», for eksempel «fra Turparkering i Jensgurilia, Nordbyen» for Bergsvatnet. Datasettet endres ikke.
- **Omfang:** hele specen beholdes, fordi kortet må validere mot skjemaet for at 1.10 kan bruke det.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| UJ-1 uten vær | Tusenårsvarden fra Damefallet, 13:30, 2 t, utsikt, sol ned 15:59 | Regeltekst «passer tiden din (1 t 32 min av 2 t), værdata mangler, utsikt». Tid ok «1 t 32 min av 2 t» / «gangtid, uten pauser». Vær ingen «ikke vurdert» / «Værmeldingen fra MET mangler». Ønsker ok «utsikt ✓». Mørke ok «tilbake 15:02» / «sola går ned 15:59». Stokkoversikt «1 t 32 min uten pauser · tilbake 15:02». |
| To preferanser | Tusenårsvarden fra Grua, 10:00, 2 t 30 min, utsikt og vann | Regeltekst slutter med «utsikt og vann», og Ønsker er «utsikt ✓ · vann ✓». |
| Én av to treffer | utsikt og vann valgt, Turen har bare utsikt | Ønsker ok «utsikt ✓ · vann –» |
| Ingen treff | vann valgt, Turen har bare utsikt | Ønsker ingen «ikke vann –», detalj «har utsikt (ikke valgt)». Regelteksten har ingen preferansedel. |
| Ingen valgt | ingen preferanser | Ønsker ingen «ingen valgt». Detaljen nevner det Turen har. |
| Mørkevarsel ved solnedgang | Tusenårsvarden fra Damefallet, 14:00 | Mørke se-opp «Mørkevarsel: tilbake ca. 15:32», detalj «Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.» og «Lurt å ta med hodelykt.» |
| Mørkevarsel ved soloppgang | start 07:00, sol opp 08:30 | Mørke se-opp «Mørkevarsel: starter før soloppgang 08:30», med tipset sist |
| Alternativ (UJ-3) | 15 min, Storlihytta fra Vardeveien | Regeltekst «passer ikke tiden din: trenger 1 min mer (16 min av 15 min), værdata mangler». Tid se-opp «16 min av 15 min» / «trenger 1 min mer, uten pauser». Tidsstolpe fyll 15/16, overGrense 1/16. |

</frozen-after-approval>

## Code Map

- `src/kjerne/visning/skjema.ts` -- `TurkortSkjema`, `KriteriumSkjema` (`merke: ok | se-opp | ingen`), `TidsstolpeSkjema` og `DagslysstolpeSkjema`. Brukes som de er.
- `src/kjerne/visning/skjema.test.ts` -- eksempelkortene viser formen og tekstene. Kan brukes som fasit.
- `src/kjerne/anbefaling.ts` -- `RangertTur` (`tur`, `turtidMin`, `morkevarsel`, `treff`) og `Alternativ` (`trengerMerMin`). Er input.
- `src/kjerne/morke.ts` -- `vurderMorke`, `Morkevarsel` (`arsak`, `tidspunktUtc`, `klokkeslett`, `tips`), `TIPS`, `MARGIN_FOR_SOLNEDGANG_MIN`, `Soltider`. `klokkeslett` lages i dag med `klokkeTekst(osloKlokke)` og skal over på `format.ts`.
- `src/kjerne/tid.ts` -- `osloTilUtc`, `osloKlokke` og `klokkeTekst`. Gjenbrukes av `format.ts`.
- `src/kjerne/turdata/skjema.ts` -- `Tur`: `navn`, `mal`, `startpunkt.navn`, `adkomst?.lengde_m`, `lengde_km_totalt`, `hoydemeter`, `hoyeste_punkt_moh`, `gradering_tekst`, `kilde`, `mal_punkt?` og `rutesegmenter`.
- `src/kjerne/turdata/rutegeometri.ts` -- `Rutegeometri` og `rutesegmentNokkel`. Kart-ruten er Turens segmenter slått sammen til én `MultiLineString`.
- `data/rutegeometri.geojson` -- importeres i tester via geojson-pluginen i Vitest.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/format.ts` (+ test) -- `varighet(min)` («1 t 32 min», «2 t», «16 min»), `klokke(utc)` (Oslo, «HH:MM»), `tall(x)` (én desimal uten «,0», desimalkomma, «−» for minus), `km(x)` etter beslutningen om lengde og `meter(x)`.
- [x] `src/kjerne/morke.ts` -- bruk `format.klokke` for `klokkeslett`. Oppførselen endres ikke.
- [x] `src/kjerne/regeltekst.ts` (+ test) -- `lagRegeltekst({ turtidMin, tilgjengeligMin, vaer, treff })` etter Regeltekst-mønsteret, med Tid-delen for Alternativet.
- [x] `src/kjerne/turkort.ts` (+ test) -- `lagTurkort(kandidat, { sok, soltider, geometri, nummer, antall, vaer })`. Kandidaten er `RangertTur` eller `Alternativ`. Den lager Kriterier, faktalinje («5,0 km · 318 høydemeter · høyeste punkt 527 moh · Middels»), `startpunktTekst` («Startpunkt: Parkering ved Romsdalsmuseet (Adkomst ca. 500 m)»), Tidsstolpe, Dagslysstolpe etter beslutningen, Kartinfoboks («5,0 km · Middels · Startpunkt: …», som i EXPERIENCE.md › Flow 2), Stokkoversikt-rad, lesetekst, kilde (`morotur.no` eller `Fjord Norway` etter vertsnavnet) og kart (rute, startpunkt, `nummer`, `malpunkt` bare når `mal_punkt` finnes).
- [x] `src/kjerne/turkort.test.ts` -- radene i I/O-matrisen, at alle kort for testdatasettet over et rutenett av Søk validerer mot `TurkortSkjema`, ingen «trygg» eller «trygt», og at samme input gir samme kort.

**Acceptance Criteria:**
- Gitt alle tekster kjernen lager for `testdata/turer.json` og Søkene i testene, når de sjekkes, så inneholder ingen av dem «trygg» eller «trygt», og ingen av dem har punktum som desimaltegn eller 12-timersklokke.
- Gitt et Turforslag, når lesetekst lages, så begynner den med «Turforslag {n} av {N}: {navn}. Turtid: 1 t 32 min av 2 t, gangtid uten pauser.» og leser radene med PRD-begrepene (Værklasse, Opplevelsespreferanser, Mørkevarsel). Alternativet begynner med «Alternativ: {navn}.».
- Gitt samme input, når kortet lages to ganger, så er kortene like.

## Design Notes

Kandidaten bærer allerede `morkevarsel`, så kortet regner ikke Mørkevarselet på nytt. Slutten og soltidene trengs likevel til ok-teksten og stolpen. Vær-input er en union med bare `mangler`. Det gjør at 2.7 kan legge til `vurdert` uten å endre signaturen.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1 | `kart.rute` er bare sjekket for lengde > 0. Feil segmenter eller byttet [lon, lat] går gjennom. | medium | Bekreftet. Skjemaet godtar byttede koordinater. Ny test sammenligner ruten med segmentene i rekkefølge. | patch |
| VG2 | Dagslysstolpen er ikke testet for en Tur som ender etter solnedgang | low | Bekreftet. `max` er ikke låst av noen test. Ny test med eksakte andeler. | patch |
| VG3, BH4, BH10 | Detaljlinjen ved Mørkevarsel om morgenen er ikke spesifisert, ikke testet og gjentar soloppgangen i leseteksten. Leseteksten for Alternativet er bare sjekket med `startsWith`. | low | Bekreftet. EXPERIENCE.md har bare radteksten og tipset. Detaljen er nå bare tipset, og hele leseteksten for soloppgang og Alternativ er låst. | patch |
| BH1 | Kartinfoboksen har «totalt», mens EXPERIENCE.md (Flow 2) har «3,06 km · Enkel · Startpunkt: …» | low | Bekreftet. Oppgavelinjen i specen avvek fra EXPERIENCE.md, som den frosne delen krever ordrett. Både koden og oppgavelinjen er rettet. | patch |
| BH6, EC6 | `fraTekst` tar Målet bort som et prefiks, ikke som et helt ord | low | Bekreftet for et navn som «Vardenes rundtur». Rettelsen er direkte. | patch |
| BH7 | Kommentaren til `avrund` oppgir feil toleranse | low | Bekreftet. Kommentaren er rettet. | patch |
| BH9 | `format.ts` mangler tester for NaN i `km` og `meter`, grenseverdier i `tall` og sommertidsskiftet i `klokke` | low | Bekreftet. Testene er lagt til. | patch |
| BH12 | Leseteksten uten Mørkevarsel kan slutte med mellomrom | low | Kan bare skje med tom `detalj`. Den er bygd om til en liste som skjøtes, en direkte rettelse. | patch |
| BH2, EC4 | Et `Alternativ` med `trengerMerMin` 0 gir en Tid-rad med «se opp» og en Regeltekst med «passer» | low | `anbefal` lager Alternativ bare når ingen Tur passer, så `trengerMerMin` er minst 1. Rettelsen ville vært en ny vakt. | avvist |
| BH3 | Kortet sjekker ikke `morkevarsel` mot `soltider` | low | Orkestreringen sender de samme soltidene til rangeringen og kortet. Det ville vært en ny vakt for input som ikke kan nå fram. | avvist |
| BH5 | En Tur som ender etter midnatt, sier «tilbake 03:00» uten dag | low | Mulig bare ved start 22:00 med lang Tilgjengelig tid. Beslutningen fra 1.7 om at soltidene for Turdagen gjelder, står. | defer |
| BH8, EC10 | `format.ts` er ikke eneste sted tall blir tekst (`sok.ts`, `nummer` og `antall`) | false | `sok.ts` lager Søkets `start`, som er data og ikke visningstekst. `nummer` og `antall` er små heltall. | avvist |
| BH11 | Leseteksten mangler faktalinje, Startpunkt og Regeltekst | false | UX-DR43 avgrenser leseteksten til nummer, navn og radene. Resten av kortet leses som vanlig tekst i artikkelen. | avvist |
| BH13 | `treff` betyr både antall og liste, og testhjelperen regner treff selv | low | Bare navngiving i to typer. Skader ingen kaller. | avvist |
| BH14, EC5 | `KortInput` sjekker ikke `nummer` og `antall` | low | `ResultatvisningSkjema` sjekker `kart.nummer` når svaret valideres i 1.10. | avvist |
| BH15 | Stokkoversikt-raden sier «tilbake 15:32» uten «ca.» ved Mørkevarsel | false | EXPERIENCE.md gir malen «{Turtid} uten pauser · tilbake HH:MM» uten unntak. | avvist |
| EC1, EC2 | `switch` på `vaer.type` har ingen `default` | false | Typen har bare `mangler`, og TypeScript krever at alle tilfellene er dekket. Story 2.7 legger til `vurdert`. | avvist |
| EC3 | Lengde 0 i Dagslysstolpen gir NaN | false | Krever Turtid 0 og start ved eller etter solnedgang. Alle Turer har positiv lengde, så Turtiden er minst 1 min. | avvist |
| EC7 | Adkomst under 0,5 m gir «ca. 0 m» | false | Adkomst brukes bare når Startpunktet er over 200 m unna. Minste verdi i data er 260 m. | avvist |
| EC8 | Mellomlageret i `WeakMap` blir utdatert om geometrien endres | false | Geometrien parses én gang og endres aldri. | avvist |
| EC9 | Svært store tall gir feil avrunding | false | Tallene er lengder, høyder og vær, alle langt under 1e15. | avvist |
