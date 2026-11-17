import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ingen AGENTS.md: ellers skriver `next dev` den når en AI-agent kjører utviklingsserveren.
  agentRules: false,
};

export default nextConfig;
