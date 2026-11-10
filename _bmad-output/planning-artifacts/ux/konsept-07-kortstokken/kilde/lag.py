#!/usr/bin/env python3
"""Konsept 07 «Kortstokken» – genererer SVG-skisser og konsept.json."""
import math, json, os
from xml.sax.saxutils import escape

OUT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # konsept-07-kortstokken/
os.makedirs(OUT, exist_ok=True)

FONT = "'Avenir Next', Avenir, 'Helvetica Neue', sans-serif"

BG = '#F4EEE3'      # varm, lys nøytral
PAPER = '#FFFBF5'   # kortflate
INK = '#2A241D'
INK2 = '#5C5348'
MUTE = '#6E6255'
LINE = '#D9CDBA'
FOREST = '#1F4A38'
FOREST_T = '#E2EBE1'
RUST = '#A13E17'
RUST_T = '#F7E3D7'
OCHRE = '#73550C'
OCHRE_T = '#F3E6C6'
EDGE1 = '#EADFCC'
EDGE2 = '#DDCFB7'
WATER = '#CADBDD'
WATER_L = '#93B2B6'
WATER_TXT = '#3B565B'
LAND = '#F0E8D8'
CONTOUR = '#D6C6A9'
TOWN = '#DDD0BB'

SUNSET = '15:59'
SOLNED = 15 * 60 + 59


def hm(s):
    h, m = s.split(':')
    return int(h) * 60 + int(m)


# ---------------------------------------------------------------- tekst
def tw(s, size, weight=400):
    tot = 0.0
    for ch in s:
        if ch == ' ':
            w = 0.27
        elif ch in 'iljI.,:;!|\'': w = 0.25
        elif ch in 'frt()[]/': w = 0.34
        elif ch in '-': w = 0.36
        elif ch in 'mwMW': w = 0.84
        elif ch in 'æøåÆØÅ': w = 0.62
        elif ch.isupper(): w = 0.66
        elif ch.isdigit(): w = 0.56
        elif ch in '–': w = 0.5
        elif ch in '«»': w = 0.48
        elif ch in '·': w = 0.28
        elif ch in '°': w = 0.4
        elif ch in '✓': w = 0.7
        else: w = 0.54
        tot += w
    f = 1.0 if weight < 500 else (1.04 if weight < 650 else 1.08)
    return tot * size * f


def wrap(s, maxw, size, weight=400):
    words = s.split(' ')
    lines, cur = [], ''
    for wd in words:
        t = (cur + ' ' + wd) if cur else wd
        if tw(t, size, weight) <= maxw or not cur:
            cur = t
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    return lines


def T(x, y, s, size=16, weight=400, fill=INK, anchor='start', italic=False, ls=None,
      tnum=False, deco=None, halo=None):
    a = f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}"'
    if anchor != 'start':
        a += f' text-anchor="{anchor}"'
    if italic:
        a += ' font-style="italic"'
    if ls:
        a += f' letter-spacing="{ls}"'
    if tnum:
        a += ' style="font-variant-numeric:tabular-nums"'
    if deco:
        a += f' text-decoration="{deco}"'
    if halo:
        a += f' stroke="{halo}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"'
    return a + f'>{escape(s)}</text>'


def TS(x, y, parts, size=16, anchor='start', tnum=False):
    """parts: liste av (tekst, vekt, farge)"""
    a = f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}"'
    if anchor != 'start':
        a += f' text-anchor="{anchor}"'
    if tnum:
        a += ' style="font-variant-numeric:tabular-nums"'
    a += '>'
    for t, w, f in parts:
        a += f'<tspan font-weight="{w}" fill="{f}">{escape(t)}</tspan>'
    return a + '</text>'


def P(x, y, s, maxw, size=15, lh=None, weight=400, fill=INK2, italic=False, tnum=False):
    lh = lh or round(size * 1.45)
    lines = wrap(s, maxw, size, weight)
    out = ''.join(T(x, y + i * lh, l, size, weight, fill, italic=italic, tnum=tnum) for i, l in enumerate(lines))
    return out, y + (len(lines) - 1) * lh


def R(x, y, w, h, rx=0, fill='none', stroke=None, sw=1, dash=None, extra=''):
    a = f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}"'
    if stroke:
        a += f' stroke="{stroke}" stroke-width="{sw}"'
    if dash:
        a += f' stroke-dasharray="{dash}"'
    return a + extra + '/>'


def L(x1, y1, x2, y2, stroke=LINE, sw=1, dash=None):
    a = f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}"'
    if dash:
        a += f' stroke-dasharray="{dash}"'
    return a + ' stroke-linecap="round"/>'


class SVG:
    def __init__(self, w, h, title):
        self.w, self.h, self.title = w, h, title
        self.parts, self.defs = [], []
        self.uid = 0

    def add(self, *s):
        self.parts.extend(s)

    def nid(self, p='c'):
        self.uid += 1
        return f'{p}{self.uid}'

    def save(self, name):
        s = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
             f'viewBox="0 0 {self.w} {self.h}" font-family="{FONT}">\n'
             f'<title>{escape(self.title)}</title>\n<defs>{"".join(self.defs)}</defs>\n'
             f'{R(0, 0, self.w, self.h, 0, BG)}\n' + '\n'.join(self.parts) + '\n</svg>\n')
        with open(os.path.join(OUT, name), 'w', encoding='utf-8') as f:
            f.write(s)
        return len(s)


# ---------------------------------------------------------------- små komponenter
def mark(cx, cy, kind, r=13):
    k = r / 13
    if kind == 'ok':
        return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{FOREST}"/>'
                f'<path d="M{cx-5.5*k:.1f},{cy+0.5*k:.1f} L{cx-1.8*k:.1f},{cy+4.2*k:.1f} L{cx+5.6*k:.1f},{cy-4.2*k:.1f}" '
                f'fill="none" stroke="#fff" stroke-width="{2.6*k:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
    if kind == 'warn':
        return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{RUST}"/>'
                f'<line x1="{cx:.1f}" y1="{cy-6*k:.1f}" x2="{cx:.1f}" y2="{cy+1.6*k:.1f}" stroke="#fff" stroke-width="{2.8*k:.1f}" stroke-linecap="round"/>'
                f'<circle cx="{cx:.1f}" cy="{cy+5.4*k:.1f}" r="{1.7*k:.1f}" fill="#fff"/>')
    return (f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r-1}" fill="{PAPER}" stroke="{MUTE}" stroke-width="1.8"/>'
            f'<line x1="{cx-5*k:.1f}" y1="{cy:.1f}" x2="{cx+5*k:.1f}" y2="{cy:.1f}" stroke="{MUTE}" stroke-width="{2.4*k:.1f}" stroke-linecap="round"/>')


def btn(x, y, w, h, label, kind='primary', size=17):
    r = h / 2
    if kind == 'primary':
        bg = R(x, y, w, h, r, FOREST)
        col = '#FFFFFF'
    elif kind == 'secondary':
        bg = R(x + 1, y + 1, w - 2, h - 2, r - 1, PAPER, FOREST, 2)
        col = FOREST
    elif kind == 'tint':
        bg = R(x, y, w, h, r, FOREST_T)
        col = FOREST
    else:  # disabled
        bg = R(x + 1, y + 1, w - 2, h - 2, r - 1, 'none', LINE, 1.5)
        col = MUTE
    return bg + T(x + w / 2, y + h / 2 + size * 0.36, label, size, 600, col, 'middle')


def chevron(cx, cy, d, col, s=7):
    if d == 'l':
        p = f'M{cx+s*0.5:.1f},{cy-s:.1f} L{cx-s*0.5:.1f},{cy:.1f} L{cx+s*0.5:.1f},{cy+s:.1f}'
    else:
        p = f'M{cx-s*0.5:.1f},{cy-s:.1f} L{cx+s*0.5:.1f},{cy:.1f} L{cx-s*0.5:.1f},{cy+s:.1f}'
    return f'<path d="{p}" fill="none" stroke="{col}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'


def stamp(x, y, label, size=44, col=FOREST, fs=None):
    fs = fs or round(size * 0.52)
    return (R(x, y, size, size, size * 0.3, col) +
            T(x + size / 2, y + size / 2 + fs * 0.36, label, fs, 700, '#FFFFFF', 'middle'))


def logo(x, y, s=32):
    k = s / 32
    return (R(x, y, s, s, 9 * k, FOREST) +
            f'<path d="M{x+7*k:.1f},{y+23*k:.1f} C{x+12*k:.1f},{y+23*k:.1f} {x+11*k:.1f},{y+15*k:.1f} {x+16*k:.1f},{y+15*k:.1f} '
            f'S{x+20*k:.1f},{y+9*k:.1f} {x+25*k:.1f},{y+9*k:.1f}" fill="none" stroke="#fff" stroke-width="{2.6*k:.1f}" '
            f'stroke-linecap="round" stroke-dasharray="{3.5*k:.1f} {3*k:.1f}"/>'
            f'<circle cx="{x+25*k:.1f}" cy="{y+9*k:.1f}" r="{2.6*k:.1f}" fill="#fff"/>')


def demo_badge_w(text_rest, size):
    return tw('DEMOMODUS', size, 700) + tw(' · ' + text_rest, size, 500) + 40


def demo_badge(x, y, rest, size=13, h=32):
    w = demo_badge_w(rest, size)
    return R(x, y, w, h, h / 2, OCHRE_T) + TS(x + 14, y + h / 2 + size * 0.36,
                                               [('DEMOMODUS', 700, OCHRE), (' · ' + rest, 500, OCHRE)], size), w


def card_path(x, y, w, h, r, ny=None, nr=10):
    if ny is None:
        return (f'M{x+r},{y} H{x+w-r} A{r},{r} 0 0 1 {x+w},{y+r} V{y+h-r} A{r},{r} 0 0 1 {x+w-r},{y+h} '
                f'H{x+r} A{r},{r} 0 0 1 {x},{y+h-r} V{y+r} A{r},{r} 0 0 1 {x+r},{y} Z')
    return (f'M{x+r},{y} H{x+w-r} A{r},{r} 0 0 1 {x+w},{y+r} V{ny-nr} A{nr},{nr} 0 0 0 {x+w},{ny+nr} '
            f'V{y+h-r} A{r},{r} 0 0 1 {x+w-r},{y+h} H{x+r} A{r},{r} 0 0 1 {x},{y+h-r} V{ny+nr} '
            f'A{nr},{nr} 0 0 0 {x},{ny-nr} V{y+r} A{r},{r} 0 0 1 {x+r},{y} Z')


# ---------------------------------------------------------------- kart
PT = {
    'kaia': (62.7345, 7.1559), 'museet': (62.7397, 7.1473), 'grua': (62.7428, 7.1510),
    'hcv': (62.7512, 7.1476), 'damef': (62.7533, 7.1619), 'fjellbru': (62.7537, 7.1710),
    'jens': (62.7550, 7.2049), 'tusten': (62.7641, 7.2715),
    'storli': (62.7562, 7.1440), 'ski': (62.7628, 7.1598), 'tusen': (62.7692, 7.1792),
    'moldev': (62.7792, 7.2032), 'bergs': (62.7656, 7.2192), 'varden': (62.7588, 7.1528),
}
START_NAVN = {
    'kaia': 'Kaia i Molde sentrum', 'museet': 'Romsdalsmuseet', 'grua': 'Hatlelitunnelen (Grua)',
    'hcv': 'HC-parkering Vardeveien', 'damef': 'Damefallet', 'fjellbru': 'Fjellbrudammen',
    'jens': 'Jensgurilia', 'tusten': 'Tusten skisenter',
}

