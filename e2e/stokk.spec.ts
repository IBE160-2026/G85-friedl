import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Resultatvisning, Turkort } from "../src/kjerne/visning/skjema";

// Story 1.13: Stokken på mobil og nettbrett mot ?demo=uten-vaer, der «nå» er man. 9. nov. 2026 kl. 13:30.
// Testene sjekker tilstand, antall, navn og felt, aldri Turnavn (AR-26). Kortene sammenlignes med
// svaret fra /api/sok. To Turforslag lages ved å mocke svaret, fordi ingen demo gir nøyaktig to.

const DEMO = "/?demo=uten-vaer";

test.use({ viewport: { width: 390, height: 844 } });

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

const deler = (page: Page) => ({
  stokk: page.getByTestId("stokk"),
  artikler: page.getByRole("article"),
  kanter: page.getByTestId("stokk-kant"),
  posisjon: page.getByTestId("stokk-posisjon"),
  navigasjon: page.getByTestId("stokknavigasjon"),
  forrige: page.getByRole("button", { name: "Forrige Turforslag" }),
  neste: page.getByRole("button", { name: "Neste Turforslag" }),
  oversikt: page.getByTestId("stokkoversikt"),
  rader: page.getByTestId("stokkoversikt").getByRole("button"),
  endreSok: page.getByRole("banner").getByRole("button", { name: "Endre søk" }),
});

/** Stokken heter «Turforslag N av M», viser «N av M» og har bare kort N synlig. */
async function forventKort(page: Page, kort: Turkort[], nummer: number) {
  const d = deler(page);
  await expect(page.getByRole("region", { name: `Turforslag ${nummer} av ${kort.length}` })).toBeVisible();
  await expect(d.posisjon).toHaveText(`${nummer} av ${kort.length}`);
  await expect(d.artikler).toHaveCount(1);
  await expect(d.artikler).toHaveAccessibleName(kort[nummer - 1].lesetekst);
}

async function ingenHorisontalRulling(page: Page) {
  const [scrollbredde, klientbredde] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(scrollbredde).toBeLessThanOrEqual(klientbredde);
}

async function minstTrykkflate(l: Locator) {
  const boks = (await l.boundingBox())!;
  expect(boks.width).toBeGreaterThanOrEqual(44);
  expect(boks.height).toBeGreaterThanOrEqual(44);
}

const topp = async (l: Locator) => (await l.boundingBox())!.y;

