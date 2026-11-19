import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sok } from "@/kjerne/sok";
import type { Resultatvisning } from "@/kjerne/visning/skjema";
import { begrunnelseUrl } from "./api";
import { BEGRUNNELSE_FRIST_MS, hentBegrunnelser, turforslagIder } from "./begrunnelser";

// Klienten for Begrunnelsen (story 4.2, AD-12): én forespørsel per Turforslag, fristen på 5 s, og at svar
// fra et gammelt Resultat aldri brukes. Kjøres uten nettleser, med en falsk `fetch` og falske tidsur.

const SOK: Sok = { dato: "2026-11-09", start: "13:30", tilgjengeligMin: 120, vanskelighetsgrad: "B", utsikt: true, vann: false };

/** En Resultatvisning med bare feltene klienten bruker. */
function visning(resultatId: string, utfall: { type: string; kort?: unknown }, sok: Sok = SOK): Resultatvisning {
  return { resultatId, sok, utfall } as unknown as Resultatvisning;
}

const IDER = ["a", "b", "c"];

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

/** Et svar fra serveren etter `ms`, som avvises når signalet avbrytes (som ekte `fetch`). */
function svarEtter(ms: number, lag: (turId: string) => Response) {
  fetchMock.mockImplementation(
    (_url, init) =>
      new Promise((ok, avvis) => {
        const { turId } = JSON.parse(String(init?.body)) as { turId: string };
        const t = setTimeout(() => ok(lag(turId)), ms);
        init?.signal?.addEventListener("abort", () => {
          clearTimeout(t);
          avvis(new DOMException("avbrutt", "AbortError"));
        });
      }),
  );
}

const tekst = (turId: string) => Response.json({ tekst: `tekst ${turId}` });

describe("begrunnelseUrl", () => {
  it("har ?demo= bare i Demomodus", () => {
    expect(begrunnelseUrl(null)).toBe("/api/begrunnelse");
    expect(begrunnelseUrl("uj-1")).toBe("/api/begrunnelse?demo=uj-1");
    expect(begrunnelseUrl("")).toBe("/api/begrunnelse?demo=");
  });
});

describe("hentBegrunnelser", () => {
  it("sender én POST per Turforslag med bare { sok, turId }, og gir tekstene", async () => {
    svarEtter(100, tekst);
    const onTekst = vi.fn();
    hentBegrunnelser(SOK, IDER, "uj-1", onTekst);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    for (const [i, [url, init]] of fetchMock.mock.calls.entries()) {
      expect(url).toBe("/api/begrunnelse?demo=uj-1");
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual({ sok: SOK, turId: ["a", "b", "c"][i] });
    }
    await vi.advanceTimersByTimeAsync(100);
    expect(onTekst.mock.calls).toEqual([
      ["a", "tekst a"],
      ["b", "tekst b"],
      ["c", "tekst c"],
    ]);
  });

  it("Turforslagene gir sine turId-er, og den korteste Turen og frarådet ingen", () => {
    expect(turforslagIder(visning("r1", { type: "turforslag", kort: IDER.map((turId) => ({ turId })) }))).toEqual(IDER);
    expect(turforslagIder(visning("r1", { type: "kortesteTur", kort: { turId: "a" } }))).toEqual([]);
    expect(turforslagIder(visning("r1", { type: "fraradet" }))).toEqual([]);
  });

  it("ingen turId-er: ingen forespørsel", () => {
    hentBegrunnelser(SOK, [], null, vi.fn());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("et svar etter fristen brukes ikke, og kallet avbrytes", async () => {
    svarEtter(6000, tekst);
    const onTekst = vi.fn();
    hentBegrunnelser(SOK, IDER, null, onTekst);
    await vi.advanceTimersByTimeAsync(BEGRUNNELSE_FRIST_MS);
    expect(fetchMock.mock.calls.every(([, init]) => init?.signal?.aborted)).toBe(true);
    await vi.advanceTimersByTimeAsync(2000);
    expect(onTekst).not.toHaveBeenCalled();
  });

  it("et svar like før fristen brukes", async () => {
    svarEtter(BEGRUNNELSE_FRIST_MS - 1, tekst);
    const onTekst = vi.fn();
    hentBegrunnelser(SOK, IDER, null, onTekst);
    await vi.advanceTimersByTimeAsync(BEGRUNNELSE_FRIST_MS - 1);
    expect(onTekst).toHaveBeenCalledTimes(3);
  });

  it("et svar etter fristen brukes ikke, selv om fetch ikke rakk å avbryte", async () => {
    // `fetch` overser signalet og svarer etter 6 s.
    fetchMock.mockImplementation((_url, init) => {
      const { turId } = JSON.parse(String(init?.body)) as { turId: string };
      return new Promise((ok) => setTimeout(() => ok(tekst(turId)), 6000));
    });
    const onTekst = vi.fn();
    hentBegrunnelser(SOK, IDER, null, onTekst);
    await vi.advanceTimersByTimeAsync(7000);
    expect(onTekst).not.toHaveBeenCalled();
  });

  it("nytt Resultat: svarene til det gamle brukes aldri, det nye får sine egne", async () => {
    const forste = { ...SOK, tilgjengeligMin: 120 };
    const andre = { ...SOK, tilgjengeligMin: 180 };
    fetchMock.mockImplementation((_url, init) => {
      const { sok, turId } = JSON.parse(String(init?.body)) as { sok: Sok; turId: string };
      // Ignorerer signalet, så bare klientens egen sjekk stopper de gamle svarene.
      const svar = Response.json({ tekst: `${sok.tilgjengeligMin} ${turId}` });
      return new Promise((ok) => setTimeout(() => ok(svar), 2000));
    });
    const gammel = vi.fn();
    const ny = vi.fn();
    const avbrytGammel = hentBegrunnelser(forste, IDER, null, gammel);
    await vi.advanceTimersByTimeAsync(500);
    avbrytGammel();
    hentBegrunnelser(andre, IDER, null, ny);
    await vi.advanceTimersByTimeAsync(3000);
    expect(gammel).not.toHaveBeenCalled();
    expect(ny.mock.calls).toEqual([
      ["a", "180 a"],
      ["b", "180 b"],
      ["c", "180 c"],
    ]);
  });

  it.each([
    ["{ tekst: null }", () => Response.json({ tekst: null })],
    ["500", () => new Response(null, { status: 500 })],
    ["400", () => Response.json({ feil: "ugyldig-sok", detaljer: [] }, { status: 400 })],
    ["200 uten JSON", () => new Response("ikke json")],
    ["200 med tom tekst", () => Response.json({ tekst: "" })],
    ["200 med tekst som tall", () => Response.json({ tekst: 1 })],
  ])("%s gir ingen tekst", async (_navn, lag) => {
    svarEtter(10, lag);
    const onTekst = vi.fn();
    hentBegrunnelser(SOK, IDER, null, onTekst);
    await vi.advanceTimersByTimeAsync(100);
    expect(onTekst).not.toHaveBeenCalled();
  });

  it("nettverksfeil gir ingen tekst", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const onTekst = vi.fn();
    hentBegrunnelser(SOK, IDER, null, onTekst);
    await vi.advanceTimersByTimeAsync(100);
    expect(onTekst).not.toHaveBeenCalled();
  });
});
