import { expect, type Page, test } from "@playwright/test";

// Story 1.11: Søk-flaten mot ?demo=uten-vaer, der «nå» er man. 9. nov. 2026 kl. 13:30.
// Testene sjekker tilstand, felt og navn, aldri Turnavn.

const DEMO = "/?demo=uten-vaer";

const STANDARD_SOK = {
  dato: "2026-11-09",
  start: "13:30",
  tilgjengeligMin: 120,
  vanskelighetsgrad: "B",
  utsikt: false,
  vann: false,
};

const felt = (page: Page) => ({
  turdag: page.getByRole("radiogroup", { name: "Turdag" }),
  iDag: page.getByRole("radio", { name: "I dag" }),
  iMorgen: page.getByRole("radio", { name: "I morgen" }),
  start: page.getByRole("combobox", { name: "Starttidspunkt" }),
  tid: page.getByRole("combobox", { name: "Tilgjengelig tid" }),
  vanskelighetsgrad: page.getByRole("radiogroup", { name: "Vanskelighetsgrad" }),
  utsikt: page.getByRole("checkbox", { name: "utsikt" }),
  vann: page.getByRole("checkbox", { name: "vann" }),
  finnTur: page.getByRole("button", { name: "Finn tur" }),
  reduserStart: page.getByRole("button", { name: "Reduser Starttidspunkt med 15 min" }),
  okStart: page.getByRole("button", { name: "Øk Starttidspunkt med 15 min" }),
  reduserTid: page.getByRole("button", { name: "Reduser Tilgjengelig tid med 15 min" }),
  okTid: page.getByRole("button", { name: "Øk Tilgjengelig tid med 15 min" }),
});

test("standard: I dag, 13:30 med «nå», 2 t, Middels og ingen preferanser", async ({ page }) => {
  await page.goto(DEMO);
  const f = felt(page);

  await expect(page.getByTestId("demomodus")).toHaveText(
    "DEMOMODUS · Værscenario: Værmeldingen mangler · «nå» = man. 9. nov. 13:30",
  );
  await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeVisible();

  await expect(f.turdag).toBeVisible();
  await expect(f.iDag).toBeChecked();
  await expect(f.iMorgen).not.toBeChecked();
  await expect(f.start).toHaveValue("13:30");
  await expect(page.getByText("nå", { exact: true })).toBeVisible();
  await expect(f.start).toHaveAccessibleDescription(/^nå Hele kvarter, 06:00–22:00\.$/);
  await expect(f.tid).toHaveValue("120");
  await expect(f.tid.locator("option:checked")).toHaveText("2 t");
  await expect(f.vanskelighetsgrad.getByRole("radio", { name: "Middels" })).toBeChecked();
  await expect(f.utsikt).not.toBeChecked();
  await expect(f.vann).not.toBeChecked();

  // Passerte tider er låst. Lik «nå» er ikke passert.
  await expect(f.start.locator('option[value="13:15"]')).toBeDisabled();
  await expect(f.start.locator('option[value="13:30"]')).toBeEnabled();

  await expect(page.getByRole("link", { name: "Data fra MET Norway" })).toHaveAttribute("target", "_blank");
  await expect(page.getByRole("link", { name: "© Kartverket" })).toHaveAttribute("target", "_blank");
});

test("I morgen gir 10:00 uten låste tider, og I dag igjen gir standard «nå»", async ({ page }) => {
  await page.goto(DEMO);
  const f = felt(page);

  await f.iMorgen.check();
  await expect(f.start).toHaveValue("10:00");
  await expect(f.start.locator("option[disabled]")).toHaveCount(0);
  await expect(page.getByText("nå", { exact: true })).toHaveCount(0);

  await f.okStart.click();
  await expect(f.start).toHaveValue("10:15");

  await f.iDag.check();
  await expect(f.start).toHaveValue("13:30");
  await expect(page.getByText("nå", { exact: true })).toBeVisible();
  await expect(f.start.locator('option[value="13:15"]')).toBeDisabled();
  await expect(f.start.locator('option[value="06:00"]')).toBeDisabled();
});

