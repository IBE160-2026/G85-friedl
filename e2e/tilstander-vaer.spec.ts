import { expect, type Locator, type Page, test } from "@playwright/test";
import type { Resultatvisning } from "../src/kjerne/visning/skjema";

// Story 2.10: Bedre tidsvindu og Frarådet i Resultatet, mot tabellen under FR-6. Bedre tidsvindu-boksen
// i Værvarslingen (uj-2, ingen-bedre), Frarådet-kortet og Bedre tidsvindu-kortet (uj-3), knappen «Bruk …»
// som sender et nytt Søk, og tilstandene uten boks og kort (uj-1, uten-vaer). Oppsettet sjekkes ved
// 1440 og 360 px. Alle Søk går med `?demo=`, så ingen test kaller MET. Testene sjekker tilstand, antall
// og felt, aldri Turnavn (AR-26).

const PC = { width: 1440, height: 1000 } as const;
const MOBIL = { width: 360, height: 800 } as const;

const MET_FAREVARSLER = "https://www.met.no/vaer-og-klima/ekstremvaervarsler-og-andre-farevarsler";
const INGEN_BEDRE = "Det finnes ikke noe bedre tidsvindu i dagslys i dag eller i morgen.";
/** `{colors.rust}` (#A13E17). */
const RUST = "rgb(161, 62, 23)";

const erSokSvar = (r: { request: () => { method: () => string }; url: () => string }) =>
  r.request().method() === "POST" && new URL(r.url()).pathname === "/api/sok";

