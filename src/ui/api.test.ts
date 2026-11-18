import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Sok } from "@/kjerne/sok";
import { sendSok, sokUrl, TIDSGRENSE_MS } from "./api";

const SOK: Sok = {
  dato: "2026-11-09",
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
};

/** Det minste svaret formsjekken godtar. */
const VISNING = {
  resultatId: "r1",
  overskrift: "Tre Turforslag som passer tiden din",
  sok: SOK,
  utfall: { type: "turforslag" },
  dittSok: { opplevelsespreferanser: [] },
  vaer: { type: "mangler" },
};

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("location", { search: "?demo=uten-vaer&sok=ignoreres" });
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("sokUrl", () => {
  it("kopierer bare demo fra search", () => {
    expect(sokUrl("?demo=uten-vaer&x=1")).toBe("/api/sok?demo=uten-vaer");
    expect(sokUrl("?x=1&demo=a%20b")).toBe("/api/sok?demo=a+b");
  });

  it("har ingen demo uten demo i search", () => {
    expect(sokUrl("")).toBe("/api/sok");
    expect(sokUrl("?x=1")).toBe("/api/sok");
  });

  it("beholder en tom demo-ID, så serveren kan svare ukjent demo", () => {
    expect(sokUrl("?demo=")).toBe("/api/sok?demo=");
  });
});

describe("sendSok", () => {
  it("poster Søket som JSON til /api/sok med demo fra location.search", async () => {
    fetchMock.mockResolvedValue(Response.json(VISNING));
    await sendSok(SOK);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/sok?demo=uten-vaer");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(SOK);
  });

  it("gir resultat ved 200", async () => {
    fetchMock.mockResolvedValue(Response.json(VISNING));
    expect(await sendSok(SOK)).toEqual({ type: "resultat", visning: VISNING });
  });

  it("gir feil ved 400 med en kjent feilform", async () => {
    const feil = { feil: "ukjent-demo", gyldigeDemoIder: ["uten-vaer"] };
    fetchMock.mockResolvedValue(Response.json(feil, { status: 400 }));
    expect(await sendSok(SOK)).toEqual({ type: "feil", feil });
  });

  it.each([
    ["500", () => new Response(null, { status: 500 })],
    ["400 uten kjent feilform", () => Response.json({ noe: "annet" }, { status: 400 })],
    ["200 uten JSON", () => new Response("ikke json", { status: 200 })],
    ["200 med bare overskrift", () => Response.json({ overskrift: "x" })],
    ["200 uten sok", () => Response.json({ resultatId: "r1", overskrift: "x" })],
    ["200 med sok uten start", () => Response.json({ ...VISNING, sok: { dato: "2026-11-09" } })],
    ["200 med null", () => Response.json(null)],
    ["200 uten utfall", () => Response.json({ ...VISNING, utfall: undefined })],
    ["200 med utfall uten type", () => Response.json({ ...VISNING, utfall: {} })],
    ["200 uten dittSok", () => Response.json({ ...VISNING, dittSok: undefined })],
    ["200 med dittSok uten opplevelsespreferanser", () => Response.json({ ...VISNING, dittSok: {} })],
    ["200 uten vaer", () => Response.json({ ...VISNING, vaer: undefined })],
    ["200 med vaer uten type", () => Response.json({ ...VISNING, vaer: {} })],
  ])("gir kontaktfeil ved %s", async (_, svar) => {
    fetchMock.mockResolvedValue(svar());
    expect(await sendSok(SOK)).toEqual({ type: "kontaktfeil" });
  });

  it("gir kontaktfeil ved nettverksfeil", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    expect(await sendSok(SOK)).toEqual({ type: "kontaktfeil" });
  });

  it("avbrytes utenfra med signal og gir kontaktfeil", async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_, avvis) => {
          init?.signal?.addEventListener("abort", () => avvis(new DOMException("avbrutt", "AbortError")));
        }),
    );
    const utenfra = new AbortController();
    const svar = sendSok(SOK, utenfra.signal);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    utenfra.abort();
    expect(await svar).toEqual({ type: "kontaktfeil" });
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
  });

  it("avbryter med en gang når signalet allerede er avbrutt", async () => {
    fetchMock.mockImplementation((_url, init) =>
      init?.signal?.aborted ? Promise.reject(new DOMException("avbrutt", "AbortError")) : Promise.resolve(Response.json(VISNING)),
    );
    const utenfra = new AbortController();
    utenfra.abort();
    expect(await sendSok(SOK, utenfra.signal)).toEqual({ type: "kontaktfeil" });
  });

  it("avbryter og gir kontaktfeil etter 10 s", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_, avvis) => {
          init?.signal?.addEventListener("abort", () => avvis(new DOMException("avbrutt", "AbortError")));
        }),
    );
    const svar = sendSok(SOK);
    await vi.advanceTimersByTimeAsync(TIDSGRENSE_MS - 1);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await svar).toEqual({ type: "kontaktfeil" });
    expect(TIDSGRENSE_MS).toBe(10_000);
  });
});
