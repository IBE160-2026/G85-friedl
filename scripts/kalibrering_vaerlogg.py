#!/usr/bin/env python3
"""Kalibreringslogg for Værtersklene (PRD §10, spørsmål 1).

Henter Værmeldingen for Værpunktet fra MET Locationforecast og fører én rad per
Tidsvindu i loggarket. Kolonnene for egen vurdering fyller du inn selv.

Bruk:
    python3 scripts/kalibrering_vaerlogg.py              # logg dagens to Tidsvinduer (kjør før kl. 10)
    python3 scripts/kalibrering_vaerlogg.py --i-morgen   # logg morgendagens to Tidsvinduer (kvelden før)
    python3 scripts/kalibrering_vaerlogg.py --oppsummer  # tell avvik mellom Værklasse og vurdering
    python3 scripts/kalibrering_vaerlogg.py --selvtest   # kjør testdata/vaerklasse-fasit.json (uten MET)

Tersklene leses fra data/vaerterskler.json, samme fil som appen bruker (AD-8).
Bare standardbiblioteket (Python 3.9+). Se _bmad-output/planning-artifacts/kalibrering/README.md.
"""
import argparse
import csv
import datetime as dt
import json
import math
import sys
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

ROT = Path(__file__).resolve().parent.parent
LOGG = ROT / "_bmad-output/planning-artifacts/kalibrering/vaerlogg.csv"
TERSKELFIL = ROT / "data/vaerterskler.json"
FASIT = ROT / "testdata/vaerklasse-fasit.json"

# Værpunktet (PRD §3; addendum, Avklarte spørsmål 4)
LAT, LON, HOYDE = 62.7617, 7.1679, 400
URL = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={LAT}&lon={LON}&altitude={HOYDE}"
# MET krever en User-Agent som identifiserer appen og gir kontaktinfo (addendum, Værintegrasjon).
# Navngitt unntak fra AD-6 (AD-8, AR-12): i appen skal bare src/server/vaer/met.ts kalle MET
# (planlagt, kommer i Story 2.4).
# Dette skriptet kaller MET selv, med egen User-Agent og uten cache, én gang per kjøring av logg.
USER_AGENT = "turplanlegger-ibe160-kalibrering/0.2 https://github.com/IBE160-2026/G85-friedl"
OSLO = ZoneInfo("Europe/Oslo")

# Tidsvinduene i kalibreringen: (navn, start, slutt) i norsk tid
TIDSVINDUER = [("formiddag", 10, 12), ("ettermiddag", 13, 15)]

# Klassenavnene i JSON-filene oversettes her og bare her. Loggen og utskriftene bruker de norske navnene.
KLASSENAVN = {"god": "god", "middels": "middels", "darlig": "dårlig", "fraradet": "frarådet", "mangler": "mangler"}
RANG = {"god": 0, "middels": 1, "dårlig": 2, "frarådet": 3}

# Formen på data/vaerterskler.json, som speiler Zod-skjemaet i src/kjerne/vaer/terskler.ts.
TERSKELKLASSER = ["fraradet", "darlig", "middels"]
TERSKELNOKLER = {"klasse", "nedbor_mm_t_minst", "vind_ms_minst", "temp_c_under"}

KOLONNER = [
    "logget", "dato", "tidsvindu", "timer", "temp_min", "temp_maks", "nedbor_maks_mm",
    "vind_maks_ms", "symboler", "vaerklasse", "utlost_av",
    "ville_gatt", "valgt_lavtliggende", "kommentar",
]


def visningssti(sti):
    try:
        return str(Path(sti).resolve().relative_to(ROT))
    except ValueError:
        return str(sti)


