import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ingen AGENTS.md: ellers skriver `next dev` den når en AI-agent kjører utviklingsserveren.
  agentRules: false,
  // AR-24: ingen logging av forespørsler. Gjelder `next dev`; `next start` logger dem ikke.
  logging: {
    incomingRequests: false,
  },
  // AD-10: data/rutegeometri.geojson importeres statisk som JSON. Vitest gjør det samme med en
  // plugin i vitest.config.mts.
  turbopack: {
    rules: {
      "*.geojson": { type: "json" },
    },
  },
};

export default nextConfig;
