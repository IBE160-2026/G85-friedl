# Utsatt arbeid

- source_spec: `_bmad-output/implementation-artifacts/spec-1-1-prosjektet-settes-opp-fra-starter-malen.md`
  summary: Vurder å oppgradere next fra 16.4.3 til 16.4.6, som retter GHSA-mfr8-8qww-v76h. Vurder også de 7 moderate minimatch-funnene i typescript-eslint (dev).
  evidence: `npm audit` gir 8 moderate. Next-advarselen gjelder bare `'use cache'` med `unstable_cache`, og det er utelukket av AD-14. Versjonen er låst i Stack i arkitekturen, så et bytte er gruppens beslutning. En bieffekt er at `next build`/`next dev` stopper første gang når en AI-agent kjører dem.
