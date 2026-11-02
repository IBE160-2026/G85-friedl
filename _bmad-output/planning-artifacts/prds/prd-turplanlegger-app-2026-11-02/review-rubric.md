# PRD Quality Review — Turplanlegger

Kjørt 2026-11-02 inline mot `.claude/skills/bmad-prd/assets/prd-validation-checklist.md`, kalibrert for et skoleprosjekt med én person, der testbarhet og sporbarhet vektes.

## Overall verdict
PRD-en er klar for UX og arkitektur. Kravene har testbare konsekvenser med konkrete tall fra datasettet, og avgjørelsene (to værnivåer, rangering som sortering, språkmodell sist) står som avgjørelser. Svakhetene var mindre: adjektiver i to NFR-er, overlapp mellom Ikke-mål og Utenfor MVP, og åpne spørsmål uten eier. Alle er rettet.

## Decision-readiness — strong
To værnivåer, Lavtliggende tur på 400 moh, ett Værpunkt og korteste Tur som Alternativ er tatt som avgjørelser, med det som ble valgt bort (§4.2, FR-18 Merknad, §6).

## Substance over theater — strong
Én persona (Ingrid) som driver alle tre reisene. NFR-ene har tall (360–1440 px, 44 px, 3 s). Visjonen er spesifikk for produktet.

## Strategic coherence — strong
Tesen («koblingsjobben») styrer funksjonene, og SM-1/SM-2 måler den. Motmålene SM-C1 og SM-C2 hindrer at «frarådet» blir sett som feil.

## Done-ness clarity — adequate → strong etter rettinger
### Findings
- **medium** «God kontrast» (NFR-9) var et adjektiv. *Fix:* minst 4,5:1. **Rettet.**
- **medium** «Vanlig mobilnett» (NFR-5) var ikke målbart. *Fix:* nettverksstruping «Fast 4G». **Rettet.**
- **low** FR-4 og FR-5 har ingen egne konsekvenser, men kravet er selve testen (gyldige valg og standardverdi). Godtatt.

## Scope honesty — adequate → strong etter rettinger
### Findings
- **medium** §7 Ikke-mål og §8.2 Utenfor MVP gjentok tre punkter. *Fix:* §7 har bare det som aldri skal med, og §8.2 har det som kan komme. **Rettet.**
- **medium** De åpne spørsmålene manglet eier og frist. *Fix:* innledning i §10. **Rettet.**

## Downstream usability — strong
Begrepslisten brukes konsekvent. ID-ene er sammenhengende (UJ-1–3, FR-1–29, NFR-1–9, SM-1–4, SM-C1–C2), og kryssreferansene stemmer.

## Shape fit — strong
Forbrukerprodukt med reell UX, så reisene med navngitt person er bærende. Lengden er over målet på 4–6 sider (ca. 3700 ord), fordi testbare konsekvenser og begrepsliste er prioritert foran korthet.

## Mechanical notes
- §4.2 sa at tersklene er «forankret i Beaufort-skalaen», men det gjelder bare vind. Rettet.
- Alle [ASSUMPTION]-er er godkjent og fjernet; §11 er slettet.
