import { parseMetCompact } from "@/kjerne/vaer/met-compact";
import type { Vaermelding } from "@/kjerne/vaer/typer";
import { VAERPUNKT } from "@/kjerne/vaerpunkt";
import type { Vaerkilde } from "./typer";
import pakke from "../../../package.json";

// MET-adapteren (story 2.4, FR-13, AD-6, AR-10, AR-24): den eneste MET-klienten i appen.
// Henter Locationforecast `compact` for Værpunktet og parser svaret med `parseMetCompact`.
// MET-vilkårene: bare fra serveren, over HTTPS, med identifiserende User-Agent, betingede kall
// (`If-Modified-Since`), ingen kall innenfor `Expires` og maks fire desimaler i koordinatene.
// Fila er skjermet fra nettleseren av lagreglene i eslint.config.mjs: src/ui/ og src/app/
// (utenom API-rutene) importerer ikke fra src/server/. `fetch` og klokka kommer inn som
// avhengigheter, så testene aldri kaller MET, og klokka fortsatt bare leses i miljo.ts.
// `lagMiljo` i src/server/miljo.ts har den ene instansen.

const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/compact";
const USER_AGENT = `turplanlegger-ibe160/${pakke.version} https://github.com/IBE160-2026/G85-friedl`;

/** `fetch` slik adapteren bruker den. Den ekte `fetch` passer. */
export type MetFetch = (url: string, init: RequestInit) => Promise<Response>;

export type MetAvhengigheter = {
  fetch: MetFetch;
  /** «Nå» som epoke-ms. */
  klokke: () => number;
  /** Tidsgrensen for hele kallet, også lesingen av svaret. Standard 2 s (NFR-4). */
  tidsgrenseMs?: number;
};

/**
 * Tallet med høyst fire desimaler, trunkert og aldri rundet (MET-vilkårene).
 * Går via tallets korteste desimalform, så flyttallsfeil ikke gir en desimal for lite:
 * `62.76179` gir `"62.7617"`, og `7.1` gir `"7.1"`. Avsluttende nuller fjernes.
 */
export function trunker4(x: number): string {
  if (!Number.isFinite(x)) throw new Error(`trunker4: ${x} er ikke et endelig tall.`);
  if (Math.abs(x) < 1e-4) return "0";
  const treff = /^(-?\d+)(?:\.(\d+))?$/.exec(String(x));
  if (!treff) throw new Error(`trunker4: ${x} kan ikke skrives med desimaler.`);
  const [, heltall, desimaler = ""] = treff;
  const fire = desimaler.slice(0, 4).replace(/0+$/, "");
  return fire ? `${heltall}.${fire}` : heltall;
}

/** En post i `VaerCache`. */
export type CachePost = {
  melding: Vaermelding;
  /** Fra `Expires`. Før dette sendes ingen kall. Uten gyldig `Expires` er posten utløpt med en gang. */
  utloperMs: number;
  /** Råverdien av `Last-Modified`, eller `null`. Sendes som `If-Modified-Since`. */
  sistEndret: string | null;
};

/** Svaret fra `forny` når kallet feilet: ingen nye kall før `ikkeForMs` (epoke-ms). */
export type Feilet = { ikkeForMs: number };

/** Ventetiden etter en feil når MET ikke sier noe annet med `Retry-After`. */
export const VENTETID_ETTER_FEIL_MS = 60 * 1000;

/**
 * Cachen for Værmeldingen i minnet, nøklet på `lat|lon|altitude`. Den har ett pågående kall
 * per nøkkel: samtidige forespørsler venter på det samme løftet, som fjernes når kallet er ferdig.
 * Etter en feil sendes ingen kall for nøkkelen før «ikke før»-tiden (MET ber klienter strupe seg).
 * Utløpt data gis aldri ut.
 */
export class VaerCache {
  private readonly poster = new Map<string, CachePost>();
  private readonly pagaende = new Map<string, Promise<Vaermelding | null>>();
  private readonly ikkeFor = new Map<string, number>();