test("tre Turforslag ved 390 px: Ditt søk-linjen, Stokken, Stokknavigasjon og Stokkoversikt", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const visning = await finnTur(page);
  const kort = turforslag(visning);
  expect(kort).toHaveLength(3);
  const d = deler(page);

  // Ditt søk er én linje, og «Endre søk» står i toppfeltet. Panelet fra PC er skjult.
  const { dittSok } = visning;
  const linje = page.getByTestId("ditt-sok-linje");
  await expect(linje).toHaveText(
    `Ditt søk: ${[dittSok.turdag, dittSok.starttidspunkt, dittSok.tilgjengeligTid, dittSok.vanskelighetsgrad, "utsikt"].join(" · ")}`,
  );
  await expect(page.getByRole("region", { name: "Ditt søk" })).toHaveCount(0);
  await expect(d.endreSok).toBeVisible();
  await expect(page.getByRole("button", { name: "Endre søk" })).toHaveCount(1);

  // Ett synlig kort, to Stokk-kanter, «1 av 3», og «Forrige» er inaktiv.
  await forventKort(page, kort, 1);
  await expect(d.stokk).toHaveAttribute("tabindex", "0");
  await expect(d.kanter).toHaveCount(2);
  await expect(d.forrige).toHaveAttribute("aria-disabled", "true");
  await expect(d.forrige).not.toHaveAttribute("disabled");
  await expect(d.neste).not.toHaveAttribute("aria-disabled");
  await expect(d.neste).toHaveText("Neste tur");
  await expect(d.posisjon).toHaveAttribute("aria-live", "polite");
  await expect(d.posisjon).toHaveAttribute("aria-atomic", "true");

  // Den inaktive «Forrige» beholder fokus og gjør ingenting, både med Enter og med trykk.
  await d.forrige.focus();
  await page.keyboard.press("Enter");
  await expect(d.forrige).toBeFocused();
  await forventKort(page, kort, 1);
  await d.forrige.click({ force: true });
  await expect(d.forrige).toBeFocused();
  await forventKort(page, kort, 1);
  await expect(d.navigasjon.locator('[aria-hidden="true"] > span')).toHaveCount(3);

  // Begrunnelsen er én kursiv linje, med kildelenken under.
  const artikkel = d.artikler.first();
  const begrunnelse = artikkel.getByTestId("begrunnelse");
  await expect(begrunnelse).toHaveText(`Begrunnelse: «${kort[0].regeltekst}»`);
  await expect(begrunnelse).toHaveCSS("font-style", "italic");
  const kilde = artikkel.getByRole("link", { name: new RegExp(`^Kilde: ${kort[0].kilde.navn}`) });
  expect(await topp(kilde)).toBeGreaterThan(await topp(begrunnelse));

  // Stokkoversikt med tre rader, der rad 1 er valgt.
  await expect(d.oversikt.getByRole("heading", { level: 2, name: "Alle tre i stokken" })).toBeVisible();
  await expect(d.rader).toHaveCount(3);
  for (const [i, data] of kort.entries()) {
    const rad = d.rader.nth(i);
    await expect(rad).toHaveAttribute("aria-pressed", i === 0 ? "true" : "false");
    await expect(rad).toContainText(`${data.mal} ${data.fra}`);
    await expect(rad).toContainText(data.stokkoversiktRad);
    await expect(rad.getByRole("img")).toHaveCount(4);
    for (const [r, navn] of ["Turtid", "Værklasse", "Opplevelsespreferanser", "Mørkevarsel"].entries()) {
      await expect(rad.getByRole("img").nth(r)).toHaveAccessibleName(new RegExp(`^${navn}: (passer|se opp|ikke vurdert)$`));
    }
    await minstTrykkflate(rad);
  }

  // Trykkflatene er minst 44 × 44 px.
  for (const l of [d.forrige, d.neste, d.endreSok, kilde]) await minstTrykkflate(l);

  // Rekkefølgen for mobil (UX-DR13), utenom kartet.
  const ys = [
    await topp(page.getByTestId("demomodus")),
    await topp(linje),
    await topp(page.getByTestId("vaermangel")),
    await topp(page.getByRole("heading", { level: 1 })),
    await topp(d.stokk),
    await topp(d.navigasjon),
    await topp(d.oversikt),
    await topp(page.getByTestId("ansvarsmerknad")),
    await topp(page.getByRole("link", { name: /Data fra MET Norway/ })),
  ];
  expect(ys).toEqual([...ys].sort((a, b) => a - b));
  await ingenHorisontalRulling(page);
});

test("«Neste tur» blar til siste kort og blir inaktiv", async ({ page }) => {
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));
  const d = deler(page);

  await d.neste.click();
  await forventKort(page, kort, 2);
  await expect(d.forrige).not.toHaveAttribute("aria-disabled");
  await expect(d.rader.nth(1)).toHaveAttribute("aria-pressed", "true");

  await d.neste.click();
  await forventKort(page, kort, 3);
  await expect(d.neste).toHaveAttribute("aria-disabled", "true");
  await expect(d.neste).not.toHaveAttribute("disabled");
  // Ingen kort er igjen bak det valgte, så Stokken har ingen kanter.
  await expect(d.kanter).toHaveCount(0);

  // Den inaktive knappen beholder fokus og gjør ingenting.
  await d.neste.focus();
  await page.keyboard.press("Enter");
  await expect(d.neste).toBeFocused();
  await forventKort(page, kort, 3);

  await d.forrige.click();
  await forventKort(page, kort, 2);
  await expect(d.kanter).toHaveCount(1);
});

test("← og → blar når Stokken har fokus, og stopper i endene", async ({ page }) => {
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));
  const { stokk } = deler(page);

  await stokk.focus();
  await page.keyboard.press("ArrowLeft");
  await forventKort(page, kort, 1);
  await page.keyboard.press("ArrowRight");
  await forventKort(page, kort, 2);
  await page.keyboard.press("ArrowRight");
  await forventKort(page, kort, 3);
  await page.keyboard.press("ArrowRight");
  await forventKort(page, kort, 3);
  await expect(stokk).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await forventKort(page, kort, 1);

  // Piltaster på en kontroll inne i kortet blar ikke, og fokus blir stående.
  const kilde = page.getByRole("article").getByRole("link", { name: /^Kilde: / });
  await kilde.focus();
  await page.keyboard.press("ArrowRight");
  await forventKort(page, kort, 1);
  await expect(kilde).toBeFocused();
});

