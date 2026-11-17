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

## 2026-11-15 kl. 20:48 — Simon Friedl

### Oppgave
Brukeren spurte om status for kalibreringen 14. og 15. nov. og ga deretter sin vurdering av de seks ventende Tidsvinduene (14.–16. nov.).

### Plan
- Sjekke launchd-loggen og `vaerlogg.csv`, vise ventende vinduer, føre inn svarene og kjøre `--oppsummer`.

### Resultat
- Den nye jobben virker: kjøringene 13. nov. (20:02), 14. nov. (20:00) og 15. nov. (20:13) lyktes alle på første forsøk og førte 14., 15. og 16. nov.
- Vurdering `ja`/`nei` er ført inn for alle seks vinduene 14.–16. nov. 14.–15. nov. var god (lett regn/snø, 0,2–0,3 mm/t, vind opptil 6,4 m/s). 16. nov. var middels på grunn av nedbør (0,9 og 0,7 mm/t, sludd/snø). Alle stemmer med Værklassen.
- `--oppsummer`: 12 vurderte Tidsvinduer, fortsatt 1 avvik (10. nov. formiddag, 1,0 mm/t). 2 vinduer gjenstår (17. nov.).
- Observasjon for nedbørsgrensen: 0,9 mm/t (16. nov.) ga middels og stemte med vurderingen, mens 1,0 mm/t med heavyrain-symbol (10. nov.) ble vurdert som dårlig. Grensen ligger altså rundt 1 mm/t, eller så avgjorde symbolet.
- `vaerlogg.csv` er committet i `fa90b26`, og ingenting er pushet.

### Åpne punkter
- 17. nov. hentes 16. nov. kl. 20:00. Vurder vinduene og kjør `--oppsummer`, og før så resultatet inn i PRD §10 spm. 1 (punktet finnes i `issues.md`).

## 2026-11-17 kl. 15:43 — Simon Friedl

### Oppgave
Brukeren spurte om koden må vente til værloggingen er ferdig. Svaret var nei, siden bare story 2.2 avhenger av loggen. Brukeren ba så om å gjøre loggen ferdig før story 1.1.

### Plan
- Spørre om vurderingen av de to vinduene 17. nov., føre den inn, kjøre `--oppsummer` og committe `vaerlogg.csv`.

### Resultat
- 17. nov. formiddag (klarvær, −3,2 til −2,0 °C) og ettermiddag (klarvær, −0,6 til −0,2 °C) er vurdert som `ville_gatt=ja`, `valgt_lavtliggende=nei`. Det stemmer med Værklassen middels, som her bare skyldes temperaturen.
- `--oppsummer`: 14 vurderte Tidsvinduer, 1 avvik (10. nov. formiddag, 1,0 mm/t). Maks 2 avvik, så startverdiene i PRD §4.2 kan beholdes.
- `vaerlogg.csv` bruker CRLF, og det er beholdt (diffen er bare de to radene). Committet i `8475804` og pushet til `origin/main` sammen med loggcommiten (`7079f9e..d60cb81`).
- Loggingen er ferdig. launchd-jobben fjerner seg selv fra 17. nov.

### Åpne punkter
- Story 2.2: før resultatet (1 avvik, terskler uendret) inn i PRD §10 spm. 1, og nevn at loggen gikk 10.–12. og 14.–17. nov. (ikke 10.–16. som i AC-en). Punktet finnes i `issues.md`.
