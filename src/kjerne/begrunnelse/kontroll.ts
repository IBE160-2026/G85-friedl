// Kontrollen av Språkmodellteksten (FR-22, NFR-2, AD-12). Ren: samme tekst, Regeltekst og fakta gir
// samme svar. Teksten godkjennes bare når alle fire reglene holder:
//   1. hver ferdig formaterte verdi i Regelteksten står ordrett i teksten,
//   2. hvert tall i teksten står i Regelteksten eller i fakta om Turen, et tall med enhet som verdi
//      med samme enhet,
//   3. teksten skriver ikke tid eller mengde med ord («to timer», «halvannen time»),
//   4. teksten bruker ikke trygg-ordene (trygg, trygt, trygge, tryggere, tryggest, utrygg …).
// Før sammenligning normaliseres teksten: NFC, myk bindestrek og tegn uten bredde fjernes,
// mellomromsvarianter (NBSP, smalt NBSP) blir vanlig mellomrom, strek mellom to tall blir tankestrek
// («3-5 °C» er «3–5 °C»), og bindestrek rett foran et tall blir minus («-2» er «−2»).
// Tall sammenlignes som skrevet: appen skriver desimalkomma, så «3.4» er ikke «3,4», og «1.000» og
// «6,450» er ukjente tall.

export type Grunn =
  | { type: "mangler-verdi"; verdi: string }
  | { type: "ukjent-tall"; tall: string }
  | { type: "tall-med-ord"; frase: string }
  | { type: "forbudt-ord"; ord: string };

export type Kontrollresultat = { godkjent: true } | { godkjent: false; grunner: Grunn[] };

/** Et tall slik format.ts skriver det: «4», «−2», «3,5». */
const TALL = String.raw`−?\d+(?:,\d+)?`;

/** Enhetene i målinger, de lengste først så «mm/t» ikke leses som «m». */
const ENHETER = String.raw`mm\/t|m\/s|°C|moh|høydemeter|km|m`;

/** Ikke midt i et tall, et intervall eller en varighet: «16 min» i «1 t 16 min», «5 °C» i «3–5 °C». */
const FORAN = String.raw`(?<![\p{L}\p{N},.−–])(?<!\d+ t )(?<!\d til )`;
/** Ingen bokstav, siffer eller skråstrek rett etter, og ikke et tall til («1 t» i «1 t 16 min»). */
const ETTER = String.raw`(?![\p{L}\p{N}\/])(?! ?\d)`;

/**
 * Varigheter («1 t 32 min», «2 t», «45 min») og målinger med enhet («3,5 mm/t», «9,2 m/s»,
 * «3–5 °C», «−2 til 1 °C», «340 moh»).
 */
const FORMATERT_VERDI = new RegExp(
  `${FORAN}(?:\\d+ t(?: \\d+ min)?|\\d+ min|${TALL}(?:–${TALL}| til ${TALL})? (?:${ENHETER}))${ETTER}`,
  "gu",
);

function normaliser(tekst: string): string {
  return tekst
    .normalize("NFC")
    .replace(/[­​-‍⁠﻿]/g, "")
    .replace(/\s+/g, " ")
    .replace(/(\d) ?[-‐‑‒–—] ?(?=\d)/g, "$1–")
    .replace(/-(?=\d)/g, "−");
}