test("sveip mot venstre gir neste kort, og sveip forbi første kort gjør ingenting", async ({ page }) => {
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));
  const { stokk } = deler(page);
  // Uten `pan-y` tar nettleseren vannrette sveip på berøringsskjermer.
  await expect(stokk).toHaveCSS("touch-action", "pan-y");
  const boks = (await stokk.boundingBox())!;
  const x = boks.x + boks.width / 2;
  const y = boks.y + 120;

  async function dra(dx: number, dy: number) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 8 });
    await page.mouse.up();
  }

  await dra(80, 0);
  await forventKort(page, kort, 1);
  await dra(-40, 0);
  await forventKort(page, kort, 1);
  await dra(-60, 80);
  await forventKort(page, kort, 1);
  await dra(-80, 0);
  await forventKort(page, kort, 2);
  await dra(80, 10);
  await forventKort(page, kort, 1);

  // Slippes pekeren utenfor Stokken, blir ikke startpunktet hengende til et senere slipp.
  const over = boks.y - 30;
  await dra(0, over - y);
  await page.mouse.move(x - 100, over);
  await page.mouse.down();
  await page.mouse.move(x - 100, y, { steps: 8 });
  await page.mouse.up();
  await forventKort(page, kort, 1);
});

test("kildelenken i kortet virker, selv om Stokken fanger pekeren ved sveip", async ({ page, context }) => {
  // Kilden ligger utenfor appen, så den nye fanen får et tomt svar i stedet for å gå ut på nettet.
  await context.route(/^https?:\/\/(?!localhost)/, (route) => route.fulfill({ body: "", contentType: "text/plain" }));
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));
  const kilde = page.getByRole("article").getByRole("link", { name: /^Kilde: / });
  const fane = page.waitForEvent("popup");
  await kilde.click();
  expect((await fane).url()).toContain(new URL(kort[0].kilde.url).hostname);
});

test("trykk på en rad i Stokkoversikt velger kortet og gir Stokken fokus", async ({ page }) => {
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));
  const d = deler(page);

  await d.rader.nth(2).click();
  await forventKort(page, kort, 3);
  await expect(d.stokk).toBeFocused();
  await expect(d.stokk).toBeInViewport();
  await expect(d.rader.nth(2)).toHaveAttribute("aria-pressed", "true");
  await expect(d.rader.nth(0)).toHaveAttribute("aria-pressed", "false");
  await expect(d.rader.nth(1)).toHaveAttribute("aria-pressed", "false");
});

test("et nytt Søk starter på kort 1, og «Endre søk» i toppfeltet går til Søk", async ({ page }) => {
  await page.goto(DEMO);
  await finnTur(page);
  const d = deler(page);
  await d.rader.nth(2).click();
  await expect(d.posisjon).toHaveText("3 av 3");

  await d.endreSok.click();
  await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeFocused();
  await expect(d.endreSok).toHaveCount(0);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("60");
  const kort = turforslag(await finnTur(page));
  await forventKort(page, kort, 1);
});

test("to Turforslag: «Begge i stokken», én Stokk-kant og «1 av 2»", async ({ page }) => {
  await page.route("**/api/sok**", async (route) => {
    const svar = await route.fetch();
    const visning = (await svar.json()) as Resultatvisning;
    // Som serveren ville svart med to Turforslag: overskriften, live-teksten og leseteksten sier «av 2».
    if (visning.utfall.type === "turforslag") {
      visning.utfall.kort = visning.utfall.kort
        .slice(0, 2)
        .map((k) => ({ ...k, lesetekst: k.lesetekst.replace(" av 3", " av 2") }));
      visning.overskrift = visning.overskrift.replace(/^Tre /, "To ");
      visning.liveTekst = visning.liveTekst.replace(/^Tre /, "To ");
    }
    await route.fulfill({ response: svar, json: visning });
  });
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));
  expect(kort).toHaveLength(2);
  expect(kort.map((k) => k.lesetekst)).toEqual([
    expect.stringMatching(/^Turforslag 1 av 2: /),
    expect.stringMatching(/^Turforslag 2 av 2: /),
  ]);
  const d = deler(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^To Turforslag /);

  await forventKort(page, kort, 1);
  await expect(d.kanter).toHaveCount(1);
  await expect(d.oversikt.getByRole("heading", { level: 2, name: "Begge i stokken" })).toBeVisible();
  await expect(d.rader).toHaveCount(2);
  await d.neste.click();
  await forventKort(page, kort, 2);
  await expect(d.neste).toHaveAttribute("aria-disabled", "true");
});

