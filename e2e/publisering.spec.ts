import { expect, test } from "./fixtures";

// Story 1.2 (AD-14, NFR-6): forsiden rendres per forespørsel og har verken informasjonskapsler
// eller skript fra andre origins. Lokalt går testen mot `next dev`, som også svarer `no-store`;
// bare CI (`next build && next start`) fanger en side som er ferdigrendret ved bygging.

test("forsiden er dynamisk og setter ingen informasjonskapsler", async ({ request }) => {
  const svar = await request.get("/");
  expect(svar.status()).toBe(200);
  const hoder = svar.headers();
  expect(hoder["cache-control"]).toContain("no-store");
  expect(hoder["x-nextjs-prerender"]).toBeUndefined();
  expect(hoder["set-cookie"]).toBeUndefined();
});

test("sideinnlasting gir ingen informasjonskapsler", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await context.cookies()).toEqual([]);
});

test("alle forespørsler går til samme origin, og ingen går til Vercels analyse", async ({ page }) => {
  const urler: string[] = [];
  page.on("request", (foresporsel) => urler.push(foresporsel.url()));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const origin = new URL(page.url()).origin;
  for (const url of urler) {
    const { origin: fra, pathname } = new URL(url);
    expect(fra, url).toBe(origin);
    expect(pathname, url).not.toMatch(/^\/_vercel\/(insights|speed-insights)\//);
  }
});