TOURS = {
    'tusen': dict(goal='Tusenårsvarden', fra='fra Damefallet', start='Parkering ved Damefallet, Vardeveien',
                  facts=['5,0 km', '318 høydemeter', '527 moh', 'Middels'], km='5,0 km', grad='Middels',
                  wp=['damef', (62.7586, 7.1676), (62.7650, 7.1745), 'tusen'], s='damef', g='tusen'),
    'storli_m': dict(goal='Storlihytta', fra='fra Romsdalsmuseet', start='Parkering ved Romsdalsmuseet (Adkomst ca. 500 m)',
                     facts=['3,46 km', '209 høydemeter', '270 moh', 'Enkel'], km='3,46 km', grad='Enkel',
                     wp=['museet', (62.7458, 7.1440), (62.7512, 7.1418), 'storli'], s='museet', g='storli'),
    'ski': dict(goal='Skihytta', fra='fra Damefallet', start='Parkering ved Damefallet, Vardeveien',
                facts=['3,06 km', '169 høydemeter', '391 moh', 'Enkel'], km='3,06 km', grad='Enkel',
                wp=['damef', (62.7576, 7.1580), 'ski'], s='damef', g='ski'),
    'moldev': dict(goal='Moldevatnet', fra='fra Jensgurilia', start='Turparkering i Jensgurilia, Nordbyen (Adkomst 280 m)',
                   facts=['6,45 km', '340 moh', 'Middels'], km='6,45 km', grad='Middels',
                   wp=['jens', (62.7628, 7.2010), (62.7722, 7.1985), 'moldev'], s='jens', g='moldev'),
    'bergs': dict(goal='Bergsvatnet', fra='fra Jensgurilia', start='Turparkering i Jensgurilia, Nordbyen',
                  facts=['3,14 km', '281 moh', 'Enkel'], km='3,14 km', grad='Enkel',
                  wp=['jens', (62.7600, 7.2125), 'bergs'], s='jens', g='bergs'),
    'storli_v': dict(goal='Storlihytta', fra='fra Vardeveien', start='HC-parkering ved Vardeveien',
                     facts=['1,06 km', '35 høydemeter', '301 moh', 'Enkel'], km='1,06 km', grad='Enkel',
                     wp=['hcv', (62.7538, 7.1452), 'storli'], s='hcv', g='storli'),
}


def gp(v):
    return PT[v] if isinstance(v, str) else v


class Proj:
    def __init__(self, x, y, w, h, lat0, lat1, lon0, lon1):
        self.x, self.y, self.w, self.h = x, y, w, h
        self.lat0, self.lat1, self.lon0, self.lon1 = lat0, lat1, lon0, lon1
        self.kx = w / ((lon1 - lon0) * 50.8)
        self.ky = h / ((lat1 - lat0) * 111.2)

    def __call__(self, lat, lon=None):
        if lon is None:
            lat, lon = gp(lat)
        return (self.x + (lon - self.lon0) / (self.lon1 - self.lon0) * self.w,
                self.y + (self.lat1 - lat) / (self.lat1 - self.lat0) * self.h)

    @classmethod
    def center(cls, x, y, w, h, clat, clon, ppkm, stretch=1.0):
        dlon = w / (ppkm * stretch) / 50.8
        dlat = h / ppkm / 111.2
        return cls(x, y, w, h, clat - dlat / 2, clat + dlat / 2, clon - dlon / 2, clon + dlon / 2)


def smooth(pts, closed=False):
    if len(pts) < 2:
        return ''
    if closed:
        P_ = pts[-1:] + pts + pts[:2]
    else:
        P_ = [pts[0]] + pts + [pts[-1]]
    d = f'M{P_[1][0]:.1f},{P_[1][1]:.1f}'
    rng = range(1, len(P_) - 2)
    for i in rng:
        p0, p1, p2, p3 = P_[i - 1], P_[i], P_[i + 1], P_[i + 2]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f' C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}'
    return d + (' Z' if closed else '')


def blob(pr, lat, lon, rx_km, ry_km, seed, wob=0.12):
    cx, cy = pr(lat, lon)
    pts = []
    for i in range(24):
        a = i / 24 * 2 * math.pi
        f = 1 + wob * math.sin(3 * a + seed) + wob * 0.6 * math.sin(5 * a + seed * 2.3)
        pts.append((cx + rx_km * pr.kx * f * math.cos(a), cy + ry_km * pr.ky * f * math.sin(a)))
    return smooth(pts, True)


PEAKS = [((62.7692, 7.1792), [0.45, 0.95, 1.5, 2.1, 2.8], 1.0),
         ((62.7612, 7.1560), [0.3, 0.7, 1.15], 2.0),
         ((62.7790, 7.2420), [0.5, 1.1, 1.8, 2.5], 3.0),
         ((62.7720, 7.1180), [0.4, 0.9, 1.5], 4.0)]
LAKES = [('Moldevatnet', (62.7800, 7.2075), 0.42, 0.17, 1.3),
         ('Bergsvatnet', (62.7668, 7.2215), 0.24, 0.13, 2.1),
         ('Fjellbrudammen', (62.7556, 7.1735), 0.14, 0.08, 0.7)]
TRAILS = [['grua', (62.7470, 7.1530), 'hcv'], ['hcv', (62.7560, 7.1500), 'varden'],
          ['fjellbru', (62.7600, 7.1780), (62.7680, 7.1810)], ['kaia', 'grua'],
          ['tusen', (62.7745, 7.1900), 'moldev'], ['jens', (62.7580, 7.2300), (62.7630, 7.2600), 'tusten'],
          ['varden', 'ski'], ['ski', (62.7680, 7.1700), 'tusen']]


def coast_lat(lon):
    return 62.7342 + 0.0010 * math.sin((lon - 7.10) * 95) + 0.0006 * math.sin((lon - 7.10) * 240) \
        + (0.0018 if lon > 7.205 else 0.0018 * max(0, (lon - 7.175) / 0.03)) * 0.6


def terrain(s, pr, rx=24, labels=True, town=True, trails=True, ny=None, skip_lakes=()):
    cid = s.nid('clip')
    s.defs.append(f'<clipPath id="{cid}"><path d="{card_path(pr.x, pr.y, pr.w, pr.h, rx) if not isinstance(rx, tuple) else top_round(pr.x, pr.y, pr.w, pr.h, rx[0])}"/></clipPath>')
    o = [f'<g clip-path="url(#{cid})">', R(pr.x, pr.y, pr.w, pr.h, 0, LAND)]
    # åsene
    for (c, radii, seed) in PEAKS:
        for i, r in enumerate(reversed(radii)):
            fill = ['#ECE2CF', '#E8DDC8', '#E4D8C1', '#E0D3BA', '#DCCEB3'][min(i, 4)]
            o.append(f'<path d="{blob(pr, c[0], c[1], r * 1.1, r * 0.8, seed)}" fill="{fill}" stroke="{CONTOUR}" stroke-width="1"/>')
    # fjorden
    lon_a = pr.lon0 - 0.05
    lon_b = pr.lon1 + 0.05
    pts = []
    n = 120
    for i in range(n + 1):
        lon = lon_a + (lon_b - lon_a) * i / n
        pts.append(pr(coast_lat(lon), lon))
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    d += f' L{pts[-1][0]:.1f},{pr.y + pr.h + 400:.1f} L{pts[0][0]:.1f},{pr.y + pr.h + 400:.1f} Z'
    o.append(f'<path d="{d}" fill="{WATER}" stroke="{WATER_L}" stroke-width="1.5"/>')
    # byen
    if town:
        bw = max(3, 0.07 * pr.kx)
        bh = max(2.5, 0.05 * pr.ky)
        lon = 7.128
        k = 0
        while lon < 7.205:
            lat = coast_lat(lon) + 0.0012
            j = 0
            while lat < 62.7425 - (0.002 if lon > 7.18 else 0):
                k += 1
                if (k * 7919) % 10 < 7:
                    x, y = pr(lat, lon)
                    o.append(R(x, y, bw, bh, 1, TOWN))
                lat += 0.0011
                j += 1
            lon += 0.0032
    # sjøer
    for name, c, a, b, seed in LAKES:
        o.append(f'<path d="{blob(pr, c[0], c[1], a, b, seed, 0.1)}" fill="{WATER}" stroke="{WATER_L}" stroke-width="1.2"/>')
    if trails:
        for tr in TRAILS:
            o.append(f'<path d="{smooth([pr(*gp(p)) for p in tr])}" fill="none" stroke="#C4B394" stroke-width="1.4" stroke-dasharray="1 4" stroke-linecap="round"/>')
    if labels:
        x, y = pr(62.7318, 7.215)
        o.append(T(x, y, 'Moldefjorden', 13, 500, WATER_TXT, 'middle', italic=True, ls=1))
        x, y = pr(62.7372, 7.186)
        o.append(T(x, y, 'Molde sentrum', 12, 600, INK2, 'middle', halo=LAND))
        x, y = pr(62.7745, 7.140)
        o.append(T(x, y, 'MOLDEMARKA', 12, 600, MUTE, 'middle', ls=3, halo=LAND))
        for name, c, a, b, seed in LAKES[:2]:
            x, y = pr(*c)
            if name not in skip_lakes and pr.x + 40 < x < pr.x + pr.w - 40 and pr.y + 30 < y < pr.y + pr.h - 20:
                o.append(T(x, y - b * pr.ky - 6, name, 11, 500, WATER_TXT, 'middle', italic=True, halo=LAND))
    o.append('</g>')
    s.add(*o)
    return cid


def top_round(x, y, w, h, r):
    return f'M{x},{y+h} V{y+r} A{r},{r} 0 0 1 {x+r},{y} H{x+w-r} A{r},{r} 0 0 1 {x+w},{y+r} V{y+h} Z'


def route(pr, key, active=True, width=None):
    t = TOURS[key]
    pts = [pr(*gp(p)) for p in t['wp']]
    d = smooth(pts)
    col = FOREST if active else '#6E6255'
    w = width or (4 if active else 2.6)
    return (f'<path d="{d}" fill="none" stroke="{PAPER}" stroke-width="{w + 4}" stroke-linecap="round" opacity="0.9"/>'
            f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-linecap="round" stroke-dasharray="{w*2.2:.1f} {w*1.6:.1f}"/>'), pts


def start_pin(x, y, label, active=True, r=13):
    col = FOREST if active else INK2
    return (f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r + 2.5}" fill="{PAPER}"/>'
            f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" fill="{col}"/>' +
            T(x, y + r * 0.38, label, round(r * 1.05), 700, '#fff', 'middle'))


def goal_pin(x, y, active=True):
    col = FOREST if active else INK2
    return (f'<path d="M{x:.1f},{y-8:.1f} L{x+7:.1f},{y+5:.1f} L{x-7:.1f},{y+5:.1f} Z" fill="{col}" stroke="{PAPER}" stroke-width="2" stroke-linejoin="round"/>')


def map_credit(x, y, anchor='end', size=11):
    s = 'Bakgrunnskart: © Kartverket · Turstier: Turrutebasen, Kartverket'
    w = tw(s, size, 500) + 16
    bx = x - w if anchor == 'end' else x
    return R(bx, y - 15, w, 22, 11, PAPER, None, 1, extra=' opacity="0.92"') + T(bx + 8, y, s, size, 500, INK2)


