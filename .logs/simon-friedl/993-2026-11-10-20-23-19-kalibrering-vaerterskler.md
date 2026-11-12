# Kalibrering av værtersklene

## 2026-11-10 kl. 20:23 — Simon Friedl

### Oppgave
Brukeren spurte om vi skulle fortsette kalibreringen kl. 21. Deretter ga brukeren sin vurdering av Værmeldingen for 11. november, som skulle føres inn i loggarket.

### Plan
- Sjekke `.logs/`, `issues.md` og launchd-loggen for avtalt tidspunkt. Oppsettet står i [apne-punkter-for-ux](995-2026-11-09-17-11-34-apne-punkter-for-ux.md) og `_bmad-output/planning-artifacts/kalibrering/README.md`.
- Føre vurderingen inn i `vaerlogg.csv` og kjøre `--oppsummer` for å se stillingen.

### Resultat
- Ingen logg nevner kl. 21. launchd-jobben kjører kl. 20:00, og kveldens kjøring gikk 20:00:03 uten feil. Den førte 11. nov.: formiddag middels (−0,1 °C), ettermiddag god.
- Vurderingen for 11. nov. er ført inn: formiddag `ville_gatt=ja`, `valgt_lavtliggende=nei`, og det samme for ettermiddag. Begge stemmer med Værklassen (god/middels).
- `--oppsummer`: 4 vurderte Tidsvinduer og 1 avvik. Avviket er 10. nov. formiddag, der Værklassen var middels mens vurderingen tilsvarer dårlig (nedbør 1,0 mm/t). 10 vinduer gjenstår.
- Merk: lavtemperatur-regelen (<0 °C gir middels) traff 11. nov. formiddag, og brukeren ville gått uten å velge lav tur. Det er ikke et avvik, siden middels og god regnes likt.
- `vaerlogg.csv` er committet etter brukerens beskjed i `c79307b` (rader for 10.–11. nov.). Senere rader må committes separat.
- Pushet til `origin/main` (`e534565..24a5def`) etter brukerens beskjed.

### Åpne punkter
- Kalibreringen fortsetter (punktet finnes allerede i `issues.md`): vurder 12.–16. nov. etter hver kjøring kl. 20:00, og kjør `--oppsummer` etter 16. nov. Følg med på om nedbørsgrensen for dårlig er for høy. 10. nov. formiddag (1,0 mm/t, heavyrain-symbol) ga middels, men vurderingen tilsvarte dårlig.

## 2026-11-12 kl. 12:23 — Simon Friedl

### Oppgave
Brukeren ville fortsette med værspørsmålene og ga sin vurdering av Værmeldingen for 12. november.

### Plan
- Sjekke nye rader i `vaerlogg.csv` og launchd-loggen, vise verdiene for vurdering og føre inn svarene.

### Resultat
- launchd-kjøringen 11. nov. startet 20:08:57 (Mac-en sov sannsynligvis kl. 20:00) og førte 12. nov.: formiddag middels (−0,7 °C), ettermiddag god.
- Vurderingen for 12. nov. er ført inn: `ja`/`nei` for begge vinduene. Begge stemmer med Værklassen.
- `--oppsummer`: 6 vurderte Tidsvinduer, fortsatt 1 avvik (10. nov. formiddag). 8 vinduer gjenstår.
- For andre gang ga <0 °C middels uten at brukeren ville valgt annerledes. Det er ikke et avvik.
- Raden for 12. nov. i `vaerlogg.csv` er ikke committet.

### Åpne punkter
- Kalibreringen fortsetter (punktet finnes i `issues.md`): vurder 13.–16. nov. og kjør `--oppsummer` etter 16. nov.
