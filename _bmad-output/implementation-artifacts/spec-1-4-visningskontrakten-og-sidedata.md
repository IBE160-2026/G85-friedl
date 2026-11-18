---
title: 'Story 1.4: Visningskontrakten og sidedata'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: 'ca386fd2f68a0b5777f7a1feb6ec06ff9fc436ac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Serveren (1.10) og UI-storyene (1.11–1.14) har ingen felles form for Resultatet, sidedataene og feilsvarene. Uten den finner hver side opp sin egen kontrakt, og UI-et begynner å utlede eller formatere selv (AD-3, AD-18).

**Approach:** Zod-skjemaer i kjernen: Resultatvisningen i `src/kjerne/visning/skjema.ts`, sidedataene i `sidedata.ts` og feilformene i `feil.ts`, med typer fra `z.infer`. Alle objekter er strenge, og tester med ett eksempel per variant viser hva som godtas og avvises. Ingen kode lager data ennå.

## Boundaries & Constraints

**Always:**
- Alle objekter er `z.strictObject`, på alle nivåer. Da avvises ekstra felt og snake_case-felt overalt.
- Alle feltnavn er camelCase. GeoJSON-feltene `type`, `geometry`, `coordinates` og `properties` er unntaket, siden de er standarden.
- Visningstekst er ferdig formatert som `string`. Andeler er tall i 0–1, og koordinater er `{ lat, lon }` eller `[lon, lat]` med gyldig verdiområde.
- `sok` og `bedreTidsvindu.nyttSok` bruker `SokSkjema` fra `src/kjerne/sok.ts`, og Værklassen bruker samme verdier som `Vaerklasse` i `src/kjerne/vaer/typer.ts`.
- Skjemaet håndhever tabellen i FR-6: `utfall` er `fraradet` hvis og bare hvis Værklassen er frarådet. `bedreTidsvindu` finnes hvis og bare hvis Værklassen er dårlig eller frarådet. `vaervarsling` finnes hvis og bare hvis Værklassen er dårlig.
- Turkort og Alternativkort har fire Kriterierader i rekkefølgen Tid, Vær, Ønsker, Mørke. Frarådet-kortet har Vær og Tid, i den rekkefølgen.

**Never:**
- Ingen `lagVisning`, `lagSidedata`, `miljo.ts`, `/api/sok`, `format.ts` eller UI. Det kommer i 1.9, 1.10 og 1.11–1.14.
- Faste tekster uten domeneverdier hører ikke hjemme i skjemaet. Ansvarsmerknaden, «DERFOR INGEN TUR», låseteksten etter 22:00, «Alle tre i stokken» og etikettene for G/B/R står i `src/ui/tekster.ts` senere.
- Ingen endring i `sok.ts`, `tid.ts`, `vaer/` eller lagreglene.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet | Feil |
|---|---|---|---|
| Gyldige varianter | ett eksempel per `utfall` (`turforslag` med 1 og 3 kort, `kortesteTur`, `fraradet`), per `vaer` (`vurdert` god/dårlig/frarådet, `mangler`) og per `bedreTidsvindu` (`funnet`, `ingen`) | `safeParse` lykkes | – |
| Ekstra felt | et felt lagt til i roten, i et kort, i en Kriterierad og i `kart` | avvist | – |
| snake_case | `hoyeste_punkt_moh` i et kort, `tur_id` i stedet for `turId` | avvist | – |
| Andel | −0,01 eller 1,01 i Tidsstolpen eller Dagslysstolpen | avvist | – |
| Antall kort | 0 eller 4 Turforslag | avvist | – |
| Kriterierader | tre rader, eller Tid og Vær i byttet rekkefølge | avvist | – |
| FR-6 | frarådet vær med `turforslag`, dårlig vær uten `bedreTidsvindu`, `mangler` med `bedreTidsvindu`, god vær med `vaervarsling` | avvist | – |
| Sidedata | med og uten demo, med «I dag» låst | godtas | – |
| Sidedata ugyldig | standard-Søket på en låst Turdag, eller en dato ingen Turdag har | avvist | – |
| Feil | `{ feil: 'ukjent-demo', gyldigeDemoIder: ['uten-vaer'] }`, `{ feil: 'ugyldig-sok', detaljer: [{ sti: 'start', melding: '…' }] }` | godtas av hvert sitt skjema og av unionen | ekstra felt eller tom `gyldigeDemoIder` avvises |