# ---------------------------------------------------------------- kriterierader
def timebar(x, y, w, used, avail, warn=False):
    f = min(used / avail, 1.0)
    o = R(x, y, w, 7, 3.5, '#E5DAC7') + R(x, y, max(7, w * f), 7, 3.5, RUST if warn else FOREST)
    if used > avail:
        ov = w * (used - avail) / avail
        o += R(x + w - 3, y - 2, ov + 8, 11, 5.5, RUST) + L(x + w, y - 6, x + w, y + 13, INK, 1.5)
    return o


def daybar(x, y, w, start, end, sunset=SOLNED, labels=True, size=11):
    limit = sunset - 30
    warn = end > limit
    span = sunset - start
    fx = lambda m: x + (m - start) / span * w
    col = RUST if warn else FOREST
    o = R(x, y, w, 7, 3.5, '#E5DAC7')
    o += R(fx(limit), y, x + w - fx(limit), 7, 0, '#D3C6B0')
    o += R(x, y, fx(end) - x, 7, 3.5, col)
    o += L(fx(limit), y - 5, fx(limit), y + 12, INK2, 1.4, '2 2')
    o += f'<circle cx="{fx(end):.1f}" cy="{y+3.5:.1f}" r="6" fill="{col}" stroke="{PAPER}" stroke-width="2"/>'
    if labels:
        hh = lambda m: f'{m // 60:02d}:{m % 60:02d}'
        o += T(x, y + 24, hh(start), size, 500, MUTE, tnum=True)
        o += T(x + w, y + 24, 'sol ned ' + hh(sunset), size, 500, MUTE, 'end', tnum=True)
    return o


def crit_rows(ix, cy, iw, rows, vx_off=96, vsize=16, dsize=13.5, lsize=15, gap=14, sep=True):
    o = []
    for i, r in enumerate(rows):
        kind = r['kind']
        o.append(mark(ix + 13, cy + 12, kind))
        o.append(T(ix + 34, cy + 18, r['label'], lsize, 700, INK))
        vx = ix + vx_off
        vcol = RUST if kind == 'warn' else INK
        o.append(T(vx, cy + 18, r['value'], vsize, 600, vcol, tnum=True))
        yy = cy + 18
        dw = iw - vx_off
        for line in ([r['detail']] if isinstance(r.get('detail'), str) else r.get('detail', [])):
            for ln in wrap(line, dw, dsize):
                yy += round(dsize * 1.42)
                o.append(T(vx, yy, ln, dsize, 400, INK2, tnum=True))
        viz = r.get('viz')
        if viz:
            if viz[0] == 'bar':
                yy += 12
                o.append(timebar(vx, yy, min(dw - 30, 230), viz[1], viz[2], kind == 'warn'))
                yy += 8
            elif viz[0] == 'day':
                yy += 13
                o.append(daybar(vx, yy, min(dw - 4, 260), viz[1], viz[2]))
                yy += 26
        cy = max(yy, cy + 26) + gap
        if sep and i < len(rows) - 1:
            o.append(L(ix + 34, cy - gap / 2 - 1, ix + iw, cy - gap / 2 - 1, '#E6DCCB', 1))
    return ''.join(o), cy


# ---------------------------------------------------------------- kort
def card_frame(x, y, w, h, ny, selected=False, r=26, edges=0, warn=False):
    o = []
    for k in range(edges, 0, -1):
        o.append(f'<path d="{card_path(x + 12 * k, y + 9 * k, w - 24 * k, h, r)}" fill="{[EDGE1, EDGE2][k-1]}" stroke="#CDBEA3" stroke-width="1.2"/>')
    base = FOREST if selected else '#E2D5BF'
    o.append(f'<path d="{card_path(x, y + 6, w, h, r, ny + 6)}" fill="{base}"/>')
    o.append(f'<path d="{card_path(x, y, w, h, r, ny)}" fill="{PAPER}" stroke="{FOREST if selected else "#CDBEA3"}" stroke-width="{2.5 if selected else 1.4}"/>')
    o.append(L(x + 16, ny, x + w - 16, ny, '#CDBEA3', 1.4, '2 6'))
    return ''.join(o)


def card_content(x, y, w, c, mode='pc', selected=False, map_h=0, s=None):
    pad = 28 if mode == 'pc' else 20
    ix, iw = x + pad, w - 2 * pad
    o = []
    cy = y
    if map_h:
        pts = [gp(p) for p in TOURS[c['key']]['wp']]
        dx = (max(p[1] for p in pts) - min(p[1] for p in pts)) * 50.8
        dy = (max(p[0] for p in pts) - min(p[0] for p in pts)) * 111.2
        ppkm = min(w * 0.45 / max(dx, 0.05), (map_h - 54) / max(dy, 0.05))
        clat = (max(p[0] for p in pts) + min(p[0] for p in pts)) / 2 + 17 / ppkm / 111.2
        clon = (max(p[1] for p in pts) + min(p[1] for p in pts)) / 2 - (w * 0.12) / ppkm / 50.8
        pr = Proj.center(x, y, w, map_h, clat, clon, ppkm)
        o.append(('MAP', pr))
        cy = y + map_h
        o.append(stamp(ix, cy - 22, str(c['n']), 44))
        o.append(T(ix + 56, cy + 26, c['goal'], 26, 600, INK))
        o.append(T(ix + 56, cy + 48, c['fra'], 15.5, 500, INK2))
        cy += 74
        o.append(T(ix, cy, '  ·  '.join(c['facts']), 13.5, 500, INK, tnum=True))
        cy += 21
        txt, cy = P(ix, cy, 'Startpunkt: ' + c['start'], iw, 13, 18, 400, INK2)
        o.append(txt)
        cy += 20
        ny = cy
        cy += 26
        o.append(T(ix, cy, c.get('why_label', 'PASSER FORDI'), 12, 700, c.get('why_col', FOREST), ls=1.4))
        cy += 14
        rows, cy = crit_rows(ix, cy, iw, c['rows'], vx_off=92, vsize=15.5, dsize=13, gap=10)
        o.append(rows)
        if c.get('regel'):
            lines = wrap('Regeltekst: «' + c['regel'] + '»', iw, 12.5, 400)
            for i, ln in enumerate(lines):
                o.append(T(ix, cy + 10 + i * 17, ln, 12.5, 400, INK2, italic=True, tnum=True))
            cy += 10 + (len(lines) - 1) * 17 + 12
        return o, cy, ny, ix, iw
    else:
        cy += pad
        o.append(stamp(ix, cy, str(c['n']), 44))
        o.append(T(ix + 56, cy + 19, c['n_label'], 14, 600, INK2, tnum=True))
        o.append(T(ix + 56, cy + 38, c.get('sub', 'Turforslag'), 13, 500, MUTE))
        if selected:
            lab = 'Vises på kartet'
            pw = tw(lab, 13, 600) + 40
            o.append(R(ix + iw - pw, cy + 8, pw, 28, 14, FOREST_T) + mark(ix + iw - pw + 15, cy + 22, 'ok', 8) +
                     T(ix + iw - pw + 28, cy + 27, lab, 13, 600, FOREST))
        cy += 44 + 12
    ts = 30 if mode == 'pc' else 28
    cy += ts
    o.append(T(ix, cy, c['goal'], ts, 600, INK))
    cy += 24 if mode == 'pc' else 22
    o.append(T(ix, cy, c['fra'], 17 if mode == 'pc' else 16, 500, INK2))
    cy += 26 if mode == 'pc' else 23
    o.append(T(ix, cy, '  ·  '.join(c['facts']), 14 if mode == 'pc' else 13.5, 500, INK, tnum=True))
    cy += 21
    txt, cy = P(ix, cy, 'Startpunkt: ' + c['start'], iw, 13.5, 19, 400, INK2)
    nl = len(wrap('Startpunkt: ' + c['start'], iw, 13.5))
    cy += 22 + 19 * max(0, c.get('start_lines', 1) - nl)
    ny = cy
    cy += 26
    o.append(T(ix, cy, c.get('why_label', 'PASSER FORDI'), 12, 700, c.get('why_col', FOREST), ls=1.4))
    o.append(txt)
    cy += 16
    rows, cy = crit_rows(ix, cy, iw, c['rows'], vx_off=96 if mode == 'pc' else 92,
                         vsize=16 if mode == 'pc' else 15.5, dsize=13.5 if mode == 'pc' else 13,
                         gap=14 if mode == 'pc' else 11)
    o.append(rows)
    if c.get('regel') and mode == 'pc':
        lines = wrap('«' + c['regel'] + '»', iw - 28, 13.5, 400)
        bh = 34 + len(lines) * 19
        o.append(R(ix, cy, iw, bh, 14, BG))
        o.append(T(ix + 14, cy + 22, 'REGELTEKST', 11, 700, MUTE, ls=1.2))
        for i, ln in enumerate(lines):
            o.append(T(ix + 14, cy + 42 + i * 19, ln, 13.5, 400, INK2, italic=True, tnum=True))
        cy += bh + 18
    elif c.get('regel'):
        lines = wrap('Regeltekst: «' + c['regel'] + '»', iw, 12.5, 400)
        cy += 2
        for i, ln in enumerate(lines):
            o.append(T(ix, cy + 12 + i * 17, ln, 12.5, 400, INK2, italic=True, tnum=True))
        cy += 12 + (len(lines) - 1) * 17 + 14
    if c.get('extra_note'):
        t, cy2 = P(ix, cy + 14, c['extra_note'], iw, 13.5, 19, 400, INK2)
        o.append(t)
        cy = cy2 + 16
    return o, cy, ny, ix, iw