  /**
   * Meldingen når posten for `nokkel` gjelder ved `na`. Ellers `null` uten kall før «ikke før»-tiden
   * etter en feil. Ellers kalles `forny` med den utløpte posten (eller `undefined`), én gang per
   * nøkkel om gangen. `forny` gir den nye posten, eller `Feilet` ved feil, og skal ikke kaste.
   * Ved `Feilet` beholdes den gamle posten for neste betingede kall.
   */
  hent(
    nokkel: string,
    na: number,
    forny: (post: CachePost | undefined) => Promise<CachePost | Feilet>,
  ): Promise<Vaermelding | null> {
    const post = this.poster.get(nokkel);
    if (post && na < post.utloperMs) return Promise.resolve(post.melding);

    const pagaende = this.pagaende.get(nokkel);
    if (pagaende) return pagaende;

    const ikkeFor = this.ikkeFor.get(nokkel);
    if (ikkeFor !== undefined && na < ikkeFor) return Promise.resolve(null);

    const kall = forny(post)
      .then((ny) => {
        if ("ikkeForMs" in ny) {
          this.ikkeFor.set(nokkel, ny.ikkeForMs);
          return null;
        }
        this.ikkeFor.delete(nokkel);
        this.poster.set(nokkel, ny);
        return ny.melding;
      })
      .finally(() => this.pagaende.delete(nokkel));
    this.pagaende.set(nokkel, kall);
    return kall;
  }
}

/** Epoke-ms fra en HTTP-dato, eller minus uendelig når verdien mangler eller er ugyldig. */
function utloper(expires: string | null): number {
  const ms = expires === null ? Number.NaN : Date.parse(expires);
  return Number.isNaN(ms) ? Number.NEGATIVE_INFINITY : ms;
}

/** «Ikke før» fra `Retry-After` (sekunder eller HTTP-dato), eller `null` når den mangler eller er ugyldig. */
function provIgjenEtter(verdi: string | null, na: number): number | null {
  if (verdi === null) return null;
  const tekst = verdi.trim();
  if (/^\d+$/.test(tekst)) return na + Number(tekst) * 1000;
  const ms = Date.parse(tekst);
  return Number.isNaN(ms) ? null : ms;
}

/** Værmeldingen frosset helt ned til hver time, fordi alle forespørsler får det samme objektet. */
function frys(melding: Vaermelding): Vaermelding {
  for (const time of melding.timer) Object.freeze(time);
  Object.freeze(melding.timer);
  return Object.freeze(melding);
}

/**
 * En kjent feil, logget som `console.error(melding, cause)`. `ikkeForMs` er «ikke før»-tiden
 * fra `Retry-After`, når MET sendte en.
 */
class MetFeil extends Error {
  readonly ikkeForMs: number | null;
  constructor(melding: string, cause: unknown, ikkeForMs: number | null = null) {
    super(melding, { cause });
    this.name = "MetFeil";
    this.ikkeForMs = ikkeForMs;
  }
}

/**
 * En trygg oppsummering av en feil for loggen: `name`, `message` og eventuelt `code`.
 * Ingenting fra `cause`, som kan ha forespørselsdata (for eksempel vert og IP fra undici).
 */
function oppsummer(feil: unknown): unknown {
  if (!(feil instanceof Error)) return typeof feil === "string" || typeof feil === "number" ? feil : String(feil);
  const kode = (feil as { code?: unknown }).code;
  return {
    name: feil.name,
    message: feil.message,
    ...(typeof kode === "string" || typeof kode === "number" ? { code: kode } : {}),
  };
}

/**
 * En `Vaerkilde` som henter Værmeldingen for Værpunktet fra MET, med egen `VaerCache`.
 * Gir `null` og logger med `console.error` ved tidsavbrudd, nettverksfeil, annen status enn
 * 200, 203 og 304, svar som ikke kan parses eller ikke har noen timer, og 304 uten noe i cachen.
 * Etter en feil gir den `null` uten kall i 60 s, eller så lenge `Retry-After` sier ved 429 og 503.
 * 203 (produktet er utfaset) brukes som 200, med én `console.warn`. Kaster aldri.
 *
 * Cachen hører til instansen. Lag derfor én instans én gang på modulnivå og bruk den for hele
 * prosessen: en instans per forespørsel får en tom cache og kaller MET hver gang.
 * `klokke` skal komme fra src/server/miljo.ts, som er eneste sted appen leser klokka.
 * Kaster ved oppretting når `tidsgrenseMs` ikke er et endelig tall over 0.
 */