test("trinnknappene har navn og gjør ingenting ved grensen", async ({ page }) => {
  await page.goto(DEMO);
  const f = felt(page);

  // I dag er 13:30 det første valget som ikke er låst.
  await expect(f.reduserStart).toHaveAttribute("aria-disabled", "true");
  await f.reduserStart.click({ force: true });
  await expect(f.start).toHaveValue("13:30");
  await f.okStart.click();
  await expect(f.start).toHaveValue("13:45");
  await f.reduserStart.click();
  await expect(f.start).toHaveValue("13:30");

  await f.iMorgen.check();
  await f.start.selectOption("06:00");
  await expect(f.reduserStart).toHaveAttribute("aria-disabled", "true");
  await f.reduserStart.click({ force: true });
  await expect(f.start).toHaveValue("06:00");

  await f.start.selectOption("22:00");
  await expect(f.okStart).toHaveAttribute("aria-disabled", "true");
  await f.okStart.click({ force: true });
  await expect(f.start).toHaveValue("22:00");

  await f.tid.selectOption("15");
  await expect(f.reduserTid).toHaveAttribute("aria-disabled", "true");
  await f.reduserTid.click({ force: true });
  await expect(f.tid).toHaveValue("15");
  await f.okTid.click();
  await expect(f.tid).toHaveValue("30");

  await f.tid.selectOption("300");
  await expect(f.okTid).toHaveAttribute("aria-disabled", "true");
  await f.okTid.click({ force: true });
  await expect(f.tid).toHaveValue("300");
  await expect(f.tid.locator("option:checked")).toHaveText("5 t");
});

test("Finn tur sender standard-Søket og melder overskriften", async ({ page }) => {
  await page.goto(DEMO);
  const f = felt(page);

  const foresporsel = page.waitForRequest(
    (r) => r.method() === "POST" && new URL(r.url()).pathname === "/api/sok",
  );
  await expect(f.finnTur).toBeEnabled();
  await f.finnTur.click();

  const sendt = await foresporsel;
  expect(new URL(sendt.url()).search).toBe("?demo=uten-vaer");
  expect(sendt.postDataJSON()).toEqual(STANDARD_SOK);

  const live = page.locator('[aria-live="polite"]');
  await expect(live.getByRole("heading", { name: "Tre Turforslag som passer tiden din" })).toBeVisible();

  // Knappen er aldri låst, og Søket står aldri i URL-en.
  await expect(f.finnTur).toBeEnabled();
  expect(new URL(page.url()).search).toBe("?demo=uten-vaer");
});

test("Finn tur sender endrede verdier", async ({ page }) => {
  await page.goto(DEMO);
  const f = felt(page);

  await f.iMorgen.check();
  await f.tid.selectOption("180");
  await f.vanskelighetsgrad.getByRole("radio", { name: "Krevende" }).check();
  await f.utsikt.check();

  const foresporsel = page.waitForRequest((r) => r.method() === "POST");
  await f.finnTur.click();
  expect((await foresporsel).postDataJSON()).toEqual({
    ...STANDARD_SOK,
    dato: "2026-11-10",
    start: "10:00",
    tilgjengeligMin: 180,
    vanskelighetsgrad: "R",
    utsikt: true,
  });
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible();
});

test("en justering fra serveren står under Starttidspunkt", async ({ page }) => {
  const justering = "Flyttet til 14:15, fordi 13:30 har passert.";
  await page.route("**/api/sok?*", async (route) => {
    const svar = await route.fetch();
    const visning = await svar.json();
    await route.fulfill({ response: svar, json: { ...visning, sok: { ...visning.sok, start: "14:15" }, justering } });
  });

  await page.goto(DEMO);
  const f = felt(page);
  await f.finnTur.click();

  await expect(page.getByText(justering)).toBeVisible();
  await expect(f.start).toHaveValue("14:15");
  await expect(f.start).toHaveAccessibleDescription(`Hele kvarter, 06:00–22:00. ${justering}`);

  // Justeringen forsvinner når Starttidspunkt endres.
  await f.okStart.click();
  await expect(page.getByText(justering)).toHaveCount(0);
  await expect(f.start).toHaveAccessibleDescription("Hele kvarter, 06:00–22:00.");

  // … og når Turdag endres.
  await f.finnTur.click();
  await expect(page.getByText(justering)).toBeVisible();
  await f.iMorgen.check();
  await expect(page.getByText(justering)).toHaveCount(0);
  await expect(f.start).toHaveAccessibleDescription("Hele kvarter, 06:00–22:00.");
});

