# Utsatt arbeid

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-prosjektet-settes-opp-fra-starter-malen.md`
  summary: Vurder å oppgradere next fra 16.4.3 til 16.4.6, som retter GHSA-mfr8-8qww-v76h. Vurder også de 7 moderate minimatch-funnene i typescript-eslint (dev).
  evidence: `npm audit` gir 8 moderate. Next-advarselen gjelder bare `'use cache'` med `unstable_cache`, og det er utelukket av AD-14. Versjonen er låst i Stack i arkitekturen, så et bytte er gruppens beslutning. En bieffekt er at `next build`/`next dev` stopper første gang når en AI-agent kjører dem.

- source_spec: `_bmad-output/implementation-artifacts/spec-2-1-vaerterskler-og-vaerklassen.md`
  summary: CI (`.github/workflows/ci.yml`) bør kjøre `npx tsc --noEmit`, siden verken Vitest eller ESLint typesjekker.
  evidence: Verification-gap-gjennomgangen av story 2.1 fant at en typefeil i kjernen bare fanges ved lokal kjøring. Det gjaldt før storyen også.

- source_spec: `_bmad-output/implementation-artifacts/spec-1-5-turdatasettet-valideres-og-rutegeometrien-konverteres.md`
  summary: Feilgrenene i `scripts/konverter-rutegeometri.ts` har ingen tester: Zip64, feil størrelse etter utpakking, flere `.gml`-filer, ugyldig lokalt hode, ukjent XML-entitet, manglende `srsName`/`srsDimension` og `*Info` med feil antall rutenummer eller rutenavn.
  evidence: Verification-gap- og blind-hunter-gjennomgangen av story 1.5. Uten Zip64-sjekken eller størrelsessjekken er alle testene grønne. Den ekte veien er dekket av CRC-sjekken og av byte-testen mot den committede fila.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-kalibrering-av-vaerterskler.md`
  summary: Python-valideringen av terskelfila (`les_terskler`) har ingen automatisk test, så den kan gli fra Zod-skjemaet i `src/kjerne/vaer/terskler.ts` uten at CI feiler.
  evidence: Verifiseringslaget fjernet sjekken av rekkefølgen og fikk fortsatt 28/28 i `--selvtest`. Den kanoniske fila vernes av Zod i Vitest, så bare `--terskler`-stien er åpen. Noen ugyldige terskelfiler kjørt gjennom skriptet i CI ville lukke hullet.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-kalibrering-av-vaerterskler.md`
  summary: `--selvtest` dekker ikke `logg()` (vindusbyggingen fra MET-timer og teksten i `utlost_av`), så en feil der kan gi feil rader i `vaerlogg.csv`.
  evidence: Selvtesten kaller `klasse_for_vindu` direkte og kaster `grunner`. Ingen test sender et MET-formet svar gjennom `timer_for_dato` og `logg`. Bare aktuelt hvis skriptet brukes til ny logging, og da med et fast MET-svar som fixture.
- source_spec: `_bmad-output/implementation-artifacts/spec-2-2-kalibrering-av-vaerterskler.md`
  summary: Kalibreringsskriptet behandler `None` fra MET som under grensen, og `max()` i `logg` krasjer da. TS-kjernen krever tall.
  evidence: Fantes før story 2.2 (`is not None`-sjekkene og `max()` i det gamle skriptet). Det inntreffer bare hvis MET mangler `air_temperature`, `wind_speed` eller `precipitation_amount` for en time med `next_1_hours`.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-8-rangering-utvalg-og-den-korteste-turen.md`
  summary: `anbefal` kaster når Turdatasettet ikke har noen Tur med Vanskelighetsgrad Enkel og brukeren velger Enkel, fordi `kortesteTur` da ikke har noe Alternativ. Valideringen (FR-27) sjekker ikke at hver Vanskelighetsgrad har minst én Tur.
  evidence: Blind-hunter-gjennomgangen av story 1.8. Dagens Turdatasett har fem Turer med Enkel, så det skjer ikke nå. En sjekk i `validerTurdatasett` (minst én Tur med G) lukker det før et nytt datasett tas i bruk.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-9-regeltekst-og-innholdet-i-turkortet.md`
  summary: En Tur som ender etter midnatt, viser «tilbake 03:00» i Mørke-raden, Stokkoversikt-raden og Dagslysstolpen uten å si at det er neste dag.
  evidence: Blind-hunter-gjennomgangen av story 1.9. Mulig bare med start 22:00 og Tilgjengelig tid over 2 t. Soltidene for Turdagen gjelder (beslutning i 1.7), så Mørkevarselet er riktig. Det er bare teksten som kan misforstås.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-11-sok-flaten.md`
  summary: Når `?demo=` står flere ganger i URL-en, tar `page.tsx` den første verdien, slik `lesDemoId` og `api.ts` gjør, men ingen test sikrer at siden og API-et er enige.
  evidence: Verification-gap-gjennomgangen av story 1.11. Bare en håndskrevet URL treffer dette. En e2e-test for `/?demo=uten-vaer&demo=finnes-ikke` ved siden av testen for ukjent demo lukker det.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-12-resultat-med-turkort-pa-pc.md`
  summary: Live-området i Resultat viser `overskrift` og ikke `liveTekst`, og vurdert vær rendres ikke.
  evidence: Gjennomgangen av story 1.12 (BH4 og EC2). Begge tas i 2.9, når Værsammendraget og Værvarslingen bygges og `liveTekst` kan avvike fra overskriften.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-12-resultat-med-turkort-pa-pc.md`
  summary: Resultat har ingen største bredde på skjermer bredere enn 1440 px, og etikettene i Dagslysstolpen kan overlappe når andelene ligger tett.
  evidence: Gjennomgangen av story 1.12 (BH10 og EC3). Ingen token for største bredde. Sjekkes i SM-4-gjennomgangen i 1.15.
- source_spec: `_bmad-output/implementation-artifacts/spec-1-13-stokken-pa-mobil-og-nettbrett.md`
  summary: Turkortene rendres to ganger, én gang for PC-raden og én gang for Stokken, og fokus kan gå tapt når bredden krysser 1200 px.
  evidence: Gjennomgangen av story 1.13 (BH4 og EC4). Den doble renderingen må løses før kartutsnittet kommer inn i Turkort i Epic 3 (story 3.5), med lat lasting eller med ett oppsett etter `matchMedia`.
