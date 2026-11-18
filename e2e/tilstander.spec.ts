import { expect, type Page, type Route, test } from "@playwright/test";
import type { Sok } from "../src/kjerne/sok";
import type { Resultatvisning } from "../src/kjerne/visning/skjema";

// Story 1.14: Alternativ, Kontaktfeil, Plassholder og Tilbake mot ?demo=uten-vaer, der «nå» er
// man. 9. nov. 2026 kl. 13:30. Testene sjekker tilstand, tekst, fokus og historikk, aldri Turnavn
// (AR-26). Svaret holdes igjen, avbrytes eller byttes med `page.route`.

const DEMO = "/?demo=uten-vaer";
const ER_SOK = (url: URL) => url.pathname === "/api/sok";
const SOK_OVERSKRIFT = "Hvor lenge vil du gå?";
const ANSVARSMERKNAD =
  "Du har selv ansvaret for å vurdere forholdene. Værvurderingen er veiledende og vurderer ikke føre (snø, is, gjørme). Følg MET sine farevarsler.";

test.use({ viewport: { width: 1440, height: 1000 } });

const erSokSvar = (r: { request: () => { method: () => string }; url: () => string }) =>
  r.request().method() === "POST" && ER_SOK(new URL(r.url()));

/** Sender Søket med «Finn tur» og gir Resultatvisningen serveren svarte med. */
async function finnTur(page: Page): Promise<Resultatvisning> {
  const svar = page.waitForResponse(erSokSvar);
  await page.getByRole("button", { name: "Finn tur" }).click();
  const visning = (await (await svar).json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeVisible();
  return visning;
}

const liveOmrade = (page: Page) => page.locator(`div[aria-live="polite"]`);
const sokOverskrift = (page: Page) => page.getByRole("heading", { level: 1, name: SOK_OVERSKRIFT });
const kontaktfeil = (page: Page) => page.getByTestId("kontaktfeil");
const historikklengde = (page: Page) => page.evaluate(() => history.length);

async function ingenHorisontalRulling(page: Page) {
  const [scrollbredde, klientbredde] = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    document.documentElement.clientWidth,
  ]);
  expect(scrollbredde).toBeLessThanOrEqual(klientbredde);
}

/** Holder igjen svaret fra /api/sok til `slipp` kalles. */
async function holdIgjen(page: Page) {
  let slipp: () => void = () => {};
  const sluppet = new Promise<void>((r) => (slipp = r));
  await page.route(ER_SOK, async (route: Route) => {
    await sluppet;
    await route.continue();
  });
  return () => slipp();
}

for (const bredde of [1440, 390]) {
  test(`Alternativ ved 15 min, ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: bredde >= 1200 ? 1000 : 844 });
    await page.goto(DEMO);
    await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
    const visning = await finnTur(page);
    if (visning.utfall.type !== "kortesteTur") throw new Error(`Utfallet er ${visning.utfall.type}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ingen Tur passer 15 min.");
    await expect(liveOmrade(page)).toContainText("Ingen Tur passer 15 min.");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(page.getByTestId("vaermangel")).toBeVisible();

    const kort = page.getByTestId("alternativkort");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toHaveAccessibleName(visning.utfall.kort.lesetekst);
    await expect(kort.getByTestId("stempel-pil")).toBeVisible();
    await expect(kort.getByTestId("alternativ-type")).toHaveText("Alternativ · den korteste Turen");

    const overlinje = kort.getByText("Slik står den mot Søket ditt", { exact: true });
    await expect(overlinje).toHaveCSS("text-transform", "uppercase");
    await expect(overlinje).toHaveCSS("color", "rgb(92, 83, 72)");

    // Tid-raden er warn, og Tidsstolpen har biten over grensen og grensestreken.
    const tid = kort.getByRole("group", { name: "Turtid" });
    await expect(tid.getByRole("img", { name: "se opp" })).toBeVisible();
    await expect(tid).toContainText(visning.utfall.kort.kriterier[0].tekst);
    await expect(kort.getByTestId("tidsstolpe").locator("div")).toHaveCount(3);

    // Begrunnelsen: boksen fra 1200 px og én linje under. Bare én av dem er synlig.
    const begrunnelse = kort.getByTestId("begrunnelse").filter({ visible: true });
    await expect(begrunnelse).toHaveCount(1);
    if (bredde >= 1200) {
      await expect(begrunnelse).toContainText("Begrunnelse");
      await expect(begrunnelse).not.toContainText("Begrunnelse:");
    } else {
      await expect(begrunnelse).toHaveText(/^Begrunnelse: «/);
    }

    const knapp = page.getByRole("button", { name: "Endre Tilgjengelig tid" });
    await expect(knapp).toBeVisible();
    await expect(knapp).toHaveCSS("background-color", "rgb(31, 74, 56)");
    await expect(page.getByTestId("passer-med")).toHaveText(visning.utfall.passerMedTekst);
    await expect(page.getByTestId("passer-med")).toHaveText("Med 30 min eller mer passer minst én Tur.");
    const ansvarsmerknad = page.getByTestId("ansvarsmerknad");
    await expect(ansvarsmerknad).toHaveText(ANSVARSMERKNAD);
    expect((await ansvarsmerknad.boundingBox())!.y).toBeGreaterThan((await knapp.boundingBox())!.y);

    // Ingen Stokk og ingen Stokkoversikt.
    await expect(page.getByTestId("stokk")).toHaveCount(0);
    await expect(page.getByTestId("stokkoversikt")).toHaveCount(0);
    await expect(page.getByTestId("stokknavigasjon")).toHaveCount(0);
    await ingenHorisontalRulling(page);
  });
}

