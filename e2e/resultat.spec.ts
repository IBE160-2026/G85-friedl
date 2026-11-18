import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Resultatvisning, Turkort } from "../src/kjerne/visning/skjema";

// Story 1.12: Resultat med Turkort på PC mot ?demo=uten-vaer, der «nå» er man. 9. nov. 2026 kl. 13:30.
// Testene sjekker tilstand, rekkefølge, antall og felt, aldri Turnavn (AR-26). Verdiene på kortene
// sammenlignes med svaret fra /api/sok, ikke med navn skrevet inn her.

const DEMO = "/?demo=uten-vaer";
const RADER = ["Turtid", "Værklasse", "Opplevelsespreferanser", "Mørkevarsel"] as const;
const MERKER = /^(passer|se opp|ikke vurdert)$/;

test.use({ viewport: { width: 1440, height: 1000 } });

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

/** Verdien til feltet `etikett` i Ditt søk. */
const ditt = (page: Page, etikett: string) =>
  page.getByTestId("ditt-sok").locator(`xpath=.//dt[normalize-space()="${etikett}"]/following-sibling::dd[1]`);

const topp = async (l: Locator) => (await l.boundingBox())!.y;

test("UJ-1 uten vær på PC: tilstand og rekkefølge", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const visning = await finnTur(page);
  const kort = turforslag(visning);
  expect(kort).toHaveLength(3);

  const demomodus = page.getByTestId("demomodus");
  const dittSok = page.getByRole("region", { name: "Ditt søk" });
  const vaermangel = page.getByTestId("vaermangel");
  const overskrift = page.getByRole("heading", { level: 1, name: "Tre Turforslag som passer tiden din" });
  const artikler = page.getByRole("article");
  const ansvarsmerknad = page.getByTestId("ansvarsmerknad");
  const kreditering = page.getByRole("link", { name: /Data fra MET Norway/ });

  await expect(demomodus).toBeVisible();
  await expect(dittSok).toBeVisible();
  await expect(dittSok.getByText("Ditt søk", { exact: true })).toHaveCSS("text-transform", "uppercase");
  await expect(ditt(page, "Turdag")).toHaveText("I dag, man. 9. nov.");
  await expect(ditt(page, "Starttidspunkt")).toHaveText("13:30");
  await expect(ditt(page, "Tilgjengelig tid")).toHaveText("2 t");
  await expect(ditt(page, "Vanskelighetsgrad")).toHaveText("Middels");
  await expect(ditt(page, "Opplevelsespreferanser")).toHaveText("utsikt");
  await expect(dittSok.getByRole("button", { name: "Endre søk" })).toBeVisible();

  // Værmangel-linjen står i tekster.ts og skal si det samme som kjernen.
  await expect(vaermangel).toHaveText(visning.vaer.type === "mangler" ? visning.vaer.tekst : "");
  await expect(page.locator('div[aria-live="polite"]')).toContainText("Tre Turforslag som passer tiden din");
  await expect(artikler).toHaveCount(3);
  await expect(ansvarsmerknad).toHaveText(
    "Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke føre (snø, is, gjørme). Følg MET sine farevarsler.",
  );
  await expect(kreditering).toBeVisible();

  // Søk-flaten er borte.
  await expect(page.getByRole("button", { name: "Finn tur" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Hvor lenge vil du gå?" })).toHaveCount(0);

  // Rekkefølgen ovenfra (UX-DR13).
  const ys = [
    await topp(demomodus),
    await topp(dittSok),
    await topp(vaermangel),
    await topp(overskrift),
    await topp(artikler.first()),
    await topp(ansvarsmerknad),
    await topp(kreditering),
  ];
  expect(ys).toEqual([...ys].sort((a, b) => a - b));

  // Kortene står side om side i rekkefølgen fra serveren.
  const bokser = await Promise.all([0, 1, 2].map(async (i) => (await artikler.nth(i).boundingBox())!));
  expect(bokser[1].y).toBeCloseTo(bokser[0].y, 0);
  expect(bokser[2].y).toBeCloseTo(bokser[0].y, 0);
  expect(bokser[0].x).toBeLessThan(bokser[1].x);
  expect(bokser[1].x).toBeLessThan(bokser[2].x);
});

test("Ditt søk viser «ingen» uten Opplevelsespreferanse", async ({ page }) => {
  await page.goto(DEMO);
  await finnTur(page);
  await expect(ditt(page, "Opplevelsespreferanser")).toHaveText("ingen");
});

test("hvert kort har alle feltene", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  const kort = turforslag(await finnTur(page));

  for (const [i, data] of kort.entries()) {
    const artikkel = page.getByRole("article").nth(i);
    await expect(artikkel).toHaveAccessibleName(data.lesetekst);
    await expect(artikkel).toHaveAccessibleName(new RegExp(`^Turforslag ${i + 1} av 3: .+\\. Turtid: `));

    await expect(artikkel.getByTestId("nummerstempel")).toHaveText(String(i + 1));
    await expect(artikkel.getByText(`${i + 1} av 3`, { exact: true })).toBeVisible();
    // Mål og «fra …» finnes, men navnene sjekkes ikke.
    await expect(artikkel.getByRole("heading", { level: 2 })).toHaveText(/\S/);
    await expect(artikkel.getByTestId("fra")).toHaveText(/\S/);
    await expect(artikkel.getByTestId("faktalinje")).toHaveText(
      /^\d+(,\d+)? km · \d+ høydemeter · høyeste punkt \d+ moh · (Enkel|Middels|Krevende)$/,
    );
    await expect(artikkel.getByTestId("startpunkt")).toHaveText(/^Startpunkt: /);
    // Overlinjene står med vanlige ord og vises i versaler.
    const passerFordi = artikkel.getByText("Passer fordi", { exact: true });
    await expect(passerFordi).toBeVisible();
    await expect(passerFordi).toHaveCSS("text-transform", "uppercase");

    // Fire Kriterierader i fast rekkefølge, hver med merke som har tekstalternativ.
    const rader = artikkel.getByRole("group");
    await expect(rader).toHaveCount(4);
    for (const [r, navn] of RADER.entries()) {
      const rad = rader.nth(r);
      await expect(rad).toHaveAccessibleName(navn);
      await expect(rad.getByRole("img")).toHaveAccessibleName(MERKER);
    }
    const vaer = artikkel.getByRole("group", { name: "Værklasse" });
    await expect(vaer.getByRole("img", { name: "ikke vurdert" })).toBeVisible();
    await expect(vaer).toContainText("ikke vurdert");

    // Haken er et SVG-ikon med tekstalternativ, ikke tegnet ✓.
    const onsker = artikkel.getByRole("group", { name: "Opplevelsespreferanser" });
    await expect(onsker).not.toContainText("✓");
    if (data.kriterier[2].tekst.includes("✓")) {
      await expect(onsker).toContainText("utsikt: ja");
      await expect(onsker.locator("p svg")).toHaveCount(1);
    }

    await expect(artikkel.getByText("Begrunnelse", { exact: true })).toHaveCSS("text-transform", "uppercase");
    await expect(artikkel.getByTestId("begrunnelse")).toContainText(`«${data.regeltekst}»`);
    expect(data.regeltekst).toMatch(/^passer tiden din \(.+ av 2 t\), værdata mangler/);

    const kilde = artikkel.getByRole("link", { name: new RegExp(`^Kilde: ${data.kilde.navn}`) });
    await expect(kilde).toHaveAttribute("href", data.kilde.url);
    await expect(kilde).toHaveAttribute("target", "_blank");
    const boks = (await kilde.boundingBox())!;
    expect(boks.width).toBeGreaterThanOrEqual(44);
    expect(boks.height).toBeGreaterThanOrEqual(44);
  }
});

test("stolpene følger andelene fra serveren", async ({ page }) => {
  await page.goto(DEMO);
  const kort = turforslag(await finnTur(page));

  for (const [i, data] of kort.entries()) {
    const artikkel = page.getByRole("article").nth(i);
    const spor = (await artikkel.getByTestId("tidsstolpe").boundingBox())!;
    const fyll = (await artikkel.getByTestId("tidsstolpe-fyll").boundingBox())!;
    expect(fyll.x).toBeCloseTo(spor.x, 0);
    expect(fyll.width / spor.width).toBeCloseTo(data.tidsstolpe.fyll, 2);

    const { slutt, skumring } = data.dagslysstolpe;
    const dagslys = (await artikkel.getByTestId("dagslysstolpe-spor").boundingBox())!;
    const midt = (b: { x: number; width: number }) => b.x + b.width / 2;
    const endepunkt = (await artikkel.getByTestId("dagslysstolpe-slutt").boundingBox())!;
    expect((midt(endepunkt) - dagslys.x) / dagslys.width).toBeCloseTo(slutt.andel, 2);
    if (skumring !== null) {
      const grense = (await artikkel.getByTestId("dagslysstolpe-grense").boundingBox())!;
      expect((midt(grense) - dagslys.x) / dagslys.width).toBeCloseTo(skumring, 1);
    }
    if (data.dagslysstolpe.solNed) {
      await expect(artikkel.getByTestId("dagslysstolpe")).toContainText(data.dagslysstolpe.solNed.tekst);
    }
    await expect(artikkel.getByTestId("dagslysstolpe")).toContainText(data.dagslysstolpe.startTekst);
  }
});

test("Endre søk går tilbake til Søk med verdiene fra Søket", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("radio", { name: "I morgen" }).check();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
  await page.getByRole("radio", { name: "Krevende" }).check();
  await page.getByRole("checkbox", { name: "vann" }).check();
  const visning = await finnTur(page);

  await page.getByRole("button", { name: "Endre søk" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByTestId("ditt-sok")).toHaveCount(0);

  await expect(page.getByRole("radio", { name: "I morgen" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Starttidspunkt" })).toHaveValue(visning.sok.start);
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("180");
  await expect(page.getByRole("radio", { name: "Krevende" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "vann" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "utsikt" })).not.toBeChecked();
  expect(new URL(page.url()).search).toBe("?demo=uten-vaer");
});

test("et nytt Søk erstatter Resultatet, og fokus står på overskriften", async ({ page }) => {
  await page.goto(DEMO);
  const forste = await finnTur(page);
  await expect(ditt(page, "Tilgjengelig tid")).toHaveText("2 t");

  await page.getByRole("button", { name: "Endre søk" }).click();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("60");
  const andre = await finnTur(page);
  expect(andre.resultatId).not.toBe(forste.resultatId);

  const overskrift = page.getByRole("heading", { level: 1 });
  await expect(overskrift).toHaveCount(1);
  await expect(overskrift).toHaveText(andre.overskrift);
  await expect(overskrift).toBeFocused();
  await expect(overskrift).toBeInViewport();
  await expect(page.getByTestId("ditt-sok")).toHaveCount(1);
  await expect(ditt(page, "Tilgjengelig tid")).toHaveText("1 t");
  await expect(page.getByRole("article")).toHaveCount(turforslag(andre).length);
});

test("Alternativ får en plassholder med Endre søk", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
  const visning = await finnTur(page);
  expect(visning.utfall.type).toBe("kortesteTur");

  await expect(page.getByTestId("resultat-kommer")).toContainText("Visningen av dette Resultatet kommer snart.");
  await expect(page.getByRole("article")).toHaveCount(0);
  await page.getByRole("button", { name: "Endre søk" }).click();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("15");
});

for (const bredde of [1200, 1440]) {
  test(`kortene er like høye og side om side ved ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 1000 });
    await page.goto(DEMO);
    await page.getByRole("checkbox", { name: "utsikt" }).check();
    await finnTur(page);
    const artikler = page.getByRole("article");
    await expect(artikler).toHaveCount(3);
    const bokser = await Promise.all([0, 1, 2].map(async (i) => (await artikler.nth(i).boundingBox())!));
    for (const boks of bokser) {
      expect(boks.height).toBeCloseTo(bokser[0].height, 0);
      expect(boks.y).toBeCloseTo(bokser[0].y, 0);
      expect(boks.width).toBeGreaterThanOrEqual(340);
    }
  });
}

for (const bredde of [360, 768, 1200, 1440]) {
  test(`Resultatet gir ingen horisontal rulling ved ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 900 });
    await page.goto(DEMO);
    await page.getByRole("checkbox", { name: "utsikt" }).check();
    await finnTur(page);
    // Under 1200 px viser Stokken ett kort om gangen (e2e/stokk.spec.ts).
    await expect(page.getByRole("article")).toHaveCount(bredde >= 1200 ? 3 : 1);
    const [scrollbredde, klientbredde] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollbredde).toBeLessThanOrEqual(klientbredde);
  });
}
