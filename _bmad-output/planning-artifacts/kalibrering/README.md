# Kalibrering av Værtersklene

Oppgaven i [PRD §10, spørsmål 1](../prds/prd-turplanlegger-app-2026-11-02/prd.md). Tersklene i PRD §4.2 er startverdier. Denne uka sjekker vi om de gir samme svar som en vanlig turgåer ville gitt.

## Oppsett

- **Værpunkt:** 62,7617 N, 7,1679 Ø, 400 moh (PRD §3 og §10 spm. 4).
- **Tidsvinduer:** formiddag 10:00–12:00 og ettermiddag 13:00–15:00, norsk tid. Begge ligger i dagslys i november.
- **Værklasse:** den dårligste timen i vinduet, med tersklene i PRD §4.2 (FR-8, FR-9).
- **Logg:** [vaerlogg.csv](vaerlogg.csv), som lages ved første kjøring.

## Slik gjør du det

1. Kjør skriptet én gang per dag i 7 dager, enten kvelden før eller om morgenen før kl. 10:

   ```sh
   python3 scripts/kalibrering_vaerlogg.py --i-morgen   # kvelden før
   python3 scripts/kalibrering_vaerlogg.py              # samme morgen, før kl. 10
   ```

   Skriptet henter Værmeldingen fra MET og fører én rad per Tidsvindu med temperatur, nedbør, vind, værsymboler og Værklassen etter dagens terskler.

2. Les verdiene i raden, ikke Værklassen, og fyll inn din egen vurdering i `vaerlogg.csv`:
   - `ville_gatt`: ja eller nei. Ville du gått tur i Moldemarka i dette vinduet med denne Værmeldingen?
   - `valgt_lavtliggende`: ja eller nei. Ville du valgt en lav Tur (under 400 moh) på grunn av været?
   - `kommentar`: valgfritt, for eksempel «vinden ville vært ok i skogen».

3. Når 14 Tidsvinduer er vurdert, tell avvikene:

   ```sh
   python3 scripts/kalibrering_vaerlogg.py --oppsummer
   ```

## Slik leses vurderingen

| Din vurdering | Tilsvarer Værklassen |
|---|---|
| Ville ikke gått | frarådet |
| Ville gått, men valgt lav Tur | dårlig |
| Ville gått, uten å velge lav Tur | god eller middels |

Et avvik er et Tidsvindu der Værklassen ikke stemmer med vurderingen. Er det mer enn 2 avvik av 14, justeres tersklene i PRD §4.2. Prioriter grensene for dårlig og frarådet, siden middels bare vises (§4.2). Kolonnen `utlost_av` viser hvilken verdi som satte klassen, og den hjelper deg å se hvilken grense som bør flyttes.

## Når uka er ferdig

- Før resultatet inn i PRD §10 spm. 1: antall avvik og eventuelle nye terskler. Endre tabellen i §4.2 og eksemplene i FR-8 hvis tersklene endres.
- Oppdater `TERSKLER` i skriptet hvis tersklene endres, så loggen og PRD-en bruker de samme verdiene.
- Merk punktet som løst i `.logs/simon-friedl/issues.md`.