/** De ferdig formaterte verdiene i Regelteksten, i rekkefølge og uten duplikater. */
export function formaterteVerdier(regeltekst: string): string[] {
  return [...new Set(normaliser(regeltekst).match(FORMATERT_VERDI) ?? [])];
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Hele verdien `verdi` i normalisert tekst, med de samme grensene som når verdiene finnes. */
const verdiRegex = (verdi: string) => new RegExp(`${FORAN}${escape(verdi)}${ETTER}`, "gu");

/**
 * Et tall i teksten med fortegn, sifre og skilletegn som skrevet («−340», «6,45», «1.000», «1½»),
 * og enheten rett etter når den finnes. Alle tallsifre telles, så «½» og «²» også er tall.
 */
const TALL_I_TEKST =
  /(?<!\p{N})(−?\p{N}+(?:[.,]\p{N}+)*)(?: ?(mm\/t|m\/s|°C|moh|høydemeter|km|min|m|t)(?![\p{L}\p{N}\/]))?/gu;

/** Tallene i `tekst`, uten enhet. */
const tallI = (tekst: string) => [...normaliser(tekst).matchAll(TALL_I_TEKST)].map((m) => m[1]);

const TALLORD =
  "(?:tjue|tretti|førti|femti|seksti|sytti|åtti|nitti)(?:en|ett|to|tre|fire|fem|seks|sju|syv|åtte|ni)?|" +
  "null|en|et|ett|ei|to|tre|fire|fem|seks|sju|syv|åtte|ni|ti|elleve|tolv|tretten|fjorten|femten|seksten|sytten|" +
  "atten|nitten|hundre|tusen|et par";

/** Enheter for tid og mengde, med flertall, bestemt form og genitiv. */
const ORDENHETER =
  "timer?s?|timen|t|minutt(?:er|ene|s)?|min|kilometer|km|millimeter|mm|meter|m|høydemeter|moh|mil|døgn|" +
  "grad(?:er)?|sekund(?:er)?|kvarter(?:s|et)?|halvtime[ns]?";

const BROKORD = "halvannen|halvtime[ns]?|halv[te]?|kvarter(?:s|et)?";

const helord = (ord: string) => `(?<!\\p{L})(?:${ord})(?!\\p{L})`;

/** Brøkord med tallordet foran og enheten etter når de finnes («en halv time»), eller tallord og enhet. */
const TALL_MED_ORD = new RegExp(
  helord(`(?:(?:${TALLORD}) )?(?:${BROKORD})(?: (?:${ORDENHETER}))?|(?:${TALLORD}) (?:${ORDENHETER})`),
  "giu",
);

/** Trygg-ordene som hele ord. Mønsteret skrives uten ordene i klartekst, så tekstsjekken i UX-DR47 holder. */
const TRYGG = new RegExp(helord("u?tryg(?:g|t|ge|gere|gest|geste)"), "giu");

/**
 * Godkjenner Språkmodellteksten `tekst` mot `regeltekst` og fakta om Turen (`lagTurfakta`), eller
 * avviser den med alle grunnene, i regelrekkefølgen.
 */
export function kontrollerSprakmodelltekst(
  tekst: string,
  regeltekst: string,
  fakta: readonly string[],
): Kontrollresultat {
  const normalisert = normaliser(tekst);
  const grunner: Grunn[] = [];

  // Regel 1. Verdiene som står i teksten, er dekket og tas bort før regel 2, de lengste først.
  let utenVerdier = normalisert;
  const verdier = formaterteVerdier(regeltekst);
  for (const verdi of verdier) {
    if (!verdiRegex(verdi).test(normalisert)) grunner.push({ type: "mangler-verdi", verdi });
  }
  for (const verdi of [...verdier].sort((a, b) => b.length - a.length)) {
    utenVerdier = utenVerdier.replace(verdiRegex(verdi), " ");
  }

  // Regel 2.
  const kilder = [regeltekst, ...fakta];
  const kjenteTall = new Set(kilder.flatMap(tallI));
  const kjenteVerdier = new Set(kilder.flatMap(formaterteVerdier));
  const ukjente = new Set<string>();
  for (const [, tall, enhet] of utenVerdier.matchAll(TALL_I_TEKST)) {
    const somAppenSkriver = /^−?\d+(?:,\d+)?$/.test(tall);
    const kjent = somAppenSkriver && (enhet ? kjenteVerdier.has(`${tall} ${enhet}`) : kjenteTall.has(tall));
    if (!kjent && !ukjente.has(tall)) {
      ukjente.add(tall);
      grunner.push({ type: "ukjent-tall", tall });
    }
  }

  // Regel 3, i tekstrekkefølge.
  for (const [frase] of normalisert.matchAll(TALL_MED_ORD)) grunner.push({ type: "tall-med-ord", frase });

  // Regel 4.
  for (const [ord] of normalisert.matchAll(TRYGG)) grunner.push({ type: "forbudt-ord", ord });

  return grunner.length === 0 ? { godkjent: true } : { godkjent: false, grunner };
}
