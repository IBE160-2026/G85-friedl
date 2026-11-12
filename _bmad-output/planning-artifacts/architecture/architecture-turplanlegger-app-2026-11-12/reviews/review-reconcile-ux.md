---
type: review
lens: reconcile-ux
target: ../ARCHITECTURE-SPINE.md
inputs:
  - ../../../ux/EXPERIENCE.md
  - ../../../ux/DESIGN.md
created: '2026-11-12'
---

# Review — Spine vs. UX (EXPERIENCE.md, DESIGN.md)

**Verdict:** The spine's boundaries are right (server-owned «nå», ingen regler eller formatering i UI-et), but the Resultat contract in AD-3 is too thin for the UI to honour them. Taken together, AD-3, AD-4 and AD-7 make several UX behaviours impossible as written: Kriterieradene, overskriftene, runding av passert Starttidspunkt, Faktalinjen og Ditt søk. Two builders would solve these in different ways. The Deferred row «De enkelte feltene i Resultat … Koden eier formen» is the root cause. The UX needs fix the shape at the boundary, so it cannot be left to the code.

Severity: critical = a UX behaviour is impossible under the spine's rules, or two builders will diverge on something core to the design. high = data/text the UI needs is not provided and the fix touches the contract. medium = ambiguity that is likely to diverge. low = small gap or a follow-up.

---

## C1 — Kriterieradene (✓ ! –) are not part of the Resultat contract — **critical**

**Missing/conflict.** Each Turkort and the Alternativkort must have four Kriterierader (Tid, Vær, Ønsker, Mørke), and the Frarådet-kort must have two (Vær, Tid). Each row has a state (ok/warn/none), a value text and detail lines. The state rules are rule logic: Turtid ≤ Tilgjengelig tid, Værklasse god/middels/dårlig/frarådet/mangler, which Opplevelsespreferanser hit, and Mørkevarsel/before sunrise. Under AD-3, a Turforslag carries only «ferdig Regeltekst, varsler, kildelenke og sammenslått rutegeometri», and AD-3/AD-7 forbid the UI from deriving or formatting. So the UI cannot draw the rows without breaking the spine. A builder will either (a) derive the states from `varsler` and Værklasse in the UI, against AD-2/AD-3, or (b) invent row fields. Two builders will invent different ones. The same applies to the Stokkoversikt rows, which show «fire små Kriteriemerker i radrekkefølge».

Many row texts are rule output with domain values:
- «trenger 1 min mer, uten pauser»
- «Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær»: only the rules that applied
- «Mørkevarsel: tilbake ca. 15:32», «Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.»
- «Mørkevarsel: starter før soloppgang 08:30»
- «utsikt ✓ · vann –», «ikke utsikt –», «har vann (ikke valgt)»
- Frarådet Vær-raden «sterk kuling, vind opp mot 19 m/s»

The spine's convention puts «Faste UI-tekster» in `src/ui/tekster.ts` and only Regeltekst in kjernen. These texts are neither, so their home is ambiguous.

**UX ref.** EXPERIENCE.md › Component Patterns (Kriterierad, Alternativkort, Frarådet-kort, Stokkoversikt) and › «Kriterieradene: når ✓, ! og –». DESIGN.md › Components › Kriterierad, Kriteriemerke, Stokkoversikt. Accessibility Floor (marks with text alternatives «passer», «se opp», «ikke vurdert»).

**Suggested fix.** Extend AD-3: every Turforslag, the korteste Tur and the `fraradet` variant carry `kriterier: Kriterierad[]` in a fixed order. Each row is `{ kriterium: 'tid'|'vaer'|'onsker'|'morke', merke: 'ok'|'warn'|'none', verdi: string, detaljer: string[] }`, plus the bar data in M3. Built in kjernen next to Regeltekst (for example `src/kjerne/begrunnelse/kriterier.ts`) using `format.ts` and `vaerord.ts`. Add a rule: «Tekster som inneholder domeneverdier lages i kjernen. `tekster.ts` har bare tekster uten domeneverdier.» Remove the Resultat-fields line from Deferred, or narrow it to «felt som ikke er nevnt i AD-3».

## C2 — Passed Starttidspunkt, «I dag» re-selection and locked times need a live «nå» the browser is not allowed to have — **critical**

