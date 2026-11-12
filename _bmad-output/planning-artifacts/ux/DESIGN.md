---
name: Turplanlegger – Kortstokken
description: Turforslag som varme turkort i en stokk, med fire faste kriterierader som gjør Begrunnelsen etterprøvbar.
status: final
created: 2026-11-10
updated: 2026-11-12
sources:
  - ../prds/prd-turplanlegger-app-2026-11-02/prd.md
  - ../prds/prd-turplanlegger-app-2026-11-02/addendum.md
  - ../architecture/architecture-turplanlegger-app-2026-11-12/ARCHITECTURE-SPINE.md
  - ./konsept-brief.md
  - ./konsept-07-kortstokken/
colors:
  surface-base: '#F4EEE3'
  surface-card: '#FFFBF5'
  surface-control: '#EFE6D6'
  ink-primary: '#2A241D'
  ink-secondary: '#5C5348'
  ink-muted: '#6E6255'
  border-card: '#CDBEA3'
  border-hairline: '#D9CDBA'
  border-row: '#E6DCCB'
  border-control: '#D5C7AF'
  border-chip: '#8F8068'
  track: '#E5DAC7'
  track-dark-zone: '#D3C6B0'
  stack-edge-1: '#EADFCC'
  stack-edge-2: '#DDCFB7'
  card-base: '#E2D5BF'
  forest: '#1F4A38'
  forest-tint: '#E2EBE1'
  on-forest: '#FFFFFF'
  rust: '#A13E17'
  rust-tint: '#F7E3D7'
  rust-border: '#E2B9A2'
  ochre: '#73550C'
  ochre-tint: '#F3E6C6'
  map-land: '#F0E8D8'
  map-contour: '#D6C6A9'
  map-town: '#DDD0BB'
  map-water: '#CADBDD'
  map-water-line: '#93B2B6'
  map-water-text: '#3B565B'
typography:
  display:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 48px
    fontWeight: 600
    lineHeight: 1.1
  display-mobile:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 27px
    fontWeight: 600
    lineHeight: 1.15
  page-title:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.2
  card-goal:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 30px
    fontWeight: 600
    lineHeight: 1.1
  card-goal-mobile:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 26px
    fontWeight: 600
    lineHeight: 1.1
  card-from:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 17px
    fontWeight: 500
  card-from-mobile:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 16px
    fontWeight: 500
  criterion-label:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 15px
    fontWeight: 700
  criterion-value:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 16px
    fontWeight: 600
    fontFeature: tabular-nums
  body:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.45
  detail:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 13.5px
    fontWeight: 400
    lineHeight: 1.42
    fontFeature: tabular-nums
  rule-text:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 13.5px
    fontWeight: 400
    fontStyle: italic
    lineHeight: 1.4
  overline:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 12px
    fontWeight: 700
    letterSpacing: 1.4px
    textTransform: uppercase
  button:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 17px
    fontWeight: 600
  button-large:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 20px
    fontWeight: 600
  label:
    fontFamily: "'Nunito Sans', 'Helvetica Neue', Arial, sans-serif"
    fontSize: 15px
    fontWeight: 600
rounded:
  sm: 12px
  stamp: 13px
  panel: 14px
  md: 18px
  lg: 22px
  map: 24px
  card: 26px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '7': 28px
  '8': 32px
  '10': 40px
  '12': 48px
  '16': 64px
  margin-mobile: 16px
  margin-tablet: 32px
  margin-desktop-min: 48px
  margin-desktop-max: 64px
  card-pad-mobile: 20px
  card-pad-desktop: 28px
  card-gap-desktop-min: 24px
  card-gap-desktop-max: 32px
  card-min-width-desktop: 340px
  text-max-width: 720px
  map-height-desktop: 340px
  map-height-mobile: 250px
  map-snippet-height: 104px
  touch-min: 44px