def les_terskler(sti=TERSKELFIL):
    """Leser og validerer terskelfila. Gir [(klasse, nedbør >=, vind >=, temperatur <)], strengeste
    klasse først, med norske klassenavn. None betyr ingen grense. En ugyldig fil avslutter skriptet."""
    navn = visningssti(sti)

    def ugyldig(grunn):
        raise SystemExit(f"{navn} er ugyldig: {grunn}")

    try:
        with open(sti, encoding="utf-8") as f:
            data = json.load(f)
    except OSError as e:
        raise SystemExit(f"{navn} kan ikke leses: {e}")
    except json.JSONDecodeError as e:
        ugyldig(f"ikke gyldig JSON ({e})")

    def er_tall(x):
        return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x)

    if not isinstance(data, dict):
        ugyldig("toppnivået må være et objekt")
    if set(data) != {"versjon", "klasser"}:
        ugyldig(f"nøklene må være versjon og klasser, men er {', '.join(sorted(data)) or 'ingen'}")
    if not er_tall(data["versjon"]) or data["versjon"] != 1:
        ugyldig(f"versjon må være 1, men er {json.dumps(data['versjon'])}")
    if not isinstance(data["klasser"], list) or not all(isinstance(k, dict) for k in data["klasser"]):
        ugyldig("klasser må være en liste med objekter")

    terskler = []
    for i, k in enumerate(data["klasser"]):
        if set(k) != TERSKELNOKLER:
            ukjente = sorted(set(k) - TERSKELNOKLER)
            mangler = sorted(TERSKELNOKLER - set(k))
            deler = ([f"ukjent nøkkel {', '.join(ukjente)}"] if ukjente else []) + (
                [f"mangler {', '.join(mangler)}"] if mangler else [])
            ugyldig(f"klasser[{i}]: {'; '.join(deler)}")
        for nokkel in ("nedbor_mm_t_minst", "vind_ms_minst", "temp_c_under"):
            if k[nokkel] is not None and not er_tall(k[nokkel]):
                ugyldig(f"klasser[{i}].{nokkel} må være et tall eller null, men er {json.dumps(k[nokkel])}")
        terskler.append(k)

    faktisk = [k["klasse"] for k in terskler]
    if faktisk != TERSKELKLASSER:
        ugyldig(f"klassene må stå med strengeste klasse først ({', '.join(TERSKELKLASSER)}),"
                f" men står som ({', '.join(str(x) for x in faktisk)})")

    return [(KLASSENAVN[k["klasse"]], k["nedbor_mm_t_minst"], k["vind_ms_minst"], k["temp_c_under"])
            for k in terskler]


def klasse_for_time(nedbor, vind, temp, terskler):
    """Værklassen for én time: strengeste klasse vinner, og det holder at én verdi når grensen
    (>= for nedbør og vind, < for temperatur). Gir (klasse, grunner)."""
    for navn, n_grense, v_grense, t_grense in terskler:
        grunner = []
        if n_grense is not None and nedbor is not None and nedbor >= n_grense:
            grunner.append(f"nedbør {nedbor} mm/t")
        if v_grense is not None and vind is not None and vind >= v_grense:
            grunner.append(f"vind {vind} m/s")
        if t_grense is not None and temp is not None and temp < t_grense:
            grunner.append(f"temperatur {temp} °C")
        if grunner:
            return navn, grunner
    return "god", []


def klasse_for_vindu(timeverdier, terskler):
    """Værklassen for et Tidsvindu: klassen til den dårligste timen. `timeverdier` har én liste per
    time som overlapper vinduet, med alle verdiene for den timen ({nedbor, vind, temp}).
    Mangler en time, eller er vinduet tomt, blir klassen "mangler". Gir (klasse, grunner)."""
    if not timeverdier or any(not verdier for verdier in timeverdier):
        return "mangler", []
    klasse, grunner = "god", []
    for verdier in timeverdier:
        for v in verdier:
            k, g = klasse_for_time(v["nedbor"], v["vind"], v["temp"], terskler)
            if RANG[k] > RANG[klasse]:
                klasse, grunner = k, g
            elif RANG[k] == RANG[klasse] and k != "god":
                grunner += [x for x in g if x not in grunner]
    return klasse, grunner


def timer_i_vindu(start_s, slutt_s):
    """Starten (epoke-sekunder) på hver hele time som overlapper [start_s, slutt_s), som
    timerITidsvindu i src/kjerne/tid.ts. 13:30–15:30 gir 13, 14 og 15."""
    timer = []
    if slutt_s <= start_s:
        return timer
    t = math.floor(start_s / 3600) * 3600
    while t < slutt_s:
        timer.append(t)
        t += 3600
    return timer