</frozen-after-approval>

## Code Map

- `src/kjerne/sok.ts` -- `SokSkjema` og `type Sok`. Gjenbrukes, endres ikke.
- `src/kjerne/vaer/typer.ts` -- `Vaerklasse` ('god' | 'middels' | 'darlig' | 'fraradet'). Skjemaets enum må `satisfies` denne.
- `src/kjerne/oppsett.test.ts` -- zod 4-mønsteret. zod er 4.6.7, og `z.strictObject`, `z.url` og `z.iso.date` finnes.
- `eslint.config.mjs` -- `lagregler/kjerne` gjelder `src/kjerne/**` automatisk. `src/ui/**` og `src/app/**` kan bare importere typer fra kjernen.
- `data/turer-moldemarka.json` -- 12 Turer, 8 Startpunkter med `navn`, `lat`, `lon`. Forklarer hvorfor `startpunkter` er `{ navn, lat, lon }[]`.
- `_bmad-output/planning-artifacts/ux/EXPERIENCE.md` -- Kriterieradene (linje 128–139), State Patterns og Faste tekster. Eksempeltekstene i testene hentes herfra.

## Tasks & Acceptance

**Execution:**
- [x] `src/kjerne/visning/skjema.ts` -- `ResultatvisningSkjema` med delskjemaene som er beskrevet i Design Notes, og eksporterte typer (`Resultatvisning`, `Turkort`, `Kriterium`, `Utfall`, `Vaer`, `BedreTidsvindu`, `Kart`) -- AD-3, AR-4.
- [x] `src/kjerne/visning/sidedata.ts` -- `SidedataSkjema` og `type Sidedata` -- AD-18, AR-5.
- [x] `src/kjerne/visning/feil.ts` -- `UkjentDemoFeilSkjema`, `UgyldigSokFeilSkjema`, `ApiFeilSkjema` (diskriminert på `feil`), `SidedataSvarSkjema` (sidedata eller ukjent demo) og typene -- AR-7.
- [x] `src/kjerne/visning/skjema.test.ts` -- radene for Resultatvisningen i matrisen, og en test som går gjennom hvert gyldig eksempel rekursivt og sjekker at alle nøkler er camelCase eller GeoJSON.
- [x] `src/kjerne/visning/sidedata.test.ts` -- radene for sidedata og feil i matrisen.

**Acceptance Criteria:**
- Gitt endringene, når `npm run lint && npm test && npx tsc --noEmit` kjøres, så lykkes alle.
- Gitt en fil i `src/ui/` som gjør `import type { Resultatvisning } from "@/kjerne/visning/skjema"`, når lint kjøres, så går den gjennom (verifiseres med en midlertidig fil eller med `lagregler.test.ts`-mønsteret, uten at fila committes).

## Implementation Notes

- `dagslysstolpe.slutt` er `{ andel, tekst }`, ikke en ren streng: stolpen kan gå forbi slutten når solnedgangen er senere, så slutten trenger en posisjon. Samme form som `solNed` og `solOpp`.
- Værklassen er `z.enum(VAERKLASSER)`, der objektet `satisfies { [K in Vaerklasse]: K }`. Da feiler `tsc` både ved en manglende og en ekstra verdi.
- Startvalg, Turdag-dato og `tilgjengeligTid.verdi` i sidedata gjenbruker `SokSkjema.shape.start`, `.dato` og `.tilgjengeligMin`, så `sok.ts` ikke endres.
- Utover spec-en håndhever skjemaet tre billige konsistensregler: Turforslagene har `kart.nummer` 1, 2, 3 i rekkefølgen de står; standard-Søkets Starttidspunkt må være et startvalg som ikke er låst; og standard-Søkets Tilgjengelig tid må være et av valgene. `Tidsstolpe` krever `fyll + overGrense ≤ 1` (med 1e-9 slakk for flyttall). `kilde.url` må være http eller https.
- Alle visningstekster er `z.string().min(1)`. `UgyldigSokFeil.detaljer[].sti` kan være tom, fordi en feil på roten av Søket har tom sti.
- Lint for `import type` fra `src/ui/` ble sjekket med en midlertidig fil `src/ui/midlertidig-lintsjekk.ts` (0 feil), og en verdiimport ga ett Lagregel-brudd. Fila er slettet.

## Spec Change Log

## Review Triage Log