**Missing/conflict.** The UX needs the current time *after* the page has rendered, in these places:
- When sending, on «Prøv igjen» and when «Endre søk» brings the Søk back, a passed Starttidspunkt is rounded up to the next kvarter, with the help text «Flyttet til 14:15, fordi 13:30 har passert.»
- After 22:00, Turdag switches to «I morgen» and Starttidspunkt to 10:00.
- Choosing «I dag» again sets Starttidspunkt to «nå» rounded up.
- Times that have passed are locked in the Trinnvelger/`<select>`.
- «I dag» is locked after 22:00.
- The Skjemakort shows «nå» under the value.

AD-4 gives the page «nå» once, at server render, and forbids the browser clock for domain logic. AD-1 allows the UI only `import type` from kjernen, so the rounding function in `tid.ts` cannot run in the browser. Neither API endpoint returns a fresh «nå» or a normalised Søk. If the page has been open for 40 minutes, the rendered «nå» is stale, and in Demomodus the browser clock is completely wrong. Builder A uses `new Date()` in the browser, which breaks Demomodus and AD-4. Builder B uses the stale render-time value, which breaks FR-2. Builder C rounds on the server but has no way to show the «Flyttet til …» text.

**UX ref.** EXPERIENCE.md › State Patterns («Starttidspunktet har passert», «Søk etter 22:00»), Component Patterns (Segmentvelger, Trinnvelger, «Finn tur»), DESIGN.md › Skjemakort («nå» under verdien). PRD FR-1, FR-2.

**Suggested fix.** Add to AD-4 (or a new AD):
1. `/api/sok` normalises the Søk with the server's «nå» (kjerne function `normaliserSok(sok, na)`). The Resultat echoes the effective Søk and an optional `justering: { tekst: 'Flyttet til 14:15, fordi 13:30 har passert.' }`.
2. Add a small endpoint, for example `GET /api/skjema?demo=<id>`, or the same payload as the server render. It returns «nå», the standardverdier, the allowed values with labels, the «I dag»-lock and an «expires at» (next kvarter, or 22:00). The client calls it on «Endre søk», on «Endre Tilgjengelig tid» and when «I dag» is chosen again. An alternative is a server «nå» anchor plus a monotonic `performance.now()` offset. If you pick that, state it explicitly and say which kjerne logic is duplicated, because AD-1 forbids it.
3. State which surface shows the «Flyttet til …» text. EXPERIENCE says «Hjelpeteksten sier …» on Søk, but on send the user lands on Resultat.

## H1 — The Overskrift depends on server «nå», the count and the weather; nothing provides it — **high**

**Missing/conflict.** The heading varies with:
- the number word (Ett/To/Tre)
- the variant: «som passer nå» when Turdag is I dag and Starttidspunkt is «nå», «som passer i morgen fra kl. 14:00» otherwise, «i dårlig vær» when the weather is dårlig, «som passer tiden din» when the Værmelding is missing
- «Ingen Tur passer {Tilgjengelig tid}.»

Deciding «Starttidspunkt er nå» needs the server's «nå» (AD-4). «fra kl. 14:00» and «{Tilgjengelig tid}» are formatted domain values (AD-7). The UX rules also do not say which variant wins when the Værmelding is missing and Turdag is i morgen («som passer tiden din» or «… i morgen fra kl. 10:00»). The same heading text feeds the polite live region, which must also announce Værvarsling, frarådet and «Vi fikk ikke kontakt.».

**UX ref.** EXPERIENCE.md › State Patterns › «Overskrifter», the state rows «Færre enn tre Turforslag», «Værmeldingen mangler …», Accessibility Floor (live region). DESIGN.md › Typography (page-title).

**Suggested fix.** Add `overskrift: string` to the Resultat, built in kjernen from the effective Søk, «nå», Utfall and Vær. Record the precedence when the Værmelding is missing (suggestion: «som passer tiden din» always wins, and goes back to the UX team for confirmation). Say that the live region announces `overskrift`, plus a fixed text from `tekster.ts` for Værvarsling, frarådet and Kontaktfeil.

## H2 — The Vær part of the Resultat is a single «værsammendrag», but the UI needs its parts (symbol code, symbol word, values, Tidsvindu, triggering value) — **high**