components:
  turkort:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-card}'
    borderWidth: 1.4px
    borderColorSelected: '{colors.forest}'
    borderWidthSelected: 2.5px
    baseColor: '{colors.card-base}'
    baseColorSelected: '{colors.forest}'
    baseOffset: 6px
    rounded: '{rounded.card}'
    padding: '{spacing.card-pad-desktop}'
    paddingMobile: '{spacing.card-pad-mobile}'
    minWidthDesktop: '{spacing.card-min-width-desktop}'
  perforering:
    color: '{colors.border-card}'
    width: 1.4px
    dash: '2 6'
    notchRadius: 10px
  stokk-kant:
    color1: '{colors.stack-edge-1}'
    color2: '{colors.stack-edge-2}'
    offsetX: 12px
    offsetY: 9px
    maxLayers: 2
  nummerstempel:
    size: 44px
    sizeSmall: 32px
    background: '{colors.forest}'
    backgroundWarn: '{colors.rust}'
    backgroundAlt: '{colors.forest}'
    text: '{colors.on-forest}'
    rounded: '{rounded.stamp}'
  kriteriemerke:
    size: 26px
    okFill: '{colors.forest}'
    okIcon: '{colors.on-forest}'
    warnFill: '{colors.rust}'
    warnIcon: '{colors.on-forest}'
    noneFill: '{colors.surface-card}'
    noneStroke: '{colors.ink-muted}'
    noneStrokeWidth: 1.8px
  kriterierad:
    labelTypography: '{typography.criterion-label}'
    valueTypography: '{typography.criterion-value}'
    valueColor: '{colors.ink-primary}'
    valueColorWarn: '{colors.rust}'
    detailTypography: '{typography.detail}'
    detailColor: '{colors.ink-secondary}'
    valueIndent: 96px
    valueIndentMobile: 92px
    dividerColor: '{colors.border-row}'
    dividerWidth: 1px
  tidsstolpe:
    height: 7px
    track: '{colors.track}'
    fill: '{colors.forest}'
    fillWarn: '{colors.rust}'
    maxWidth: 230px
  dagslysstolpe:
    height: 7px
    track: '{colors.track}'
    darkZone: '{colors.track-dark-zone}'
    limitLineColor: '{colors.ink-secondary}'
    limitLineDash: '2 2'
    fill: '{colors.forest}'
    fillWarn: '{colors.rust}'
    endDotRadius: 6px
    endDotRing: '{colors.surface-card}'
    maxWidth: 260px
  begrunnelse-boks:
    background: '{colors.surface-base}'
    rounded: '{rounded.panel}'
    labelTypography: '{typography.overline}'
    labelColor: '{colors.ink-muted}'
    textTypography: '{typography.rule-text}'
    textColor: '{colors.ink-secondary}'
  knapp-primaer:
    background: '{colors.forest}'
    text: '{colors.on-forest}'
    typography: '{typography.button}'
    rounded: '{rounded.full}'
    height: 52px
    heightLarge: 60px
  knapp-sekundaer:
    background: '{colors.surface-card}'
    borderColor: '{colors.forest}'
    borderWidth: 2px
    text: '{colors.forest}'
    rounded: '{rounded.full}'
    minHeight: '{spacing.touch-min}'
  knapp-tonet:
    background: '{colors.forest-tint}'
    text: '{colors.forest}'
    rounded: '{rounded.full}'
    minHeight: '{spacing.touch-min}'
  fokusring:
    innerColor: '{colors.surface-card}'
    innerWidth: 2px
    outerColor: '{colors.forest}'
    outerWidth: 3px
  segmentvelger:
    background: '{colors.surface-control}'
    borderColor: '{colors.border-control}'
    selectedBackground: '{colors.forest}'
    selectedText: '{colors.on-forest}'
    height: 52px
    heightMobile: 48px
    rounded: '{rounded.full}'
  trinnvelger:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-card}'
    stepBackground: '{colors.forest-tint}'
    stepIcon: '{colors.forest}'
    height: 52px
    rounded: '{rounded.full}'
  preferansebrikke:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-chip}'
    iconColor: '{colors.ink-muted}'
    backgroundOn: '{colors.forest}'
    textOn: '{colors.on-forest}'
    height: 48px
    heightMobile: 46px
    rounded: '{rounded.full}'
  demomodus-merke:
    background: '{colors.ochre-tint}'
    text: '{colors.ochre}'
    rounded: '{rounded.full}'
    roundedMobile: '{rounded.sm}'
    height: 32px
  ditt-sok:
    labelTypography: '{typography.overline}'
    valueTypography: '{typography.label}'
  vaersammendrag:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-hairline}'
    rounded: '{rounded.md}'
  vaersymbol:
    size: 32px
    sizeMobile: 24px
  vaermangel-linje:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-hairline}'
    rounded: '{rounded.md}'
  vaervarsling:
    background: '{colors.rust-tint}'
    borderColor: '{colors.rust-border}'
    titleColor: '{colors.rust}'
    rounded: '{rounded.lg}'
  bedre-tidsvindu-boks:
    background: '{colors.surface-card}'
    borderColor: '{colors.forest}'
    borderWidth: 2px
    rounded: '{rounded.md}'
  fraradet-kort:
    rounded: '{rounded.card}'
    stamp: '{components.nummerstempel.backgroundWarn}'
    titleColor: '{colors.rust}'
  bedre-tidsvindu-kort:
    rounded: '{rounded.card}'
    borderColor: '{colors.forest}'
    borderWidth: 2.5px
  alternativkort:
    rounded: '{rounded.card}'
    overlineColor: '{colors.ink-secondary}'
  kontaktfeil-kort:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-card}'
    rounded: '{rounded.card}'
  plassholderstokk:
    edgeColor1: '{colors.stack-edge-1}'
    edgeColor2: '{colors.stack-edge-2}'
    textTypography: '{typography.body}'
    textColor: '{colors.ink-secondary}'
  stokkoversikt-rad:
    height: 64px
    borderColor: '{colors.border-card}'
    borderColorSelected: '{colors.forest}'
    rounded: '{rounded.md}'
  stokknavigasjon:
    size: 52px
    nextWidth: 140px
    dotSize: 8px
    dotColor: '{colors.border-card}'
    dotColorActive: '{colors.forest}'
  ansvarsmerknad:
    background: '{colors.surface-card}'
    borderColor: '{colors.border-hairline}'
    rounded: '{rounded.md}'
  kart:
    rounded: '{rounded.map}'
    routeColor: '{colors.forest}'
    routeWidth: 4px
    routeDash: '2.2 1.6'
    routeHaloColor: '{colors.surface-card}'
    routeHaloWidth: 4px
    routeInactiveColor: '{colors.ink-muted}'
    routeInactiveWidth: 2.6px
    startPinColor: '{colors.forest}'
    startPinRing: '{colors.surface-card}'
    goalPinColor: '{colors.forest}'
    labelColor: '{colors.forest}'
