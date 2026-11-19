import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { osloTilUtc, TIME_MS } from "@/kjerne/tid";
import { parseMetCompact } from "@/kjerne/vaer/met-compact";
import { klasseForTidsvindu } from "@/kjerne/vaer/vaerklasse";
import uj1Met from "../../../data/vaerscenarioer/uj-1/met.json";
import uj2Met from "../../../data/vaerscenarioer/uj-2/met.json";
import pakke from "../../../package.json";
import { lagMetVaerkilde, trunker4, VaerCache, VENTETID_ETTER_FEIL_MS, type MetFetch } from "./met";

// MET-adapteren (story 2.4). Ingen test kaller MET: alle bruker en falsk `fetch`,
// og den globale `fetch` er byttet ut med en som feiler testen hvis noe bruker den.

const URL_FORVENTET =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=62.7617&lon=7.1679&altitude=400";
const USER_AGENT = `turplanlegger-ibe160/${pakke.version} https://github.com/IBE160-2026/G85-friedl`;

const START = Date.UTC(2026, 10, 19, 12, 0);
const MIN = 60 * 1000;
const httpDato = (ms: number) => new Date(ms).toUTCString();
const SIST_ENDRET = httpDato(START - 5 * MIN);

type Svar = { status: number; body?: unknown; headers?: Record<string, string> };

/** Et `Response` som fra MET. `body` som streng sendes rått, ellers som JSON. */
function svar({ status, body, headers = {} }: Svar): Response {
  const tekst = body === undefined ? null : typeof body === "string" ? body : JSON.stringify(body);
  return new Response(status === 304 ? null : tekst, { status, headers });
}

const ok = (expires: number | null, body: unknown = uj1Met, lastModified: string | null = SIST_ENDRET) =>
  svar({
    status: 200,
    body,
    headers: {
      ...(expires === null ? {} : { Expires: httpDato(expires) }),
      ...(lastModified === null ? {} : { "Last-Modified": lastModified }),
    },
  });

/** En falsk `fetch` som gir svarene i rekkefølge. */
function falskFetch(...svarene: (() => Response | Promise<Response>)[]): Mock<MetFetch> {
  let i = 0;
  return vi.fn<MetFetch>(async () => {
    const neste = svarene[i++];
    if (!neste) throw new Error("Den falske fetch har ingen flere svar.");
    return neste();
  });
}

let na = START;
const klokke = () => na;
let logg: Mock<typeof console.error>;
let advarsel: Mock<typeof console.warn>;