test("et nytt Søk forkaster svaret på det forrige", async ({ page }) => {
  const forsteJustering = "Flyttet til 14:00, fordi 13:30 har passert.";
  const andreJustering = "Flyttet til 14:15, fordi 13:30 har passert.";
  let antall = 0;
  let slippForste = () => {};
  const forsteHoldt = new Promise<void>((slipp) => (slippForste = slipp));
  let forsteFerdig = () => {};
  const forsteBehandlet = new Promise<void>((ferdig) => (forsteFerdig = ferdig));

  await page.route("**/api/sok?*", async (route) => {
    const nr = ++antall;
    const svar = await route.fetch();
    const visning = await svar.json();
    if (nr === 1) {
      // Det første svaret holdes til det andre er besvart. Klienten har da avbrutt kallet.
      await forsteHoldt;
      await route
        .fulfill({ response: svar, json: { ...visning, sok: { ...visning.sok, start: "14:00" }, justering: forsteJustering } })
        .catch(() => {})
        .finally(forsteFerdig);
      return;
    }
    await route.fulfill({
      response: svar,
      json: { ...visning, sok: { ...visning.sok, start: "14:15" }, justering: andreJustering },
    });
    slippForste();
  });

  await page.goto(DEMO);
  const f = felt(page);
  const forsteSendt = page.waitForRequest((r) => r.method() === "POST");
  await f.finnTur.click();
  await forsteSendt;
  await f.finnTur.click();

  await expect(page.getByText(andreJustering)).toBeVisible();
  await expect(f.start).toHaveValue("14:15");

  await forsteBehandlet;
  await expect(page.getByText(forsteJustering)).toHaveCount(0);
  await expect(page.getByText(andreJustering)).toBeVisible();
  await expect(f.start).toHaveValue("14:15");
});

test("tokens er lastet og trykkflatene er minst 44 × 44 px ved 360 px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(DEMO);
  const f = felt(page);

  const trykkflate = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--spacing-touch-min").trim(),
  );
  expect(trykkflate).toBe("44px");

  // Radioknappen og avkrysningsboksen dekker hele segmentet og hele brikken.
  for (const element of [f.okStart, f.reduserTid, f.utsikt, f.iMorgen, f.finnTur]) {
    const boks = await element.boundingBox();
    expect(boks, String(element)).not.toBeNull();
    expect(boks!.width, String(element)).toBeGreaterThanOrEqual(44);
    expect(boks!.height, String(element)).toBeGreaterThanOrEqual(44);
  }
});

test("ukjent demo gir panelet med gyldige demoer", async ({ page }) => {
  await page.goto("/?demo=finnes-ikke");
  await expect(page.getByRole("heading", { level: 1, name: "Ukjent demo" })).toBeVisible();
  await expect(page.getByText("Ukjent demo: «finnes-ikke». Gyldige demoer: uten-vaer.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Finn tur" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Data fra MET Norway" })).toBeVisible();

  await page.getByRole("link", { name: "uten-vaer" }).click();
  await expect(page).toHaveURL(/\/\?demo=uten-vaer$/);
  await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeVisible();
});

test("tastaturet når alle felt i leserekkefølge", async ({ page }) => {
  await page.goto(DEMO);
  const navn: string[] = [];
  for (let i = 0; i < 11; i++) {
    await page.keyboard.press("Tab");
    navn.push(
      await page.evaluate(() => {
        const el = document.activeElement as HTMLElement & { labels?: NodeListOf<HTMLLabelElement> };
        return el.getAttribute("aria-label") ?? el.labels?.[0]?.textContent ?? el.textContent ?? "";
      }),
    );
  }
  expect(navn).toEqual([
    "I dag",
    "Reduser Starttidspunkt med 15 min",
    "Starttidspunkt",
    "Øk Starttidspunkt med 15 min",
    "Reduser Tilgjengelig tid med 15 min",
    "Tilgjengelig tid",
    "Øk Tilgjengelig tid med 15 min",
    "Middels",
    "utsikt",
    "vann",
    "Finn tur",
  ]);

  // Pil og mellomrom virker som i vanlige radioknapper og avkrysningsbokser.
  const f = felt(page);
  await f.iDag.focus();
  await page.keyboard.press("ArrowRight");
  await expect(f.iMorgen).toBeChecked();
  await expect(f.start).toHaveValue("10:00");
  await f.vann.focus();
  await page.keyboard.press("Space");
  await expect(f.vann).toBeChecked();
});

// 180 px er 360 px ved 200 % zoom (EXPERIENCE.md › Accessibility Floor).
for (const bredde of [180, 360, 768, 1200, 1440]) {
  test(`ingen horisontal rulling ved ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 900 });
    await page.goto(DEMO);
    await expect(page.getByRole("button", { name: "Finn tur" })).toBeVisible();
    const [scrollbredde, klientbredde] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollbredde).toBeLessThanOrEqual(klientbredde);
  });
}
