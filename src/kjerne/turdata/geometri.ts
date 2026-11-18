// Avstander i meter for sjekkene i FR-27. Punktene er WGS84, og linjene er [lon, lat] som i GeoJSON.
// Avstanden regnes i en lokal ekvirektangulær projeksjon rundt punktet. Det er nøyaktig nok
// for avstander under 10 km, og det er alt sjekkene trenger.

export type Punkt = { lat: number; lon: number };
export type Linje = readonly (readonly [number, number])[];

/** Middelradien til jorda i meter (IUGG). */
const JORDRADIUS_M = 6_371_008.8;
const RAD = Math.PI / 180;

/** Projiserer [lon, lat] til meter (x øst, y nord) rundt `origo`. */
function projeksjon(origo: Punkt) {
  const kx = JORDRADIUS_M * RAD * Math.cos(origo.lat * RAD);
  const ky = JORDRADIUS_M * RAD;
  return ([lon, lat]: readonly [number, number]): [number, number] => [(lon - origo.lon) * kx, (lat - origo.lat) * ky];
}

/** Avstanden i planet fra origo til linjestykket a–b. */
function avstandFraOrigo([ax, ay]: [number, number], [bx, by]: [number, number]): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengde2 = dx * dx + dy * dy;
  const t = lengde2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengde2));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

/** Avstanden i meter mellom to punkter. */
export function avstand(a: Punkt, b: Punkt): number {
  const [x, y] = projeksjon(a)([b.lon, b.lat]);
  return Math.hypot(x, y);
}

/** Korteste avstand i meter fra et punkt til en linje. */
export function avstandTilLinje(punkt: Punkt, linje: Linje): number {
  const proj = projeksjon(punkt);
  if (linje.length === 1) return Math.hypot(...proj(linje[0]));
  let minst = Infinity;
  let forrige = proj(linje[0]);
  for (let i = 1; i < linje.length; i++) {
    const neste = proj(linje[i]);
    minst = Math.min(minst, avstandFraOrigo(forrige, neste));
    forrige = neste;
  }
  return minst;
}

/** Korteste avstand i meter fra et punkt til noen av linjene. */
export function avstandTilLinjer(punkt: Punkt, linjer: readonly Linje[]): number {
  return Math.min(...linjer.map((linje) => avstandTilLinje(punkt, linje)));
}

const tilPunkt = ([lon, lat]: readonly [number, number]): Punkt => ({ lat, lon });

/** Minste avstand fra et endepunkt på den ene linja til den andre linja, begge veier. */
function kant(a: Linje, b: Linje): number {
  return Math.min(
    avstandTilLinje(tilPunkt(a[0]), b),
    avstandTilLinje(tilPunkt(a[a.length - 1]), b),
    avstandTilLinje(tilPunkt(b[0]), a),
    avstandTilLinje(tilPunkt(b[b.length - 1]), a),
  );
}

/**
 * Største hull i meter mellom linjebitene. Linjebitene er noder, og kanten mellom to biter er
 * minste avstand fra et endepunkt til den andre linja. Svaret er største kant i minste spenntre,
 * altså det lengste spranget som trengs for å binde alle bitene sammen. 0 for én eller ingen linje.
 */
export function storsteHull(linjer: readonly Linje[]): number {
  const n = linjer.length;
  if (n < 2) return 0;

  // Prim: `best[i]` er korteste kant fra treet til node i.
  const iTreet = new Array<boolean>(n).fill(false);
  const best = new Array<number>(n).fill(Infinity);
  best[0] = 0;
  let storst = 0;

  for (let runde = 0; runde < n; runde++) {
    let neste = -1;
    for (let i = 0; i < n; i++) {
      if (!iTreet[i] && (neste < 0 || best[i] < best[neste])) neste = i;
    }
    iTreet[neste] = true;
    storst = Math.max(storst, best[neste]);
    for (let i = 0; i < n; i++) {
      if (!iTreet[i]) best[i] = Math.min(best[i], kant(linjer[neste], linjer[i]));
    }
  }
  return storst;
}