**Missing/conflict.** The Værsammendrag is laid out as: Kriteriemerke + «Værklasse god», then the Værsymbol *icon* + word («lettskyet»), then the values «3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s», the Tidsvindu at the far right, and the Høydemerknad below. On mobile it uses two lines. Værvarsling has the title «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00» and lists the triggering value first. Frarådet needs the sentence «Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).».

These parts are missing from the contract:
- The icon filename needs the full `symbol_code` *with* `_day/_night/_polartwilight`.
- The word needs the code *without* the suffix, mapped through a table, with `…andthunder` → «… og torden».
- An unknown code gives no icon and no word, so the leading «{symbolord} · » must be dropped.
- Picking the hour is rule logic: the hour with the worst Værklasse in the Tidsvindu, the first if several are equally bad.

AD-3 gives «Værklasse, værsammendrag og eventuell Værvarsling», AD-15 says only «filnavn fra symbol_code», and AD-8 puts Værord in `vaerord.ts` but does not mention the symbol-word table. If the server sends only a finished string, the UI has to parse it to insert the icon. If it sends raw `symbol_code`, the UI does the mapping and the hour choice itself.

**UX ref.** EXPERIENCE.md › Værord (Tallformat, Værsammendrag/Værvarsling format), › Værsymbol (table, worst hour, unknown code). DESIGN.md › Components › Værsammendrag, Værsymbol, Værvarsling, Frarådet-kort.

**Suggested fix.** In AD-3, `vaer: vurdert` carries:
- `klasse: 'god'|'middels'|'darlig'|'fraradet'` and `klasseTekst`
- `symbol: { ikon: 'clearsky_day' | null, ord: 'klarvær' | null }`
- `verdier: string` (the values with the triggering value first when the class is dårlig)
- `tidsvindu: '10:00–13:00'`
- `tittel` for Værvarsling and `melding` for frarådet

Put the symbol-word table in kjernen (`src/kjerne/vaersymbol.ts`, or alongside `vaerord.ts` under AD-8). The kjerne returns `ikon: null` for codes without a file in `public/vaerikoner/`, so the UI never requests a 404.

## H3 — The Datafelt convention (snake_case dataset fields «helt ut i API-et») conflicts with AD-7 for everything formatted on the Turkort — **high**

**Missing/conflict.** These texts all contain formatted domain values (decimal comma, «moh», «t/min»):
- Faktalinje: «lengde totalt · høydemeter · høyeste punkt · Vanskelighetsgrad»
- Kartinfoboks: «Skihytta fra Damefallet · 3,06 km · Enkel · Startpunkt: …»
- Stokkoversikt row: «1 t 32 min uten pauser · tilbake 15:02»
- Mål and «fra …» split into two typographic roles
- «Startpunkt: …»

The convention says the Turdatasett fields keep their names all the way through the API, which implies raw numbers such as `lengde_km: 3.06`. AD-7 says the UI never formats domain values. One builder formats `3.06` → «3,06 km» in the UI, the other adds strings. The Søk echo in Ditt søk («I dag 13:30 · 2 t · Middels · utsikt», PC fields with «ingen») and the Trinnvelger `<select>` labels for all valid values («1 t 15 min», «13:45») are also formatted durations and times. AD-4 says the server gives «hvilke valg som er tillatt», but not their labels.

These texts are also formatted domain values:
- «Ingen Tur passer {Tilgjengelig tid}.»
- «Med {korteste Turtid rundet opp til kvarter} eller mer passer minst én Tur.»: the rounding is a computation as well
- «samme 2 t, Middels» on the Bedre tidsvindu-kort

**UX ref.** DESIGN.md › Components › Turkort (Faktalinje, «Startpunkt: …»), Kartinfoboks, Stokkoversikt, Ditt søk, Bedre tidsvindu-kort. EXPERIENCE.md › Faste tekster («Under Alternativkortet»), Component Patterns (Trinnvelger, Ditt søk, Stokkoversikt), Voice and Tone (5,0 km, «1 t 2 min»).

