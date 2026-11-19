import type { Page, Request, Route } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { Resultatvisning, Turkort } from "../src/kjerne/visning/skjema";

// Story 4.2: Begrunnelsen med Språkmodellteksten fra den falske modellen i Demomodus (FR-22, AD-12, UX-DR27).
// Turforslagene vises med Regelteksten, og «Kort fortalt: …» byttes inn når svaret kommer innen 5 s i samme
// Resultat. Testene sammenligner med svaret fra /api/sok, aldri med Turnavn (AR-26), og kaller aldri Anthropic.

test.use({ viewport: { width: 1440, height: 1000 } });

const ER_BEGRUNNELSE = (url: URL) => url.pathname === "/api/begrunnelse";

/** Sender Søket med «Finn tur» og gir Resultatvisningen serveren svarte med. */
async function finnTur(page: Page): Promise<Resultatvisning> {
  const svar = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/sok");
  await page.getByRole("button", { name: "Finn tur" }).click();
  const visning = (await (await svar).json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeVisible();
  return visning;
}

function turforslag(visning: Resultatvisning): Turkort[] {
  if (visning.utfall.type !== "turforslag") throw new Error(`Utfallet er ${visning.utfall.type}`);
  return visning.utfall.kort;
}

/** Forespørslene til /api/begrunnelse, i rekkefølge. */
function begrunnelseForesporsler(page: Page): Request[] {
  const liste: Request[] = [];
  page.on("request", (r) => {
    if (ER_BEGRUNNELSE(new URL(r.url()))) liste.push(r);
  });
  return liste;
}

/**
 * Holder hvert kall til /api/begrunnelse til funksjonen som returneres, kalles. Da slippes de fram til
 * serveren. Et kall klienten har avbrutt i mellomtiden, ignoreres.
 */
async function holdTil(page: Page): Promise<() => void> {
  let slipp!: () => void;
  const sluppet = new Promise<void>((r) => (slipp = r));
  await page.route(ER_BEGRUNNELSE, async (route: Route) => {
    await sluppet;
    await route.continue().catch(() => {});
  });
  return slipp;
}

const vent = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Turkortene på PC, i rekkefølge. */
const kortraden = (page: Page) => page.getByTestId("kortraden").getByTestId("turkort");

const falsk = (k: Turkort) => `Kort fortalt: ${k.regeltekst}.`;

test("uj-1: hver Begrunnelse-boks får «Kort fortalt: …», og resten av kortene er uendret", async ({ page }) => {
  const foresporsler = begrunnelseForesporsler(page);
  const slipp = await holdTil(page);
  await page.goto("/?demo=uj-1");
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const visning = await finnTur(page);
  const kort = turforslag(visning);
  const artikler = kortraden(page);
  await expect(artikler).toHaveCount(kort.length);

  // Før svaret: Regelteksten, og kortene slik de står.
  for (const [i, k] of kort.entries()) {
    await expect(artikler.nth(i).getByTestId("begrunnelse")).toContainText(`«${k.regeltekst}»`);
  }
  const for_ = await artikler.allInnerTexts();
  slipp();

  // Etter svaret: Språkmodellteksten, og ellers samme tekst og rekkefølge i hvert kort.
  for (const [i, k] of kort.entries()) {
    await expect(artikler.nth(i).getByTestId("begrunnelse")).toContainText(`«${falsk(k)}»`);
  }
  const etter = await artikler.allInnerTexts();
  expect(etter.map((t, i) => t.replace(falsk(kort[i]), kort[i].regeltekst))).toEqual(for_);

  // Én forespørsel per Turforslag, med bare { sok, turId } og ?demo=.
  expect(foresporsler).toHaveLength(kort.length);
  for (const [i, r] of foresporsler.entries()) {
    expect(r.method()).toBe("POST");
    expect(new URL(r.url()).search).toBe("?demo=uj-1");
    expect(r.postDataJSON()).toEqual({ sok: visning.sok, turId: kort[i].turId });
  }
});

test("uj-1 ved 390 px: Begrunnelse-linjen i Stokken får «Kort fortalt: …»", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?demo=uj-1");
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const [forste] = turforslag(await finnTur(page));
  await expect(page.getByTestId("stokk-valgt").getByTestId("begrunnelse")).toHaveText(
    `Begrunnelse: «${falsk(forste)}»`,
  );
});