/** Trykker på `knapp`, venter på svaret fra /api/sok og overskriften, og gir Resultatvisningen. */
async function sendMed(page: Page, knapp: Locator): Promise<Resultatvisning> {
  const svar = page.waitForResponse(erSokSvar);
  await knapp.click();
  const respons = await svar;
  expect(respons.ok(), `/api/sok svarte ${respons.status()}`).toBe(true);
  const visning = (await respons.json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeVisible();
  return visning;
}

const finnTur = (page: Page) => sendMed(page, page.getByRole("button", { name: "Finn tur" }));

/**
 * UJ-2: I morgen (man. 9. nov.) 10:00, 3 t, Krevende og utsikt. «Nå» er søn. 8. nov. kl. 20.
 * `tilgjengeligMin` bytter Tilgjengelig tid.
 */
async function uj2(page: Page, tilgjengeligMin = 180): Promise<Resultatvisning> {
  await page.goto("/?demo=uj-2");
  await page.getByRole("radio", { name: "I morgen" }).check();
  await expect(page.getByRole("combobox", { name: "Starttidspunkt" })).toHaveValue("10:00");
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption(String(tilgjengeligMin));
  await page.getByRole("radio", { name: "Krevende" }).check();
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  return finnTur(page);
}

/** UJ-3: standard-Søket, I dag (lør. 14. nov.) 10:00, 2 t, Middels. `tilgjengeligMin` bytter Tilgjengelig tid. */
async function uj3(page: Page, tilgjengeligMin = 120): Promise<Resultatvisning> {
  await page.goto("/?demo=uj-3");
  await expect(page.getByRole("combobox", { name: "Starttidspunkt" })).toHaveValue("10:00");
  await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption(String(tilgjengeligMin));
  await expect(page.getByRole("radio", { name: "Middels" })).toBeChecked();
  return finnTur(page);
}

/** Verdien i feltet `etikett` i Ditt søk på PC. */
const dittSokFelt = (page: Page, etikett: string) =>
  page.getByTestId("ditt-sok").locator("dl > div", { has: page.locator("dt", { hasText: etikett }) }).locator("dd");

const boks = async (l: Locator) => (await l.boundingBox())!;

test.describe("Dårlig med vindu (uj-2)", () => {
  test.use({ viewport: PC });

  test("boksen i Værvarslingen, og «Bruk 14:00» gir et nytt Resultat for 14:00", async ({ page }) => {
    const visning = await uj2(page);
    expect(visning.bedreTidsvindu).toMatchObject({ type: "funnet", nyttSok: { start: "14:00" } });

    const varsling = page.getByTestId("vaervarsling");
    const bedre = varsling.getByTestId("bedre-tidsvindu-boks");
    await expect(bedre).toBeVisible();
    await expect(bedre.getByTestId("bedre-tidsvindu-tekst")).toHaveText("I morgen fra kl. 14:00 er Værklassen god.");
    await expect(bedre.getByTestId("bedre-tidsvindu-antall")).toHaveText("5 Turer passer før mørket.");
    const bruk = bedre.getByRole("button", { name: "Bruk 14:00" });
    await expect(bruk).toBeVisible();
    await expect(bruk).toHaveAccessibleDescription(
      "I morgen fra kl. 14:00 er Værklassen god. 5 Turer passer før mørket.",
    );
    await expect(page.getByTestId("fraradet-kort")).toHaveCount(0);
    await expect(page.getByTestId("bedre-tidsvindu-kort")).toHaveCount(0);

    const lengde = await page.evaluate(() => history.length);
    const ny = await sendMed(page, bruk);
    expect(ny.sok).toEqual({ ...visning.sok, start: "14:00" });
    expect(ny.utfall.type).toBe("turforslag");
    await expect(dittSokFelt(page, "Starttidspunkt")).toHaveText("14:00");
    await expect(dittSokFelt(page, "Turdag")).toHaveText(visning.dittSok.turdag);
    await expect(page.getByTestId("turkort").filter({ visible: true }).first()).toBeVisible();
    // Det nye Resultatet erstatter det forrige: ingen ny historikkoppføring, og fokus på overskriften.
    expect(await page.evaluate(() => history.length)).toBe(lengde);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    // Værklassen fra 14:00 er god, så det er verken Værvarsling eller boks.
    await expect(page.getByTestId("vaervarsling")).toHaveCount(0);
    await expect(page.getByTestId("bedre-tidsvindu-boks")).toHaveCount(0);

    // Tilbake går til Søk, ikke til det erstattede Resultatet, med Søket fra det nye Resultatet.
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toHaveCount(0);
    await expect(page.getByTestId("vaervarsling")).toHaveCount(0);
    await expect(page.getByRole("article")).toHaveCount(0);
    await expect(page.getByRole("combobox", { name: "Starttidspunkt" })).toHaveValue("14:00");
  });
});

test.describe("Dårlig og ingen Tur passer (uj-2, 15 min)", () => {
  test.use({ viewport: PC });

  test("Værvarslingen med boksen og knappen står over Alternativkortet", async ({ page }) => {
    const visning = await uj2(page, 15);
    expect(visning.utfall.type).toBe("kortesteTur");
    expect(visning.bedreTidsvindu?.type).toBe("funnet");
    const varsling = page.getByTestId("vaervarsling");
    const bedre = varsling.getByTestId("bedre-tidsvindu-boks");
    const knapp = bedre.getByRole("button", { name: /^Bruk / });
    const alternativ = page.getByTestId("alternativkort");
    await expect(bedre).toBeVisible();
    await expect(knapp).toBeVisible();
    await expect(alternativ).toBeVisible();
    if (visning.bedreTidsvindu?.type !== "funnet") return;
    await expect(knapp).toHaveText(visning.bedreTidsvindu.knappTekst);
    await expect(bedre.getByTestId("bedre-tidsvindu-antall")).toHaveText(visning.bedreTidsvindu.antallTekst);
    const v = await boks(varsling);
    expect(v.y + v.height).toBeLessThanOrEqual((await boks(alternativ)).y);
    expect((await boks(knapp)).y).toBeLessThan((await boks(alternativ)).y);
  });
});

test.describe("Ingen vindu (ingen-bedre)", () => {
  test.use({ viewport: PC });

  test("boksen viser teksten uten knapp", async ({ page }) => {
    await page.goto("/?demo=ingen-bedre");
    const visning = await finnTur(page);
    expect(visning.bedreTidsvindu).toEqual({ type: "ingen", tekst: INGEN_BEDRE });
    const bedre = page.getByTestId("vaervarsling").getByTestId("bedre-tidsvindu-boks");
    await expect(bedre).toBeVisible();
    await expect(bedre.getByTestId("bedre-tidsvindu-tekst")).toHaveText(INGEN_BEDRE);
    await expect(bedre.getByTestId("bedre-tidsvindu-antall")).toHaveCount(0);
    await expect(bedre.getByRole("button")).toHaveCount(0);
  });
});

test.describe("Frarådet (uj-3)", () => {
  test.use({ viewport: PC });

  test("Frarådet-kortet og Bedre tidsvindu-kortet, uten kart, Ansvarsmerknad og Turkort", async ({ page }) => {
    const visning = await uj3(page);
    expect(visning.utfall.type).toBe("fraradet");
    if (visning.utfall.type !== "fraradet") return;

    const kort = page.getByTestId("fraradet-kort");
    await expect(kort).toBeVisible();
    await expect(kort.getByTestId("vindflate")).toBeVisible();
    await expect(kort.getByTestId("nummerstempel")).toHaveText("!");
    await expect(kort.getByText("Ingen Turforslag", { exact: true })).toBeVisible();
    const klasse = kort.getByTestId("fraradet-klasse");
    await expect(klasse).toHaveText("Værklasse frarådet");
    await expect(klasse).toHaveCSS("color", RUST);
    await expect(kort.getByTestId("fraradet-verdier")).toHaveText(/vind opptil \d+(,\d)? m\/s/);
    await expect(kort.getByTestId("fraradet-melding")).toHaveText(visning.utfall.melding);
    await expect(kort.getByText(/^derfor ingen tur$/i)).toHaveCSS("text-transform", "uppercase");
    const rader = kort.locator("[data-rad]");
    await expect(rader).toHaveCount(2);
    await expect(rader.nth(0)).toHaveAttribute("data-rad", "vaer");
    await expect(rader.nth(1)).toHaveAttribute("data-rad", "tid");
    await expect(kort.getByRole("group", { name: "Værklasse" }).getByRole("img", { name: "se opp" })).toBeVisible();
    await expect(kort.getByRole("group", { name: "Turtid" }).getByRole("img", { name: "ikke vurdert" })).toBeVisible();
    const lenke = kort.getByRole("link", { name: /^Sjekk også MET sine farevarsler\./ });
    await expect(lenke).toHaveAttribute("href", MET_FAREVARSLER);
    await expect(lenke).toHaveAttribute("target", "_blank");
    await expect(lenke).toHaveAttribute("rel", "noopener noreferrer");

    const bedre = page.getByTestId("bedre-tidsvindu-kort");
    await expect(bedre).toBeVisible();
    await expect(bedre.getByTestId("nummerstempel").getByTestId("stempel-pil")).toBeAttached();
    await expect(bedre.getByText(/^alternativ · bedre tidsvindu$/i)).toHaveCSS("text-transform", "uppercase");
    await expect(bedre.getByTestId("bedre-tidsvindu-dag")).toHaveText("I morgen, søn. 15. nov.");
    await expect(bedre.getByTestId("bedre-tidsvindu-detalj")).toHaveText("fra kl. 11:00 · samme 2 t, Middels");
    if (visning.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");
    await expect(bedre.getByTestId("bedre-tidsvindu-antall")).toHaveText(visning.bedreTidsvindu.antallTekst);
    await expect(bedre.getByRole("button", { name: "Bruk i morgen 11:00" })).toBeVisible();

    // Ditt søk med «Endre søk», men ingen vær-del, kart, Ansvarsmerknad eller kort.
    await expect(page.getByTestId("ditt-sok").getByRole("button", { name: "Endre søk" })).toBeVisible();
    const borte = ["vaersammendrag", "vaervarsling", "vaermangel", "ansvarsmerknad", "alternativkort", "stokk"];
    for (const testid of borte) {
      await expect(page.getByTestId(testid), testid).toHaveCount(0);
    }
    await expect(page.getByTestId("turkort")).toHaveCount(0);
    await expect(page.locator(".leaflet-container, [data-testid='kart']")).toHaveCount(0);
  });

  test("«Bruk i morgen 11:00» gir vanlige Turforslag, og Ditt søk viser i morgen 11:00", async ({ page }) => {
    const visning = await uj3(page);
    if (visning.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");
    const ny = await sendMed(page, page.getByRole("button", { name: "Bruk i morgen 11:00" }));
    expect(ny.sok).toEqual(visning.bedreTidsvindu.nyttSok);
    expect(ny.utfall.type).toBe("turforslag");
    await expect(page.getByTestId("turkort").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByTestId("fraradet-kort")).toHaveCount(0);
    await expect(dittSokFelt(page, "Turdag")).toHaveText("I morgen, søn. 15. nov.");
    await expect(dittSokFelt(page, "Starttidspunkt")).toHaveText("11:00");
  });

  test("15 min: først frarådet uten den korteste Turen, så Alternativkortet med 16 min", async ({ page }) => {
    const visning = await uj3(page, 15);
    expect(visning.utfall.type).toBe("fraradet");
    await expect(page.getByTestId("fraradet-kort")).toBeVisible();
    await expect(page.getByTestId("alternativkort")).toHaveCount(0);
    if (visning.bedreTidsvindu?.type !== "funnet") throw new Error("Forventet et Bedre tidsvindu.");
    const bedre = page.getByTestId("bedre-tidsvindu-kort");
    await expect(bedre.getByTestId("bedre-tidsvindu-detalj")).toHaveText("fra kl. 11:00 · samme 15 min, Middels");
    await expect(bedre.getByTestId("bedre-tidsvindu-antall")).toHaveText(visning.bedreTidsvindu.antallTekst);

    const ny = await sendMed(page, page.getByRole("button", { name: "Bruk i morgen 11:00" }));
    if (ny.utfall.type !== "kortesteTur") throw new Error(`Utfallet er ${ny.utfall.type}`);
    expect(ny.utfall.kort.kriterier[0].tekst).toBe("16 min av 15 min");
    const alternativ = page.getByTestId("alternativkort");
    await expect(alternativ).toBeVisible();
    await expect(alternativ.getByRole("group", { name: "Turtid" })).toContainText("16 min av 15 min");
    await expect(page.getByTestId("fraradet-kort")).toHaveCount(0);
  });

  test("på mobil står «Endre søk» bare i toppfeltet, og den går til Søk med fokus", async ({ page }) => {
    await page.setViewportSize(MOBIL);
    await uj3(page);
    const toppfelt = page.getByRole("banner").getByRole("button", { name: "Endre søk" });
    await expect(toppfelt).toBeVisible();
    await expect(page.getByRole("button", { name: "Endre søk" }).filter({ visible: true })).toHaveCount(1);
    await toppfelt.click();
    await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeFocused();
    await expect(page.getByTestId("fraradet-kort")).toHaveCount(0);
  });

  test("live-området har «Ingen Turforslag»", async ({ page }) => {
    await uj3(page);
    await expect(page.locator('div[aria-live="polite"]')).toHaveText("Ingen Turforslag");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ingen Turforslag");
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  });
});

test.describe("God og mangler", () => {
  test.use({ viewport: PC });

  for (const { demo, tilgjengeligMin, utfall } of [
    { demo: "uj-1", tilgjengeligMin: 120, utfall: "turforslag" },
    { demo: "uj-1", tilgjengeligMin: 15, utfall: "kortesteTur" },
    { demo: "uten-vaer", tilgjengeligMin: 120, utfall: "turforslag" },
    { demo: "uten-vaer", tilgjengeligMin: 15, utfall: "kortesteTur" },
  ] as const) {
    test(`${demo} med ${tilgjengeligMin} min: ${utfall}, uten boks og uten kort`, async ({ page }) => {
      await page.goto(`/?demo=${demo}`);
      await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption(String(tilgjengeligMin));
      const visning = await finnTur(page);
      expect(visning.utfall.type).toBe(utfall);
      expect(visning.bedreTidsvindu).toBeUndefined();
      await expect(page.getByTestId(utfall === "turforslag" ? "turkort" : "alternativkort").first()).toBeAttached();
      for (const testid of ["bedre-tidsvindu-boks", "bedre-tidsvindu-kort", "fraradet-kort", "vaervarsling"]) {
        await expect(page.getByTestId(testid), testid).toHaveCount(0);
      }
      await expect(page.getByRole("button", { name: /^Bruk / })).toHaveCount(0);
    });
  }
});

for (const [navn, viewport] of [
  ["PC", PC],
  ["mobil", MOBIL],
] as const) {
  test.describe(`Oppsettet på ${navn}`, () => {
    test.use({ viewport });

    test("uj-2: boksen til høyre i Værvarslingen på PC og under på mobil", async ({ page }) => {
      await uj2(page);
      const varsling = page.getByTestId("vaervarsling");
      const bedre = varsling.getByTestId("bedre-tidsvindu-boks");
      await expect(bedre).toBeVisible();
      // Høydemerknaden er siste linje i innholdet og fyller bredden av det.
      const h = await boks(varsling.getByTestId("hoydemerknad"));
      const b = await boks(bedre);
      const v = await boks(varsling);
      expect(b.x + b.width).toBeLessThanOrEqual(v.x + v.width);
      if (navn === "PC") {
        expect(b.x).toBeGreaterThanOrEqual(h.x + h.width - 1);
        expect(b.y).toBeLessThan(h.y + h.height);
      } else {
        expect(b.y).toBeGreaterThanOrEqual(h.y + h.height);
      }
      const knapp = await boks(bedre.getByRole("button", { name: "Bruk 14:00" }));
      expect(knapp.height).toBeGreaterThanOrEqual(44);
    });

    test("uj-3: kortene ved siden av hverandre på PC og under hverandre på mobil", async ({ page }) => {
      await uj3(page);
      const fraradet = await boks(page.getByTestId("fraradet-kort"));
      const bedre = await boks(page.getByTestId("bedre-tidsvindu-kort"));
      if (navn === "PC") {
        expect(bedre.x).toBeGreaterThanOrEqual(fraradet.x + fraradet.width);
        expect(Math.abs(bedre.y - fraradet.y)).toBeLessThan(2);
      } else {
        expect(bedre.y).toBeGreaterThanOrEqual(fraradet.y + fraradet.height);
        expect(Math.abs(bedre.x - fraradet.x)).toBeLessThan(2);
        // På mobil fyller knappen kortets bredde, i tommelsonen.
        const knapp = await boks(page.getByRole("button", { name: "Bruk i morgen 11:00" }));
        expect(knapp.width).toBeGreaterThan(bedre.width * 0.7);
      }
      // Overskriften står over kortene.
      expect((await boks(page.getByRole("heading", { level: 1 }))).y).toBeLessThan(fraradet.y);
    });
  });
}