test("Endre Tilgjengelig tid går til Søk med 15 min og fokus på Tilgjengelig tid", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
  await finnTur(page);
  await page.getByRole("button", { name: "Endre Tilgjengelig tid" }).click();

  await expect(sokOverskrift(page)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("15");
  // Minusknappen er inaktiv ved 15 min, så fokus går til plussknappen.
  await expect(page.getByRole("button", { name: "Reduser Tilgjengelig tid med 15 min" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );
  await expect(page.getByRole("button", { name: "Øk Tilgjengelig tid med 15 min" })).toBeFocused();
  expect(new URL(page.url()).search).toBe("?demo=uten-vaer");
});

test("Endre Tilgjengelig tid gir fokus på minusknappen når den kan brukes", async ({ page }) => {
  // Et Alternativ for et Søk på 30 min, laget av det ekte svaret for 15 min.
  await page.route(ER_SOK, async (route) => {
    const svar = await route.fetch();
    const visning = (await svar.json()) as Resultatvisning;
    await route.fulfill({ response: svar, json: { ...visning, sok: { ...visning.sok, tilgjengeligMin: 30 } } });
  });
  await page.goto(DEMO);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
  await finnTur(page);
  await page.getByRole("button", { name: "Endre Tilgjengelig tid" }).click();

  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("30");
  await expect(page.getByRole("button", { name: "Reduser Tilgjengelig tid med 15 min" })).toBeFocused();
});

for (const bredde of [1440, 390]) {
  test(`Plassholderstokken mens svaret venter, ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 900 });
    const slipp = await holdIgjen(page);
    await page.goto(DEMO);
    await page.getByRole("button", { name: "Finn tur" }).click();

    const plassholder = page.getByTestId("plassholder");
    await expect(plassholder).toBeVisible();
    await expect(page.getByTestId("plassholderstokk")).toHaveAttribute("aria-busy", "true");
    await expect(plassholder).toHaveText("Finner turer …");
    await expect(page.getByTestId("plassholder-kant")).toHaveCount(2);
    await expect(liveOmrade(page)).toContainText("Finner turer …");
    await expect(plassholder).toBeFocused();
    await expect(plassholder).toBeInViewport();

    // Ditt søk står øverst. Ingen spinner, ingen kort, ingen knapper og ingen Ansvarsmerknad.
    await expect(page.getByTestId(bredde >= 1200 ? "ditt-sok" : "ditt-sok-linje")).toContainText("13:30");
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    const animasjoner = await plassholder.evaluate((el) =>
      [el, ...el.querySelectorAll("*")].map((e) => getComputedStyle(e).animationName).filter((n) => n !== "none"),
    );
    expect(animasjoner).toEqual([]);
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("main").getByRole("button")).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("button", { name: "Endre søk" })).toHaveCount(0);
    await expect(page.getByTestId("ansvarsmerknad")).toHaveCount(0);
    expect((await page.getByTestId(bredde >= 1200 ? "ditt-sok" : "ditt-sok-linje").boundingBox())!.y).toBeLessThan(
      (await page.getByTestId("plassholderstokk").boundingBox())!.y,
    );
    await ingenHorisontalRulling(page);

    const svar = page.waitForResponse(erSokSvar);
    slipp();
    const visning = (await (await svar).json()) as Resultatvisning;
    await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeFocused();
    await expect(plassholder).toHaveCount(0);
  });
}

test("Kontaktfeil etter tidsgrensen på 10 s, meldt i live-området", async ({ page }) => {
  await page.clock.install();
  // Svaret kommer aldri.
  await page.route(ER_SOK, () => {});
  await page.goto(DEMO);
  await page.getByRole("button", { name: "Finn tur" }).click();
  await expect(page.getByTestId("plassholder")).toBeVisible();

  await page.clock.runFor(9_000);
  await expect(page.getByTestId("plassholder")).toBeVisible();
  await expect(kontaktfeil(page)).toHaveCount(0);

  await page.clock.runFor(1_100);
  await expect(kontaktfeil(page)).toBeVisible();
  await expect(page.getByTestId("plassholder")).toHaveCount(0);
  await expect(liveOmrade(page)).toContainText("Vi fikk ikke kontakt.");
  await expect(page.getByRole("heading", { level: 1, name: "Vi fikk ikke kontakt." })).toBeFocused();
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

for (const bredde of [1440, 390]) {
  test(`Kontaktfeil-kortet ved nettverksfeil, med en gang, ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 900 });
    await page.route(ER_SOK, (route) => route.abort());
    await page.goto(DEMO);
    await page.getByRole("checkbox", { name: "utsikt" }).check();
    await page.getByRole("button", { name: "Finn tur" }).click();

    const kort = kontaktfeil(page);
    await expect(kort).toBeVisible({ timeout: 3_000 });
    await expect(kort.getByRole("heading", { level: 1 })).toHaveText("Vi fikk ikke kontakt.");
    await expect(kort.getByRole("heading", { level: 1 })).toHaveCSS("font-size", "26px");
    await expect(kort.getByRole("heading", { level: 1 })).toBeFocused();
    await expect(kort).toContainText("Søket ditt er tatt vare på.");
    await expect(kort.getByRole("img")).toHaveCount(0);
    await expect(kort.locator("svg")).toHaveCount(1);
    await expect(kort.getByRole("button", { name: "Prøv igjen" })).toHaveCSS("background-color", "rgb(31, 74, 56)");
    await expect(kort.getByRole("button", { name: "Endre søk" })).toBeVisible();
    await expect(liveOmrade(page)).toContainText("Vi fikk ikke kontakt.");

    // Ditt søk står over kortet. Ingen kart, Ansvarsmerknad eller Stokkoversikt, og bare én «Endre søk»,
    // også i toppfeltet på mobil.
    const dittSok = page.getByTestId(bredde >= 1200 ? "ditt-sok" : "ditt-sok-linje");
    await expect(dittSok).toContainText("utsikt");
    expect((await dittSok.boundingBox())!.y).toBeLessThan((await kort.boundingBox())!.y);
    await expect(page.getByTestId("ansvarsmerknad")).toHaveCount(0);
    await expect(page.getByTestId("stokkoversikt")).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("banner").getByRole("button", { name: "Endre søk" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Endre søk" })).toHaveCount(1);
    await ingenHorisontalRulling(page);
  });
}

test("Kontaktfeil-kortet ved 500, med «Prøv igjen»", async ({ page }) => {
  await page.route(ER_SOK, (route) => route.fulfill({ status: 500, json: { feil: "intern" } }));
  await page.goto(DEMO);
  await page.getByRole("button", { name: "Finn tur" }).click();
  await expect(kontaktfeil(page)).toBeVisible();
  await expect(kontaktfeil(page).getByRole("button", { name: "Prøv igjen" })).toBeVisible();
});

test("ugyldig Søk (400) gir Kontaktfeil-kortet uten «Prøv igjen», og feilen i konsollen", async ({ page }) => {
  const feil = { feil: "ugyldig-sok", detaljer: [{ felt: "start" }] };
  const konsoll: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") konsoll.push(m.text());
  });
  await page.route(ER_SOK, (route) => route.fulfill({ status: 400, json: feil }));
  await page.goto(DEMO);
  await page.getByRole("button", { name: "Finn tur" }).click();

  const kort = kontaktfeil(page);
  await expect(kort).toBeVisible();
  await expect(kort.getByRole("heading", { level: 1, name: "Vi fikk ikke kontakt." })).toBeFocused();
  await expect(kort.getByRole("button", { name: "Prøv igjen" })).toHaveCount(0);
  await expect(kort.getByRole("button")).toHaveCount(1);
  await expect(kort.getByRole("button", { name: "Endre søk" })).toBeVisible();
  await expect.poll(() => konsoll.some((t) => t.includes("Serveren avviste Søket"))).toBe(true);

  await kort.getByRole("button", { name: "Endre søk" }).click();
  await expect(sokOverskrift(page)).toBeFocused();
});

