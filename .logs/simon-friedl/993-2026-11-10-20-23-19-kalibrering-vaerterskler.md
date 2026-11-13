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
- Raden for 12. nov. i `vaerlogg.csv` er committet i `72269cf` og pushet til `origin/main` etter brukerens beskjed.

### Åpne punkter
- Kalibreringen fortsetter (punktet finnes i `issues.md`): vurder 13.–16. nov. og kjør `--oppsummer` etter 16. nov.

## 2026-11-13 kl. 13:20 — Simon Friedl

### Oppgave
Brukeren spurte om kalibreringen gikk i går. Kjøringen hadde feilet, og brukeren ba om å forlenge jobben med én dag og gjøre gjentakene mer robuste.

### Plan
- Lese `vaerlogg.csv` og `~/Library/Logs/turplanlegger-kalibrering.log`.
- Endre `~/Library/LaunchAgents/no.ibe160.turplanlegger.kalibrering.plist`, laste jobben inn på nytt og teste gjentakslogikken uten å hente ekte data.

### Resultat
- Kjøringen 12. nov. startet 20:12:11 (etter dvale), og alle 3 forsøkene feilet med `URLError: nodename nor servname provided` (ikke nett ennå). 13. nov. er ikke logget. Den ble ikke hentet i ettertid, fordi vinduene var passert eller hadde startet (13:09), og raden ikke ville vært en Værmelding gitt på forhånd.
- launchd-jobben er endret (fila ligger utenfor repoet; kopi av den gamle i scratchpad):
  - Stoppdatoen er flyttet fra 20261116 til 20261117. Siste kjøring er 16. nov., og den logger 17. nov. Da blir det 7 dager (10.–12. og 14.–17. nov.) = 14 Tidsvinduer.
  - Gjentak: 6 forsøk med 5 min mellomrom (før: 3 × 60 s), uten unødvendig ventetid etter siste forsøk.
- Verifisert: `plutil -lint` OK, `sh -n` OK, og `launchctl bootout` + `bootstrap` er gjort. `launchctl print` viser ny stoppdato, ny løkke og kl. 20:00. Løkka er testet med liksom-kommando: alltid feil gir 6 forsøk og exit 1, og suksess på 3. forsøk gir exit 0.
- Ikke testet med `kickstart`, fordi det ville hentet 14. nov. kl. 13 og fått kveldens kjøring til å hoppe over dagen. Kveldens kjøring er den første ekte testen.

### Åpne punkter
- Sjekk etter kveldens kjøring at 14. nov. er logget (launchd-loggen). Kalibreringen gjelder nå 10.–12. og 14.–17. nov.; kjør `--oppsummer` etter 17. nov. (punktet finnes i `issues.md`).