---

# Turplanlegger – DESIGN.md (Kortstokken)

Dette dokumentet beskriver den visuelle identiteten til Turplanlegger. Den bygger på konsept 07 «Kortstokken» ([skissene](konsept-07-kortstokken/), [beskrivelse per skjerm](konsept-07-kortstokken/konsept.json), [generatoren](konsept-07-kortstokken/kilde/lag.py)). Atferd, tilstander og mikrotekst står i [EXPERIENCE.md](EXPERIENCE.md). Ved konflikt mellom disse to dokumentene og en skisse gjelder dokumentene. Kjente avvik i skissene står i EXPERIENCE.md (Kjente avvik i skissene).

**Utvidelse av spesifikasjonen:** typografitokenene bruker også `fontFeature`, `fontStyle` og `textTransform`. Disse tre nøklene finnes ikke i design.md-spesifikasjonen. Prosjektet legger dem til fordi tabellsiffer, kursiv Begrunnelse og overlinjer i versaler er bærende.

## Brand & Style

Turplanlegger skal føles som en venn som kjenner Moldemarka, ikke som et dashbord. Hvert Turforslag er et **turkort**: et varmt papirkort med Målet i stor skrift og en perforert del merket «passer fordi». De opptil tre kortene ligger i en **stokk** i rangert rekkefølge. Ingrid står i gangen med jakka på og skal ta ett valg. Derfor viser mobilen ett kort om gangen, og kortet forklarer seg selv med fire faste rader: Tid, Vær, Ønsker og Mørke.

Uttrykket er rolig og personlig. Bakgrunnen er en varm, lys papirtone. Én dyp skoggrønn farge betyr «passer» og «gjør dette», og én rustfarge betyr «se opp». Nunito Sans brukes overalt. Formene er avrundede og vennlige, men aldri leketøyaktige. Appen har ingen poengsum, ingen stjerner og ingen bilder, bare tall som kan etterprøves.

## Colors

Paletten består av papir, blekk og to signalfarger. NFR-9 krever kontrast på minst 4,5:1. Kontrastene under er regnet ut:

| Forgrunn | Bakgrunn | Kontrast | Brukes til |
|---|---|---|---|
| `ink-primary` | `surface-card` / `surface-base` | 14,9 / 13,3 | titler, verdier, etiketter |
| `ink-secondary` | `surface-card` / `surface-base` / `rust-tint` | 7,3 / 6,5 / 6,1 | detaljer, brødtekst |
| `ink-muted` | `surface-card` / `surface-base` | 5,8 / 5,1 | hjelpetekst, overlinjer |
| `on-forest` | `forest` | 10,0 | primærknapper, merket ok, nummerstempel |
| `forest` | `surface-card` / `forest-tint` | 9,7 / 8,2 | lenker, sekundære og tonede knapper |
| `rust` | `surface-card` / `rust-tint` | 6,3 / 5,3 | verdier ved warn, tittel i Værvarsling |
| `on-forest` | `rust` | 6,5 | stempelet «!», merket warn |
| `ochre` | `ochre-tint` | 5,6 | Demomodus-merke |
| `map-water-text` | `map-water` | 5,5 | vannetiketter i skissene |
| `border-chip` (ikke tekst) | `surface-card` | 3,7 | kanten rundt preferansebrikker (WCAG 1.4.11) |

- **Papir.** `{colors.surface-base}` er sidebakgrunnen. `{colors.surface-card}` er flaten på kort og alle paneler. `{colors.surface-control}` er bunnen i segmentvelgerne.
- **Blekk.** `{colors.ink-primary}`, `{colors.ink-secondary}` og `{colors.ink-muted}`. Den dempede tonen brukes aldri på tall Ingrid skal sammenligne.
- **Skoggrønn** `{colors.forest}` betyr både «passer» (merket ok, tidsstolpe, valgt kort, valgt rute) og primærhandling. `{colors.forest-tint}` er bakgrunnen for tonede knapper og trinnknapper.
- **Rust** `{colors.rust}` betyr «se opp»: merket warn, Værklasse dårlig og frarådet, Mørkevarsel og Turtid over Tilgjengelig tid. Rust brukes aldri til pynt eller handlinger.
- **Oker** `{colors.ochre}` brukes bare på Demomodus-merket.
- **Kartfarger** (`map-*`) gjelder skissene og et eventuelt eget vektorkart. Bakgrunnskartet har sine egne farger. Derfor er det **dempet**: arkitekturen har valgt Kartverkets topografiske gråtonekart (AD-15), slik at den grønne ruten alltid er det sterkeste på kartet. Appen tegner selv ruter, Startpunkter, Mål og etiketter med `components.kart`.

Ikke bruk røde feilflater, gradienter, lilla eller blå aksenter, fargekoding av Vanskelighetsgrad (den står som tekst) eller farge som eneste bærer av mening.

## Typography

Én skriftfamilie: **Nunito Sans**, med reserve `'Helvetica Neue', Arial, sans-serif`. Skriften er valgt i arkitekturen (AD-15) og er den samme på alle enheter. Den selvhostes med `next/font`, så ingen skrift lastes fra tredjepart (NFR-6). Tall som sammenlignes (Turtid, klokkeslett, km, moh), settes med tabellsiffer.

| Rolle | Token | Bruk |
|---|---|---|
| Display | `{typography.display}`, `{typography.display-mobile}` | «Hvor lenge vil du gå?» på Søk |
| Sidetittel | `{typography.page-title}` | «Tre Turforslag som passer nå», «Ingen Tur passer 15 min.» |
| Mål på kortet | `{typography.card-goal}`, `{typography.card-goal-mobile}` | «Tusenårsvarden» |
| Fra-linje | `{typography.card-from}`, `{typography.card-from-mobile}` | «fra Damefallet» |
| Kriterieetikett | `{typography.criterion-label}` | Tid, Vær, Ønsker, Mørke |
| Kriterieverdi | `{typography.criterion-value}` | «1 t 32 min av 2 t» |
| Brødtekst | `{typography.body}` | ingresser og meldinger |
| Detalj | `{typography.detail}` | «gangtid, uten pauser», «sola går ned 15:59» |
| Begrunnelse | `{typography.rule-text}` | Begrunnelsen ordrett, i anførselstegn |
| Overlinje | `{typography.overline}` | PASSER FORDI, BEGRUNNELSE, BEDRE TIDSVINDU, DITT SØK |
| Etikett | `{typography.label}` | skjemaetiketter, verdier i Ditt søk |
| Knapp | `{typography.button}`, `{typography.button-large}` | |

