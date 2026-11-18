import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { configDefaults, defineConfig } from "vitest/config";

// Laster *.geojson som JSON, slik at data/rutegeometri.geojson kan importeres statisk.
const geojson: Plugin = {
  name: "geojson-som-json",
  transform(kode, id) {
    if (!id.endsWith(".geojson")) return null;
    // JSON.parse: en ødelagt fil feiler som JSON-feil, og innholdet kjøres aldri som kode.
    return { code: `export default JSON.parse(${JSON.stringify(kode)});`, map: null };
  },
};

export default defineConfig({
  plugins: [geojson],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts", "*.test.ts"],
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
