import { beforeEach, vi } from "vitest";

// AR-26 og AR-24: ingen test skal kunne nå Anthropic, selv om skallet eller .env.local har en nøkkel.
// Nøkkelen er tom før hver test. vi.unstubAllEnvs() går tilbake til den tomme verdien, ikke til den ekte.
// Tester som trenger en nøkkel, setter en falsk selv med vi.stubEnv.
process.env.ANTHROPIC_API_KEY = "";

beforeEach(() => {
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
