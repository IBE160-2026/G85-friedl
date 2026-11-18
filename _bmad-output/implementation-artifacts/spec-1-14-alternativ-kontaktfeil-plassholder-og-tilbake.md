---
title: 'Story 1.14: Alternativ, Kontaktfeil, Plassholder og Tilbake'
type: 'feature'
created: '2026-11-18'
status: 'done'
baseline_commit: '02107db9d88850a29545b204b83adde3db3ae911'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/DESIGN.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux/EXPERIENCE.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-12-resultat-med-turkort-pa-pc.md'
  - '{project-root}/_bmad-output/implementation-artifacts/spec-1-13-stokken-pa-mobil-og-nettbrett.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Når ingen Tur passer, viser Resultatet bare en plassholder fra 1.12. Mens Søket venter, ser brukeren ingenting. Feiler nettet, skjer ingenting synlig, og Tilbake forlater appen. Brukeren kan bli stående med en side som ikke gir noe å gjøre (Story 1.14, UX-DR25, UX-DR28–UX-DR30, UX-DR46, AR-2, AR-13).

**Approach:** Bygg i `src/ui/`:
- Alternativkortet for `utfall.type === 'kortesteTur'`, med Turkort-komponenten.
- Plassholderstokken mens svaret venter.
- Kontaktfeil-kortet ved tidsgrense eller nettverksfeil, og ved 5xx.
- Historikk med `history.pushState`/`replaceState`, slik at Tilbake fra Resultat går til Søk med verdiene.

## Decisions

- **Tilstand per visning:** `sok`, `venter`, `resultat` og `kontaktfeil`. «Finn tur» går til `venter`. Svaret gir `resultat` eller `kontaktfeil`. Et `feil`-svar (400) gir også Kontaktfeil-kortet, fordi skjemaet ikke kan lage ugyldige Søk.
- **Historikk:** første overgang fra Søk til `venter`/`resultat` lager én oppføring med `pushState`. Et nytt Søk fra Resultat (via «Endre søk» og så «Finn tur», eller «Prøv igjen») bruker `replaceState`. URL-en er alltid `location.pathname + location.search`, så `?demo` blir med og Søket aldri står i URL-en. `popstate` tilbake til Søk viser Søk med Søket fra det siste Resultatet, eller fra Kontaktfeil.
- **«Endre søk» fra Resultat** går til Søk med `history.back()` når Resultatet har en oppføring, slik at historikken ikke vokser. Ellers byttes visningen direkte.
- **«Endre Tilgjengelig tid»** gjør det samme som «Endre søk», og flytter fokus til minusknappen for Tilgjengelig tid. Er den inaktiv, går fokus til plussknappen.
- **«Prøv igjen»** sender Søket som Kontaktfeil gjelder for, på nytt. Et passert Starttidspunkt rundes opp av serveren som før.
- **Plassholderstokken** står der kortene ellers står, med Ditt søk øverst. Den er ikke interaktiv og har `aria-busy="true"`. Teksten «Finner turer …» står i live-området.
- **Kontaktfeil-kortet** meldes i live-området. Det har ikke kart, Ansvarsmerknad eller Stokkoversikt. Ditt søk står over kortet.
- **Alternativkortet** har ingen Stokk og ingen Stokkoversikt. Det vises på samme måte ved alle bredder, utenom forskjellene mellom PC og mobil i Begrunnelsen fra 1.12 og 1.13. Ansvarsmerknaden står under (UX-DR42).

## Boundaries & Constraints

**Always:**
- Alternativkortet har stempelet «→», «Alternativ · den korteste Turen», overlinjen «Slik står den mot Søket ditt» i dempet tone (store bokstaver med CSS), Tid-raden med merket warn og Tidsstolpen med den rustfargede biten og grensestreken. Under står primærknappen og `passerMedTekst`.
- Plassholderstokken har to tomme stokk-kanter, en tom kortflate og «Finner turer …», uten spinner.
- Kontaktfeil-kortet er et papirkort med merket none, «Vi fikk ikke kontakt.» (`page-title`), «Søket ditt er tatt vare på.», «Prøv igjen» (primær) og «Endre søk».
- Faste tekster står i `src/ui/tekster.ts`.
- Overgangene flytter fokus. Til Resultat eller Kontaktfeil går fokus til overskriften eller kortets tittel. Til Søk går fokus til Søk-overskriften, eller til feltet for «Endre Tilgjengelig tid».

