import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadEnvConfig, updateInitialEnv } from "@next/env";
import { afterAll, describe, expect, it, vi } from "vitest";
import playwright from "./playwright.config";

// AR-26: ingen test når Anthropic, selv om skallet eller .env.local har en nøkkel. vitest.setup.ts tømmer
// nøkkelen før hver Vitest-test, og Playwright gir serveren en tom nøkkel. Next skal la den tomme verdien
// stå foran .env.local, ellers ville e2e-serveren fått nøkkelen derfra. Nøklene her er ikke ekte.

const LOGG = { info: () => {}, error: () => {} };
const mappe = mkdtempSync(join(tmpdir(), "turplanlegger-env-"));
writeFileSync(join(mappe, ".env.local"), "ANTHROPIC_API_KEY=test-nokkel-fra-env-local\n");

afterAll(() => {
  rmSync(mappe, { recursive: true, force: true });
});

describe("nøkkelen i testene (AR-26)", () => {
  it("Vitest: nøkkelen er tom i hver test", () => {
    expect(process.env.ANTHROPIC_API_KEY).toBe("");
  });

  it("Playwright: serveren får en tom nøkkel", () => {
    const server = playwright.webServer;
    expect(Array.isArray(server)).toBe(false);
    expect((server as { env?: Record<string, string> }).env).toEqual({ ANTHROPIC_API_KEY: "" });
  });

  it("Next: en satt tom nøkkel står foran .env.local, og en manglende nøkkel hentes derfra", () => {
    const lagret = process.env.ANTHROPIC_API_KEY;
    // Med NODE_ENV=test hopper Next over .env.local. `next start` kjører med production.
    vi.stubEnv("NODE_ENV", "production");
    try {
      updateInitialEnv({ ANTHROPIC_API_KEY: "" });
      expect(loadEnvConfig(mappe, false, LOGG, true).combinedEnv.ANTHROPIC_API_KEY).toBe("");

      // Motprøven: uten satt verdi leser Next fila, så testen over sjekker noe.
      updateInitialEnv({ ANTHROPIC_API_KEY: undefined });
      delete process.env.ANTHROPIC_API_KEY;
      expect(loadEnvConfig(mappe, false, LOGG, true).combinedEnv.ANTHROPIC_API_KEY).toBe("test-nokkel-fra-env-local");
    } finally {
      updateInitialEnv({ ANTHROPIC_API_KEY: lagret });
      process.env.ANTHROPIC_API_KEY = lagret;
      vi.unstubAllEnvs();
    }
  });
});