**Suggested fix.** Clarify the convention: raw dataset fields *may* pass through for identification and links, but every displayed value comes as a finished string in a `visning` block per Tur. The block holds `mal`, `fra`, `faktalinje`, `startpunkt`, `kartinfo`, `turtidTekst` and `tilbakeTekst`. Add `dittSok` (one-line and per-field forms) and `alternativHint` to the Resultat, and option labels to the form payload (C2). All of them are built with `format.ts`.

## M1 — Map data beyond merged geometry is missing (Startpunkt/Mål points, shared numbering, Tur-ID, Søk map) — **medium**

**Missing/conflict.**
- The Kart draws each Startpunkt as a numbered circle, with numbers side by side when Turer share a Startpunkt, and each Mål as a triangle. A MultiLineString has no reliable start or end, so these points must be sent.
- Card ↔ route ↔ Startpunkt selection (FR-24) needs a stable ID per Turforslag. AD-3 does not name one.
- The PC Søk page shows a map with all 8 Startpunkter and the text «12 Turer fra 8 Startpunkter (tallene følger Turdatasettet)» *before* any Søk. The spine only delivers geometry inside a Resultat, and says nothing about data for the Søk map.

**UX ref.** DESIGN.md › Components › Kart, Kartinfoboks. EXPERIENCE.md › Faste tekster («Søk-kartet (PC)»), State Patterns («Søk, standardverdier»), Component Patterns (Turkort, Kart).

**Suggested fix.** In AD-3/AD-10, each Tur in the Resultat carries `id` (the dataset id), `startpunkt: { id, lat, lon, navn }`, `mal: { lat, lon }` and `rute: MultiLineString`. In AD-4, the server-rendered page also receives `startpunkter[]` (unique, with coordinates) and the finished count text, computed by the shell from the Turdatasett.

## M2 — The Bedre tidsvindu fields are unspecified — **medium**

**Missing/conflict.** AD-3 has `bedreTidsvindu: funnet | ingen | fraværende` but no fields. The UI needs:
- machine values to send a new Søk: Turdag and Starttidspunkt, keeping the other fields
- display texts: «I morgen fra kl. 14:00 er Værklassen god», «Bruk 14:00» or «Bruk i morgen 11:00», «I morgen (søn. 15. nov.) fra kl. 11:00» (the date format belongs in `format.ts`), «fra kl. 11:00 · samme 2 t, Middels»
- for `ingen`, the text, which depends on Turdag («… i dag eller i morgen.» or «… i morgen.»)

It is also unclear whether «Bruk HH:MM» or «Bruk i morgen HH:MM» is chosen by the card type or by whether the window is on another day. Separately, PRD FR-19 also asks for the number of Turer that fit before dark in the new Tidsvindu. The UX does not show it, so that is a PRD/UX gap to note.

**UX ref.** EXPERIENCE.md › Component Patterns (Bedre tidsvindu-boks, Bedre tidsvindu-kort), State Patterns («Ingen Bedre tidsvindu»), Flow 2/3. DESIGN.md › Bedre tidsvindu-boks, Bedre tidsvindu-kort.

**Suggested fix.** `bedreTidsvindu: { type: 'funnet', turdag: 'i-dag'|'i-morgen', starttidspunkt: 'HH:MM', tekst, knappTekst, dagTekst? } | { type: 'ingen', tekst }`, with all texts built in kjernen.

## M3 — Tidsstolpe and Dagslysstolpe proportions: UI arithmetic or server fractions? — **medium**

**Missing/conflict.**
- The Tidsstolpe fill is Turtid ÷ Tilgjengelig tid, with a rust overflow part and a boundary line on the Alternativkort.
- The Dagslysstolpe runs from Starttidspunkt to solnedgang. It has a darker zone after solnedgang − 30 min, a dashed boundary, the fill to the end of the Tur with an end dot, the labels «sol ned HH:MM» and «sol opp HH:MM», and a dark field before soloppgang.

AD-7 says the UI never «regner ut» domain values. It is ambiguous whether computing these fractions from ISO timestamps is allowed. One builder will add ISO instants and do the arithmetic in the UI, another will add fractions.

**UX ref.** DESIGN.md › Components › Tidsstolpe, Dagslysstolpe, YAML `tidsstolpe`, `dagslysstolpe`. EXPERIENCE.md › Kriterieradene (Tid ✓/!, Mørke ✓/!).