test("Prøv igjen sender samme Søk, og Resultatet vises", async ({ page }) => {
  const sendt: Sok[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST" && ER_SOK(new URL(r.url()))) sendt.push(r.postDataJSON() as Sok);
  });
  await page.route(ER_SOK, (route) => route.abort());
  await page.goto(DEMO);
  const start = await historikklengde(page);
  await page.getByRole("radio", { name: "I morgen" }).check();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("90");
  await page.getByRole("checkbox", { name: "vann" }).check();
  await page.getByRole("button", { name: "Finn tur" }).click();
  await expect(kontaktfeil(page)).toBeVisible();
  // Ditt søk viser Søket som Kontaktfeil gjelder for.
  const dittSok = page.getByTestId("ditt-sok");
  await expect(dittSok.locator("dt")).toHaveText([
    "Turdag",
    "Starttidspunkt",
    "Tilgjengelig tid",
    "Vanskelighetsgrad",
    "Opplevelsespreferanser",
  ]);
  await expect(dittSok.locator("dd")).toHaveText(["I morgen", "10:00", "1 t 30 min", "Middels", "vann"]);

  // Nettet er tilbake.
  await page.unroute(ER_SOK);
  const svar = page.waitForResponse(erSokSvar);
  await page.getByRole("button", { name: "Prøv igjen" }).click();
  const visning = (await (await svar).json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeFocused();
  await expect(kontaktfeil(page)).toHaveCount(0);

  expect(sendt).toHaveLength(2);
  expect(sendt[1]).toEqual(sendt[0]);
  expect(sendt[0]).toMatchObject({ tilgjengeligMin: 90, vann: true, utsikt: false });
  // «Prøv igjen» erstatter oppføringen, så Tilbake går til Søk.
  expect(await historikklengde(page)).toBe(start + 1);
  await page.goBack();
  await expect(sokOverskrift(page)).toBeVisible();
});