test("ett Turforslag: ingen Stokk-kanter, Stokknavigasjon eller Stokkoversikt", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("30");
  await page.getByRole("radio", { name: "Enkel" }).check();
  const kort = turforslag(await finnTur(page));
  expect(kort).toHaveLength(1);
  const d = deler(page);

  await expect(page.getByRole("region", { name: "Turforslag 1 av 1" })).toBeVisible();
  await expect(d.artikler).toHaveCount(1);
  await expect(d.kanter).toHaveCount(0);
  await expect(d.navigasjon).toHaveCount(0);
  await expect(d.oversikt).toHaveCount(0);
});

test("Ditt søk-linjen har fire ledd uten Opplevelsespreferanse", async ({ page }) => {
  await page.goto(DEMO);
  const { dittSok } = await finnTur(page);
  expect(dittSok.opplevelsespreferanser).toHaveLength(0);
  await expect(page.getByTestId("ditt-sok-linje")).toHaveText(
    `Ditt søk: ${[dittSok.turdag, dittSok.starttidspunkt, dittSok.tilgjengeligTid, dittSok.vanskelighetsgrad].join(" · ")}`,
  );
});

test("kortet glir med en transition, som er av under «Reduser bevegelse»", async ({ page }) => {
  await page.goto(DEMO);
  await finnTur(page);
  const valgt = page.getByTestId("stokk-valgt");
  await expect(valgt).toHaveCSS("transition-duration", /0\.25s/);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(valgt).toHaveCSS("transition-duration", "0s");
  await deler(page).neste.click();
  await expect(deler(page).posisjon).toHaveText("2 av 3");
  await expect(page.getByTestId("stokk-valgt")).toHaveCSS("transition-duration", "0s");
});

for (const bredde of [768, 1199]) {
  test(`nettbrett ved ${bredde} px bruker mobiloppsettet innenfor tekstbredden`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 1000 });
    await page.goto(DEMO);
    const kort = turforslag(await finnTur(page));
    const d = deler(page);

    await forventKort(page, kort, 1);
    await expect(page.getByTestId("ditt-sok-linje")).toBeVisible();
    await expect(page.getByRole("region", { name: "Ditt søk" })).toHaveCount(0);
    await expect(d.endreSok).toBeVisible();
    await expect(d.oversikt).toBeVisible();

    // Sidemargen er 32 px, og innholdet holder seg innenfor 720 px.
    const stokk = (await d.stokk.boundingBox())!;
    expect(stokk.x).toBeCloseTo(32, 0);
    expect(stokk.width).toBeLessThanOrEqual(720);
    expect((await d.oversikt.boundingBox())!.width).toBeLessThanOrEqual(720);
    await ingenHorisontalRulling(page);
  });
}

test("PC ved 1200 px har tre kort side om side og ingen Stokk", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await page.goto(DEMO);
  await finnTur(page);
  const d = deler(page);

  await expect(d.artikler).toHaveCount(3);
  const bokser = await Promise.all([0, 1, 2].map(async (i) => (await d.artikler.nth(i).boundingBox())!));
  expect(bokser[1].y).toBeCloseTo(bokser[0].y, 0);
  expect(bokser[0].x).toBeLessThan(bokser[1].x);
  await expect(d.stokk).toBeHidden();
  await expect(d.oversikt).toBeHidden();
  await expect(page.getByTestId("ditt-sok-linje")).toBeHidden();
  await expect(page.getByRole("region", { name: "Ditt søk" })).toBeVisible();
  await expect(d.endreSok).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Endre søk" })).toHaveCount(1);
});

// 180 px tilsvarer 200 % zoom ved 360 px.
for (const bredde of [360, 768, 180]) {
  test(`Stokken gir ingen horisontal rulling ved ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 800 });
    await page.goto(DEMO);
    await page.getByRole("checkbox", { name: "utsikt" }).check();
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    for (let nummer = 1; nummer <= kort.length; nummer++) {
      if (nummer > 1) await d.neste.click();
      await forventKort(page, kort, nummer);
      await ingenHorisontalRulling(page);
    }
    await minstTrykkflate(d.forrige);
    await minstTrykkflate(d.neste);
  });
}