**Suggested fix.** Have the server send presentational fractions (0–1, overflow allowed) and finished labels as part of the Kriterierad in C1, for example `stolpe: { fyll, grense?, morkFra?, morkTil?, venstre, hoyre }`. Add to AD-7 that the UI may do layout arithmetic (bounds, pixel widths) but not time arithmetic.

## M4 — Client state, history and «Endre søk» memory are not anchored in the spine — **medium**

**Missing/conflict.**
- Søk and Resultat are two views on one page.
- The Søk is kept only in memory and never in the URL.
- «Endre søk», «Endre Tilgjengelig tid» (with focus on the field) and the Kontaktfeil text «Søket ditt er tatt vare på.» all need the last Søk to survive the view change.
- Resultat adds one history entry. Back returns to Søk with its values. New Søks from Resultat replace the entry.
- `?demo=<id>` must stay in the URL across this.

The spine has one `page.tsx` but no rule against putting the Søk in query parameters or using a Next.js route segment per view. A builder could reasonably do either, and both break NFR-6 or the history rule.

**UX ref.** EXPERIENCE.md › Foundation (Personvern), Information Architecture, Interaction Primitives («Nettleserens Tilbake», «Ett trykk = nytt Søk»), State Patterns («Får ikke kontakt»).

**Suggested fix.** Add a short convention: «Søket og visningen ligger i klientminne (React state) på `page.tsx`. Visningsbytte gjøres med `history.pushState`/`replaceState` på samme URL, som beholder `?demo=`. Søket skrives aldri i URL, `localStorage` eller cookies.»

## M5 — The /api/begrunnelse window and scope are ambiguous — **medium**

**Missing/conflict.**
- The UX swaps the text when the Språkmodelltekst arrives «innen 5 s». The spine sets a 5 s server timeout towards Anthropic, but no client deadline measured from when the Turforslag were shown. With network latency and three calls, a reply could arrive after 5 s and still swap the text.
- The UX gives the Alternativkort a Begrunnelse-boks too, but AD-12 says «én gang per Turforslag». It is unclear whether the korteste Tur gets a Språkmodelltekst.
- Parallel versus sequential calls is not specified.

**UX ref.** EXPERIENCE.md › Component Patterns (Begrunnelse-boks, Alternativkort), Flow 1 step 6. PRD FR-22.

**Suggested fix.** In AD-12, add: the client fires the calls in parallel right after rendering. It ignores replies that arrive more than 5 s after the Resultat was shown (`AbortController`). Also state whether the korteste Tur is included (suggestion: yes, the same call).

## M6 — Kartutsnitt and «Bakgrunnskartet lastes ikke» are unaddressed by AD-15 — **medium**

**Missing/conflict.**
- On mobile and tablet, each Turkort has a static Kartutsnitt (104 px, 160 px on tablet) with only its own route and «© {kartleverandør}». The Frarådet-kort has a Kartutsnitt «med vindstreker» but no Tur.
- AD-15 covers one Leaflet map. Kartutsnitt could be up to three more non-interactive Leaflet instances with tiles, or SVG drawn from the geometry. Builders will differ, and the tile load and NFR-5 are affected.
- When tiles fail, the UX wants a paper-coloured surface with routes, Startpunkter and Mål still drawn, plus the text «Bakgrunnskartet kunne ikke lastes.». The spine does not mention tile-error handling.

**UX ref.** EXPERIENCE.md › Component Patterns (Kartutsnitt), State Patterns («Bakgrunnskartet lastes ikke»). DESIGN.md › Components › Kartutsnitt, Frarådet-kort.

**Suggested fix.** In AD-15:
- Decide what the Kartutsnitt is. Suggestion: a non-interactive Leaflet instance with the same tile source, or an SVG from the route geometry with no tiles. If you choose SVG, drop «© kartleverandør» from the snippet in DESIGN.md.
- State that the tile layer's `tileerror` switches the map to `{colors.map-land}` and shows the fixed text from `tekster.ts`, while the vector layers stay.
- State that the Frarådet snippet is decorative and uses no data.

## L1 — Demomodus-merke data and the unknown-demo-ID message text — **low**