test("Endre søk fra Kontaktfeil går til Søk med verdiene", async ({ page }) => {
  await page.route(ER_SOK, (route) => route.abort());
  await page.goto(DEMO);
  const start = await historikklengde(page);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
  await page.getByRole("radio", { name: "Krevende" }).check();
  await page.getByRole("button", { name: "Finn tur" }).click();
  await kontaktfeil(page).getByRole("button", { name: "Endre søk" }).click();

  await expect(sokOverskrift(page)).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("180");
  await expect(page.getByRole("radio", { name: "Krevende" })).toBeChecked();
  expect(await historikklengde(page)).toBe(start + 1);
});

test("Fram til Kontaktfeil etter Tilbake viser kortet, og «Endre søk» gir Søket som ble sendt", async ({ page }) => {
  await page.route(ER_SOK, (route) => route.abort());
  await page.goto(DEMO);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
  await page.getByRole("button", { name: "Finn tur" }).click();
  await expect(kontaktfeil(page)).toBeVisible();

  await page.goBack();
  await expect(sokOverskrift(page)).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("180");
  // Skjemaet endres, men Søket sendes ikke.
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("60");

  await page.goForward();
  await expect(kontaktfeil(page)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Vi fikk ikke kontakt." })).toBeFocused();
  await expect(page.getByTestId("ditt-sok").locator("dd").nth(2)).toHaveText("3 t");

  await kontaktfeil(page).getByRole("button", { name: "Endre søk" }).click();
  await expect(sokOverskrift(page)).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("180");
});

test("Tilbake fra Resultat går til Søk med verdiene, og URL-en beholder ?demo", async ({ page }) => {
  await page.goto(DEMO);
  await page.getByRole("radio", { name: "I morgen" }).check();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
  await page.getByRole("radio", { name: "Krevende" }).check();
  await page.getByRole("checkbox", { name: "vann" }).check();
  const visning = await finnTur(page);
  // Søket står aldri i URL-en.
  expect(new URL(page.url()).search).toBe("?demo=uten-vaer");

  await page.goBack();
  await expect(sokOverskrift(page)).toBeFocused();
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByRole("radio", { name: "I morgen" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "Starttidspunkt" })).toHaveValue(visning.sok.start);
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("180");
  await expect(page.getByRole("radio", { name: "Krevende" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "vann" })).toBeChecked();
  expect(new URL(page.url()).search).toBe("?demo=uten-vaer");

  // Fram igjen viser det siste Resultatet.
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeFocused();
});

