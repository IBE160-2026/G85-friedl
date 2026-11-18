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