export function lagMetVaerkilde({ fetch, klokke, tidsgrenseMs = 2000 }: MetAvhengigheter): Vaerkilde {
  if (!Number.isFinite(tidsgrenseMs) || tidsgrenseMs <= 0) {
    throw new Error(`lagMetVaerkilde: tidsgrenseMs må være et endelig tall over 0, ikke ${tidsgrenseMs}.`);
  }
  const lat = trunker4(VAERPUNKT.lat);
  const lon = trunker4(VAERPUNKT.lon);
  const altitude = String(Math.round(VAERPUNKT.hoydeMoh));
  const url = `${MET_URL}?lat=${lat}&lon=${lon}&altitude=${altitude}`;
  const nokkel = `${lat}|${lon}|${altitude}`;
  const cache = new VaerCache();
  let utfasingVarslet = false;

  /** Kallet og tolkningen av svaret. Kaster ved feil. */
  async function hentPost(post: CachePost | undefined, signal: AbortSignal, na: number): Promise<CachePost> {
    const headers: Record<string, string> = { "User-Agent": USER_AGENT };
    if (post?.sistEndret) headers["If-Modified-Since"] = post.sistEndret;

    const svar = await fetch(url, { headers, cache: "no-store", signal });
    const utloperMs = utloper(svar.headers.get("Expires"));
    const sistEndret = svar.headers.get("Last-Modified");

    // Status leses direkte: 304 er ikke `ok`.
    if (svar.status === 304) {
      if (!post) throw new MetFeil("MET: 304 uten Værmelding i cachen", svar.status);
      return { melding: post.melding, utloperMs, sistEndret: sistEndret ?? post.sistEndret };
    }
    if (svar.status !== 200 && svar.status !== 203) {
      void svar.body?.cancel().catch(() => {});
      const ikkeFor =
        svar.status === 429 || svar.status === 503 ? provIgjenEtter(svar.headers.get("Retry-After"), na) : null;
      throw new MetFeil("MET: uventet status", svar.status, ikkeFor);
    }
    if (svar.status === 203 && !utfasingVarslet) {
      utfasingVarslet = true;
      console.warn("MET: produktet er utfaset", svar.status);
    }

    const data: unknown = await svar.json();
    const melding = frys(parseMetCompact(data));
    if (melding.timer.length === 0) throw new MetFeil("MET: svaret har ingen timer", "ingen rader med next_1_hours");
    return { melding, utloperMs, sistEndret };
  }

  /** `hentPost` med tidsgrense. Gir `Feilet` og logger ved alle feil. */
  async function forny(post: CachePost | undefined, na: number): Promise<CachePost | Feilet> {
    const kontroller = new AbortController();
    let tidtaker: ReturnType<typeof setTimeout> | undefined;
    const tidsavbrudd = new Promise<never>((_, avvis) => {
      tidtaker = setTimeout(() => {
        const feil = new MetFeil("MET: tidsavbrudd", `${tidsgrenseMs} ms`);
        kontroller.abort(feil);
        avvis(feil);
      }, tidsgrenseMs);
    });

    try {
      return await Promise.race([hentPost(post, kontroller.signal, na), tidsavbrudd]);
    } catch (feil) {
      if (feil instanceof MetFeil) console.error(feil.message, oppsummer(feil.cause));
      else console.error("MET: kallet eller svaret feilet", oppsummer(feil));
      const ikkeForMs = feil instanceof MetFeil ? feil.ikkeForMs : null;
      return { ikkeForMs: ikkeForMs ?? na + VENTETID_ETTER_FEIL_MS };
    } finally {
      clearTimeout(tidtaker);
    }
  }

  return () => {
    const na = klokke();
    return cache.hent(nokkel, na, (post) => forny(post, na));
  };
}