The badge shows «DEMOMODUS · Værscenario: … · «nå» = …». AD-13 has a description in `scenario.json`, but the spine does not say that the page receives the description and a *formatted* «nå». AD-5 adds a UI message for an unknown demo-ID that lists the valid IDs. That text does not exist in EXPERIENCE › Faste tekster, and the spine does not say whether the server-rendered page shows it directly or only after a 400. **Fix:** in AD-4/AD-5, the page props include `demo: { id, beskrivelse, naTekst } | null`. An unknown ID is caught at page render as well. Ask UX for the text, or add it to `tekster.ts` and back to EXPERIENCE.md.

## L2 — UI behaviour on 400 (ugyldig Søk) is undefined — **low**

The Feil convention maps 500 and timeouts to the Kontaktfeil-kort but says nothing about how the UI shows a 400 for an invalid Søk. That should not happen with the form, but it can happen with a stale Søk after C2. **Fix:** say that a 400 for an invalid Søk shows the Kontaktfeil-kort, or that it cannot happen because of server normalisation (C2).

## L3 — The MET farevarsel URL is not fixed — **low**

The Frarådet-kort link «Sjekk også MET sine farevarsler.» opens MET in a new tab. Neither the UX nor the spine fixes the URL. **Fix:** put the URL in `tekster.ts`, or in a `lenker.ts` next to it.

## L4 — The ikonlisens check handed to architecture is resolved, but the attribution placement is not — **low**

EXPERIENCE › Værsymbol says «lisensen sjekkes i arkitekturen». AD-15 records MIT. MIT requires the copyright notice to ship with the files. **Fix:** in AD-15, add «LICENSE-fila fra METs værikoner ligger i `public/vaerikoner/`». No UI credit is required, and the Kreditering already says «Værdata: MET Norway».

## F1 — Follow-up for DESIGN.md/EXPERIENCE.md: Nunito Sans replaces Avenir Next (not a spine defect) — **low**

The user decided in the spine (AD-15) to self-host Nunito Sans with `next/font`. This answers EXPERIENCE › Open Questions #1 more broadly than asked: the question was about a fallback for Android/Windows, and the decision replaces Avenir Next on all platforms. DESIGN.md is now out of date in these places:
- every `typography.*.fontFamily` token (`'Avenir Next', Avenir, 'Helvetica Neue', sans-serif`)
- Brand & Style («Avenir Next brukes overalt»)
- Typography («Én skriftfamilie: **Avenir Next** …», «Avenir Next finnes bare på Apple-enheter … avgjøres i arkitekturen»)
- EXPERIENCE › Open Questions #1, which should be closed

**Check while updating:**
- weights 400/500/600/700 and italic (`rule-text` is italic)
- that `tabular-nums` (tnum) works in the self-hosted subset
- glyph coverage for ✓ (U+2713) and → (U+2192), which are probably not in Nunito Sans, so the fallback font draws them; consider drawing them as SVG in the Kriteriemerke/Nummerstempel
- that the 92/96 px `valueIndent` and the 360 px layout still fit with Nunito Sans metrics

**Related follow-up:** DESIGN.md › Kreditering and Kartutsnitt still say «© {kartleverandør}» and «Kartverket brukes som plassholder til leverandøren er valgt». AD-15 has chosen Kartverket topograatone, so that should be filled in («Bakgrunnskart: © Kartverket»).

---

## Checked and consistent (no finding)

- The muted background map requirement → AD-15 Kartverket topograatone.
- The map library choice → Leaflet 1.9.4 + react-leaflet, without a key.
- No third-party fonts (NFR-6) → `next/font` self-hosting.
- The 10 s client timeout → the Feil convention.
- MET failure gives no HTTP error, but Værmangel → `vaer: mangler`.
- Fixed texts verbatim → `tekster.ts` (but see C1 for texts with values).
- The Værord table and its limits → `vaerord.ts` (AD-8).
- The Høydemerknad «ca. 400 moh» matches `altitude=400` (AD-6).
- One API call per Søk and a new Søk for «Bruk …» and «Prøv igjen» → AD-2.
- The Demomodus badge iff demo → AD-5.
- The Begrunnelse arrives after the rows, and the rows never change → AD-12 (but see M5).
- Tokens as CSS variables → the Styling convention.