Overskrifter er setninger, ikke slagord. Versaler brukes bare i overlinjer.

Kontrollert i skriftfila 2026-11-12:

- **Vekter:** 400, 500, 600 og 700 finnes alle i den variable fila (200–1000).
- **Kursiv** er en egen fil. Begrunnelsen og «omtrentlig rute» er kursive, så både normal og kursiv må lastes.
- **Tabellsiffer:** sifrene 0–9 er like brede i standardoppsettet. Skriften har ingen egen `tnum`-funksjon. `fontFeature: tabular-nums` står likevel i tokenene, slik at kravet følger med hvis skriften byttes.
- **✓ og →** finnes ikke i Nunito Sans. Haken og pila tegnes derfor som egne SVG-ikoner, aldri som teksttegn (se Components › Ikoner). Tegnene −, –, ·, «», °, … og æøå finnes.

## Layout & Spacing

Avstandsskalaen er 4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 40 / 48 / 64 px (`{spacing.1}`–`{spacing.16}`). Skissene er tegnet ved 390 og 1440 px. Reglene under gjelder for alle bredder.

- **Mobil (360–767 px):** sidemarg `{spacing.margin-mobile}`. Kortet fyller bredden innenfor margene, med innvendig luft `{spacing.card-pad-mobile}`. Over brettekanten (844 px på en 390 × 844-skjerm) står Ditt søk, ett helt kort med alle fire rader og Stokknavigasjonen. Under står Kart (`{spacing.map-height-mobile}`), Stokkoversikt, Ansvarsmerknad og Kreditering. Søk har forklaringen øverst og Skjemakortet som et ark i nedre del, med «Finn tur» nederst.
- **Nettbrett (768–1199 px):** samme oppsett som mobil, i full bredde med sidemarg `{spacing.margin-tablet}`. Kortflaten går i full bredde, men tekstinnholdet holder seg innenfor `{spacing.text-max-width}`, slik at linjene ikke blir for lange. Kartutsnittet i kortet blir høyere, 160 px. Søk har forklaringen øverst og Skjemakortet under, uten kart.
- **PC (fra 1200 px):** sidemargen går fra `{spacing.margin-desktop-min}` til `{spacing.margin-desktop-max}` og vokser med bredden. Resultat har Ditt søk, Værsammendrag eller Værvarsling, Kart i full bredde (`{spacing.map-height-desktop}`) og under det kortene i tre like brede kolonner. Hver kolonne er minst `{spacing.card-min-width-desktop}` bred, med mellomrom fra `{spacing.card-gap-desktop-min}` til `{spacing.card-gap-desktop-max}`. Kortene i samme rad er like høye. Ved 1200 px blir kortene ca. 350 px brede, ved 1440 px 416 px. Søk har Skjemakortet i 5 av 12 kolonner og kartet over Moldemarka i 7 av 12.
- **Trykkflater:** minst `{spacing.touch-min}` i begge retninger.
- **Fokusring:** `{components.fokusring}`, med papirfarge innerst og skoggrønt ytterst.

## Elevation & Depth

Kortstokken bruker ikke uskarpe skygger. Dybde lages med **fysiske lag**:

- **Stokk-kanter (bare på mobil og nettbrett):** bak det synlige kortet i Stokken ligger opptil to kortkanter (`{components.stokk-kant}`), forskjøvet 12 px inn og 9 px ned per lag. De viser at det finnes flere kort. På PC ligger kortene side om side og har ingen stokk-kanter. Skjemakortet på Søk har to kanter på alle bredder, som et hint om at kortene kommer derfra.
- **Kortfot:** hvert kort hviler på en massiv flate 6 px under seg (`{components.turkort.baseColor}`). Når kortet er valgt, er foten skoggrønn (`baseColorSelected`), og kortet får skoggrønn kant.
- Paneler (Værsammendrag, Ansvarsmerknad, Værmangel-linje) ligger flatt med hårstrek.

## Shapes

