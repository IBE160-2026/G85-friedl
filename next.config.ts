import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ingen AGENTS.md: ellers skriver `next dev` den når en AI-agent kjører utviklingsserveren.
  agentRules: false,
  // AR-24: ingen logging av forespørsler. Gjelder `next dev`; `next start` logger dem ikke.
  logging: {
    incomingRequests: false,
  },
};

export default nextConfig;
