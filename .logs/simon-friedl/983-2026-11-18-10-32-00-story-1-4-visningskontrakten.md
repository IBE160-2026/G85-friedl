# Story 1.4: Visningskontrakten og sidedata

## 2026-11-18 kl. 10:32 — Simon Friedl

### Oppgave
Kjør story 1.4 med `bmad-build`. Serveren (1.10) og UI-storyene (1.11–1.14) skal ha én felles kontrakt for Resultatet, sidedataene og feilsvarene, som Zod-skjemaer i kjernen (AD-3, AD-18, AR-7).

### Plan
- `epic-1-context.md` var gyldig og ble brukt som den er. Story 1.3 ga kontinuitet.
- Skrev specen [spec-1-4-visningskontrakten-og-sidedata.md](../../_bmad-output/implementation-artifacts/spec-1-4-visningskontrakten-og-sidedata.md). Den er på om lag 2700 token, og Simon valgte å beholde den samlet. Det var ingen åpne spørsmål. Skjemaformen står i Design Notes som et forslag som 1.9 og 1.10 kan utvide.
- En subagent implementerte specen. Tre gjennomgangslag fulgte: blind-hunter, edge-case-hunter og verification-gap.

### Resultat
- **`src/kjerne/visning/skjema.ts`**:
  - `ResultatvisningSkjema` har `vaer` (`vurdert`/`mangler`), `utfall` (`turforslag` 1–3, `kortesteTur`, `fraradet`), Turkort, Kriterierader, `bedreTidsvindu` (`funnet`/`ingen`) og `dittSok`.
  - Turkortet har fire Kriterierader i fast rekkefølge, Tidsstolpe `{ fyll, overGrense }`, Dagslysstolpe med merker og ferdige etiketter, lesetekst og kart (GeoJSON MultiLineString i `[lon, lat]`).
  - `z.strictObject` gjelder på alle nivåer, så ekstra felt og snake_case-felt avvises.
  - Roten håndhever FR-6: frarådet ⇔ `fraradet`, Bedre tidsvindu ⇔ dårlig/frarådet, Værvarsling ⇔ dårlig, og `kart.nummer` er 1, 2, 3.
- **`src/kjerne/visning/sidedata.ts`**: `SidedataSkjema` (AD-18). Standard-Søket må være mulig å velge i skjemaet.
- **`src/kjerne/visning/feil.ts`**: `UkjentDemoFeilSkjema`, `UgyldigSokFeilSkjema`, `ApiFeilSkjema` og `SidedataSvarSkjema`.
- **Gjennomgangen** ga 8 rettelser, nesten alle i testene:
  - en test låser rekkefølgen `[lon, lat]`
  - grenen for låst Turdag er nå isolert
  - regelen for `kilde.url` er testet
  - de valgfrie og nullbare formene er testet som gyldige
  - tom tekst og tom rute avvises
  - FR-6 er testet i begge retninger
  - en delt test-fixture er ikke lenger mutert
  - feilmeldingen for `kart.nummer` er klarere

  Elleve funn ble avvist, blant annet ekstra konsistensregler for Tidsstolpe, sidedata og `turId`. Ingen funn ble utsatt. Triagen står i specen.
- **Verifisering:** lint er ren, Vitest gir 317/317, og `npx tsc --noEmit` er ren. `import type` fra `src/ui/` er sjekket med en midlertidig fil, som er slettet.
- **Status:** committet i `cc85978`. Specen er `done`, og sprint-status står på `review`.

### Åpne punkter
- Story 1.4 står som `review` i sprint-status: se over endringen (eventuelt `bmad-walkthrough`) og sett den til `done`.
- Neste steg: `bmad-build` for story 1.5 (Turdatasettet valideres og rutegeometrien konverteres), i et nytt kontekstvindu.