- `{rounded.card}`: Turkort, Frarådet-kort, Bedre tidsvindu-kort, Alternativkort, Kontaktfeil-kort og Skjemakort. `{rounded.map}`: kartflater.
- `{rounded.lg}`: Værvarsling. `{rounded.md}`: Værsammendrag, Værmangel-linje, Ansvarsmerknad, Bedre tidsvindu-boks og Stokkoversikt-rader. `{rounded.panel}`: Begrunnelse-boks. `{rounded.stamp}`: Nummerstempel. `{rounded.sm}`: Demomodus-merket på mobil.
- `{rounded.full}`: alle knapper, segmentvelgere, trinnvelgere, brikker og Demomodus-merket på PC.
- **Perforeringen** (`{components.perforering}`) skiller toppen av kortet (hvem og hvor) fra delen merket «passer fordi». Den er en stiplet linje med et halvsirkelhakk i hver kortkant. Perforeringen er kortets signatur og brukes ikke andre steder.
- **Nummerstempelet** er et avrundet kvadrat. Det viser 1–3 for Turforslag, «!» på rust for frarådet og «→» på skoggrønt (`backgroundAlt`) for Bedre tidsvindu-kortet og Alternativkortet.

## Components

Navnene her brukes likt i YAML-nøklene, i denne seksjonen og i EXPERIENCE.md › Component Patterns.

- **Turkort** ([pc-2](konsept-07-kortstokken/pc-2-godt-vaer.svg), [mob-2](konsept-07-kortstokken/mob-2-godt-vaer.svg)). Innholdet står i denne rekkefølgen ovenfra:
  1. Kartutsnitt (se under), bare på mobil og nettbrett.
  2. Nummerstempel og «1 av 3».
  3. Mål i `card-goal`, og «fra …» i `card-from`.
  4. Faktalinje: lengde totalt · høydemeter · høyeste punkt · Vanskelighetsgrad.
  5. «Startpunkt: …».
  6. Perforering.
  7. Overlinjen PASSER FORDI i skoggrønt.
  8. Fire Kriterierader.
  9. Begrunnelse-boks.
  10. Fot med «Kilde: morotur.no» (understreket lenke i skoggrønt) og knappen «Vis på kartet» (sekundær). Når kortet er valgt, står «Vises på kartet» (tonet, med hake). Foten finnes bare på PC. På mobil står kildelenken under Begrunnelse-boksen.