def render_card(s, x, y, w, c, mode='pc', selected=False, map_h=0, h=None, edges=0, footer=True):
    o, cy, ny, ix, iw = card_content(x, y, w, c, mode, selected, map_h, s)
    # footer: kilde + knapp
    if footer and mode == 'pc':
        fy = cy + 4
        need = fy + 44 + 26 - y
    elif footer:
        fy = cy
        need = fy + 22 + 18 - y
    else:
        need = cy + 8 - y
    H = h or need
    if mode == 'pc' and footer:
        fy = y + H - 26 - 44
    s.add(card_frame(x, y, w, H, ny, selected, edges=edges))
    for part in o:
        if isinstance(part, tuple) and part[0] == 'MAP':
            pr = part[1]
            cid = terrain(s, pr, rx=(26,), labels=False, town=True, trails=False)
            s.add(f'<g clip-path="url(#{cid})">')
            rsvg, pts = route(pr, c['key'], True, 3.5)
            s.add(rsvg)
            gx, gy = pts[-1]
            sx, sy = pts[0]
            s.add(goal_pin(gx, gy), start_pin(sx, sy, str(c['n']), True, 11))
            s.add(T(gx + 10, gy + 4, c['goal'], 11.5, 600, INK, halo=LAND))
            mx, my = pts[len(pts) // 2]
            s.add(R(x + w - 188, y + 13, 176, 24, 12, PAPER, None, extra=' opacity="0.92"'))
            s.add(f'<path d="M{x+w-180},{y+25} h18" stroke="{FOREST}" stroke-width="3" stroke-dasharray="5 4" stroke-linecap="round"/>')
            s.add(TS(x + w - 156, y + 29, [('omtrentlig rute', 600, FOREST), ('  © Kartverket', 500, INK2)], 10.5))
            tag = c.get('mob_tag', f"Turforslag {c['n_label']}")
            tw_ = tw(tag, 12, 600) + 20
            s.add(R(x + 12, y + 12, tw_, 26, 13, PAPER, '#CDBEA3', 1), T(x + 22, y + 29.5, tag, 12, 600, INK, tnum=True))
            s.add('</g>')
            s.add(L(x + 1, pr.y + pr.h, x + w - 1, pr.y + pr.h, '#CDBEA3', 1.2))
        else:
            s.add(part)
    if footer and mode == 'pc':
        s.add(T(ix, fy + 27, 'Kilde: morotur.no', 14, 600, FOREST, deco='underline'))
        if selected:
            s.add(btn(ix + iw - 176, fy, 176, 44, 'Vises på kartet', 'tint', 15))
        else:
            s.add(btn(ix + iw - 176, fy, 176, 44, 'Vis på kartet', 'secondary', 15))
    elif footer:
        s.add(T(ix, fy + 14, 'Kilde: morotur.no', 13.5, 600, FOREST, deco='underline'))
        if c.get('right_note'):
            s.add(T(ix + iw, fy + 14, c['right_note'], 12.5, 500, MUTE, 'end'))
    return H


# ---------------------------------------------------------------- data for kortene
def tid_row(used, avail, used_s, avail_s, warn=False, detail='gangtid, uten pauser'):
    return dict(kind='warn' if warn else 'ok', label='Tid', value=f'{used_s} av {avail_s}', detail=detail,
                viz=('bar', used, avail))


def mork_row(start, end_s, mode='pc'):
    end = hm(end_s)
    warn = end > SOLNED - 30
    if warn:
        return dict(kind='warn', label='Mørke', value=f'Mørkevarsel: tilbake ca. {end_s}',
                    detail=f'sola går ned {SUNSET}', viz=('day', hm(start), end))
    return dict(kind='ok', label='Mørke', value=f'tilbake {end_s}', detail=f'sola går ned {SUNSET}',
                viz=('day', hm(start), end))


def make_card(key, n, total, rows, regel=None, mc=None, ppkm=None, **kw):
    t = TOURS[key]
    c = dict(key=key, n=n, n_label=f'{n} av {total}', goal=t['goal'], fra=t['fra'], facts=t['facts'],
             start=t['start'], rows=rows, regel=regel)
    pts = [gp(p) for p in t['wp']]
    lat = [p[0] for p in pts]
    lon = [p[1] for p in pts]
    c['mc'] = mc or ((max(lat) + min(lat)) / 2, (max(lon) + min(lon)) / 2)
    c['ppkm'] = ppkm or 120
    c.update(kw)
    return c


GOOD = 'oppholdsvær og lite vind'

# Tilstand 2
C2 = [
    make_card('tusen', 1, 3, [tid_row(92, 120, '1 t 32 min', '2 t'),
                              dict(kind='ok', label='Vær', value='Værklasse god', detail=f'{GOOD}, 3–5 °C'),
                              dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                              mork_row('13:30', '15:02')],
              'passer tiden din (1 t 32 min av 2 t), oppholdsvær og lite vind, utsikt', ppkm=105),
    make_card('storli_m', 2, 3, [tid_row(62, 120, '1 t 2 min', '2 t'),
                                 dict(kind='ok', label='Vær', value='Værklasse god', detail=f'{GOOD}, 3–5 °C'),
                                 dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                                 mork_row('13:30', '14:32')],
              'passer tiden din (1 t 2 min av 2 t), oppholdsvær og lite vind, utsikt', ppkm=105),
    make_card('ski', 3, 3, [tid_row(54, 120, '54 min', '2 t'),
                            dict(kind='ok', label='Vær', value='Værklasse god', detail=f'{GOOD}, 3–5 °C'),
                            dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                            mork_row('13:30', '14:24')],
              'passer tiden din (54 min av 2 t), oppholdsvær og lite vind, utsikt', ppkm=130),
]

BAD = 'regn opptil 3,5 mm/t og vind opp mot 9 m/s'
C3A = [
    make_card('moldev', 1, 3, [tid_row(93, 180, '1 t 33 min', '3 t'),
                               dict(kind='warn', label='Vær', value='Værklasse dårlig',
                                    detail=[BAD + ', 2–4 °C', 'Øverst fordi: lavtliggende tur (340 moh), egnet i dårlig vær']),
                               dict(kind='none', label='Ønsker', value='ikke utsikt –',
                                    detail='har vann (ikke valgt)'),
                               mork_row('10:00', '11:33')],
              'passer tiden din (1 t 33 min av 3 t), regn opptil 3,5 mm/t og vind opp mot 9 m/s, lavtliggende tur (340 moh), egnet i dårlig vær', ppkm=85),
    make_card('storli_m', 2, 3, [tid_row(62, 180, '1 t 2 min', '3 t'),
                                 dict(kind='warn', label='Vær', value='Værklasse dårlig',
                                      detail=[BAD + ', 2–4 °C', 'Øverst fordi: lavtliggende tur (270 moh)']),
                                 dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                                 mork_row('10:00', '11:02')],
              'passer tiden din (1 t 2 min av 3 t), regn opptil 3,5 mm/t og vind opp mot 9 m/s, lavtliggende tur (270 moh), utsikt', ppkm=105),
    make_card('ski', 3, 3, [tid_row(54, 180, '54 min', '3 t'),
                            dict(kind='warn', label='Vær', value='Værklasse dårlig',
                                 detail=[BAD + ', 2–4 °C', 'Øverst fordi: lavtliggende tur (391 moh)']),
                            dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                            mork_row('10:00', '10:54')],
              'passer tiden din (54 min av 3 t), regn opptil 3,5 mm/t og vind opp mot 9 m/s, lavtliggende tur (391 moh), utsikt', ppkm=130),
]

C3B = [
    make_card('storli_m', 1, 3, [tid_row(62, 180, '1 t 2 min', '3 t'),
                                 dict(kind='ok', label='Vær', value='Værklasse god', detail=GOOD),
                                 dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                                 mork_row('14:00', '15:02')],
              'passer tiden din (1 t 2 min av 3 t), oppholdsvær og lite vind, utsikt'),
    make_card('ski', 2, 3, [tid_row(54, 180, '54 min', '3 t'),
                            dict(kind='ok', label='Vær', value='Værklasse god', detail=GOOD),
                            dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                            mork_row('14:00', '14:54')],
              'passer tiden din (54 min av 3 t), oppholdsvær og lite vind, utsikt'),
    make_card('bergs', 3, 3, [tid_row(43, 180, '43 min', '3 t'),
                              dict(kind='ok', label='Vær', value='Værklasse god', detail=GOOD),
                              dict(kind='none', label='Ønsker', value='ikke utsikt –', detail='har vann (ikke valgt)'),
                              mork_row('14:00', '14:43')],
              'passer tiden din (43 min av 3 t), oppholdsvær og lite vind'),
]

C_MORK = make_card('tusen', 4, 4, [tid_row(92, 180, '1 t 32 min', '3 t'),
                                   dict(kind='ok', label='Vær', value='Værklasse god', detail=GOOD),
                                   dict(kind='ok', label='Ønsker', value='utsikt ✓', detail='treffer det du valgte'),
                                   dict(kind='warn', label='Mørke', value='Mørkevarsel',
                                        detail=['Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.'],
                                        viz=('day', hm('14:00'), hm('15:32')))],
                   'passer tiden din (1 t 32 min av 3 t), oppholdsvær og lite vind, utsikt', ppkm=105)
C_MORK['n_label'] = 'rangert lenger ned'
C_MORK['sub'] = 'Komponentdetalj'

C5 = make_card('storli_v', 1, 1, [
    dict(kind='warn', label='Tid', value='16 min av 15 min', detail='trenger 1 min mer, uten pauser', viz=('bar', 16, 15)),
    dict(kind='none', label='Vær', value='ikke vurdert', detail='Værmeldingen fra MET mangler'),
    dict(kind='none', label='Ønsker', value='ingen valgt', detail='turen har utsikt'),
    mork_row('13:30', '13:46')], None, ppkm=230)
C5['n_label'] = 'Alternativ'
C5['sub'] = 'den korteste Turen'
C5['why_label'] = 'SLIK STÅR DEN MOT SØKET DITT'
C5['mob_tag'] = 'Alternativ'

ANSVAR = ('Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke '
          'føre (snø, is, gjørme). Følg MET sine farevarsler.')
KRED = ['Værdata: MET Norway', 'Turstier: Turrutebasen, Kartverket', 'Turer: morotur.no og Fjord Norway',
        'Bakgrunnskart: © Kartverket']


# ---------------------------------------------------------------- PC-rammer
def pc_header(s, demo=None):
    s.add(logo(64, 20, 32), T(108, 43, 'Turplanlegger', 22, 600, INK), T(262, 43, 'Moldemarka', 15, 500, MUTE))
    if demo:
        w = demo_badge_w(demo, 13)
        b, _ = demo_badge(1376 - w, 20, demo, 13, 32)
        s.add(b)
    s.add(L(0, 72, 1440, 72, LINE, 1))


def pc_summary(s, y, items, label='Endre søk'):
    x = 64
    s.add(T(x, y + 20, 'DITT SØK', 11, 700, MUTE, ls=1.4))
    x = 64
    for lab, val in items:
        s.add(T(x, y + 42, lab, 12.5, 500, MUTE))
        s.add(T(x, y + 64, val, 17, 600, INK, tnum=True))
        x += max(tw(lab, 12.5, 500), tw(val, 17, 600)) + 36
    s.add(btn(1376 - 150, y + 22, 150, 46, label, 'secondary', 16))


def pc_footer(s, y, ansvar=True):
    if ansvar:
        s.add(R(64, y, 1312, 64, 18, PAPER, LINE, 1))
        s.add(mark(64 + 30, y + 32, 'none', 11))
        s.add(T(64 + 54, y + 38, ANSVAR, 14.5, 500, INK2))
        y += 96
    s.add(L(64, y, 1376, y, LINE, 1))
    s.add(T(64, y + 32, '  ·  '.join(KRED), 13, 500, INK2))
    s.add(T(1376, y + 32, 'Turplanlegger er en prototype for Moldemarka', 13, 500, MUTE, 'end'))
    return y + 56


def pc_weather(s, y, kind, klass, vals, window, note=None, h=72):
    s.add(R(64, y, 1312, h, 18, PAPER, LINE, 1))
    s.add(mark(64 + 32, y + 36, kind, 14))
    s.add(T(64 + 58, y + 43, klass, 19, 600, RUST if kind == 'warn' else INK))
    x = 64 + 58 + tw(klass, 19, 600) + 28
    s.add(T(x, y + 32, vals, 15.5, 500, INK, tnum=True))
    if note:
        s.add(T(x, y + 54, note, 13.5, 400, INK2))
    s.add(T(1376 - 28, y + 32, 'Tidsvindu', 12.5, 500, MUTE, 'end'))
    s.add(T(1376 - 28, y + 54, window, 17, 600, INK, 'end', tnum=True))


def pc_map(s, y, h, keys, sel=0, callout=None, starts_label=None):
    pr = Proj(64, y, 1312, h, 62.7305, 62.7870, 7.040, 7.330)
    terrain(s, pr, rx=24, skip_lakes=[TOURS[k]['goal'] for k in keys])
    s.add(f'<path d="{card_path(64, y, 1312, h, 24)}" fill="none" stroke="#CDBEA3" stroke-width="1.4"/>')
    allpts = []
    order = list(range(len(keys)))
    order = [i for i in order if i != sel] + ([sel] if sel is not None and sel < len(keys) else [])
    for i in order:
        rs, pts = route(pr, keys[i], i == sel)
        s.add(rs)
        allpts.append((i, pts))
    # mål
    for i, pts in allpts:
        gx, gy = pts[-1]
        t = TOURS[keys[i]]
        s.add(goal_pin(gx, gy, i == sel))
        s.add(T(gx + 11, gy + 4, t['goal'], 12.5, 600 if i == sel else 500, INK if i == sel else INK2, halo=LAND))
    # startpunkter (samme Startpunkt kan ha flere nummer)
    seen = {}
    for i, pts in sorted(allpts):
        sk = TOURS[keys[i]]['s']
        seen.setdefault(sk, []).append(i)
    for sk, idxs in seen.items():
        x0, y0 = pr(*PT[sk])
        for j, i in enumerate(idxs):
            s.add(start_pin(x0 - 13 * (len(idxs) - 1) + 26 * j, y0 + 4, str(i + 1), i == sel, 12))
    # rutemerking
    _, spts = [p for p in allpts if p[0] == sel][0]
    mx, my = spts[1]
    s.add(T(mx + 12, my + 2, 'omtrentlig rute', 12, 600, FOREST, italic=True, halo=LAND))
    # forklaring
    lx, ly = 64 + 24, y + h - 24
    s.add(R(lx - 8, ly - 26, 360, 38, 19, PAPER, None, extra=' opacity="0.94"'))
    s.add(start_pin(lx + 12, ly - 7, '1', True, 10))
    s.add(T(lx + 30, ly - 2, 'Startpunkt', 12.5, 500, INK2))
    s.add(goal_pin(lx + 112, ly - 7))
    s.add(T(lx + 124, ly - 2, 'Mål', 12.5, 500, INK2))
    s.add(f'<path d="M{lx+164},{ly-7} h34" stroke="{FOREST}" stroke-width="3.5" stroke-dasharray="7 5" stroke-linecap="round"/>')
    s.add(T(lx + 206, ly - 2, 'omtrentlig rute', 12.5, 500, INK2))
    s.add(map_credit(64 + 1312 - 16, y + h - 18))
    if callout:
        cx, cyy, cw = 64 + 1312 - 24 - 380, y + 24, 380
        t = TOURS[keys[sel]]
        lines = wrap('Startpunkt: ' + t['start'], cw - 80, 13.5)
        ch = 92 + len(lines) * 19
        # leder fra kort til rute
        gx, gy = spts[-1]
        s.add(R(cx, cyy, cw, ch, 18, PAPER, FOREST, 2))
        s.add(stamp(cx + 18, cyy + 16, str(sel + 1), 32))
        s.add(T(cx + 62, cyy + 38, f"{t['goal']} {t['fra']}", 17, 600, INK))
        s.add(T(cx + 62, cyy + 62, f"{t['km']} totalt  ·  {t['grad']}", 14, 500, INK, tnum=True))
        for i, ln in enumerate(lines):
            s.add(T(cx + 62, cyy + 84 + i * 19, ln, 13.5, 400, INK2))
    return pr


def pc_cards(s, y, cards, sel=0):
    w, gap = 416, 32
    hs = []
    tmp = SVG(10, 10, 'tmp')
    ml = max(len(wrap('Startpunkt: ' + c['start'], w - 56, 13.5)) for c in cards)
    for c in cards:
        c['start_lines'] = ml
    for i, c in enumerate(cards):
        hs.append(render_card(tmp, 64 + i * (w + gap), y, w, c, 'pc', i == sel))
    H = max(hs)
    for i, c in enumerate(cards):
        render_card(s, 64 + i * (w + gap), y, w, c, 'pc', i == sel, h=H)
    return y + H + 6


# ---------------------------------------------------------------- PC-skjermer
def pc1():
    s = SVG(1440, 1060, 'Kortstokken – PC – Søk (startside)')
    pc_header(s, 'Værscenario: Godt vær · «nå» = man. 9. nov. 13:30')
    x = 64
    s.add(T(x, 160, 'Hvor lenge vil du gå?', 48, 600, INK))
    t, yy = P(x, 206, 'Si når du vil gå og hvor lang tid du har. Vi veier værmeldingen og foreslår opptil '
                  'tre turer i Moldemarka som passer, og forteller hvorfor.', 560, 19, 29, 400, INK2)
    s.add(t)
    # skjemakortet, med stokken bak
    fx, fy, fw = 64, yy + 40, 600
    fh = 560
    s.add(card_frame(fx, fy, fw, fh, fy + fh - 112, False, edges=2))
    ix, iw = fx + 32, fw - 64
    cy = fy + 40
    # Turdag
    s.add(T(ix, cy, 'Turdag', 15, 600, INK))
    cy += 12
    s.add(seg(ix, cy, iw, 52, ['I dag', 'I morgen'], 0, 16))
    cy += 52 + 36
    half = (iw - 24) / 2
    s.add(T(ix, cy, 'Starttidspunkt', 15, 600, INK), T(ix + half + 24, cy, 'Tilgjengelig tid', 15, 600, INK))
    cy += 12
    s.add(stepper(ix, cy, half, 52, '13:30', 'nå'))
    s.add(stepper(ix + half + 24, cy, half, 52, '2 t', None))
    cy += 52 + 24
    s.add(T(ix + half + 24, cy, 'Tid til selve turen, uten reise', 13, 400, INK2))
    s.add(T(ix + half + 24, cy + 18, 'til og fra Startpunktet.', 13, 400, INK2))
    s.add(T(ix, cy, 'Hele kvarter, 06:00–22:00.', 13, 400, INK2))
    cy += 18 + 36
    s.add(TS(ix, cy, [('Vanskelighetsgrad', 600, INK), ('  høyeste du vil gå', 400, MUTE)], 15))
    cy += 12
    s.add(seg(ix, cy, iw, 52, ['Enkel', 'Middels', 'Krevende'], 1, 16))
    cy += 52 + 36
    s.add(TS(ix, cy, [('Opplevelsespreferanser', 600, INK), ('  valgfritt, velg gjerne flere', 400, MUTE)], 15))
    cy += 12
    s.add(chip(ix, cy, 'utsikt', False), chip(ix + 132, cy, 'vann', False))
    # Finn tur
    s.add(btn(ix, fy + fh - 84, iw, 60, 'Finn tur', 'primary', 20))
    # kart til høyre
    mx, my, mw, mh = 720, 112, 656, 760
    pr = Proj.center(mx, my, mw, mh, 62.7600, 7.2060, 72, 1.0)
    terrain(s, pr, rx=26)
    s.add(f'<path d="{card_path(mx, my, mw, mh, 26)}" fill="none" stroke="#CDBEA3" stroke-width="1.4"/>')
    offs = {'kaia': (12, 4, 'start'), 'museet': (12, 8, 'start'), 'grua': (12, 0, 'start'),
            'hcv': (12, 4, 'start'), 'damef': (-4, -14, 'middle'), 'fjellbru': (12, 2, 'start'),
            'jens': (12, 4, 'start'), 'tusten': (-12, 4, 'end')}
    for k, (dx, dy, an) in offs.items():
        x0, y0 = pr(*PT[k])
        s.add(f'<circle cx="{x0:.1f}" cy="{y0:.1f}" r="8.5" fill="{PAPER}"/><circle cx="{x0:.1f}" cy="{y0:.1f}" r="6" fill="{INK2}"/>')
        s.add(T(x0 + dx, y0 + dy, START_NAVN[k], 12, 600, INK, an, halo=LAND))
    s.add(R(mx + 20, my + 20, 300, 64, 18, PAPER, None, extra=' opacity="0.95"'))
    s.add(T(mx + 38, my + 46, 'Moldemarka', 17, 600, INK))
    s.add(T(mx + 38, my + 68, '12 Turer fra 8 Startpunkter', 13.5, 500, INK2))
    s.add(map_credit(mx + mw - 16, my + mh - 18))
    s.add(T(mx, my + mh + 30, 'Kortene med Turforslag legges ut her når du trykker «Finn tur».', 14, 400, INK2))
    pc_footer(s, 960, ansvar=False)
    return s.save('pc-1-sok.svg')


def seg(x, y, w, h, opts, sel, size=16):
    o = R(x, y, w, h, h / 2, '#EFE6D6', '#D5C7AF', 1)
    n = len(opts)
    sw = w / n
    for i, op in enumerate(opts):
        if i == sel:
            o += R(x + i * sw + 4, y + 4, sw - 8, h - 8, (h - 8) / 2, FOREST)
            o += T(x + i * sw + sw / 2, y + h / 2 + size * 0.36, op, size, 600, '#fff', 'middle')
        else:
            o += T(x + i * sw + sw / 2, y + h / 2 + size * 0.36, op, size, 500, INK, 'middle')
    return o


def stepper(x, y, w, h, val, sub):
    o = R(x, y, w, h, h / 2, PAPER, '#CDBEA3', 1.4)
    o += f'<circle cx="{x+h/2:.1f}" cy="{y+h/2:.1f}" r="{h/2-5:.1f}" fill="{FOREST_T}"/>'
    o += L(x + h / 2 - 7, y + h / 2, x + h / 2 + 7, y + h / 2, FOREST, 2.6)
    o += f'<circle cx="{x+w-h/2:.1f}" cy="{y+h/2:.1f}" r="{h/2-5:.1f}" fill="{FOREST_T}"/>'
    o += L(x + w - h / 2 - 7, y + h / 2, x + w - h / 2 + 7, y + h / 2, FOREST, 2.6)
    o += L(x + w - h / 2, y + h / 2 - 7, x + w - h / 2, y + h / 2 + 7, FOREST, 2.6)
    if sub:
        o += T(x + w / 2, y + h / 2 + 3, val, 19, 600, INK, 'middle', tnum=True)
        o += T(x + w / 2, y + h / 2 + 18, sub, 11.5, 500, MUTE, 'middle')
    else:
        o += T(x + w / 2, y + h / 2 + 7, val, 19, 600, INK, 'middle', tnum=True)
    return o


def chip(x, y, label, on, w=116, h=48):
    if on:
        return R(x, y, w, h, h / 2, FOREST) + mark(x + 24, y + h / 2, 'ok', 9) + T(x + 42, y + h / 2 + 6, label, 16, 600, '#fff')
    return (R(x + 1, y + 1, w - 2, h - 2, h / 2, PAPER, '#B9A98C', 1.5) +
            f'<circle cx="{x+24}" cy="{y+h/2}" r="8.5" fill="none" stroke="{MUTE}" stroke-width="1.6"/>' +
            L(x + 20, y + h / 2, x + 28, y + h / 2, MUTE, 1.6) + L(x + 24, y + h / 2 - 4, x + 24, y + h / 2 + 4, MUTE, 1.6) +
            T(x + 42, y + h / 2 + 6, label, 16, 500, INK))


def pc2():
    s = SVG(1440, 1460, 'Kortstokken – PC – Resultat i godt vær (UJ-1)')
    pc_header(s, 'Værscenario: Godt vær · «nå» = man. 9. nov. 13:30')
    pc_summary(s, 84, [('Turdag', 'I dag, man. 9. nov.'), ('Starttidspunkt', '13:30'), ('Tilgjengelig tid', '2 t'),
                       ('Vanskelighetsgrad', 'Middels'), ('Opplevelsespreferanser', 'utsikt')])
    pc_weather(s, 172, 'ok', 'Værklasse god', '3–5 °C  ·  0 mm nedbør  ·  vind opptil 4 m/s  ·  lettskyet',
               '13:30–15:30', 'Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.')
    s.add(T(64, 290, 'Tre Turforslag som passer nå', 26, 600, INK))
    s.add(T(1376, 290, 'Kort 1 er valgt og uthevet på kartet. Trykk et annet kort, eller en rute, for å bytte.', 14, 400, INK2, 'end'))
    pc_map(s, 312, 340, ['tusen', 'storli_m', 'ski'], 0, callout=True)
    y = pc_cards(s, 684, C2, 0)
    s.h = pc_footer(s, y + 30) + 16
    return s.save('pc-2-godt-vaer.svg')


def pc3a():
    s = SVG(1440, 1660, 'Kortstokken – PC – Resultat i dårlig vær med Værvarsling og Bedre tidsvindu (UJ-2)')
    pc_header(s, 'Værscenario: Dårlig formiddag, bedre fra kl. 14 · «nå» = søn. 8. nov. 20:15')
    pc_summary(s, 84, [('Turdag', 'I morgen, man. 9. nov.'), ('Starttidspunkt', '10:00'), ('Tilgjengelig tid', '3 t'),
                       ('Vanskelighetsgrad', 'Krevende'), ('Opplevelsespreferanser', 'utsikt')])
    # Værvarsling + Bedre tidsvindu
    y = 172
    h = 150
    s.add(R(64, y, 1312, h, 22, RUST_T, '#E2B9A2', 1.2))
    s.add(mark(64 + 36, y + 38, 'warn', 15))
    s.add(T(64 + 64, y + 45, 'Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00', 20, 600, RUST))
    s.add(T(64 + 64, y + 74, 'Regn opptil 3,5 mm/t og vind opp mot 9 m/s, 2–4 °C.', 16, 500, INK, tnum=True))
    s.add(T(64 + 64, y + 100, 'Derfor står lavtliggende Turer og Turer som er egnet i dårlig vær øverst i stokken.', 14.5, 400, INK2))
    s.add(T(64 + 64, y + 124, 'Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.', 13.5, 400, INK2))
    bx, bw = 1376 - 16 - 420, 420
    s.add(R(bx, y + 16, bw, h - 32, 18, PAPER, FOREST, 2))
    s.add(mark(bx + 30, y + 46, 'ok', 12))
    s.add(T(bx + 52, y + 44, 'BEDRE TIDSVINDU', 11.5, 700, FOREST, ls=1.3))
    s.add(T(bx + 52, y + 68, 'I morgen fra kl. 14:00', 16, 600, INK, tnum=True))
    s.add(T(bx + 52, y + 90, 'er Værklassen god', 16, 600, INK))
    s.add(btn(bx + bw - 20 - 150, y + 52, 150, 52, 'Bruk 14:00', 'primary', 17))
    s.add(T(64, 362, 'Tre Turforslag i dårlig vær', 26, 600, INK))
    s.add(T(1376, 362, 'Samme 3 t. «Bruk 14:00» sender et nytt Søk med Starttidspunkt 14:00.', 14, 400, INK2, 'end'))
    pc_map(s, 384, 340, ['moldev', 'storli_m', 'ski'], 0, callout=True)
    y = pc_cards(s, 756, C3A, 0)
    s.h = pc_footer(s, y + 30) + 16
    return s.save('pc-3a-darlig-vaer.svg')


def pc3b():
    s = SVG(1440, 2140, 'Kortstokken – PC – Bedre tidsvindu tatt i bruk, med Mørkevarsel som komponentdetalj')
    pc_header(s, 'Værscenario: Dårlig formiddag, bedre fra kl. 14 · «nå» = søn. 8. nov. 20:15')
    pc_summary(s, 84, [('Turdag', 'I morgen, man. 9. nov.'), ('Starttidspunkt', '14:00'), ('Tilgjengelig tid', '3 t'),
                       ('Vanskelighetsgrad', 'Krevende'), ('Opplevelsespreferanser', 'utsikt')])
    pc_weather(s, 172, 'ok', 'Værklasse god', 'Bedre tidsvindu tatt i bruk  ·  oppholdsvær og lite vind',
               '14:00–17:00', 'Værmelding for ca. 400 moh. På toppene kan det være kaldere og mer vind.  Sola går ned 15:59.')
    s.add(T(64, 290, 'Tre Turforslag fra kl. 14:00', 26, 600, INK))
    s.add(T(1376, 290, 'Alle tre er tilbake før 15:29, 30 min før solnedgang.', 14, 400, INK2, 'end'))
    pc_map(s, 312, 340, ['storli_m', 'ski', 'bergs'], 0, callout=True)
    y = pc_cards(s, 684, C3B, 0)
    # komponentdetalj
    y += 48
    dy = y
    H = render_card(s, 96, dy + 72, 416, C_MORK, 'pc', False)
    FH = 72 + H + 48
    s.add(R(48, dy, 1344, FH, 28, 'none', INK2, 1.4, '6 6'))
    lab = 'KOMPONENTDETALJ · Slik vises Mørkevarsel'
    s.add(R(76, dy - 14, tw(lab, 13, 700) + 13 * 0.08 * len(lab) + 28, 28, 14, BG))
    s.add(T(90, dy + 5, lab, 13, 700, INK, ls=1))
    s.add(T(96, dy + 44, '(Tusenårsvarden fra Damefallet er rangert lenger ned)', 15, 500, INK2))
    # forstørret Mørke-rad
    ex = 576
    s.add(T(ex, dy + 110, 'Mørke-raden, forstørret', 22, 600, INK))
    t, yy = P(ex, dy + 142, 'Raden får «!» og varselfarge når Turen ender senere enn 30 min før solnedgang. '
                            'Mørkevarselet fjerner ingen Tur, men slike Turer legges nederst i stokken.', 700, 15.5, 24, 400, INK2)
    s.add(t)
    by = yy + 36
    s.add(R(ex, by, 752, 252, 22, PAPER, RUST, 2))
    s.add(mark(ex + 40, by + 44, 'warn', 18))
    s.add(T(ex + 72, by + 52, 'Mørke', 20, 700, INK))
    s.add(T(ex + 160, by + 52, 'Mørkevarsel: tilbake ca. 15:32', 22, 600, RUST, tnum=True))
    s.add(T(ex + 160, by + 82, 'Sola går ned 15:59. Turen ender ca. 15:32 uten pauser,', 15, 500, INK, tnum=True))
    s.add(T(ex + 160, by + 104, 'etter grensen 30 min før solnedgang.', 15, 500, INK, tnum=True))
    # stor dagbar
    bx, bw2, byy = ex + 160, 540, by + 150
    st, en, lim = hm('14:00'), hm('15:32'), SOLNED - 30
    fx = lambda m: bx + (m - st) / (SOLNED - st) * bw2
    s.add(R(bx, byy, bw2, 12, 6, '#E5DAC7'), R(fx(lim), byy, bx + bw2 - fx(lim), 12, 0, '#D3C6B0'),
          R(bx, byy, fx(en) - bx, 12, 6, RUST))
    s.add(L(fx(lim), byy - 10, fx(lim), byy + 22, INK, 1.6, '3 3'))
    s.add(f'<circle cx="{fx(en):.1f}" cy="{byy+6}" r="9" fill="{RUST}" stroke="{PAPER}" stroke-width="3"/>')
    s.add(T(bx, byy + 40, 'start 14:00', 13, 500, INK2, tnum=True))
    s.add(T(fx(lim) - 10, byy - 12, 'grense 15:29', 13, 600, INK, 'end', tnum=True))
    s.add(T(fx(en) + 14, byy - 12, 'ender ca. 15:32', 13, 600, RUST, tnum=True))
    s.add(T(bx + bw2, byy + 40, 'sola ned 15:59', 13, 500, INK2, 'end', tnum=True))
    s.add(T(ex + 160, by + 228, 'Farge er aldri alene: «!», ordet Mørkevarsel og klokkeslettene står alltid med.', 13.5, 400, INK2))
    # sammenligning med ok
    oy = by + 282
    s.add(R(ex, oy, 752, 96, 22, PAPER, '#CDBEA3', 1.4))
    s.add(mark(ex + 40, oy + 40, 'ok', 18))
    s.add(T(ex + 72, oy + 48, 'Mørke', 20, 700, INK))
    s.add(T(ex + 160, oy + 48, 'tilbake 15:02', 22, 600, INK, tnum=True))
    s.add(T(ex + 160, oy + 76, 'Til sammenligning: Storlihytta fra Romsdalsmuseet, kort 1 over. Sola går ned 15:59.', 15, 400, INK2, tnum=True))
    s.h = pc_footer(s, dy + FH + 40) + 16
    return s.save('pc-3b-bedre-tidsvindu.svg')


def wind_art(s, x, y, w, h, top_r=26):
    pr = Proj.center(x, y, w, h, 62.7640, 7.1720, 95)
    terrain(s, pr, rx=(top_r,), labels=False, town=True, trails=False)
    o = []
    for i in range(7):
        yy = y + 22 + i * (h - 30) / 7
        xx = x + 20 + (i * 53) % 90
        ln = w * (0.35 + 0.12 * (i % 3))
        o.append(f'<path d="M{xx:.1f},{yy:.1f} q{ln*0.3:.1f},-8 {ln*0.6:.1f},0 t{ln*0.4:.1f},0" fill="none" stroke="{WATER_TXT}" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>')
    s.add(*o)
    s.add(L(x + 1, y + h, x + w - 1, y + h, '#CDBEA3', 1.2))


def pc4():
    s = SVG(1440, 980, 'Kortstokken – PC – Frarådet, ingen Turforslag (UJ-3)')
    pc_header(s, 'Værscenario: Sterk kuling · «nå» = lør. 14. nov. 09:40')
    pc_summary(s, 84, [('Turdag', 'I dag, lør. 14. nov.'), ('Starttidspunkt', '10:00'), ('Tilgjengelig tid', '2 t'),
                       ('Vanskelighetsgrad', 'Middels'), ('Opplevelsespreferanser', 'ingen')])
    s.add(T(64, 226, 'I dag legger vi ingen kort på bordet.', 30, 600, INK))
    s.add(T(64, 258, 'Det er ikke en feil: når Værklassen er frarådet, går den foran tid og ønsker. Her er heller et bedre tidspunkt.', 16, 400, INK2))
    # meldingskort
    x, y, w, h = 64, 296, 640, 520
    s.add(card_frame(x, y, w, h, y + 300, False))
    wind_art(s, x, y, w, 150)
    s.add(stamp(x + 28, y + 128, '!', 44, RUST))
    s.add(T(x + 84, y + 168, 'Ingen Turforslag', 13, 600, INK2))
    s.add(T(x + 28, y + 210, 'Værklasse frarådet', 30, 600, RUST))
    t, yy = P(x + 28, y + 244, 'Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).',
              w - 56, 18, 27, 500, INK, tnum=True)
    s.add(t)
    s.add(T(x + 28, y + 326, 'DERFOR INGEN TUR', 12, 700, RUST, ls=1.4))
    rows, cy = crit_rows(x + 28, y + 342, w - 56, [
        dict(kind='warn', label='Vær', value='frarådet', detail='vind opp mot 19 m/s, 10:00–12:00'),
        dict(kind='none', label='Tid', value='ikke vurdert', detail='frarådet går foran alt annet')], vx_off=96)
    s.add(rows)
    s.add(T(x + 28, y + h - 30, 'Sjekk også MET sine farevarsler.', 15, 600, FOREST, deco='underline'))
    # Bedre tidsvindu-kort
    x2, w2 = 64 + 640 + 40, 520
    s.add(card_frame(x2, y, w2, 360, y + 164, True))
    s.add(stamp(x2 + 28, y + 28, '→', 44))
    s.add(T(x2 + 84, y + 47, 'Alternativ', 14, 600, INK2))
    s.add(T(x2 + 84, y + 66, 'Bedre tidsvindu', 13, 500, MUTE))
    s.add(T(x2 + 28, y + 118, 'I morgen (søn. 15. nov.)', 26, 600, INK))
    s.add(T(x2 + 28, y + 140, 'fra kl. 11:00', 17, 500, INK2, tnum=True))
    s.add(T(x2 + 28, y + 186, 'Samme Søk, ny tid: 11:00–13:00, 2 t, Middels.', 15, 400, INK2, tnum=True))
    s.add(T(x2 + 28, y + 210, 'Du får vanlige Turforslag hvis du tar det i bruk.', 15, 400, INK2))
    s.add(btn(x2 + 28, y + 360 - 28 - 60, w2 - 56, 60, 'Bruk i morgen 11:00', 'primary', 19))
    pc_footer(s, 870, ansvar=False)
    return s.save('pc-4-fraradet.svg')


def pc5():
    s = SVG(1440, 1100, 'Kortstokken – PC – Ingen Tur passer, og Værmeldingen mangler (live-modus)')
    pc_header(s, None)
    pc_summary(s, 84, [('Turdag', 'I dag, man. 9. nov.'), ('Starttidspunkt', '13:30'), ('Tilgjengelig tid', '15 min'),
                       ('Vanskelighetsgrad', 'Middels'), ('Opplevelsespreferanser', 'ingen')])
    y = 172
    s.add(R(64, y, 1312, 64, 18, PAPER, LINE, 1))
    s.add(mark(64 + 32, y + 32, 'none', 13))
    s.add(TS(64 + 58, y + 38, [('Været er ikke vurdert. ', 600, INK),
                                ('Vi fikk ikke hentet Værmeldingen fra MET, så været er ikke vurdert.', 400, INK2)], 16))
    s.add(T(64, 290, 'Ingen Tur passer 15 min.', 30, 600, INK))
    s.add(T(64, 320, 'Den korteste Turen i Moldemarka tar 16 min. Her er den som Alternativ.', 16, 400, INK2))
    H = render_card(s, 64, 348, 480, C5, 'pc', True)
    # kart
    mx, my, mw, mh = 576, 348, 800, H
    pr = Proj.center(mx, my, mw, mh, 62.7545, 7.1440, 330, 1.0)
    terrain(s, pr, rx=26)
    s.add(f'<path d="{card_path(mx, my, mw, mh, 26)}" fill="none" stroke="#CDBEA3" stroke-width="1.4"/>')
    rs, pts = route(pr, 'storli_v', True, 4.5)
    s.add(rs)
    s.add(goal_pin(*pts[-1]), start_pin(pts[0][0], pts[0][1], '1', True, 13))
    s.add(T(pts[-1][0] + 12, pts[-1][1] + 5, 'Storlihytta', 14, 600, INK, halo=LAND))
    s.add(T(pts[0][0] + 20, pts[0][1] + 6, 'HC-parkering ved Vardeveien', 13.5, 600, INK, halo=LAND))
    s.add(T(pts[1][0] + 14, pts[1][1] + 2, 'omtrentlig rute', 13, 600, FOREST, italic=True, halo=LAND))
    s.add(R(mx + 20, my + 20, 380, 86, 18, PAPER, FOREST, 2))
    s.add(stamp(mx + 36, my + 36, '1', 32))
    s.add(T(mx + 80, my + 50, 'Storlihytta fra Vardeveien', 17, 600, INK))
    s.add(T(mx + 80, my + 74, '1,06 km totalt  ·  Enkel', 14, 500, INK, tnum=True))
    s.add(T(mx + 80, my + 94, 'Startpunkt: HC-parkering ved Vardeveien', 13.5, 400, INK2))
    s.add(map_credit(mx + mw - 16, my + mh - 18))
    s.add(btn(64, 348 + H + 40, 300, 56, 'Endre Tilgjengelig tid', 'primary', 18))
    s.add(T(384, 348 + H + 74, 'Med 30 min eller mer passer minst én Tur.', 15, 400, INK2))
    s.h = pc_footer(s, 348 + H + 136) + 16
    return s.save('pc-5-ingen-tur-uten-vaer.svg')


# ---------------------------------------------------------------- mobil
MW = 390


def mob_header(s, demo=None, btn_label='Endre søk'):
    s.add(logo(16, 14, 28), T(52, 34, 'Turplanlegger', 18, 600, INK))
    if btn_label:
        w = tw(btn_label, 15, 600) + 36
        s.add(btn(MW - 16 - w, 6, w, 44, btn_label, 'secondary', 15))
    y = 58
    if demo:
        lines = demo
        h = 14 + 17 * len(lines)
        s.add(R(16, y, MW - 32, h, 12, OCHRE_T))
        s.add(TS(28, y + 21, [('DEMOMODUS', 700, OCHRE), (' · ' + lines[0], 500, OCHRE)], 12))
        for i, ln in enumerate(lines[1:]):
            s.add(T(28, y + 21 + 17 * (i + 1), ln, 12, 500, OCHRE))
        y += h + 8
    return y


def mob_summary(s, y, l1, l2):
    s.add(T(16, y + 18, l1, 15, 600, INK, tnum=True))
    s.add(T(16, y + 38, l2, 14, 500, INK2, tnum=True))
    return y + 50


def fold(s, y=844):
    s.add(L(0, y, MW, y, INK2, 1, '5 4'))
    w = tw('skjermkant 844', 11, 600) + 14
    s.add(R(MW - 8 - w, y - 10, w, 20, 10, BG, INK2, 1), T(MW - 8 - w / 2, y + 4, 'skjermkant 844', 11, 600, INK2, 'middle'))


def mob_nav(s, y, n, total, prev_on=None):
    prev_on = n > 1 if prev_on is None else prev_on
    # forrige
    if prev_on:
        s.add(R(16, y, 52, 52, 26, PAPER, FOREST, 2), chevron(42, y + 26, 'l', FOREST))
    else:
        s.add(R(16.75, y + 0.75, 50.5, 50.5, 25, 'none', LINE, 1.5), chevron(42, y + 26, 'l', '#9A8E80'))
    s.add(T(MW / 2 - 30, y + 24, f'{n} av {total}', 16, 600, INK, 'middle', tnum=True))
    # prikker
    for i in range(total):
        cx = MW / 2 - 30 - (total - 1) * 7 + i * 14
        s.add(f'<circle cx="{cx}" cy="{y+40}" r="4" fill="{FOREST if i == n - 1 else "#CDBEA3"}"/>')
    if n < total:
        s.add(R(MW - 16 - 140, y, 140, 52, 26, FOREST), T(MW - 16 - 140 + 58, y + 32, 'Neste tur', 16, 600, '#fff', 'middle'),
              chevron(MW - 16 - 26, y + 26, 'r', '#fff'))


def mob_footer(s, y, ansvar=True):
    if ansvar:
        t, yy = P(44, y + 26, ANSVAR, MW - 60, 13, 19, 500, INK2)
        s.add(R(16, y, MW - 32, yy - y + 22, 16, PAPER, LINE, 1), mark(30, y + 22, 'none', 9), t)
        y = yy + 46
    s.add(L(16, y, MW - 16, y, LINE, 1))
    for i, k in enumerate(KRED):
        s.add(T(16, y + 26 + i * 19, k, 12.5, 500, INK2))
    return y + 26 + len(KRED) * 19


def mob1():
    s = SVG(MW, 1010, 'Kortstokken – mobil – Søk (startside)')
    y = mob_header(s, ['Værscenario: Godt vær', '«nå» = man. 9. nov. 13:30'], None)
    s.add(T(16, y + 38, 'Hvor lenge vil du gå?', 27, 600, INK))
    t, yy = P(16, y + 66, 'Si når du vil gå og hvor lang tid du har. Vi veier værmeldingen og foreslår opptil '
                         'tre turer i Moldemarka som passer, og forteller hvorfor.', MW - 32, 15, 22, 400, INK2)
    s.add(t)
    # bunnark i tommelsonen
    sy = 300
    
    
    s.add(f'<path d="{top_round(0, sy, MW, 844 - sy, 28)}" fill="{PAPER}" stroke="#CDBEA3" stroke-width="1.4"/>')
    ix, iw = 20, MW - 40
    cy = sy + 36
    s.add(T(ix, cy, 'Turdag', 14, 600, INK))
    s.add(seg(ix, cy + 10, iw, 48, ['I dag', 'I morgen'], 0, 16))
    cy += 10 + 48 + 30
    half = (iw - 14) / 2
    s.add(T(ix, cy, 'Starttidspunkt', 14, 600, INK), T(ix + half + 14, cy, 'Tilgjengelig tid', 14, 600, INK))
    s.add(stepper(ix, cy + 10, half, 52, '13:30', 'nå'), stepper(ix + half + 14, cy + 10, half, 52, '2 t', None))
    cy += 10 + 52 + 20
    s.add(T(ix, cy, 'Tilgjengelig tid: tid til selve turen, uten reise til', 12.5, 400, INK2))
    s.add(T(ix, cy + 17, 'og fra Startpunktet.', 12.5, 400, INK2))
    cy += 17 + 32
    s.add(TS(ix, cy, [('Vanskelighetsgrad', 600, INK), ('  høyeste du vil gå', 400, MUTE)], 14))
    s.add(seg(ix, cy + 10, iw, 48, ['Enkel', 'Middels', 'Krevende'], 1, 15))
    cy += 10 + 48 + 30
    s.add(TS(ix, cy, [('Opplevelsespreferanser', 600, INK), ('  valgfritt', 400, MUTE)], 14))
    s.add(chip(ix, cy + 10, 'utsikt', False, 120, 46), chip(ix + 132, cy + 10, 'vann', False, 120, 46))
    s.add(btn(16, 768, MW - 32, 60, 'Finn tur', 'primary', 20))
    fold(s)
    s.add(T(16, 870, 'Tommelsonen: alle valg ligger i nedre halvdel av skjermen.', 12, 500, MUTE))
    s.h = mob_footer(s, 896, ansvar=False) + 30
    return s.save('mob-1-sok.svg')


def mob_card_screen(s, y, c, total, map_h=118):
    x, w = 16, MW - 32
    tmp = SVG(10, 10, 't')
    H = render_card(tmp, x, y, w, c, 'mob', False, map_h=map_h, edges=2 if total > 1 else 0)
    render_card(s, x, y, w, c, 'mob', False, map_h=map_h, h=H, edges=2 if total > 1 else 0)
    return y + H + (2 * 9 if total > 1 else 0)


def mini_list(s, y, cards, title='Alle tre i stokken'):
    s.add(T(16, y, title, 18, 600, INK))
    y += 16
    for i, c in enumerate(cards):
        s.add(R(16, y, MW - 32, 64, 18, PAPER, FOREST if i == 0 else '#CDBEA3', 2 if i == 0 else 1.2))
        s.add(stamp(28, y + 12, str(i + 1), 40))
        s.add(T(80, y + 27, f"{c['goal']} {c['fra']}", 14.5, 600, INK))
        tid = c['rows'][0]['value'].split(' av ')[0]
        for j, r in enumerate(c['rows']):
            s.add(mark(88 + j * 19, y + 44, r['kind'], 7.5))
        s.add(T(166, y + 49, f"{tid} · {c['rows'][3]['value']}", 12.5, 500, INK2, tnum=True))
        y += 72
    return y


def mob_overview_map(s, y, keys, h=250):
    pr = Proj.center(16, y, MW - 32, h, *keys_center(keys), 56, 1.15)
    terrain(s, pr, rx=22, labels=True)
    s.add(f'<path d="{card_path(16, y, MW - 32, h, 22)}" fill="none" stroke="#CDBEA3" stroke-width="1.2"/>')
    seen = {}
    labs = []
    for i in [1, 2, 0]:
        if i < len(keys):
            rs, pts = route(pr, keys[i], i == 0, 3 if i == 0 else 2.2)
            s.add(rs)
            s.add(goal_pin(*pts[-1], i == 0))
            labs.append(T(pts[-1][0] + (9 if i == 0 else -9), pts[-1][1] + 4, TOURS[keys[i]]['goal'], 11, 600, INK, 'start' if i == 0 else 'end', halo=LAND))
    s.add(*labs)
    for i, k in enumerate(keys):
        seen.setdefault(TOURS[k]['s'], []).append(i)
    for sk, idxs in seen.items():
        x0, y0 = pr(*PT[sk])
        for j, i in enumerate(idxs):
            s.add(start_pin(x0 - 12 * (len(idxs) - 1) + 24 * j, y0 + 4, str(i + 1), i == 0, 11))
    s.add(T(28, y + h - 14, 'omtrentlig rute', 11, 600, FOREST, italic=True, halo=LAND))
    s.add(T(MW - 28, y + h - 14, '© Kartverket', 10.5, 500, INK2, 'end', halo=LAND))
    return y + h


def keys_center(keys):
    pts = []
    for k in keys:
        pts += [gp(p) for p in TOURS[k]['wp']]
    return ((max(p[0] for p in pts) + min(p[0] for p in pts)) / 2 - 0.0008,
            (max(p[1] for p in pts) + min(p[1] for p in pts)) / 2)


def mob2():
    s = SVG(MW, 1640, 'Kortstokken – mobil – Resultat i godt vær (UJ-1)')
    y = mob_header(s, ['Værscenario: Godt vær', '«nå» = man. 9. nov. 13:30'])
    y = mob_summary(s, y + 2, 'I dag 13:30 · 2 t · Middels · utsikt', 'Værklasse god · 3–5 °C · oppholdsvær, lite vind')
    y = mob_card_screen(s, y + 2, C2[0], 3, map_h=104)
    mob_nav(s, 776, 1, 3)
    fold(s)
    y = 868
    t, yy = P(16, y + 14, 'Sveip kortet til siden, eller bruk pilene. Kortene ligger i rangert rekkefølge.', MW - 32, 13, 19, 400, MUTE)
    s.add(t)
    y = yy + 34
    s.add(T(16, y, 'Værmelding for ca. 400 moh. På toppene kan det', 13, 400, INK2))
    s.add(T(16, y + 19, 'være kaldere og mer vind. Tidsvindu 13:30–15:30.', 13, 400, INK2, tnum=True))
    y += 56
    s.add(T(16, y, 'Kart og liste', 18, 600, INK))
    y = mob_overview_map(s, y + 14, ['tusen', 'storli_m', 'ski'])
    y = mini_list(s, y + 36, C2, 'Alle tre i stokken')
    s.h = mob_footer(s, y + 12) + 30
    return s.save('mob-2-godt-vaer.svg')


def mob3():
    s = SVG(MW, 2060, 'Kortstokken – mobil – Resultat i dårlig vær med Værvarsling og Mørkevarsel-detalj')
    y = mob_header(s, ['Værscenario: Dårlig formiddag,', 'bedre fra kl. 14 · «nå» = søn. 8. nov. 20:15'])
    y = mob_summary(s, y + 2, 'I morgen, man. 9. nov. · 10:00', '3 t · Krevende · utsikt')
    # Værvarsling
    vy = y + 2
    s.add(R(16, vy, MW - 32, 228, 20, RUST_T, '#E2B9A2', 1.2))
    s.add(mark(38, vy + 26, 'warn', 12))
    s.add(T(58, vy + 32, 'Værvarsling: Værklasse dårlig', 16, 600, RUST))
    s.add(T(30, vy + 58, 'Regn opptil 3,5 mm/t og vind opp mot', 14, 500, INK, tnum=True))
    s.add(T(30, vy + 78, '9 m/s, 2–4 °C, kl. 10:00–13:00.', 14, 500, INK, tnum=True))
    s.add(T(30, vy + 100, 'Lavtliggende Turer og Turer som er egnet i', 13, 400, INK2))
    s.add(T(30, vy + 118, 'dårlig vær ligger øverst i stokken.', 13, 400, INK2))
    s.add(R(24, vy + 134, MW - 48, 86, 16, PAPER, FOREST, 1.8))
    s.add(T(38, vy + 158, 'BEDRE TIDSVINDU', 11, 700, FOREST, ls=1.2))
    s.add(T(38, vy + 180, 'I morgen fra kl. 14:00', 14, 600, INK, tnum=True))
    s.add(T(38, vy + 199, 'er Værklassen god', 14, 600, INK))
    s.add(btn(MW - 24 - 12 - 116, vy + 152, 116, 50, 'Bruk 14:00', 'primary', 15.5))
    y = vy + 228 + 14
    y = mob_card_screen(s, y, C3A[0], 3, map_h=96)
    fold(s)
    mob_nav(s, y + 14, 1, 3)
    y += 14 + 52 + 40
    # komponentdetalj

    s.add(T(28, y + 5, 'KOMPONENTDETALJ', 12, 700, INK, ls=1))
    s.add(T(24, y + 34, 'Slik vises Mørkevarsel', 18, 600, INK))
    s.add(T(24, y + 56, '(Tusenårsvarden fra Damefallet er', 13, 500, INK2))
    s.add(T(24, y + 74, 'rangert lenger ned)', 13, 500, INK2))
    cx, cw = 24, MW - 48
    cyy = y + 94
    ci = len(s.parts)
    s.add(T(cx + 16, cyy + 34, 'Tusenårsvarden', 22, 600, INK))
    s.add(T(cx + 16, cyy + 56, 'fra Damefallet · 1 t 32 min, start 14:00', 13.5, 500, INK2, tnum=True))
    rows, ry = crit_rows(cx + 16, cyy + 74, cw - 32, [
        dict(kind='ok', label='Tid', value='1 t 32 min av 3 t', detail='gangtid, uten pauser'),
        dict(kind='warn', label='Mørke', value='Mørkevarsel',
             detail=['tilbake ca. 15:32', 'Sola går ned 15:59. Turen ender ca. 15:32 uten pauser, etter grensen 30 min før solnedgang.'],
             viz=('day', hm('14:00'), hm('15:32')))], vx_off=88, vsize=15.5, dsize=13)
    s.add(rows)
    ch = ry - cyy + 4
    s.parts.insert(ci, f'<path d="{card_path(cx, cyy, cw, ch, 22)}" fill="{PAPER}" stroke="#CDBEA3" stroke-width="1.4"/>')
    FH = cyy - y + ch + 16
    s.parts.insert(ci, R(8, y, MW - 16, FH, 22, 'none', INK2, 1.3, '6 5') + R(20, y - 12, 150, 24, 12, BG))
    s.add(T(28, y + 5, 'KOMPONENTDETALJ', 12, 700, INK, ls=1))
    y += FH + 30
    s.h = mob_footer(s, y) + 30
    return s.save('mob-3-darlig-vaer.svg')


def mob4():
    s = SVG(MW, 1090, 'Kortstokken – mobil – Frarådet, ingen Turforslag (UJ-3)')
    y = mob_header(s, ['Værscenario: Sterk kuling', '«nå» = lør. 14. nov. 09:40'])
    y = mob_summary(s, y + 2, 'I dag, lør. 14. nov. · 10:00', '2 t · Middels · ingen Opplevelsespreferanser')
    x, w = 16, MW - 32
    ch = 590
    s.add(card_frame(x, y + 4, w, ch, y + 4 + 356, False))
    wind_art(s, x, y + 4, w, 110)
    cy = y + 4 + 110
    s.add(stamp(x + 20, cy - 22, '!', 44, RUST))
    s.add(T(x + 74, cy + 18, 'Ingen Turforslag', 13, 600, INK2))
    s.add(T(x + 20, cy + 62, 'Værklasse frarådet', 26, 600, RUST))
    t, yy = P(x + 20, cy + 92, 'Det er meldt sterk kuling, vind opp mot 19 m/s i Tidsvinduet ditt (10:00–12:00).',
              w - 40, 16, 23, 500, INK, tnum=True)
    s.add(t)
    t, yy = P(x + 20, yy + 30, 'Frarådet går foran tid og ønsker, så vi legger ingen kort på bordet nå.', w - 40, 14, 20, 400, INK2)
    s.add(t)
    s.add(T(x + 20, yy + 30, 'Sjekk også MET sine farevarsler.', 14, 600, FOREST, deco='underline'))
    # Bedre tidsvindu-del
    by = y + 4 + 356 + 26
    s.add(mark(x + 33, by + 8, 'ok', 12))
    s.add(T(x + 54, by + 13, 'ALTERNATIV · BEDRE TIDSVINDU', 11.5, 700, FOREST, ls=1.2))
    s.add(T(x + 20, by + 50, 'I morgen (søn. 15. nov.)', 22, 600, INK))
    s.add(T(x + 20, by + 74, 'fra kl. 11:00 · samme 2 t, Middels', 15, 500, INK2, tnum=True))
    s.add(T(x + 20, by + 104, 'Tar du det i bruk, får du Turforslag som vanlig.', 13.5, 400, INK2))
    s.add(btn(16, 768, MW - 32, 60, 'Bruk i morgen 11:00', 'primary', 19))
    fold(s)
    s.h = mob_footer(s, 880, ansvar=False) + 30
    return s.save('mob-4-fraradet.svg')


def mob5():
    s = SVG(MW, 1300, 'Kortstokken – mobil – Ingen Tur passer, og Værmeldingen mangler (live-modus)')
    y = mob_header(s, None)
    y = mob_summary(s, y + 2, 'I dag, man. 9. nov. · 13:30', '15 min · Middels · ingen Opplevelsespreferanser')
    s.add(R(16, y + 2, MW - 32, 62, 16, PAPER, LINE, 1))
    s.add(mark(36, y + 24, 'none', 10))
    s.add(T(54, y + 28, 'Været er ikke vurdert.', 14, 600, INK))
    s.add(T(30, y + 50, 'Vi fikk ikke hentet Værmeldingen fra MET.', 13, 400, INK2))
    y += 64 + 30
    s.add(T(16, y + 6, 'Ingen Tur passer 15 min.', 22, 600, INK))
    s.add(T(16, y + 30, 'Den korteste Turen tar 16 min:', 14, 400, INK2))
    y = mob_card_screen(s, y + 46, C5, 1, map_h=92)
    s.add(btn(16, 776, MW - 32, 56, 'Endre Tilgjengelig tid', 'primary', 18))
    fold(s)
    y = max(y, 844) + 30
    t, yy = P(16, y, 'Med 30 min eller mer passer minst én Tur. Kartet over viser Startpunktet og Omtrentlig rute.',
              MW - 32, 13, 19, 400, MUTE)
    s.add(t)
    s.h = mob_footer(s, yy + 26) + 30
    return s.save('mob-5-ingen-tur-uten-vaer.svg')


if __name__ == '__main__':
    sizes = {}
    for f in [pc1, pc2, pc3a, pc3b, pc4, pc5, mob1, mob2, mob3, mob4, mob5]:
        sizes[f.__name__] = f()
    print(sizes)