def selvtest(terskler):
    """Kjører testdata/vaerklasse-fasit.json mot tersklene, uten MET. Gir exit-koden."""
    with FASIT.open(encoding="utf-8") as f:
        fasit = json.load(f)

    def forventet(rad):
        try:
            return KLASSENAVN[rad["klasse"]]
        except KeyError:
            raise SystemExit(f"{visningssti(FASIT)}: ukjent klasse {rad['klasse']!r} i «{rad['beskrivelse']}»")

    def verdier(rad):
        return {"nedbor": rad["nedborMmT"], "vind": rad["vindMs"], "temp": rad["tempC"]}

    def epoke(tid):
        return int(dt.datetime.fromisoformat(tid.replace("Z", "+00:00")).timestamp())

    resultater = []
    for rad in fasit["timer"]:
        faktisk, _ = klasse_for_time(rad["nedborMmT"], rad["vindMs"], rad["tempC"], terskler)
        resultater.append((rad["beskrivelse"], forventet(rad), faktisk))
    for vindu in fasit["tidsvinduer"]:
        per_time = {}
        for time in vindu["timer"]:
            per_time.setdefault(epoke(time["start"]), []).append(verdier(time))
        timeverdier = [per_time.get(t, []) for t in timer_i_vindu(epoke(vindu["start"]), epoke(vindu["slutt"]))]
        faktisk, _ = klasse_for_vindu(timeverdier, terskler)
        resultater.append((vindu["beskrivelse"], forventet(vindu), faktisk))

    feil = [r for r in resultater if r[1] != r[2]]
    for beskrivelse, forv, fakt in feil:
        print(f"FEIL: {beskrivelse}: forventet {forv}, faktisk {fakt}")
    bestod = len(resultater) - len(feil)
    print(f"Selvtest: {bestod} av {len(resultater)} fasitrader består.")
    return 1 if feil else 0


def hent_vaermelding():
    req = urllib.request.Request(URL, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=15) as svar:
        return json.load(svar)


def timer_for_dato(data, dato):
    """Timesverdier for datoen, nøklet på hel time i norsk tid."""
    timer = {}
    for rad in data["properties"]["timeseries"]:
        tid = dt.datetime.fromisoformat(rad["time"].replace("Z", "+00:00")).astimezone(OSLO)
        if tid.date() != dato or "next_1_hours" not in rad["data"]:
            continue
        inst = rad["data"]["instant"]["details"]
        neste = rad["data"]["next_1_hours"]
        timer[tid.hour] = {
            "temp": inst.get("air_temperature"),
            "vind": inst.get("wind_speed"),
            "nedbor": neste["details"].get("precipitation_amount"),
            "symbol": neste["summary"].get("symbol_code", ""),
        }
    return timer


def les_logg():
    if not LOGG.exists():
        return []
    with LOGG.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def skriv_logg(rader):
    LOGG.parent.mkdir(parents=True, exist_ok=True)
    with LOGG.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=KOLONNER)
        w.writeheader()
        w.writerows(rader)


