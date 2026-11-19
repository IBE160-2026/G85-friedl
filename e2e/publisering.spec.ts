import { expect, KARTFLISER, test } from "./fixtures";

// Story 1.2 (AD-14, NFR-6): forsiden rendres per forespørsel og har verken informasjonskapsler
// eller skript fra andre origins. Lokalt går testen mot `next dev`, som også svarer `no-store`;
// bare CI (`next build && next start`) fanger en side som er ferdigrendret ved bygging.
//
// Story 3.3: på PC har Søk kartet, og nettleseren henter kartflisene fra Kartverket (AR-20). Det er det
// eneste andre opphavet som er lov, og bare for bilder. Fixturen stubber flisene, så testen kaller ikke Kartverket.

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

test("alle forespørsler går til samme origin eller til kartflisene, og ingen går til Vercels analyse", async ({
  page,
}) => {
  const urler: { url: string; type: string }[] = [];
  page.on("request", (foresporsel) => urler.push({ url: foresporsel.url(), type: foresporsel.resourceType() }));

  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const origin = new URL(page.url()).origin;
  for (const { url, type } of urler) {
    const { origin: fra, pathname } = new URL(url);
    // Fra Kartverket hentes bare kartflisene, som bilder.
    if (fra === KARTFLISER) expect(type, url).toBe("image");
    else expect(fra, url).toBe(origin);
    expect(pathname, url).not.toMatch(/^\/_vercel\/(insights|speed-insights)\//);
  }
});
