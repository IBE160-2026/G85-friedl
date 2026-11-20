# Sluttsjekk for Epic 2

Story 2.11 (AR-25, SM-3, SM-4, NFR-5). Sjekket 2026-11-19.

## Oversikt

| Krav | Resultat |
|---|---|
| README (AR-25) | Bestått. Lenkene til `?demo=uj-1`, `uj-2` og `uj-3` står i en tabell med «nå», Søk og hva du ser. README har også en ny seksjon om kalibreringen. Setningene om at MET ikke er koblet til, er fjernet. Committet i `b2edf2d`. |
| Prøvekjøring fra ren klone (SM-3, forberedelse) | Bestått etter en rettelse. Kjørt av Claude, ikke av en person utenfor gruppa. Prøven fant at overskriften sa «som passer nå» etter «Bruk 14:00». Feilen er rettet i `1c6be47`, og prøven ble kjørt på nytt. |
| SM-3 med en person utenfor gruppa | **Ikke målt.** Bevisst beslutning 2026-11-20: tiden før innlevering er begrenset, og verken publisering eller brukertest er krav fra faglærer. |
| NFR-5 med ekte MET og «Fast 4G» | Bestått. Median 208 ms og maks 209 ms mot Production. Grensen er 3 s. |
| SM-4 ved 360, 768 og 1440 px | Bestått. `e2e/sluttsjekk.spec.ts` gir 29 av 29. Det er 9 visninger × 3 bredder, pluss Kriterieradene ved 180 og 360 px. |
| Testene | Bestått. `npm test` gir 1484/1484, `npm run lint` og `npx tsc --noEmit` er rene, og `CI=1 npx playwright test` gir 129/129. |

## Prøvekjøring fra ren klone

Kjørt 2026-11-19. Repoet ble klonet fra den lokale commiten `b2edf2d` til en midlertidig mappe, fordi 2.11 ikke er pushet. Mappa hadde ingen `.env`. README ble fulgt:

- `npm install` og `npm run dev` startet appen på `http://localhost:3000`.
- Et Playwright-skript i Chromium ved 1440 px fulgte stegene i Demomodus-tabellen.

| Steg | Resultat |
|---|---|
| `?demo=uj-1`, utsikt, «Finn tur» | «Tre Turforslag som passer nå». Værsammendraget har «Værklasse god klarvær 3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s» og Tidsvinduet 13:30–15:30. |
| `?demo=uj-2`, I morgen, 3 t, Krevende, utsikt | «Tre Turforslag i dårlig vær». Værvarslingen har «Værklasse dårlig i Tidsvinduet 10:00–13:00», «Nedbør opptil 3,4 mm/t, vind opptil 9,2 m/s, 5–7 °C.». Boksen sier «I morgen fra kl. 14:00 er Værklassen god. 5 Turer passer før mørket.» og har knappen «Bruk 14:00». |
| «Bruk 14:00» | Første kjøring ga «Tre Turforslag som passer nå». Det er feil etter EXPERIENCE › State Patterns. Etter `1c6be47` står det «Tre Turforslag som passer i morgen fra kl. 14:00», med Værklasse god, delvis skyet og 4–7 °C. |
| `?demo=uj-3`, standard-Søket | «Ingen Turforslag» og ingen Turkort. Frarådet-kortet har «Værklasse frarådet», «vind opptil 19 m/s» og «Det er meldt sterk kuling …». Knappen «Bruk i morgen 11:00» finnes. |
| «Bruk i morgen 11:00» | «Tre Turforslag som passer i morgen fra kl. 11:00», med Værklasse god, lettskyet og 5–6 °C. |

Serveren ble stoppet, og mappa ble slettet etterpå.

## NFR-5: svartid med ekte MET

Målt 2026-11-19 kl. 11:01 med `npm run svartid -- https://g85-friedl.vercel.app/` mot Production på `8b7e674` (story 2.8–2.10). Siden var uten Demomodus, så serveren hentet Værmeldingen fra MET.

- «Fast 4G»: 165 ms ventetid, 1 012 500 B/s ned og 168 750 B/s opp. Mobilvisning 390 × 844 px.
- Oppvarmingen tok 728 ms. De fem målingene ga 196, 208, 209, 208 og 201 ms.
- **Median 208 ms og maks 209 ms**, innenfor 3 s.
- Et `POST /api/sok` rett etterpå (i dag 12:00, 2 t, Middels) ga `vaer.type` `vurdert` med «Værklasse middels» og «skyet · −3 °C · nedbør 0 mm/t · vind opptil 1 m/s». Svaret kom altså med ekte MET.
- Etter oppvarmingen svarer serveren trolig fra MET-cachen. Det første kallet, med MET, er oppvarmingen på 728 ms.

## SM-4

`CI=1 npx playwright test e2e/sluttsjekk.spec.ts` ga 29 av 29 bestått. Visningene er:

- Søk, Turforslag, Alternativ, Kontaktfeil og ukjent demo
- Værsammendrag (uj-1), Værvarsling med Bedre tidsvindu (uj-2), Frarådet (uj-3) og ingen Bedre tidsvindu (ingen-bedre)

Hver visning sjekkes ved 360, 768 og 1440 px for horisontal rulling, trykkflater på minst 44 px og hover.

## Kalibreringen

`python3 scripts/kalibrering_vaerlogg.py --oppsummer` gir 14 vurderte Tidsvinduer og 1 avvik, så startverdiene beholdes. Det stemmer med PRD §10, spørsmål 1.