**Never:**
- Søket står aldri i URL-en, og det brukes ingen query-parametre utenom `demo`.
- Ingen spinner, ingen automatisk nytt forsøk og ingen tellere.
- Ingen kart (Epic 3).

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet |
|---|---|---|
| Alternativ | `?demo=uten-vaer`, 15 min | «Ingen Tur passer 15 min.», Alternativkortet med «→», overlinjen, Tid-raden warn og bit over grensen, «Endre Tilgjengelig tid» og «Med 30 min eller mer passer minst én Tur.», og Ansvarsmerknaden |
| Endre Tilgjengelig tid | trykk knappen | Søk med 15 min, og fokus på minusknappen for Tilgjengelig tid |
| Plassholder | svaret holdes igjen med `page.route` | Plassholderstokken med «Finner turer …» og `aria-busy`, uten spinner |
| Tidsgrense | svaret kommer aldri (route uten svar, klokke eller lang venting) | Kontaktfeil-kortet etter 10 s, meldt i live-området |
| Nettverksfeil | `route.abort()` | Kontaktfeil-kortet med en gang |
| Prøv igjen | Kontaktfeil og så nettet tilbake | samme Søk sendes, og Resultatet vises |
| Tilbake | Resultat og så `page.goBack()` | Søk med verdiene fra Søket, og URL-en med `?demo=uten-vaer` |
| Nytt Søk fra Resultat | Endre søk, så Finn tur, så Tilbake | Søk (ikke det første Resultatet) |
| Én oppføring | Søk, Resultat, Endre søk, Resultat | `history.length` har økt med 1 fra start |

</frozen-after-approval>

## Implementation Notes

- **Nye filer i `src/ui/`:** Plassholderstokk og Kontaktfeil, med CSS Modules. Alternativkortet er `Turkort` med `alternativ`, og Nummerstempelet har fått pila «→» som SVG (`pil`).
- **Resultat** tar nå `tilstand` (`venter`, `resultat` eller `kontaktfeil`) i stedet for `visning`. I live-området står overskriften, Plassholderstokken eller Kontaktfeil-kortet. `aria-busy` står på kortflaten, og «Finner turer …» står ved siden av den, så teksten ikke er inne i et opptatt element.
- **Ditt søk mens svaret venter og ved Kontaktfeil** settes sammen av etikettene i sidedataene («I dag», «2 t»), fordi serverens `dittSok` ikke finnes ennå. Turdag står da som «I dag», ikke «I dag, man. 9. nov.». Ditt søk har ingen «Endre søk» i disse tilstandene.
- **Historikken:** oppføringen merkes med `turplanleggerResultat` i `history.state`. Next.js legger sine egne felt inn i det samme objektet. `popstate` fram til oppføringen viser det siste Resultatet eller Kontaktfeil-kortet igjen.
- **Fokus etter «Endre Tilgjengelig tid»:** Alternativ kommer bare ved 15 min, der minusknappen er inaktiv. Fokus går da til plussknappen, etter beslutningen i specen. Matrisen sier minusknappen. Minus-veien testes med et mocket svar på 30 min.
- **`e2e/sok.spec.ts`:** testen «et nytt Søk forkaster svaret på det forrige» trykket «Finn tur» to ganger mens svaret ventet. Søk er nå skjult mens svaret venter, så testen går Tilbake og sender det nye Søket derfra.

## Code Map

- `src/ui/SokFlate.tsx`, `Resultat.tsx`, `Turkort.tsx`, `Tidsstolpe.tsx`, `tekster.ts` og `api.ts` (1.11–1.13) -- utvides. `sendSok` gir allerede `resultat`, `feil` eller `kontaktfeil`.
- `src/kjerne/visning/skjema.ts` -- `utfall.kortesteTur` har `kort` og `passerMedTekst`.
- `_bmad-output/planning-artifacts/ux/konsept-07-kortstokken/pc-5-ingen-tur-uten-vaer.svg` og `mob-5-ingen-tur-uten-vaer.svg` -- skissene for Alternativ.
- `e2e/` -- nye tester i `e2e/tilstander.spec.ts`.