- **Kriterierad.** Kriteriemerke, etikett, verdi og detaljlinjer. Verdien er i rust ved warn. Tid-raden har en Tidsstolpe, og Mørke-raden har en Dagslysstolpe. Ved Mørkevarsel står tipset «Lurt å ta med hodelykt.» som siste detaljlinje i Mørke-raden. Radene skilles med en hårstrek.
- **Ikoner.** Haken (✓) og pila (→) er egne SVG-ikoner i appen, fordi Nunito Sans mangler tegnene. Det gjelder Kriteriemerket, Nummerstempelet, haken i Ønsker-raden («utsikt ✓»), «Vises på kartet» og pilene i Stokknavigasjon. Inne i en tekstlinje er ikonet like høyt som en stor bokstav og har tekstens farge. Der dette dokumentet og EXPERIENCE.md skriver ✓ eller →, menes ikonet.
- **Kriteriemerke.** Merket ok er en skoggrønn sirkel med hvit hake. Merket warn er en rustfarget sirkel med hvitt «!». Merket none er en papirsirkel med kant i dempet tone og en vannrett strek.
- **Tidsstolpe.** Fyllet viser Turtid ÷ Tilgjengelig tid. Når Turtiden er lengre enn Tilgjengelig tid (Alternativkort), stikker en rustfarget bit ut over enden, med en loddrett strek ved grensen.
- **Dagslysstolpe.** Går fra Starttidspunkt til solnedgang. Feltet etter mørkegrensen (solnedgang − 30 min) er mørkere, med en stiplet grenselinje. Fyllet går til Turens slutt og har et endepunkt. Starttiden står til venstre og «sol ned HH:MM» til høyre. Starter Turen før soloppgang, får stolpen et mørkt felt fra start til soloppgang, merket «sol opp HH:MM».
- **Begrunnelse-boks.** På PC er det et felt i sidefarge med overlinjen BEGRUNNELSE og Begrunnelsen i kursiv. På mobil er det en kursiv linje: «Begrunnelse: «…»».
- **Knapper.** Primær (`knapp-primaer`), sekundær (`knapp-sekundaer`) og tonet (`knapp-tonet`). Alle er piller.
- **Skjemakort** ([pc-1](konsept-07-kortstokken/pc-1-sok.svg), [mob-1](konsept-07-kortstokken/mob-1-sok.svg)). Inneholder Segmentvelger for Turdag og Vanskelighetsgrad, Trinnvelger for Starttidspunkt (med «nå» under verdien når den er nå) og Tilgjengelig tid, og Preferansebrikker for utsikt og vann. Etiketten står over feltet, og hjelpeteksten under. Primærknappen «Finn tur» (`heightLarge`) står nederst.
- **Ditt søk.** På PC er det et panel med overlinjen DITT SØK og fem felt, hvert med etikett og verdi: Turdag, Starttidspunkt, Tilgjengelig tid, Vanskelighetsgrad og Opplevelsespreferanser. Til høyre står «Endre søk» som sekundærknapp. På mobil er det én linje, for eksempel «I dag 13:30 · 2 t · Middels · utsikt», og «Endre søk» står i toppfeltet.
- **Værsammendrag.** Et papirpanel. Til venstre står Kriteriemerket og «Værklasse god». Deretter kommer Værsymbolet med ord («lettskyet») og verdiene: «3–5 °C · nedbør 0 mm/t · vind opptil 4 m/s». Tidsvinduet står helt til høyre, og Høydemerknaden under. På mobil står klassen og symbolet på én linje og verdiene på neste, med Høydemerknaden rett under.
- **Værsymbol.** METs eget ikon for symbolkoden, med ord fra tabellen i EXPERIENCE.md ved siden av. Ikonet er pynt for skjermlesere. Ordet bærer meningen.
- **Værmangel-linje** ([pc-5](konsept-07-kortstokken/pc-5-ingen-tur-uten-vaer.svg)). Et papirpanel med merket none: «Været er ikke vurdert.» i fet skrift, og «Vi fikk ikke hentet Værmeldingen fra MET.» etter. Den står der Værsammendraget ellers står.
- **Værvarsling** ([pc-3a](konsept-07-kortstokken/pc-3a-darlig-vaer.svg)). Et panel med `vaervarsling`-flate, merket warn og tittelen i rust: «Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00». Under står verdien som utløste varslingen, de andre verdiene og forklaringen om rekkefølgen. Bedre tidsvindu-boksen står til høyre på PC og under på mobil.
- **Bedre tidsvindu-boks.** Et papirfelt med skoggrønn kant inne i Værvarsling. Det har overlinjen BEDRE TIDSVINDU, teksten «I morgen fra kl. 14:00 er Værklassen god», antallslinjen «5 Turer passer før mørket.» i `detail` og primærknappen «Bruk 14:00».
- **Frarådet-kort** ([pc-4](konsept-07-kortstokken/pc-4-fraradet.svg), [mob-4](konsept-07-kortstokken/mob-4-fraradet.svg)). Har form som et Turkort. Øverst er et kartutsnitt med vindstreker. Deretter følger stempelet «!», «Ingen Turforslag», «Værklasse frarådet» i rust og verdiene. Under overlinjen DERFOR INGEN TUR står Kriterieradene Vær og Tid. Lenken «Sjekk også MET sine farevarsler.» står nederst.
- **Bedre tidsvindu-kort.** Et frittstående kort med skoggrønn kant ved Frarådet-kortet: ved siden av på PC, i nedre del av samme ark på mobil. Det har stempelet «→», overlinjen ALTERNATIV · BEDRE TIDSVINDU, dagen i `page-title`, «fra kl. 11:00 · samme 2 t, Middels», antallslinjen (som i Bedre tidsvindu-boksen) og primærknappen «Bruk i morgen 11:00».
- **Alternativkort** ([pc-5](konsept-07-kortstokken/pc-5-ingen-tur-uten-vaer.svg), [mob-5](konsept-07-kortstokken/mob-5-ingen-tur-uten-vaer.svg)). Bygd som et Turkort, med disse forskjellene: stempelet er «→», merket i kartutsnittet er «Alternativ», teksten ved stempelet er «Alternativ · den korteste Turen», og overlinjen er SLIK STÅR DEN MOT SØKET DITT i dempet tone. Tid-raden er warn. Under kortet står primærknappen «Endre Tilgjengelig tid» og teksten «Med 30 min eller mer passer minst én Tur.»
- **Kontaktfeil-kort.** Et papirkort uten kartutsnitt, med merket none og overskriften «Vi fikk ikke kontakt.» i `page-title`. Under står «Søket ditt er tatt vare på.» i `body`, primærknappen «Prøv igjen» og sekundærknappen «Endre søk».
- **Plassholderstokk.** To tomme stokk-kanter og en tom kortflate uten innhold, med «Finner turer …» i `body` midt på. Den har ingen spinner.
- **Kart** ([pc-2](konsept-07-kortstokken/pc-2-godt-vaer.svg)). Dempet bakgrunnskart (se Colors). Valgt rute er stiplet skoggrønn, andre ruter er tynnere og grå. Alle ruter har papirhalo. Startpunkt er en nummerert sirkel. Når flere Turer deler Startpunkt, står numrene side om side. Mål er en trekant. Etiketten «omtrentlig rute» står i kursiv skoggrønt langs den valgte ruten. Tegnforklaringen (Startpunkt · Mål · omtrentlig rute) står nede til venstre, og Krediteringen for kartet, «© Kartverket» som lenke, står i en papirpille nede til høyre.
- **Kartinfoboks.** Et papirfelt øverst til høyre i kartet med skoggrønn kant. Det har et lite Nummerstempel (`sizeSmall`) og viser navn, lengde totalt, Vanskelighetsgrad og Startpunkt for det valgte Turforslaget (FR-24). På mobil står det over det store kartet.
- **Kartutsnitt.** Et statisk utsnitt øverst i Turkortet (mobil og nettbrett), `{spacing.map-snippet-height}` høyt. Det viser bare kortets eget Startpunkt og Omtrentlige rute, med merket «Turforslag N av 3» og «omtrentlig rute · © Kartverket».
- **Stokken og Stokknavigasjon** ([mob-2](konsept-07-kortstokken/mob-2-godt-vaer.svg)). Stokken viser ett Turkort med Stokk-kanter bak. Stokknavigasjon står i tommelsonen: «Forrige» er en rund knapp med pil, og er inaktiv med hårstrek og grå pil når den ikke kan brukes. I midten står «1 av 3» med prikker. «Neste tur» er en primær pille.
- **Stokkoversikt.** Overskriften «Alle tre i stokken» (ved to kort «Begge i stokken») og rader med Nummerstempel (40 px), «Mål fra Startpunkt», fire små Kriteriemerker i radrekkefølge og «1 t 32 min uten pauser · tilbake 15:02». Valgt rad har skoggrønn kant.
- **Demomodus-merke.** Okerfarget. På PC er det en pille i toppfeltet, på mobil et felt under toppfeltet: «DEMOMODUS · Værscenario: … · «nå» = …».
- **Ansvarsmerknad.** Et papirpanel med merket none og ansvarsteksten.
- **Kreditering.** Tekst under en hårstrek. Ordlyden står i EXPERIENCE.md › Faste tekster. «Data fra MET Norway» og «© Kartverket» er understrekede lenker i skoggrønt (AD-15).
- **Toppfelt og logo.** Logoen er et avrundet skoggrønt kvadrat med en stiplet sti som ender i en prikk. Ordmerket «Turplanlegger» står ved siden av, og «Moldemarka» i dempet tekst. Logoen er ikke en lenke.

## Do's and Don'ts

| Gjør | Ikke gjør |
|---|---|
| Vis alltid alle fire Kriterieradene på hvert Turkort, i samme rekkefølge | Skjul en rad, eller lag en samlet poengsum |
| Bruk merke, ord og farge sammen (✓ «tilbake 15:02») | Bruk grønt eller rust alene |
| Skoggrønt for «passer» og primærhandling, rust bare for «se opp» | Rust på knapper eller pynt, grønt på varsler |
| Skriv «uten pauser» ved hver Turtid, også i Stokkoversikt | Vis Turtid uten den merknaden |
| Dybde med stokk-kanter og kortfot | Uskarpe skygger, glass, gradienter |
| Tabellsiffer på alle tall som sammenlignes | Proporsjonale siffer i kolonner og stolper |
| Vanskelighetsgrad som ord | Fargekode for Enkel, Middels og Krevende |
| Oker bare til Demomodus | Oker til vær eller varsler |
| Dempet bakgrunnskart | Fargesterke kartfliser som konkurrerer med ruten |
