import { describe, expect, it } from "vitest";
import { soltider } from "./sol";
import { osloTilUtc } from "./tid";

// Solberegningen testes for seg mot addendumets kontrollverdier, med ±2 min (FR-21, AD-11).

const MINUTT_MS = 60_000;

describe("soltider for Værpunktet", () => {
  it.each([
    ["2026-11-09", "08:30", "15:59"],
    ["2026-06-21", "03:28", "23:37"],
  ])("%s gir sol opp %s og ned %s, med høyst 2 min avvik", (dato, opp, ned) => {
    const sol = soltider(dato);
    expect(Math.abs(sol.oppUtc - osloTilUtc(dato, opp))).toBeLessThanOrEqual(2 * MINUTT_MS);
    expect(Math.abs(sol.nedUtc - osloTilUtc(dato, ned))).toBeLessThanOrEqual(2 * MINUTT_MS);
  });

  it.each([
    ["2026-11-09", "08:30", "15:59"],
    ["2026-06-21", "03:28", "23:38"],
    ["2026-12-21", "10:05", "14:54"],
  ])("%s gir nøyaktig %s og %s (låst, så drift synes)", (dato, opp, ned) => {
    expect(soltider(dato)).toEqual({ oppUtc: osloTilUtc(dato, opp), nedUtc: osloTilUtc(dato, ned) });
  });

  it("runder av til hele minutter", () => {
    for (const dato of ["2026-11-09", "2026-06-21", "2026-12-21", "2026-03-29"]) {
      const { oppUtc, nedUtc } = soltider(dato);
      expect(oppUtc % MINUTT_MS).toBe(0);
      expect(nedUtc % MINUTT_MS).toBe(0);
    }
  });

  it("sol opp kommer før sol ned, og begge ligger på Oslo-datoen", () => {
    for (const dato of ["2026-01-01", "2026-03-29", "2026-06-21", "2026-10-25", "2026-12-21"]) {
      const { oppUtc, nedUtc } = soltider(dato);
      expect(oppUtc).toBeLessThan(nedUtc);
      expect(oppUtc).toBeGreaterThanOrEqual(osloTilUtc(dato, "00:00"));
      expect(nedUtc).toBeLessThan(osloTilUtc(dato, "23:59") + MINUTT_MS);
    }
  });

  it("gir samme svar hver gang", () => {
    expect(soltider("2026-11-09")).toEqual(soltider("2026-11-09"));
  });

  it("kaster ved ugyldig dato", () => {
    expect(() => soltider("9. november")).toThrow(/Ugyldig dato/);
  });

  it("kaster når sola ikke går ned (midnattssol)", () => {
    expect(() => soltider("2026-06-21", { lat: 78.22, lon: 15.65 })).toThrow(/går ikke ned 2026-06-21.*midnattssol/);
  });

  it("kaster når sola ikke går opp (mørketid)", () => {
    expect(() => soltider("2026-12-21", { lat: 78.22, lon: 15.65 })).toThrow(/går ikke opp 2026-12-21.*mørketid/);
  });
});