test("forsinket: et svar holdt i 6 s brukes ikke, og Regelteksten står etter 6,5 s", async ({ page }) => {
  await page.route(ER_BEGRUNNELSE, async (route) => {
    await vent(6000);
    await route.fulfill({ json: { tekst: "Kort fortalt: for sent." } }).catch(() => {});
  });
  await page.goto("/?demo=uj-1");
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const kort = turforslag(await finnTur(page));
  await vent(6500);
  const artikler = kortraden(page);
  for (const [i, k] of kort.entries()) {
    await expect(artikler.nth(i).getByTestId("begrunnelse")).toContainText(`«${k.regeltekst}»`);
  }
  await expect(page.getByText(/Kort fortalt/)).toHaveCount(0);
});

test("nytt Søk før svarene kommer: kortene i det nye Resultatet får sine egne svar", async ({ page }) => {
  const slipp = await holdTil(page);
  await page.goto("/?demo=uj-1");
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const gamle = turforslag(await finnTur(page));

  await page.getByRole("region", { name: "Ditt søk" }).getByRole("button", { name: "Endre søk" }).click();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
  const nye = turforslag(await finnTur(page));
  expect(nye.map(falsk)).not.toEqual(gamle.map(falsk));
  slipp();

  const artikler = kortraden(page);
  await expect(artikler).toHaveCount(nye.length);
  for (const [i, k] of nye.entries()) {
    await expect(artikler.nth(i).getByTestId("begrunnelse")).toContainText(`«${falsk(k)}»`);
  }
  await vent(1000);
  const tekster = await page.getByTestId("begrunnelse").allInnerTexts();
  for (const g of gamle) expect(tekster.join("\n")).not.toContain(falsk(g));
});

test("nytt Søk etter at tekstene kom: de nye kortene viser sin egen Regeltekst, aldri den gamle teksten", async ({
  page,
}) => {
  await page.goto("/?demo=uj-1");
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const gamle = turforslag(await finnTur(page));
  const artikler = kortraden(page);
  for (const [i, k] of gamle.entries()) {
    await expect(artikler.nth(i).getByTestId("begrunnelse")).toContainText(`«${falsk(k)}»`);
  }

  // Fra nå svarer serveren { tekst: null }, så hver Begrunnelse i det nye Resultatet skal være Regelteksten.
  let besvart = 0;
  await page.route(ER_BEGRUNNELSE, async (route) => {
    await route.fulfill({ json: { tekst: null } });
    besvart++;
  });
  await page.getByRole("region", { name: "Ditt søk" }).getByRole("button", { name: "Endre søk" }).click();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
  const nye = turforslag(await finnTur(page));
  await expect.poll(() => besvart).toBe(nye.length);

  await expect(artikler).toHaveCount(nye.length);
  for (const [i, k] of nye.entries()) {
    await expect(artikler.nth(i).getByTestId("begrunnelse")).toContainText(`«${k.regeltekst}»`);
  }
  await expect(page.getByText(/Kort fortalt/)).toHaveCount(0);
});

test("den korteste Turen: ingen forespørsel, og Regelteksten står", async ({ page }) => {
  const foresporsler = begrunnelseForesporsler(page);
  await page.goto("/?demo=uten-vaer");
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
  const visning = await finnTur(page);
  if (visning.utfall.type !== "kortesteTur") throw new Error(`Utfallet er ${visning.utfall.type}`);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByTestId("alternativkort").getByTestId("begrunnelse").filter({ visible: true }),
  ).toContainText(`«${visning.utfall.kort.regeltekst}»`);
  expect(foresporsler).toEqual([]);
});

test("frarådet: ingen forespørsel", async ({ page }) => {
  const foresporsler = begrunnelseForesporsler(page);
  await page.goto("/?demo=uj-3");
  const visning = await finnTur(page);
  expect(visning.utfall.type).toBe("fraradet");
  await page.waitForLoadState("networkidle");
  expect(foresporsler).toEqual([]);
});