Pass 1 (blind-hunter BH, edge-case-hunter EC, verification-gap VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| VG1, BH10, EC2 | Rekkefølgen `[lon, lat]` er ikke låst av noen test. Testen «avviser [lat, lon]» feiler bare fordi 200 er utenfor begge områdene. | medium | Gap-funnet er forhåndsverifisert: bytte av tuppelen gir 62/62 grønne. GeoJSON/Leaflet-forveksling er den klassiske feilen. | patch (P1) |
| EC1 | Byttede koordinater inne i Norge går gjennom skjemaet | low | Bekreftet, men et skjema kan ikke se rekkefølgen når begge verdiene er i område. Nærhetssjekk mot `startpunkt` er en ny vakt. P1 låser rekkefølgen i skjemaet. | avvist |
| VG2, BH8 | Testen for låst Turdag feiler på grunn av låst Starttidspunkt, så grenen `turdag.last` er uverifisert. Testen for låst Starttidspunkt sjekker heller ikke stien. | medium | Forhåndsverifisert: grenen satt til `false` gir 62/62 grønne. | patch (P2) |
| VG3, BH5 | Regelen http/https på `kilde.url` har ingen test | medium | Forhåndsverifisert: `z.string()` i stedet gir 62/62 grønne. Feltet blir en `href`. | patch (P3) |
| VG4, BH6 | Valgfrie og nullbare former er aldri testet som gyldige: `skumring`/`solNed` null, uten `malpunkt`, `solOpp` satt, tom `opplevelsespreferanser`, `sti: ''` | medium | Forhåndsverifisert: fem innstramminger gir 62/62 grønne. Specen sier at formene er gyldige. | patch (P4) |
| VG5 | Tom tekst, tom `coordinates` og en linje med ett punkt avvises ikke av noen test | low | Forhåndsverifisert. Testtillegg uten ny kode. | patch (P5) |
| BH7 | FR-6-testene mangler frarådet uten `bedreTidsvindu`, frarådet med `vaervarsling`, middels med `bedreTidsvindu`, frarådet med `kortesteTur`, og stiene `utfall.type` og `vaer.vaervarsling` | low | Bekreftet. Reglene er hvis-og-bare-hvis, men halvparten av retningene er utestet. Bare testtillegg. | patch (P6) |
| EC11 | `sidedata.test.ts` muterer den delte `iMorgen` | low | Bekreftet: `sidedata()` legger samme `iMorgen`-objekt i hver kopi, og `feilVerdi` endrer `startvalg[0]`. Det virker i dag bare fordi testen står sist. Direkte retting med `structuredClone`. | patch (P7) |
| BH11 | Feilmeldingen for `kart.nummer` sier ikke hva verdien faktisk er | low | Bekreftet. Direkte retting av en streng. | patch (P8) |
| BH1 | Ingen sjekk av at Turforslagene har ulike `turId` | low | Bekreftet, men utvalget i 1.8 velger én Tur per Mål og fyller på fra rangert liste, så duplikater er usannsynlige. Fiksen er en ny regel. | avvist |
| BH2, EC3 | Turforslag med `overGrense > 0` og Alternativ med sum under 1 godtas | low | Bekreftet. Formlene står i Design Notes og 1.9 testes mot eksemplene. Fiksen er nye grener i roten. | avvist |
| BH3, EC5 | `kart.nummer` sjekkes ikke for Alternativkortet | low | Bekreftet, men specen sier ikke hva Alternativkortet skal ha. UI-et viser «→» ut fra `utfall.type`. Ny gren. | avvist |
| BH4 | `symbol.ikonSti` godtar enhver streng | low | Verdien kommer fra en fast tabell i kjernen, og en `img src` kjører ikke `javascript:`. Ny vakt for input som ikke kan nå fram. | avvist |
| BH9, EC8, EC9, EC10 | Sidedata sjekker ikke rekkefølge, duplikater eller at låst Turdag har bare låste startvalg | low | Bekreftet, men listene lages av én løkke i 1.10, og testene der fanger avvik. Fiksen er flere nye regler. | avvist |
| EC6 | `skumring` kan finnes uten `solNed`, og merkene kan stå i feil rekkefølge | low | Bekreftet, men hvilke kombinasjoner som er gyldige, avgjøres i 1.9. Ny regel. | avvist |
| EC7 | Tekst med bare mellomrom godtas | low | Bekreftet, men all tekst lages av kjernen fra faste maler. Usannsynlig. | avvist |
| BH12 | `SidedataSvarSkjema` er en union uten felles diskriminator | false | `"feil" in svar` gir riktig innsnevring i TypeScript, og formen er gitt av AD-18. | avvist |
| BH13 | 500-svaret har ingen form | false | AR-7 og Consistency Conventions sier at 500 gir Kontaktfeil-kortet uten å lese kroppen. Klienten velger visning ut fra status og `feil`. | avvist |
| BH14 | `Tekst`/koordinatskjemaer er duplisert, og nestede typer mangler | low | To linjer i to filer. Typene legges til når UI-storyene trenger dem (AD-3). Ingen navngitt skade nå. | avvist |

## Design Notes

Formen under er et forslag som 1.9 og 1.10 kan utvide (AD-3). Felt med `?` er valgfrie.

- `Kriterium = { rad: 'tid'|'vaer'|'onsker'|'morke', merke: 'ok'|'se-opp'|'ingen', tekst, detalj: string[] }`. `detalj` er en liste, fordi Mørke-raden har flere linjer og tipset sist.
- `Turkort = { turId, mal, fra ('fra Damefallet'), startpunktTekst ('Startpunkt: …'), faktalinje, kriterier: tuple[4], tidsstolpe, dagslysstolpe, regeltekst, kartinfoboks: { navn, tekst }, stokkoversiktRad, lesetekst, kilde: { navn, url }, kart }`. Alternativkortet bruker samme skjema.
- `tidsstolpe = { fyll, overGrense }`. Stolpen er max(Turtid, Tilgjengelig tid) lang. Turforslag: `fyll` = T ÷ A og `overGrense` = 0. Alternativ: `fyll` = A ÷ T og `overGrense` = (T − A) ÷ T. Summen er høyst 1.
- `dagslysstolpe = { startTekst, slutt, skumring: andel | null, solNed: { andel, tekst: 'sol ned 15:59' } | null, solOpp: { andel, tekst: 'sol opp 08:30' } | null }`. Andelene er posisjoner langs stolpen, som serveren lar spenne over start, slutt og solnedgang.
- `kart = { rute: Feature<MultiLineString> med [lon, lat] og properties {}, startpunkt: { lat, lon }, nummer: 1–3, malpunkt? }`.
- `vaer` diskriminert på `type`: `vurdert = { klasse, klasseTekst ('Værklasse dårlig'), symbol: { ord, ikonSti } | null, sammendrag, tidsvindu ('10:00–12:00'), hoydemerknad, vaervarsling?: { tekst } }`, `mangler = { tekst }`. `symbol` er `null` for en ukjent symbolkode.
- `utfall` diskriminert på `type`: `turforslag = { kort: Turkort[1–3] }`, `kortesteTur = { kort: Turkort, passerMedTekst ('Med 30 min eller mer passer minst én Tur.') }`, `fraradet = { melding, kriterier: tuple[vaer, tid] }`.
- `bedreTidsvindu?` diskriminert på `type`: `funnet = { nyttSok: Sok, tekst, antallTekst ('5 Turer passer før mørket.'), knappTekst ('Bruk i morgen 11:00') }`, `ingen = { tekst }`.
- `dittSok = { turdag, starttidspunkt, tilgjengeligTid, vanskelighetsgrad, opplevelsespreferanser: string[] }`. UI-et viser «ingen» på PC når lista er tom.
- `Sidedata = { demo: { id, beskrivelse, naTekst } | null, skjema: { turdager: tuple[iDag, iMorgen], tilgjengeligTid: { verdi, etikett }[], standardSok: Sok }, startpunkter: { navn, lat, lon }[], telletekst }`. En Turdag er `{ dato, etikett, last, startvalg: { verdi 'HH:MM', last }[] }`. `tilgjengeligTid` har etikettene fordi varigheter formateres i kjernen (AD-7).
- `UgyldigSokFeil.detaljer = { sti, melding }[]` med minst ett element. Det er enkelt for serveren å lage fra `issues` i zod.
- Regler på tvers av felt legges med `.superRefine` på roten, så meldingen peker på feltet som bryter FR-6.

## Verification

**Commands:**
- `npm run lint` -- forventet: 0 feil
- `npm test` -- forventet: alle grønne, også de nye testene
- `npx tsc --noEmit` -- forventet: ren
