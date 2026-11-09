#!/usr/bin/env python3
"""Kalibreringslogg for Værtersklene (PRD §10, spørsmål 1).

Henter Værmeldingen for Værpunktet fra MET Locationforecast og fører én rad per
Tidsvindu i loggarket. Kolonnene for egen vurdering fyller du inn selv.

Bruk:
    python3 scripts/kalibrering_vaerlogg.py              # logg dagens to Tidsvinduer (kjør før kl. 10)
    python3 scripts/kalibrering_vaerlogg.py --i-morgen   # logg morgendagens to Tidsvinduer (kvelden før)
    python3 scripts/kalibrering_vaerlogg.py --oppsummer  # tell avvik mellom Værklasse og vurdering

Bare standardbiblioteket (Python 3.9+). Se _bmad-output/planning-artifacts/kalibrering/README.md.
"""
import argparse
import csv
import datetime as dt
import json
import sys
import urllib.request
from pathlib import Path
from zoneinfo import ZoneInfo

ROT = Path(__file__).resolve().parent.parent
LOGG = ROT / "_bmad-output/planning-artifacts/kalibrering/vaerlogg.csv"

# Værpunktet (PRD §3, §10 spm. 4)
LAT, LON, HOYDE = 62.7617, 7.1679, 400
URL = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={LAT}&lon={LON}&altitude={HOYDE}"
# MET krever en User-Agent som identifiserer appen og gir kontaktinfo (addendum, Værintegrasjon)
USER_AGENT = "turplanlegger-ibe160-kalibrering/0.1 https://github.com/IBE160-2026/G85-friedl"
OSLO = ZoneInfo("Europe/Oslo")

# Tidsvinduene i kalibreringen: (navn, start, slutt) i norsk tid
TIDSVINDUER = [("formiddag", 10, 12), ("ettermiddag", 13, 15)]

# Værterskler, startverdier fra PRD §4.2. Strengeste klasse først.
# Hver grense: (nedbør mm/t >=, middelvind m/s >=, temperatur °C <). None = ingen grense.
TERSKLER = [
    ("frarådet", 10.0, 17.2, None),
    ("dårlig", 2.0, 10.8, -10.0),
    ("middels", 0.5, 8.0, 0.0),
]
RANG = {"god": 0, "middels": 1, "dårlig": 2, "frarådet": 3}

KOLONNER = [
    "logget", "dato", "tidsvindu", "timer", "temp_min", "temp_maks", "nedbor_maks_mm",
    "vind_maks_ms", "symboler", "vaerklasse", "utlost_av",
    "ville_gatt", "valgt_lavtliggende", "kommentar",
]


def klasse_for_time(nedbor, vind, temp):
    for navn, n_grense, v_grense, t_grense in TERSKLER:
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


def logg(overstyr, i_morgen=False):
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
        verdier = [timer.get(h) for h in range(start, slutt)]
        if any(v is None for v in verdier):
            print(f"{dato} {navn}: MET mangler timesverdier for vinduet", file=sys.stderr)
            continue
        klasse, grunner = "god", []
        for v in verdier:
            k, g = klasse_for_time(v["nedbor"], v["vind"], v["temp"])
            if RANG[k] > RANG[klasse]:
                klasse, grunner = k, g
            elif RANG[k] == RANG[klasse] and k != "god":
                grunner += [x for x in g if x not in grunner]
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
    a = p.parse_args()
    oppsummer() if a.oppsummer else logg(a.overstyr, a.i_morgen)