def logg(terskler, overstyr, i_morgen=False):
    na = dt.datetime.now(OSLO)
    dato = na.date() + dt.timedelta(days=1 if i_morgen else 0)
    timer = timer_for_dato(hent_vaermelding(), dato)
    rader = les_logg()
    for navn, start, slutt in TIDSVINDUER:
        if any(r["dato"] == dato.isoformat() and r["tidsvindu"] == navn for r in rader) and not overstyr:
            print(f"{dato} {navn}: finnes allerede i loggen (bruk --overstyr for å hente på nytt)")
            continue
        if not i_morgen and na.hour >= start:
            print(f"{dato} {navn}: Tidsvinduet har startet, så det logges ikke. Kjør skriptet før kl. {start:02d}, eller kvelden før med --i-morgen.")
            continue
        timeverdier = [[timer[h]] if h in timer else [] for h in range(start, slutt)]
        klasse, grunner = klasse_for_vindu(timeverdier, terskler)
        if klasse == "mangler":
            print(f"{dato} {navn}: MET mangler timesverdier for vinduet", file=sys.stderr)
            continue
        verdier = [v[0] for v in timeverdier]
        rad = {
            "logget": na.strftime("%Y-%m-%d %H:%M"),
            "dato": dato.isoformat(),
            "tidsvindu": navn,
            "timer": f"{start:02d}:00–{slutt:02d}:00",
            "temp_min": min(v["temp"] for v in verdier),
            "temp_maks": max(v["temp"] for v in verdier),
            "nedbor_maks_mm": max(v["nedbor"] for v in verdier),
            "vind_maks_ms": max(v["vind"] for v in verdier),
            "symboler": " ".join(v["symbol"] for v in verdier),
            "vaerklasse": klasse,
            "utlost_av": "; ".join(grunner),
            "ville_gatt": "",
            "valgt_lavtliggende": "",
            "kommentar": "",
        }
        rader = [r for r in rader if not (r["dato"] == rad["dato"] and r["tidsvindu"] == navn)]
        rader.append(rad)
        print(f"{dato} {navn} {rad['timer']}: {klasse}"
              f" (temp {rad['temp_min']}–{rad['temp_maks']} °C, nedbør maks {rad['nedbor_maks_mm']} mm/t,"
              f" vind maks {rad['vind_maks_ms']} m/s{', ' + rad['utlost_av'] if grunner else ''})")
    rader.sort(key=lambda r: (r["dato"], [n for n, _, _ in TIDSVINDUER].index(r["tidsvindu"])))
    skriv_logg(rader)
    print(f"Loggen: {LOGG}. Fyll inn ville_gatt og valgt_lavtliggende (ja/nei).")


def forventet_klasse(ville_gatt, lavtliggende):
    """Hvilken Værklasse vurderingen tilsvarer (PRD §4.2): nei = frarådet,
    ja + lavtliggende = dårlig, ja + ikke lavtliggende = god eller middels."""
    if ville_gatt == "nei":
        return {"frarådet"}
    if ville_gatt == "ja" and lavtliggende == "ja":
        return {"dårlig"}
    if ville_gatt == "ja" and lavtliggende == "nei":
        return {"god", "middels"}
    return None


def oppsummer():
    rader = les_logg()
    vurdert = avvik = 0
    for r in rader:
        forventet = forventet_klasse(r["ville_gatt"].strip().lower(), r["valgt_lavtliggende"].strip().lower())
        if forventet is None:
            print(f"{r['dato']} {r['tidsvindu']}: ikke vurdert ennå")
            continue
        vurdert += 1
        if r["vaerklasse"] not in forventet:
            avvik += 1
            print(f"{r['dato']} {r['tidsvindu']}: AVVIK, Værklasse {r['vaerklasse']},"
                  f" vurderingen tilsvarer {'/'.join(sorted(forventet))} ({r['utlost_av'] or 'ingen grense nådd'})")
    print(f"\n{vurdert} vurderte Tidsvinduer, {avvik} avvik.")
    if vurdert < 14:
        print(f"Kalibreringen trenger 14 vurderte Tidsvinduer; {14 - vurdert} gjenstår.")
    elif avvik > 2:
        print("Mer enn 2 av 14 avvik: tersklene i PRD §4.2 bør justeres (prioriter dårlig og frarådet).")
    else:
        print("Maks 2 avvik: startverdiene i PRD §4.2 kan beholdes.")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--oppsummer", action="store_true", help="tell avvik mellom Værklasse og egen vurdering")
    p.add_argument("--i-morgen", action="store_true", help="logg morgendagens Tidsvinduer")
    p.add_argument("--overstyr", action="store_true", help="hent dagens Tidsvinduer på nytt selv om de finnes")
    p.add_argument("--selvtest", action="store_true",
                   help="kjør testdata/vaerklasse-fasit.json mot tersklene, uten å kalle MET")
    p.add_argument("--terskler", default=str(TERSKELFIL), metavar="STI",
                   help="terskelfil for logg og --selvtest (standard: data/vaerterskler.json)")
    a = p.parse_args()
    if a.oppsummer:
        oppsummer()
    elif a.selvtest:
        sys.exit(selvtest(les_terskler(a.terskler)))
    else:
        logg(les_terskler(a.terskler), a.overstyr, a.i_morgen)