test("Tilbake mens svaret venter, går til Søk og forkaster svaret", async ({ page }) => {
  const slipp = await holdIgjen(page);
  await page.goto(DEMO);
  await page.getByRole("button", { name: "Finn tur" }).click();
  await expect(page.getByTestId("plassholder")).toBeVisible();
  await page.goBack();
  await expect(sokOverskrift(page)).toBeFocused();
  slipp();
  await expect(page.getByTestId("plassholder")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Finn tur" })).toBeVisible();
  await expect(kontaktfeil(page)).toHaveCount(0);
});

test("Fram etter Tilbake mens svaret venter, viser ikke et gammelt Resultat", async ({ page }) => {
  await page.goto(DEMO);
  const start = await historikklengde(page);
  const forste = await finnTur(page);
  await page.getByRole("button", { name: "Endre søk" }).click();
  await expect(sokOverskrift(page)).toBeVisible();

  // Det andre Søket holdes igjen, og Tilbake forkaster det.
  const slipp = await holdIgjen(page);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("60");
  await page.getByRole("button", { name: "Finn tur" }).click();
  await expect(page.getByTestId("plassholder")).toBeVisible();
  await page.goBack();
  await expect(sokOverskrift(page)).toBeVisible();
  slipp();

  // Fram har ikke noe svar å vise, så flaten går tilbake til oppføringen for Søk.
  await page.goForward();
  await expect(sokOverskrift(page)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: forste.overskrift })).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => history.state?.turplanleggerResultat === true)).toBe(false);
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("60");
  expect(await historikklengde(page)).toBe(start + 1);

  // Et nytt Søk derfra legger fortsatt bare én oppføring.
  await page.unrouteAll({ behavior: "ignoreErrors" });
  await finnTur(page);
  expect(await historikklengde(page)).toBe(start + 1);
});

test("to raske trykk på «Endre søk» går bare ett steg tilbake", async ({ page }) => {
  await page.goto(DEMO);
  await finnTur(page);
  // Det andre klikket sendes før `popstate` har kommet.
  await page.getByTestId("ditt-sok").getByRole("button", { name: "Endre søk" }).evaluate((knapp: HTMLElement) => {
    knapp.click();
    knapp.click();
  });
  await expect(sokOverskrift(page)).toBeFocused();
  expect(new URL(page.url()).search).toBe("?demo=uten-vaer");
  await page.waitForTimeout(300);
  await expect(sokOverskrift(page)).toBeVisible();
});

test("et nytt Søk fra Resultat erstatter det første, og Tilbake går til Søk", async ({ page }) => {
  await page.goto(DEMO);
  const forste = await finnTur(page);
  await page.getByRole("button", { name: "Endre søk" }).click();
  await expect(sokOverskrift(page)).toBeFocused();
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("60");
  const andre = await finnTur(page);
  expect(andre.resultatId).not.toBe(forste.resultatId);

  await page.goBack();
  await expect(sokOverskrift(page)).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("60");
  await expect(page.getByRole("heading", { level: 1, name: forste.overskrift })).toHaveCount(0);
  await expect(page.getByRole("article")).toHaveCount(0);
});

test("Søk, Resultat, Endre søk og Resultat gir én historikkoppføring", async ({ page }) => {
  await page.goto(DEMO);
  const start = await historikklengde(page);
  await finnTur(page);
  expect(await historikklengde(page)).toBe(start + 1);
  await page.getByRole("button", { name: "Endre søk" }).click();
  await expect(sokOverskrift(page)).toBeVisible();
  await finnTur(page);
  expect(await historikklengde(page)).toBe(start + 1);
});

test("Endre søk i toppfeltet på mobil går tilbake i historikken", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(DEMO);
  const start = await historikklengde(page);
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
  await finnTur(page);
  await page.getByRole("banner").getByRole("button", { name: "Endre søk" }).click();
  await expect(sokOverskrift(page)).toBeFocused();
  await expect(page.getByRole("combobox", { name: "Tilgjengelig tid" })).toHaveValue("15");
  await finnTur(page);
  expect(await historikklengde(page)).toBe(start + 1);
});
