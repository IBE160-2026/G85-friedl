# Review: Tech currency – Architecture Spine Turplanlegger

- **Lens:** Is every committed technology decision checked against the web, npm, the existing repo or the current starter (create-next-app 16.4.x), rather than taken from training data?
- **Reviewed:** `ARCHITECTURE-SPINE.md` (draft, 2026-11-12) and `.memlog.md`
- **Date:** 2026-11-12
- **Method:** `npm view` (versions, publish dates, peers, engines); `npm pack create-next-app@16.4.3` and reading its `dist/index.js` and templates; `npm pack @anthropic-ai/sdk@1.3.0` and reading `client.d.ts`/`client.js`; a dry-run `npm install --package-lock-only` of the pinned Stack, plus `npm audit`; `curl` against Kartverket and MET; `gh api` against metno/weathericons and GitHub Advisories; the official docs for Next.js, Vercel, MET and Kartverket. I did not recheck the sun calculation (AD-11).

## Verdict

Most of the pinned versions exist, are at least 14 days old and work together. Two things were never checked against the starter or against a real install, and both break the first build if nobody fixes them:

- create-next-app 16.4.3 turns on `cacheComponents` by default. That clashes with AD-4, where the page reads the server clock.
- The starter's `@types/node ^20` conflicts with Vitest 5 and gives `ERESOLVE`.

Vitest 5.0.0 also has two known advisories. Nothing in the spine says how Haiku 5.5 should be called (thinking, effort, sampling, units).

## Summary of findings

| # | Severity | Topic |
| --- | --- | --- |
| F1 | high | create-next-app 16.4.3 turns on `cacheComponents: true` by default, which conflicts with AD-4 |
| F2 | high | The pinned Stack plus the starter's `@types/node ^20` cannot be installed (`ERESOLVE` against Vitest 5) |
| F3 | medium | Vitest 5.0.0 has two moderate advisories. 5.0.5 is fixed and meets the 14-day rule |
| F4 | medium | Haiku 5.5 through SDK 1.x: thinking is on by default, effort defaults to medium, sampling parameters give 400, and `timeout` is in ms. None of this is in AD-12 |
| F5 | medium | The starter's other defaults differ from the spine, and the repo root is not empty, so create-next-app refuses to run in place |
| F6 | medium | `next/dynamic` with `ssr: false` must sit in a Client Component, but AD-15 does not say where |
| F7 | medium | Vercel Hobby with a repo owned by a GitHub organization (IBE160-2026) has not been checked |
| F8 | low | Transitive dependencies (vite 8.3.8, 1 day old) break the 14-day rule |
| F9 | low | MET details: If-Modified-Since must equal Last-Modified, coordinates are truncated, HTTP/2 on Node 26, the credit text |
| F10 | low | Kartverket: verified. Add a link in the credit. There is no published usage limit to cite |
| F11 | low | METs værikoner: verified. The MIT notice must be included, and the file names contain a known typo |
| F12 | low | next/font with Nunito Sans: verified, but `next build` needs network access to Google Fonts |
| F13 | low | Files in `data/` read at runtime on Vercel need file tracing. Not checked |
| – | ok | Verified without remarks (see the end) |

---

## F1 — create-next-app 16.4.3 turns on Cache Components by default [high]

**Claim in the spine:**
- AD-4: "Siden rendres på serveren og får «nå» og standardverdiene til skjemaet … ferdig utregnet". The clock is read in `src/server/miljo.ts`.
- AD-5: the demo ID comes from `?demo=`, which means `searchParams`.
- Memlog line 50: "create-next-app sine standardvalg brukes der de ikke kolliderer".

**What I found:** In `create-next-app@16.4.3/dist/index.js`, the recommended defaults are:

```
{typescript:true, linter:"eslint", tailwind:true, app:true, srcDir:false, importAlias:"@/*",
 reactCompiler:false, cacheComponents:true, agentsMd:true}
```

With `cacheComponents`, the starter writes `cacheComponents: true, partialPrefetching: true` into `next.config.ts`. With Cache Components on:

- `new Date()` or `Date.now()` in a Server Component, before any request data has been read, gives the error `next-prerender-current-time` (https://nextjs.org/docs/messages/next-prerender-current-time).
- Awaiting `searchParams` or `connection()` outside `<Suspense>` gives the error `blocking-route`, "Uncached data was accessed outside of `<Suspense>`" (https://nextjs.org/docs/messages/blocking-route).
- The `runtime` route segment config is not allowed (https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents).

A page that does `lagMiljo(demoId)` and then reads the clock directly in `page.tsx`, as AD-4 and AD-5 describe, fails `next build`. Worse, if it is "fixed" the wrong way with `"use cache"`, «nå» freezes at build time. The spine does not mention `cacheComponents`, and the memlog has no `(version)` entry for the starter's defaults.

**Suggested fix:** Add a decision to AD-4 (or the Stack section), either A or B:

- **A (simplest):** Scaffold with `--no-cache-components` and say so in the spine. No `"use cache"` anywhere.
- **B:** Keep Cache Components and write the rule down:
  - `page.tsx` renders a static shell.
  - The part that reads `searchParams` and «nå» sits inside `<Suspense>`.
  - `lagMiljo()` calls `await connection()` before the clock is read on a page render.
  - `"use cache"` is never used on anything that depends on «nå» or a demo ID.
  - No `export const runtime`.

Route handlers with POST are not affected.

## F2 — The pinned Stack cannot be installed with the starter's `@types/node` [high]

**Claim in the spine:** The Stack pins `vitest 5.0.0`, says nothing about `@types/node`, and says "create-next-app sine standardvalg brukes".

**What I found:** For TypeScript projects, create-next-app 16.4.3 writes `typescript:"^5","@types/node":"^20","@types/react":"^19","@types/react-dom":"^19"`. Vitest 5.0.0 has the optional peer `@types/node: "^22.0.0 || >=24.0.0"`. A dry run with the Stack's versions plus `@types/node ^20` (npm 11.19.0, Node 26.8.1):

```
npm error Could not resolve dependency:
npm error peerOptional @types/node@"^22.0.0 || >=24.0.0" from vitest@5.0.0
npm error   dev @types/node@"^20" from the root project
```

With `@types/node 26.6.2` and `vite 8.3.5`, the same set resolves cleanly to next 16.4.3, react 19.3.1, typescript 5.9.3 and vitest 5.0.0.

**Suggested fix:**
- Add `@types/node` 26.6.6 (published 2026-10-28, so 15 days old) to the Stack. It also matches Node 26.x.
- Add `vite` as an explicit dev dependency (see F8).

## F3 — Vitest 5.0.0 has known advisories [medium]

**Claim in the spine:** `Vitest | 5.0.0`, chosen under the rule "minst 14 dager gamle".

**What I found:**
- `npm view vitest time`: 5.0.1 (09-15), 5.0.2 (09-25), 5.0.3 (09-30), 5.0.4 (10-12), 5.0.5 (2026-10-15), 5.1.0 (11-02). So 5.0.5 is 28 days old and meets the rule.
- `npm audit` on the resolved Stack shows:
  - GHSA-qxg6-89mg-rqv8, "Vitest: Code injection via unauthenticated manual mock registration" (medium; `@vitest/mocker >=5.0.0-beta.1 <5.0.3`, fixed in 5.0.3)
  - GHSA-xp26-3454-mjgp, a Windows backslash traversal (medium, fixed in 5.0.3)
- Both were published 2026-10-21 (https://github.com/advisories/GHSA-qxg6-89mg-rqv8, https://github.com/advisories/GHSA-xp26-3454-mjgp).
- The other choices do follow "newest version that is at least 14 days old": next 16.4.3 (16.4.4 is from 11-02), @anthropic-ai/sdk 1.3.0 (1.4.0 is from 11-02), and @playwright/test 1.64.1 (1.65.0 is from 11-05). Vitest is the exception.

**Suggested fix:** Pin `vitest 5.0.5`. Write the rule down as "the newest patch that is at least 14 days old", and run `npm audit` before pinning.

## F4 — AD-12 does not say how Haiku 5.5 is called through SDK 1.x [medium]

**Claim in the spine:** "`@anthropic-ai/sdk`, modell `claude-haiku-5-5`, tidsgrense 5 s, `maxRetries: 0`".

**What I found:**

The claim itself is correct:
- `@anthropic-ai/sdk@1.3.0` (published 2026-10-23) has `timeout?: number` ("@unit milliseconds") and `maxRetries?: number` ("@default 2") in `client.d.ts`.
- The `Model` union in `resources/messages/messages.d.ts` contains `'claude-haiku-5-5'`.
- The SDK peer is `zod ^3.25.0 || ^4.0.0`, which fits zod 4.6.7.

What the spine does not say:
- **API version:** `client.js` sends `'anthropic-version': '2026-10-21'`. In that version, any `temperature`, `top_p` or `top_k` gives 400 (Claude API reference, api-version migration "2026-10-21"). Haiku 5.5 rejects non-default sampling parameters in any case. An implementer who adds `temperature: 0` "for stable text" gets 400 every time, and FR-22 then quietly always falls back to Regeltekst.
- **Thinking:** On Haiku 5.5, adaptive thinking is on when `thinking` is not set, and effort defaults to `medium`. The answer can start with `thinking` blocks, and thinking counts toward `max_tokens` (Claude API reference, "Migrating to Claude Haiku 5.5"). With a timeout of 5 s and `maxRetries: 0`, this makes timeouts more likely, and so makes it more likely that the model text never shows. Code that reads `content[0].text` breaks.
- **Refusals:** Haiku 5.5 has no server-side `fallbacks`, and `fallbacks` as a list gives 400. The memlog's claim on this is correct.

**Suggested fix:** Add to AD-12:
- `timeout: 5_000` (ms)
- `maxRetries: 0`
- `output_config: { effort: 'low' }`, or `thinking: { type: 'disabled' }`, which is allowed at effort low, medium and high
- no `temperature`, `top_p` or `top_k`
- `max_tokens` with room for thinking
- read text blocks by `type`
- check `stop_reason` (`refusal`, `max_tokens`) before the text goes to `kontrollerSprakmodelltekst()`
- no `fallbacks`

## F5 — Other starter defaults differ from the spine, and in-place scaffolding fails [medium]

**Claim in the spine:** The source tree uses `src/app/`, `src/ui/`, `src/kjerne/`. Styling is "CSS Modules … Ikke Tailwind". The Stack has react 19.3.1, next 16.4.3, Nunito Sans through next/font, and ESLint with `no-restricted-imports`.

**What I found (create-next-app 16.4.3):**
- Defaults are `tailwind:true` and `srcDir:false`. `agentsMd:true` writes `AGENTS.md`.
- `dependencies: {react: "19.3.0", "react-dom": "19.3.0", next: <its own version>}`. React is hard-coded as `const en="19.3.0"`, not 19.3.1.
- `layout.tsx` uses `Geist` and `Geist_Mono` from `next/font/google`.
- The linter is ESLint 9 flat config (`eslint-config-next/core-web-vitals` + `/typescript`) with `"lint": "eslint"`. That fits.
- `isFolderEmpty()` accepts only `.claude, .git, .gitignore, .idea, .vscode, LICENSE, docs, …`. The repo root also has `CLAUDE.md`, `README.md`, `_bmad`, `_bmad-output`, `.logs`, `data`, `scripts` and `tilbakemelding-product-brief.md`, so `npx create-next-app .` stops with "contains files that could conflict".
- `npx create-next-app@latest` would install next 16.4.6 (published 2026-11-09, 3 days old), which breaks the pinning rule.

**Suggested fix:** Record the exact command in the spine or the first story:

```
npx create-next-app@16.4.3 <tom-mappe> --ts --app --src-dir --no-tailwind --eslint \
  --no-react-compiler --no-cache-components --import-alias "@/*" --use-npm --no-agents-md
```

(`--cache-components` instead, if F1-B is chosen.) Then:
- move the files into the repo
- bump `react` and `react-dom` to 19.3.1
- swap Geist for `Nunito_Sans`
- remove `page.module.css` and the demo page

## F6 — Where Leaflet's `ssr: false` must sit [medium]

**Claim in the spine:** AD-15: "Kartkomponenten lastes med `next/dynamic` og `ssr: false`". AD-4: the page is rendered on the server.

**What I found:** Next.js docs (https://nextjs.org/docs/app/guides/lazy-loading): "`ssr: false` option is not supported in Server Components. You will see an error if you try to use it in Server Components … Please move it into a Client Component." `src/app/page.tsx` is a Server Component under AD-4, so the obvious place to put the call fails.

Compatibility is fine:
- react-leaflet 5.0.0 has peers `leaflet ^1.9.0`, `react ^19.0.0`, `react-dom ^19.0.0`, so it fits React 19.3.1.
- next 16.4.3 peers `react ^18.2.0 || ^19.0.0`.
- Leaflet 1.9.4 is still the newest stable version. 2.0.0-beta.3 exists, but react-leaflet 5 requires ^1.9.
- The react-leaflet repo is active (pushed 2026-11-07).

**Suggested fix:** Add to AD-15: "`dynamic(() => import('./Kart'), { ssr: false })` står i en egen klientkomponent (`'use client'`, for eksempel `src/ui/KartLaster.tsx`), som siden importerer." Also say that `leaflet/dist/leaflet.css` is imported in the client component or in the layout.

## F7 — Vercel Hobby with a repo owned by a GitHub organization [medium]

**Claim in the spine:** AD-14: "Hosting er Vercel Hobby, koblet til GitHub. `main` gir Production". The repo is `IBE160-2026/G85-friedl`.

**What I found:**
- Hobby terms: "Hobby teams are restricted to non-commercial personal use only". Commercial means "financial gain of anyone involved in any part of the production". A student project with no ads or payment falls within the terms (https://vercel.com/docs/limits/fair-use-guidelines, last_updated 2026-09-14). OK.
- `gh api repos/IBE160-2026/G85-friedl` returns `visibility: public`. Good.
- Vercel's docs (https://vercel.com/docs/git/vercel-for-github): to import a repo owned by an organization you must be "Owner of the GitHub organization OR Member … with write or admin access". "Outside Collaborator … cannot import". Also, "For a repository that an organization owns, the Vercel GitHub App must be installed on that organization. If you aren't an organization Owner, GitHub sends your installation request to the Owners for approval". That means the course's org owner.
- Community threads report that Hobby cannot deploy from private org repos, and some say that new projects cannot connect to org repos at all (https://community.vercel.com/t/why-cant-hobby-accounts-deploy-from-organizations/10015, https://community.vercel.com/t/unable-to-deploy-from-organizational-private-repository/16334). This is not confirmed in the official docs.

**Suggested fix:**
- Check early, before the first story, that the Vercel GitHub App can be installed on IBE160-2026 and that a Hobby project can connect to the public repo.
- Record the fallback in AD-14: GitHub Actions with `vercel build` + `vercel deploy --prebuilt` and a `VERCEL_TOKEN` secret (described on the same Vercel page). That also fits AD-14's "GitHub Actions kjører lint, Vitest og Playwright".

## F8 — The 14-day rule does not cover transitive dependencies [low]

**Claim in the spine:** "Versjonene var minst 14 dager gamle 2026-11-12. Når koden finnes, er det `package-lock.json` som gjelder."

**What I found:** Vitest requires `vite ^6.4.0 || ^7.0.0 || ^8.0.0` (non-optional peer), and npm picks `vite 8.3.8`, published 2026-11-11. That is 1 day old. Other transitive dependencies (for example `typescript-eslint 8.72.2` through `eslint-config-next`) likewise come in at their newest version. `npm audit` shows 9 moderate findings, all in dev tools:
- typescript-eslint and minimatch (GHSA-g3hv-75wg-m249)
- vitest (F3)

None of them are in next or react.

**Suggested fix:**
- Pin `vite 8.3.5` (2026-10-21) as a dev dependency.
- Make the first lock file with `npm install --before=2026-10-29`, or accept that the rule applies only to direct dependencies and say so in the spine.
- Commit `package-lock.json` from day one.

## F9 — MET Locationforecast: details the spine glosses over [low]

**Claim in the spine:** AD-6: HTTPS, `compact`, four decimals, `altitude=400`, a User-Agent with a GitHub URL, `cache: 'no-store'`, `Expires`, and renewal with If-Modified-Since.

**What I found (https://api.met.no/doc/TermsOfService):**
- The User-Agent must identify you, with "company email or website". The repo is public (HTTP 200), so the URL works. OK.
- "Never repeat requests until the time indicated in the `Expires` response header". OK.
- "Note that the If-Modified-Since header should be identical to the previous Last-Modified". The spine does not say this. The cache must store `Last-Modified`.
- "truncate all coordinates to max 4 decimals". That means truncate, not round. 62.7617/7.1679 already has 4 decimals.
- "Keep total traffic below 20 requests per second". Cache per instance is OK.
- A live call (`curl … /locationforecast/2.0/compact?lat=62.7617&lon=7.1679&altitude=400`) returns `HTTP/2 200`, `last-modified` and `expires`. Node 26 on Vercel negotiates HTTP/2 in `fetch`, and "For HTTP/2 responses, `response.statusText` is empty" (https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration). The adapter must check `status` (200 or 304), not `statusText`.
- Credit (https://api.met.no/doc/License): NLOD 2.0 and CC BY 4.0, "Data from MET Norway" or "Based on data from MET Norway", plus a link. AD-15 only gives the text for Kartverket.
- `cache: 'no-store'`: the Next docs (https://nextjs.org/docs/app/api-reference/functions/fetch, lastUpdated 2026-08-18) say the default is "auto no cache", and that `no-store` "fetches the resource from the remote server on every request". Caching is opt-in, and memoization "does not apply in Route Handlers". So `no-store` is correct and harmless, but redundant in a POST handler. Keep it as an explicit statement of intent.

**Suggested fix:**
- In AD-6, add: "`If-Modified-Since` = forrige `Last-Modified`", "koordinater trunkeres", and "status leses fra `response.status`".
- In AD-15, or a new point under FR-29, add the credit text «Data fra MET Norway» with a link.

## F10 — Kartverket gråtonekart [low]

**Claim in the spine:** AD-15: `https://cache.kartverket.no/v1/wmts/1.0.0/topograatone/default/webmercator/{z}/{y}/{x}.png` with «© Kartverket» (CC BY 4.0). Memlog: tested 200.

**What I found:**
- `curl …/topograatone/default/webmercator/10/290/533.png` returns `200 image/png`, `cache-control: public, max-age=345600`, `access-control-allow-origin: *`.
- https://cache.kartverket.no/ lists the layer `topograatone` and the TileMatrixSet `webmercator`. Its Leaflet example uses the same `{z}/{y}/{x}` order and `attribution: '&copy; Kartverket'`.
- The terms (https://kartverket.no/en/api-and-data/terms-of-use): CC BY 4.0, "©Kartverket", "Link to Kartverket's websites where possible".
- I found no published request limit or fair-use limit for the cache service. The spine does not claim one, but nothing confirms there is no limit either.

**Suggested fix:**
- Make the map credit a link to kartverket.no. CC BY 4.0 also asks for a link to the licence.
- Do not claim a "fair use" limit.
- Cut the map's maxZoom to the levels the layer actually has (check WMTSCapabilities).

## F11 — METs værikoner [low]

**Claim in the spine:** AD-15: "METs værikoner (MIT) ligger i `public/vaerikoner/` med filnavn fra `symbol_code`".

**What I found:**
- `gh api repos/metno/weathericons` shows MIT, not archived, last pushed 2023-08-07.
- The LICENSE reads "Copyright (c) 2015-2017 Yr".
- `weather/svg/` has 83 files named `<symbol_code>.svg` (for example `clearsky_day.svg`, `cloudy.svg`, `heavyrainshowers_polartwilight.svg`).
- The README: "the filenames are different to correspond with the symbol codes in Locationforecast". It also notes the typo `lightssleetshowersandthunder` and `lightssnowshowersandthunder`, which matches the API's symbol_code, so it must not be "fixed".

**Suggested fix:**
- Copy `LICENSE` to `public/vaerikoner/LICENSE`. MIT requires the notice to follow along.
- Use the SVG variants.
- Have one test that checks every `symbol_code` in the Værscenarioer has a file.

## F12 — next/font and Nunito Sans [low]

**Claim in the spine:** "Skriften Nunito Sans selvhostes med `next/font`", and "ingen kall til Google ved kjøring" (memlog).

**What I found:**
- In `next@16.4.3/dist/compiled/@next/font/dist/google/font-data.json`, "Nunito Sans" is variable: weights 200–1000, axes `YTLC, opsz, wdth, wght`, subsets `latin, latin-ext, cyrillic, cyrillic-ext, vietnamese`.
- The docs (https://nextjs.org/docs/app/api-reference/components/font): "CSS and font files are downloaded at build time … No requests are sent to Google by the browser." So the claim holds.
- But `next build` and `next dev` need network access to Google Fonts. NFR-3 ("npm install && npm run dev uten nøkler") works with network but not offline.

**Suggested fix:**
- In layout.tsx, use `Nunito_Sans({ subsets: ['latin'], variable: '--font-nunito-sans', display: 'swap' })`. æøå are in `latin`.
- Optionally use `next/font/local` with committed woff2 (SIL OFL 1.1), if an offline build matters.

## F13 — Reading `data/` at runtime on Vercel [low]

**Claim in the spine:** The shell reads `data/turer-moldemarka.json`, `data/rutegeometri.geojson`, `data/vaerterskler.json` and `data/vaerscenarioer/<id>/…`. The Python script reads `vaerterskler.json`.

**What I found:** Not checked in the spine or the memlog. With `fs.readFile` and dynamic paths (`vaerscenarioer/${id}`), Next/Vercel file tracing may leave the files out of the function bundle.

**Suggested fix:**
- Use static `import` of the JSON files (it works with `resolveJsonModule`, which is on in the starter's tsconfig).
- Or set `outputFileTracingIncludes` in `next.config.ts` for `data/**`.
- Check it with a Preview deploy in the first story.

---

## Verified without remarks

| Claim | Evidence |
| --- | --- |
| next 16.4.3 exists and is 20 days old | `npm view next time` → 2026-10-23T13:40Z. No audit findings. Peers react `^18.2.0 \|\| ^19.0.0`, engines `node >=20.9.0` |
| react / react-dom 19.3.1 | 2026-10-14. `react-dom@19.3.1` peer `react ^19.3.1` |
| react-leaflet 5.0.0 + leaflet 1.9.4 with React 19.3 | Peers `leaflet ^1.9.0, react ^19.0.0, react-dom ^19.0.0`. `@react-leaflet/core 3.0.0` the same |
| TypeScript 5.9.3 instead of 7.x | create-next-app writes `typescript:"^5"`. Also, typescript-eslint 8.72.2 (through eslint-config-next 16.4.3) has peer `typescript >=4.8.4 <6.1.0`, so TS 7.0.2 would break lint. The choice is right, and the reason is stronger than the memlog states |
| Vitest 5 with TS 5.9 | Vitest has no TypeScript peer and runs TS through vite/esbuild. The real conflict is `@types/node` (F2) |
| zod 4.6.7, date-fns 4.4.0, @date-fns/tz 1.5.0, proj4 2.22.0, @playwright/test 1.64.1 | All exist and are ≥14 days old. Playwright engines `node >=20`. next peer `@playwright/test ^1.51.1` (optional) |
| @anthropic-ai/sdk 1.3.0: `claude-haiku-5-5`, `timeout`, `maxRetries` | `client.d.ts` lines 107/136, the `Model` union in `messages.d.ts` |
| Node 26.x on Vercel | https://vercel.com/docs/functions/runtimes/node-js/node-js-versions: "26.x (default), 24.x, 22.x". `engines: "26.x"` gives the latest 26.x. Changelog "Node.js 26 LTS is now Generally Available on Vercel" (2026-10-29). Vitest engines `>=26.0.0` OK |
| Vercel Hobby for a non-commercial student project | Fair Use Guidelines, "Commercial usage" (see F7) |
| MET: browser must not call the API, proxy required | ToS: "Browsers and mobile apps should not contact the API directly" |

## Sources

- https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents
- https://nextjs.org/docs/messages/next-prerender-current-time
- https://nextjs.org/docs/messages/blocking-route
- https://nextjs.org/docs/app/api-reference/functions/fetch
- https://nextjs.org/docs/app/guides/lazy-loading
- https://nextjs.org/docs/app/api-reference/components/font
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions
- https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration
- https://vercel.com/changelog/node-js-26-lts-is-now-generally-available-on-vercel
- https://vercel.com/docs/limits/fair-use-guidelines
- https://vercel.com/docs/git/vercel-for-github
- https://community.vercel.com/t/why-cant-hobby-accounts-deploy-from-organizations/10015
- https://community.vercel.com/t/unable-to-deploy-from-organizational-private-repository/16334
- https://api.met.no/doc/TermsOfService
- https://api.met.no/doc/License
- https://cache.kartverket.no/
- https://kartverket.no/en/api-and-data/terms-of-use
- https://github.com/metno/weathericons
- https://github.com/advisories/GHSA-qxg6-89mg-rqv8
- https://github.com/advisories/GHSA-xp26-3454-mjgp
- npm registry (`npm view …`, `npm pack create-next-app@16.4.3`, `npm pack @anthropic-ai/sdk@1.3.0`, dry-run `npm install --package-lock-only`, `npm audit`), 2026-11-12