## Tasks & Acceptance

**Execution:**
- [x] `src/ui/` -- Alternativkort (som variant av Turkort), Plassholderstokk og Kontaktfeil, med CSS Modules og tekster.
- [x] `src/ui/SokFlate.tsx` -- tilstandene, historikken (`pushState`, `replaceState` og `popstate`), «Prøv igjen», «Endre Tilgjengelig tid» og fokus.
- [x] `e2e/tilstander.spec.ts` -- matrisen. Tidsgrensen kan testes med `page.clock` eller med en route som aldri svarer og en timeout på over 10 s.

**Acceptance Criteria:**
- Gitt alle tilstandene, når de leses med skjermleser, så meldes overskriften eller meldingen i live-området, og fokus står på et fornuftig sted.
- Gitt `npm run build` og `CI=1 npx playwright test`, når de kjøres, så er begge grønne.

## Verification

**Commands:**
- `npm test` -- forventet: alle grønne
- `npm run lint && npx tsc --noEmit` -- forventet: ren
- `CI=1 npx playwright test` -- forventet: grønn

## Review Triage Log

Pass 1: blind-hunter (BH), edge-case-hunter (EC) og verification-gap (VG).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|------|---------|-------------|------|
| BH1, EC2, VG-a | Fram kan vise et gammelt Resultat, eller ende på en oppføring som ikke svarer til det som vises | medium | Bekreftet ved å lese koden. `sisteSvar` tømmes nå når et Søk sendes. Fram uten svar går tilbake. | patch |
| BH2, EC4 | 400 gir Kontaktfeil, og «Prøv igjen» sender det samme ugyldige Søket i det uendelige | medium | Bekreftet. Ved `feil` vises Kontaktfeil uten «Prøv igjen», og feilen logges. | patch |
| EC1 | To trykk før `popstate` kaller `history.back()` to ganger og forlater appen | medium | Bekreftet. Vakt med en ref. | patch |
| EC3, EC8 | Etter Tilbake, endring og Fram til Kontaktfeil viser «Endre søk» de endrede verdiene | low | Bekreftet. Tilstandens Søk legges i skjemaet. | patch |
| BH4, EC5 | Valgfrie håndterere gir knapper som ikke gjør noe | low | Bekreftet. Gjort påkrevde. | patch |
| EC6 | `fokuser()` kan gi fokus til en inaktiv knapp | low | Bekreftet. | patch |
| BH8 | Fokus lander på en anonym div, og `aria-busy` virker ikke | low | Bekreftet. | patch |
| BH5, EC7 | Navnet på testen for gamle svar sier mer enn testen sjekker | low | Bekreftet. Nytt navn. Skjemaet er skjult mens Søket venter, så et nytt Søk kan ikke starte da. | patch |
| VG1 | Toppfeltknappen er ikke sjekket på mobil mens Søket venter og ved Kontaktfeil | medium | Bekreftet. | patch |
| VG2, BH3 | Ditt søk mens Søket venter og ved Kontaktfeil er nesten ikke testet | low | Bekreftet. Test av hele teksten. At Turdag står uten dato før svaret kommer, er godtatt. | patch |
| VG3, BH6 | Det er ikke sjekket at Alternativkortet viser én Begrunnelse per bredde | low | Bekreftet. | patch |
| VG4 | Fram til Kontaktfeil er ikke testet | low | Bekreftet. | patch |
| VG5, BH11 | Plassholderen for frarådet mistet testen sin, og noen kommentarer er utdaterte | low | Bekreftet. | patch |
| BH7 | Størrelser i px og tokens fra Turkort brukt i Kontaktfeil | low | Ingen egne tokens. Kontaktfeil er et papirkort, som Turkort. | avvist |
| BH9 (resten) | Tester av gjeninnlasting, `Nummerstempel pil` og `fokuser` utenfor e2e | low | Dekkes av e2e, eller har liten verdi. | avvist |
| BH10 | Testene sjekker eksakt markup og farger | low | Kodestil. | avvist |
| BH12 | Props i Turkort kan kombineres på motstridende måter | low | Bare én kaller. | avvist |
