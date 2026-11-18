// GeoJSON-filer i data/ importeres statisk som JSON (AD-10). Innholdet er ukjent til det er
// validert, for eksempel med RutegeometriSkjema. Vitest laster filene med en plugin i
// vitest.config.mts, og Next.js trenger turbopack.rules['*.geojson'] = { type: 'json' } (story 1.10).
declare module "*.geojson" {
  const data: unknown;
  export default data;
}