beforeEach(() => {
  na = START;
  logg = vi.spyOn(console, "error").mockImplementation(() => {}) as Mock<typeof console.error>;
  advarsel = vi.spyOn(console, "warn").mockImplementation(() => {}) as Mock<typeof console.warn>;
  vi.stubGlobal("fetch", () => {
    throw new Error("En test brukte den ekte fetch.");
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Et loggargument som tekst: strenger som de er, alt annet som JSON (med `message` for feil). */
const somTekst = (x: unknown) =>
  typeof x === "string" ? x : JSON.stringify(x, (_, v) => (v instanceof Error ? { ...v, message: v.message } : v));

/** Alle argumentene i alle `console.error` og `console.warn`, som tekst. */
const altLogget = () => [...logg.mock.calls, ...advarsel.mock.calls].flat().map(somTekst).join(" ");

/** Ingen forespørselsdata i noe loggargument. */
function forventIngenForesporselsdata() {
  expect(altLogget()).not.toMatch(/api\.met\.no|turplanlegger-ibe160|User-Agent|lat=|If-Modified-Since|1\.2\.3\.4/);
}

/** Sjekker at det er logget nøyaktig én gang, med «MET: » først, og uten forespørselsdata. */
function forventEnLogg(monster: RegExp) {
  expect(logg).toHaveBeenCalledTimes(1);
  const [melding, ...resten] = logg.mock.calls[0];
  expect(String(melding)).toMatch(/^MET: /);
  expect(String(melding)).toMatch(monster);
  const alt = [melding, ...resten].map(somTekst).join(" ");
  expect(alt).not.toContain("api.met.no");
  expect(alt).not.toContain(USER_AGENT);
}

const MELDING_UJ1 = parseMetCompact(uj1Met);

describe("trunker4", () => {
  it.each([
    [62.76179, "62.7617"],
    [7.16799, "7.1679"],
    [7.1, "7.1"],
    [62.7617, "62.7617"],
    [7.1679, "7.1679"],
    [400, "400"],
    [0.1 + 0.2, "0.3"],
    [1.00009, "1"],
    [-7.16799, "-7.1679"],
    [-0.00009, "0"],
    [0, "0"],
  ])("%s gir %j", (x, forventet) => {
    expect(trunker4(x)).toBe(forventet);
  });

  it("kaster for tall som ikke er endelige", () => {
    expect(() => trunker4(Number.NaN)).toThrow();
    expect(() => trunker4(Number.POSITIVE_INFINITY)).toThrow();
  });
});

describe("lagMetVaerkilde", () => {
  it("første kall: riktig URL, User-Agent og cache: 'no-store', og en Værmelding tilbake", async () => {
    const fetch = falskFetch(() => ok(START + 30 * MIN));
    const melding = await lagMetVaerkilde({ fetch, klokke })();

    expect(melding).toEqual(MELDING_UJ1);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe(URL_FORVENTET);
    expect(init.cache).toBe("no-store");
    expect(init.headers).toEqual({ "User-Agent": USER_AGENT });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(logg).not.toHaveBeenCalled();
  });

  it("Værmeldingen i cachen er frosset helt ned til hver time", async () => {
    const melding = (await lagMetVaerkilde({ fetch: falskFetch(() => ok(START + 30 * MIN)), klokke })())!;
    expect(Object.isFrozen(melding)).toBe(true);
    expect(Object.isFrozen(melding.timer)).toBe(true);
    expect(melding.timer.every((t) => Object.isFrozen(t))).toBe(true);
  });

  it("innenfor Expires: ingen fetch, samme melding", async () => {
    const fetch = falskFetch(() => ok(START + 30 * MIN));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();

    na = START + 10 * MIN;
    const andre = await vaerkilde();
    expect(andre).toBe(forste);
    na = START + 30 * MIN - 1;
    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("etter Expires, 304: If-Modified-Since lik Last-Modified, samme melding og levetiden forlenget", async () => {
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 61 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();

    na = START + 31 * MIN;
    const andre = await vaerkilde();
    expect(andre).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toBe(URL_FORVENTET);
    expect(fetch.mock.calls[1][1].headers).toEqual({ "User-Agent": USER_AGENT, "If-Modified-Since": SIST_ENDRET });
    expect(fetch.mock.calls[1][1].cache).toBe("no-store");

    // Levetiden er forlenget til det nye Expires.
    na = START + 60 * MIN;
    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(logg).not.toHaveBeenCalled();
  });

  it("etter Expires, 200: ny melding som erstatter posten", async () => {
    const nyttSvar = structuredClone(uj2Met);
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => ok(START + 70 * MIN, nyttSvar, httpDato(START + 35 * MIN)),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 120 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    await vaerkilde();

    na = START + 40 * MIN;
    const ny = await vaerkilde();
    expect(ny).toEqual(parseMetCompact(uj2Met));
    expect(ny).not.toEqual(MELDING_UJ1);

    // Posten er erstattet: ny levetid og ny Last-Modified.
    na = START + 69 * MIN;
    expect(await vaerkilde()).toBe(ny);
    expect(fetch).toHaveBeenCalledTimes(2);
    na = START + 71 * MIN;
    expect(await vaerkilde()).toBe(ny);
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ "If-Modified-Since": httpDato(START + 35 * MIN) });
  });

  it("samtidige: fetch kalles én gang, og begge får samme melding", async () => {
    let los!: (r: Response) => void;
    const fetch = falskFetch(() => new Promise<Response>((r) => (los = r)));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });

    const a = vaerkilde();
    const b = vaerkilde();
    await Promise.resolve();
    expect(fetch).toHaveBeenCalledTimes(1);
    los(ok(START + 30 * MIN));

    const [ma, mb] = await Promise.all([a, b]);
    expect(ma).toEqual(MELDING_UJ1);
    expect(mb).toBe(ma);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("samtidige som feiler: begge får null, og løftet fjernes så neste Søk etter ventetiden prøver igjen", async () => {
    let avvis!: (e: Error) => void;
    const fetch = falskFetch(() => new Promise<Response>((_, a) => (avvis = a)), () => ok(START + 30 * MIN));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });

    const a = vaerkilde();
    const b = vaerkilde();
    await Promise.resolve();
    avvis(new TypeError("fetch failed"));
    expect(await a).toBeNull();
    expect(await b).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    forventEnLogg(/MET: /);

    na = START + VENTETID_ETTER_FEIL_MS;
    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("tidsavbrudd: fetch løses aldri, null etter 2 s og console.error", async () => {
    vi.useFakeTimers();
    const fetch = falskFetch(() => new Promise<Response>(() => {}));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });

    let ferdig = false;
    const resultat = vaerkilde().then((m) => {
      ferdig = true;
      return m;
    });
    await vi.advanceTimersByTimeAsync(1999);
    expect(ferdig).toBe(false);
    expect(fetch.mock.calls[0][1].signal!.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    expect(await resultat).toBeNull();
    expect(fetch.mock.calls[0][1].signal!.aborted).toBe(true);
    forventEnLogg(/tidsavbrudd/);
    expect(logg.mock.calls[0][1]).toBe("2000 ms");
  });

  it("tidsavbrudd gjelder også lesingen av svaret", async () => {
    vi.useFakeTimers();
    const henger = {
      status: 200,
      headers: new Headers({ Expires: httpDato(START + 30 * MIN) }),
      json: () => new Promise(() => {}),
    } as unknown as Response;
    const vaerkilde = lagMetVaerkilde({ fetch: falskFetch(() => henger), klokke, tidsgrenseMs: 500 });

    const resultat = vaerkilde();
    await vi.advanceTimersByTimeAsync(500);
    expect(await resultat).toBeNull();
    forventEnLogg(/tidsavbrudd/);
  });

  it("500: null og logg", async () => {
    const fetch = falskFetch(() => svar({ status: 500, body: "Internal Server Error" }));
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    forventEnLogg(/status/);
    expect(logg.mock.calls[0][1]).toBe(500);
  });

  it("500: kroppen avbrytes før feilen", async () => {
    const cancel = vi.fn(async () => {});
    const svar500 = { status: 500, headers: new Headers(), body: { cancel } } as unknown as Response;
    expect(await lagMetVaerkilde({ fetch: falskFetch(() => svar500), klokke })()).toBeNull();
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("203: brukes som 200, med én console.warn om at produktet er utfaset", async () => {
    const svar203 = () =>
      svar({ status: 203, body: uj1Met, headers: { "Last-Modified": SIST_ENDRET } });
    const fetch = falskFetch(svar203, svar203);
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });

    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(advarsel).toHaveBeenCalledTimes(1);
    expect(String(advarsel.mock.calls[0][0])).toMatch(/^MET: .*utfaset/);
    expect(logg).not.toHaveBeenCalled();
    forventIngenForesporselsdata();
  });

  it.each([403, 429])("status %s: null og logg", async (status) => {
    const fetch = falskFetch(() => svar({ status, body: uj1Met }));
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    forventEnLogg(/status/);
  });

  it("nettverksfeil: null og logg med årsaken", async () => {
    const feil = new TypeError("fetch failed");
    const fetch = vi.fn<MetFetch>(async () => {
      throw feil;
    });
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    forventEnLogg(/MET: /);
    expect(logg.mock.calls[0][1]).toEqual({ name: "TypeError", message: "fetch failed" });
  });

  it("nettverksfeil med cause: loggen har name, message og code, men ingenting fra cause", async () => {
    const feil = Object.assign(
      new TypeError("fetch failed", { cause: { code: "ECONNREFUSED", address: "1.2.3.4", port: 443 } }),
      { code: "UND_ERR" },
    );
    const fetch = vi.fn<MetFetch>(async () => {
      throw feil;
    });
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    expect(logg.mock.calls[0][1]).toEqual({ name: "TypeError", message: "fetch failed", code: "UND_ERR" });
    expect(altLogget()).not.toMatch(/ECONNREFUSED|address|443/);
    forventIngenForesporselsdata();
  });

  it("ugyldig JSON: null og logg", async () => {
    const fetch = falskFetch(() => svar({ status: 200, body: "{ikke json", headers: { Expires: httpDato(START + 30 * MIN) } }));
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    forventEnLogg(/MET: /);
    expect(logg.mock.calls[0][1]).toMatchObject({ name: "SyntaxError" });
  });

  it("uten timeseries: null og logg med feilen fra parseren", async () => {
    const fetch = falskFetch(() => ok(START + 30 * MIN, { properties: {} }));
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    forventEnLogg(/MET: /);
    expect(String((logg.mock.calls[0][1] as Error).message)).toMatch(/timeseries/);
  });

  it("fornyelsen feiler: null, ikke den gamle meldingen, og neste Søk prøver betinget igjen", async () => {
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => {
        throw new TypeError("fetch failed");
      },
      () => svar({ status: 304, headers: { Expires: httpDato(START + 90 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();

    na = START + 31 * MIN;
    expect(await vaerkilde()).toBeNull();
    forventEnLogg(/MET: /);

    na = START + 32 * MIN;
    expect(await vaerkilde()).toBe(forste);
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ "If-Modified-Since": SIST_ENDRET });
  });

  it.each([
    ["tom timeseries", { properties: { timeseries: [] } }],
    [
      "ingen rader med next_1_hours",
      {
        properties: {
          timeseries: [{ time: "2026-11-19T12:00:00Z", data: { instant: { details: {} }, next_6_hours: {} } }],
        },
      },
    ],
  ])("200 med %s: null og logg, og ingenting caches", async (_, body) => {
    const fetch = falskFetch(() => ok(START + 30 * MIN, body), () => ok(START + 90 * MIN));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    expect(await vaerkilde()).toBeNull();
    forventEnLogg(/ingen timer/);

    na = START + VENTETID_ETTER_FEIL_MS;
    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(fetch.mock.calls[1][1].headers).toEqual({ "User-Agent": USER_AGENT });
  });

  it("304 uten cache: null og logg", async () => {
    const fetch = falskFetch(() => svar({ status: 304, headers: { Expires: httpDato(START + 30 * MIN) } }));
    expect(await lagMetVaerkilde({ fetch, klokke })()).toBeNull();
    forventEnLogg(/304/);
  });

  it.each([
    ["uten Expires", null],
    ["med ugyldig Expires", "i morgen"],
  ])("200 %s: meldingen returneres, og neste kall sender et betinget kall", async (_, expires) => {
    const headere: Record<string, string> = { "Last-Modified": SIST_ENDRET };
    if (expires !== null) headere.Expires = expires;
    const fetch = falskFetch(
      () => svar({ status: 200, body: uj1Met, headers: headere }),
      () => svar({ status: 304 }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();
    expect(forste).toEqual(MELDING_UJ1);

    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1].headers).toEqual({ "User-Agent": USER_AGENT, "If-Modified-Since": SIST_ENDRET });
    expect(logg).not.toHaveBeenCalled();
  });

  it("200 uten Last-Modified: neste kall sendes uten If-Modified-Since", async () => {
    const fetch = falskFetch(() => ok(START + 30 * MIN, uj1Met, null), () => ok(START + 90 * MIN));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    await vaerkilde();
    na = START + 31 * MIN;
    await vaerkilde();
    expect(fetch.mock.calls[1][1].headers).toEqual({ "User-Agent": USER_AGENT });
  });

  it("hver instans eier sin egen cache", async () => {
    const fetchA = falskFetch(() => ok(START + 30 * MIN));
    const fetchB = falskFetch(() => ok(START + 30 * MIN));
    await lagMetVaerkilde({ fetch: fetchA, klokke })();
    await lagMetVaerkilde({ fetch: fetchB, klokke })();
    expect(fetchA).toHaveBeenCalledTimes(1);
    expect(fetchB).toHaveBeenCalledTimes(1);
  });

  it("timer etter midnatt: uj-2 gjennom adapteren, Turdag 9. nov. 22:00 i 3 t", async () => {
    const fetch = falskFetch(() => ok(START + 30 * MIN, uj2Met));
    const melding = (await lagMetVaerkilde({ fetch, klokke })())!;

    const start = osloTilUtc("2026-11-09", "22:00");
    const timer = melding.timer.map((t) => t.startUtc);
    for (const time of [21, 22, 23]) expect(timer).toContain(Date.UTC(2026, 10, 9, time));
    expect(klasseForTidsvindu(melding, start, start + 3 * TIME_MS)).not.toBe("mangler");
  });

  it("logger aldri forespørselsdata, i noe argument", async () => {
    const statuser = [500, 304, 429];
    for (const status of statuser) {
      na += 10 * VENTETID_ETTER_FEIL_MS;
      await lagMetVaerkilde({ fetch: falskFetch(() => svar({ status })), klokke })();
    }
    const kast = vi.fn<MetFetch>(async () => {
      throw new TypeError("fetch failed", { cause: { code: "ECONNREFUSED", address: "1.2.3.4" } });
    });
    await lagMetVaerkilde({ fetch: kast, klokke })();
    await lagMetVaerkilde({ fetch: falskFetch(() => ok(START, "{ikke json")), klokke })();
    expect(logg).toHaveBeenCalledTimes(statuser.length + 2);
    forventIngenForesporselsdata();
  });

  it("tidsgrenseMs må være et endelig tall over 0", () => {
    const fetch = falskFetch();
    for (const tidsgrenseMs of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => lagMetVaerkilde({ fetch, klokke, tidsgrenseMs })).toThrow(/tidsgrenseMs/);
    }
    expect(() => lagMetVaerkilde({ fetch, klokke, tidsgrenseMs: 1 })).not.toThrow();
  });

  it("304 med ny Last-Modified: neste betingede kall bruker den nye", async () => {
    const nyEndret = httpDato(START + 20 * MIN);
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 60 * MIN), "Last-Modified": nyEndret } }),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 90 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    await vaerkilde();
    na = START + 31 * MIN;
    await vaerkilde();
    na = START + 61 * MIN;
    await vaerkilde();
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ "If-Modified-Since": nyEndret });
  });

  it("200 → 304 → etter det nye Expires sendes fortsatt If-Modified-Since", async () => {
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 60 * MIN) } }),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 90 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();
    na = START + 31 * MIN;
    await vaerkilde();
    na = START + 61 * MIN;
    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].headers).toEqual({ "User-Agent": USER_AGENT, "If-Modified-Since": SIST_ENDRET });
  });

  it("304 uten Expires: posten er fortsatt utløpt, så neste kall sendes betinget", async () => {
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => svar({ status: 304 }),
      () => svar({ status: 304 }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();
    na = START + 31 * MIN;
    expect(await vaerkilde()).toBe(forste);
    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ "If-Modified-Since": SIST_ENDRET });
  });

  it("ingen tidtaker er igjen etter et vellykket kall", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const vaerkilde = lagMetVaerkilde({ fetch: falskFetch(() => ok(START + 30 * MIN)), klokke });
    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("lagMetVaerkilde: ventetid etter feil", () => {
  it("feil: neste kall rett etter kaller ikke fetch og logger ikke, etter 60 s sendes et betinget kall", async () => {
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => svar({ status: 500 }),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 90 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();

    const feilet = START + 31 * MIN;
    na = feilet;
    expect(await vaerkilde()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    forventEnLogg(/status/);

    na = feilet + VENTETID_ETTER_FEIL_MS - 1;
    expect(await vaerkilde()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(logg).toHaveBeenCalledTimes(1);

    na = feilet + VENTETID_ETTER_FEIL_MS;
    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].headers).toMatchObject({ "If-Modified-Since": SIST_ENDRET });
  });

  it("feil uten cache: etter ventetiden sendes et vanlig kall", async () => {
    const fetch = falskFetch(
      () => {
        throw new TypeError("fetch failed");
      },
      () => ok(START + 90 * MIN),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    expect(await vaerkilde()).toBeNull();
    expect(await vaerkilde()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
    na = START + VENTETID_ETTER_FEIL_MS;
    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(fetch.mock.calls[1][1].headers).toEqual({ "User-Agent": USER_AGENT });
  });

  it.each([
    ["429 med Retry-After i sekunder", 429, "120", 120 * 1000],
    ["503 med Retry-After som HTTP-dato", 503, httpDato(START + 5 * MIN), 5 * MIN],
    ["429 uten Retry-After", 429, null, VENTETID_ETTER_FEIL_MS],
    ["429 med ugyldig Retry-After", 429, "snart", VENTETID_ETTER_FEIL_MS],
    ["500 med Retry-After (brukes ikke)", 500, "600", VENTETID_ETTER_FEIL_MS],
  ])("%s: venter %s ms", async (_, status, retryAfter, ventMs) => {
    const headers: Record<string, string> = retryAfter === null ? {} : { "Retry-After": retryAfter };
    const fetch = falskFetch(() => svar({ status, headers }), () => ok(START + 90 * MIN));
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    expect(await vaerkilde()).toBeNull();

    na = START + ventMs - 1;
    expect(await vaerkilde()).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);

    na = START + ventMs;
    expect(await vaerkilde()).toEqual(MELDING_UJ1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("tidsavbrudd under fornyelse av en utløpt post: null, og etter ventetiden et betinget kall med gammel Last-Modified", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const fetch = falskFetch(
      () => ok(START + 30 * MIN),
      () => new Promise<Response>(() => {}),
      () => svar({ status: 304, headers: { Expires: httpDato(START + 90 * MIN) } }),
    );
    const vaerkilde = lagMetVaerkilde({ fetch, klokke });
    const forste = await vaerkilde();

    na = START + 31 * MIN;
    const fornyelse = vaerkilde();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await fornyelse).toBeNull();
    forventEnLogg(/tidsavbrudd/);

    na = START + 31 * MIN + VENTETID_ETTER_FEIL_MS;
    expect(await vaerkilde()).toBe(forste);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(fetch.mock.calls[2][1].headers).toEqual({ "User-Agent": USER_AGENT, "If-Modified-Since": SIST_ENDRET });
  });
});

describe("VaerCache", () => {
  it("fjerner det pågående løftet også når forny kaster", async () => {
    const cache = new VaerCache();
    const forny = vi
      .fn<(post: unknown) => Promise<{ ikkeForMs: number }>>()
      .mockRejectedValueOnce(new Error("uventet"))
      .mockResolvedValueOnce({ ikkeForMs: 0 });
    await expect(cache.hent("k", 0, forny)).rejects.toThrow("uventet");
    await expect(cache.hent("k", 0, forny)).resolves.toBeNull();
    expect(forny).toHaveBeenCalledTimes(2);
  });

  it("holder nøklene adskilt", async () => {
    const cache = new VaerCache();
    const post = { melding: MELDING_UJ1, utloperMs: 100, sistEndret: null };
    await cache.hent("a", 0, async () => post);
    const forny = vi.fn(async () => ({ ikkeForMs: 0 }));
    expect(await cache.hent("a", 50, forny)).toBe(MELDING_UJ1);
    expect(await cache.hent("b", 50, forny)).toBeNull();
    expect(forny).toHaveBeenCalledTimes(1);
  });
});
