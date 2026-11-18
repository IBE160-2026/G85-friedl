// GeoJSON-filer i data/ importeres statisk som JSON (AD-10). Innholdet er ukjent til det er
// validert, for eksempel med RutegeometriSkjema. Vitest laster filene med en plugin i
// vitest.config.mts, og Next.js med turbopack.rules i next.config.ts.
declare module "*.geojson" {
  const data: unknown;
  export default data;
}
