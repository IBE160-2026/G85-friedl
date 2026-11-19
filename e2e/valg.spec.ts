import type { Locator, Page } from "@playwright/test";
import { expect, KARTFLISER, test } from "./fixtures";
import type { Resultatvisning, Turkort } from "../src/kjerne/visning/skjema";
import { grupperStartpunkter, velgIGruppe } from "../src/ui/kart-data";

// Story 3.5: velg Turforslag i listen eller på kartet (FR-24, UX-DR35, UX-DR37, UX-DR43, UX-DR44). Valget i
// Resultatet styrer kortene på PC, Stokken, Stokkoversikten, kartet og Kartinfoboksen, og kortene og kartet
// kan begge endre det. Kartflisene er stubbet av fixtures.ts, så ingen test kaller Kartverket. Alle Søk går med
// `?demo=`. Testene finner kortene med nummer og `aria-current`, og sammenligner med svaret fra serveren, aldri
// med Turnavn skrevet i testen (AR-26).

const PC = { width: 1440, height: 1000 } as const;
const MOBIL = { width: 360, height: 800 } as const;
const NETTBRETT = { width: 768, height: 1024 } as const;
/** `{colors.forest}` (#1F4A38): det valgte Startpunktet og den valgte ruten. */
const FOREST = "rgb(31, 74, 56)";

/** Sender Søket med «Finn tur» og gir Resultatvisningen serveren svarte med. */
async function finnTur(page: Page): Promise<Resultatvisning> {
  const svar = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/sok",
  );
  await page.getByRole("button", { name: "Finn tur" }).click();
  const respons = await svar;
  expect(respons.ok(), `/api/sok svarte ${respons.status()}`).toBe(true);
  const visning = (await respons.json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeVisible();
  return visning;
}

function turforslag(visning: Resultatvisning): Turkort[] {
  if (visning.utfall.type !== "turforslag") throw new Error(`Utfallet er ${visning.utfall.type}`);
  return visning.utfall.kort;
}

const boks = async (l: Locator) => (await l.boundingBox())!;

const deler = (page: Page) => {
  const kart = page.getByTestId("kart").filter({ visible: true });
  return {
    kart,
    linjer: kart.locator(".leaflet-overlay-pane path"),
    startpunkter: kart.getByTestId("kart-startpunkt"),
    infoboks: page.getByTestId("kartinfoboks").filter({ visible: true }),
    /** Kortene på PC, i rekkefølge. */
    kortene: page.getByTestId("kortraden").getByRole("article"),
  };
};

/** Startpunkt-markøren (knappen) for kortet med `nummer`. */
const markor = (kart: Locator, nummer: number) =>
  kart.getByRole("button", { name: new RegExp(`(^|og )Turforslag ${nummer}: `) });

/** Bakgrunnsfargen til sirkelen med `nummer`. */
const sirkelfarge = (startpunkter: Locator, nummer: number) =>
  startpunkter
    .locator("span", { hasText: new RegExp(`^${nummer}$`) })
    .evaluate((el) => getComputedStyle(el).backgroundColor);

/** Indeksene til kortene på PC som har `aria-current="true"`. */
const valgtePc = (kortene: Locator) =>
  kortene.evaluateAll((artikler) => artikler.flatMap((a, i) => (a.getAttribute("aria-current") === "true" ? [i] : [])));

/** Sjekker at kortet med `indeks` er valgt overalt på PC: kortet, ruten, Startpunktet og Kartinfoboksen. */
async function sjekkValgtPc(page: Page, kort: Turkort[], indeks: number) {
  const d = deler(page);
  await expect.poll(() => valgtePc(d.kortene)).toEqual([indeks]);
  const nummer = kort[indeks].kart.nummer;
  await expect.poll(() => sirkelfarge(d.startpunkter, nummer)).toBe(FOREST);
  // Den valgte ruten tegnes sist, så den ligger øverst, og den er skoggrønn og stiplet.
  const siste = d.linjer.last();
  expect(await siste.evaluate((el) => getComputedStyle(el).stroke)).toBe(FOREST);
  expect(await siste.evaluate((el) => getComputedStyle(el).strokeDasharray)).not.toBe("none");
  await sjekkInfoboks(d.infoboks, kort[indeks], `Turforslag ${nummer} av ${kort.length}`);
  // Foten: «Vises på kartet» på det valgte kortet, «Vis på kartet» på de andre.
  for (const [i, artikkel] of (await d.kortene.all()).entries()) {
    const knapp = artikkel.getByTestId("vis-pa-kartet");
    // Knappen kan ikke trykkes «av»: valget står i aria-current på kortet, ikke i aria-pressed.
    await expect(knapp).not.toHaveAttribute("aria-pressed");
    await expect(knapp).toBeEnabled();
    await expect(knapp).toHaveText(i === indeks ? "Vises på kartet" : "Vis på kartet");
  }
}

async function sjekkInfoboks(infoboks: Locator, kort: Turkort, hvem: string) {
  await expect(infoboks).toHaveCount(1);
  await expect(infoboks).toContainText(`${hvem}: ${kort.kartinfoboks.navn}`);
  await expect(infoboks.locator("p").last()).toHaveText(kort.kartinfoboks.startpunkt);
}

/** Startpunktene og rutene står til venstre for Kartinfoboksen på PC. */
async function sjekkVenstreForInfoboks(d: ReturnType<typeof deler>) {
  const infoboks = await boks(d.infoboks);
  for (const [navn, liste] of [
    ["Startpunktet", d.startpunkter],
    ["ruten", d.linjer],
  ] as const) {
    for (const l of await liste.all()) {
      const b = await boks(l);
      expect(b.x + b.width, `${navn} står til venstre for Kartinfoboksen`).toBeLessThanOrEqual(infoboks.x);
    }
  }
}

/** Venter til kartflaten står stille (samme transformasjon to målinger på rad), og gir transformasjonen. */
const stilleUtsnitt = (kart: Locator) => stille(() => kartutsnitt(kart));

/** Venter til `mal` gir samme verdi to målinger på rad, og gir verdien. */
async function stille(mal: () => Promise<string>): Promise<string> {
  let forrige: string | null = null;
  await expect
    .poll(async () => {
      const naa = await mal();
      const stille = naa === forrige;
      forrige = naa;
      return stille;
    }, { intervals: [200] })
    .toBe(true);
  return forrige!;
}

/** Transformasjonen til kartflaten i Leaflet: den endres når kartet zoomer eller panorerer. */
const kartutsnitt = (kart: Locator) =>
  kart.locator(".leaflet-map-pane").evaluate((el) => (el as HTMLElement).style.transform);

/** Et punkt på trefflinjen til ruten med `nummer` der linjen selv tar imot trykket, i sidekoordinater. */
async function punktPaRute(kart: Locator, nummer: number): Promise<{ x: number; y: number }> {
  const sti = kart.locator(`[data-testid="kart-rute-treff"][data-nummer="${nummer}"]`);
  await expect(sti).toHaveCount(1);
  const punkt = await sti.evaluate((el) => {
    const linje = el as SVGPathElement;
    const lengde = linje.getTotalLength();
    const ctm = linje.getScreenCTM()!;
    for (let t = 0.5; t < 1; t += 0.05) {
      for (const andel of [t, 1 - t]) {
        const p = linje.getPointAtLength(lengde * andel).matrixTransform(ctm);
        if (document.elementFromPoint(p.x, p.y) === linje) return { x: p.x, y: p.y };
      }
    }
    return null;
  });
  expect(punkt, `et ledig punkt på rute ${nummer}`).not.toBeNull();
  return punkt!;
}

test.describe("Valg på PC", () => {
  test.use({ viewport: PC, reducedMotion: "reduce" });

  test("kort 1 er valgt fra start, med «Vises på kartet», Kartinfoboksen og rute 1", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    expect(kort).toHaveLength(3);
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);
    await sjekkValgtPc(page, kort, 0);

    // Kartinfoboksen står øverst til høyre i kartet, og markørene står klar av den.
    const kart = await boks(d.kart);
    const infoboks = await boks(d.infoboks);
    expect(infoboks.y - kart.y).toBeLessThan(24);
    expect(kart.x + kart.width - (infoboks.x + infoboks.width)).toBeLessThan(24);
    await sjekkVenstreForInfoboks(d);
    // Kartinfoboksen er ikke interaktiv, men et høflig live-område på PC.
    await expect(d.infoboks).toHaveAttribute("aria-live", "polite");
    await expect(d.infoboks.locator("a, button, [tabindex]")).toHaveCount(0);
  });

  test("et trykk på kort 3 velger det, og kartet zoomer ikke på nytt", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);
    const for_ = await stilleUtsnitt(d.kart);

    await d.kortene.nth(2).getByTestId("faktalinje").click();
    await sjekkValgtPc(page, kort, 2);
    expect(await sirkelfarge(d.startpunkter, kort[0].kart.nummer)).not.toBe(FOREST);
    expect(await kartutsnitt(d.kart)).toBe(for_);
  });

  test("et trykk på kildelenken velger ikke kortet", async ({ page, context }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    // Lenken åpner i ny fane. Fanen stoppes, så den ikke henter noe utenfra.
    await context.route(
      (url) => url.hostname !== "localhost" && url.origin !== KARTFLISER,
      (route) => route.abort(),
    );
    const ny = context.waitForEvent("page");
    await d.kortene.nth(1).getByRole("link", { name: /^Kilde:/ }).click();
    await (await ny).close();
    await sjekkValgtPc(page, kort, 0);
  });

  test("Tab til kort 2 og Enter velger det, og mellomrom på kort 3 velger det", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    await d.kortene.nth(0).focus();
    for (let i = 0; i < 5 && !(await d.kortene.nth(1).evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(d.kortene.nth(1)).toBeFocused();
    // Kortet har fokusringen ved tastaturfokus.
    expect(await d.kortene.nth(1).evaluate((el) => getComputedStyle(el).boxShadow)).toContain(FOREST);
    await page.keyboard.press("Enter");
    await sjekkValgtPc(page, kort, 1);
    await expect(d.kortene.nth(1)).toBeFocused();

    await d.kortene.nth(2).focus();
    const y = await page.evaluate(() => window.scrollY);
    await page.keyboard.press(" ");
    await sjekkValgtPc(page, kort, 2);
    // Mellomrom ruller ikke siden.
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test("«Vis på kartet» på kort 2 velger det og ruller kartet inn, og fokuset blir på knappen", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    const knapp = d.kortene.nth(1).getByTestId("vis-pa-kartet");
    await knapp.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 400));
    await expect(d.kart).not.toBeInViewport({ ratio: 1 });
    expect((await boks(knapp)).height).toBeGreaterThanOrEqual(44);

    await knapp.click();
    await sjekkValgtPc(page, kort, 1);
    await expect(d.kart).toBeInViewport({ ratio: 1 });
    await expect(knapp).toBeFocused();
    // Haken er pynt: navnet er bare «Vises på kartet».
    await expect(knapp).toHaveAccessibleName("Vises på kartet");
  });

  test("«Vis på kartet» ruller ikke når kartet synes helt", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    const knapp = d.kortene.nth(2).getByTestId("vis-pa-kartet");
    await knapp.scrollIntoViewIfNeeded();
    await expect(d.kart).toBeInViewport({ ratio: 1 });
    await expect(knapp).toBeInViewport();
    const y = await page.evaluate(() => window.scrollY);
    await knapp.click();
    await sjekkValgtPc(page, kort, 2);
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
  });

  test("tekst markert i kort 2 og Enter på kildelenken i kort 2 velger ikke kortet", async ({ page, context }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    const mal = d.kortene.nth(1).getByRole("heading", { level: 2 });
    const b = await boks(mal);
    await page.mouse.move(b.x + 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width - 2, b.y + b.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await page.evaluate(() => window.getSelection()?.toString().length ?? 0)).toBeGreaterThan(0);
    await sjekkValgtPc(page, kort, 0);

    await context.route(
      (url) => url.hostname !== "localhost" && url.origin !== KARTFLISER,
      (route) => route.abort(),
    );
    const ny = context.waitForEvent("page");
    await d.kortene.nth(1).getByRole("link", { name: /^Kilde:/ }).focus();
    await page.keyboard.press("Enter");
    await (await ny).close();
    await sjekkValgtPc(page, kort, 0);
  });

  test("en markør som får fokus utenfor det synlige kartet eller under Kartinfoboksen, flyttes inn", async ({
    page,
  }) => {
    await page.goto("/?demo=uten-vaer");
    turforslag(await finnTur(page));
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);
    const zoomInn = d.kart.getByRole("button", { name: "Zoom inn" });
    const m = markor(d.kart, 3);
    /** Plasseringen til markøren, som endres når kartet zoomer eller panorerer. */
    const plass = async () => JSON.stringify(await boks(m));
    for (let i = 0; i < 2; i++) {
      const for_ = await plass();
      await zoomInn.click();
      await expect.poll(plass).not.toBe(for_);
      await stille(plass);
    }
    const kart = await boks(d.kart);
    const infoboks = await boks(d.infoboks);

    // Først under Kartinfoboksen, så utenfor kartet til venstre.
    for (const mal of [
      { x: infoboks.x + infoboks.width / 2, y: infoboks.y + infoboks.height / 2 },
      { x: kart.x - 150, y: kart.y + kart.height / 2 },
    ]) {
      const start = await boks(m);
      const fra = { x: kart.x + kart.width / 2, y: kart.y + kart.height - 60 };
      await page.mouse.move(fra.x, fra.y);
      await page.mouse.down();
      const dx = mal.x - (start.x + start.width / 2);
      const dy = mal.y - (start.y + start.height / 2);
      await page.mouse.move(fra.x + dx, fra.y + dy, { steps: 10 });
      await page.mouse.up();
      await stille(plass);
      // Markøren står nå utenfor eller under boksen. Fokuset flyttes til den med Shift+Tab fra zoomknappen.
      const dratt = await boks(m);
      const midt = dratt.x + dratt.width / 2;
      expect(midt > infoboks.x || midt < kart.x, "markøren er under boksen eller utenfor kartet").toBe(true);
      await zoomInn.focus();

      for (let i = 0; i < 10 && !(await m.evaluate((el) => el === document.activeElement)); i++) {
        await page.keyboard.press("Shift+Tab");
      }
      await expect(m).toBeFocused();
      await stille(plass);
      const b = await boks(m);
      expect(b.x).toBeGreaterThanOrEqual(kart.x);
      expect(b.y).toBeGreaterThanOrEqual(kart.y);
      expect(b.y + b.height).toBeLessThanOrEqual(kart.y + kart.height);
      expect(b.x + b.width, "markøren står til venstre for Kartinfoboksen").toBeLessThanOrEqual(infoboks.x);
      const rull = await d.kart.locator(".leaflet-container").evaluate((el) => [el.scrollLeft, el.scrollTop]);
      expect(rull).toEqual([0, 0]);
    }
  });

  test("et trykk på Startpunkt-markøren eller ruten velger kortet", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);
    const grupper = grupperStartpunkter(kort);
    const gruppe = grupper.find((g) => g.kort.some((k) => k.indeks === 1))!;

    const m = markor(d.kart, 2);
    const b = await boks(m);
    expect(b.width).toBeGreaterThanOrEqual(44);
    expect(b.height).toBeGreaterThanOrEqual(44);
    await m.click();
    await sjekkValgtPc(page, kort, velgIGruppe(gruppe, 0));

    // Tilbake til kort 1 med kortet, og så rute 3 på kartet.
    await d.kortene.nth(0).getByTestId("faktalinje").click();
    await sjekkValgtPc(page, kort, 0);
    const p = await punktPaRute(d.kart, kort[2].kart.nummer);
    await page.mouse.click(p.x, p.y);
    await sjekkValgtPc(page, kort, 2);
  });

  test("Tab til markøren for kort 3 og Enter velger det, og markøren har fokusringen", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    const m = markor(d.kart, 3);
    for (let i = 0; i < 10 && !(await m.evaluate((el) => el === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(m).toBeFocused();
    await page.keyboard.press("Enter");
    const gruppe = grupperStartpunkter(kort).find((g) => g.kort.some((k) => k.indeks === 2))!;
    await sjekkValgtPc(page, kort, velgIGruppe(gruppe, 0));
    await expect(m).toBeFocused();
    expect(await m.evaluate((el) => getComputedStyle(el).boxShadow)).toContain(FOREST);
  });

  test("et nytt Søk setter valget tilbake til kort 1", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    let kort = turforslag(await finnTur(page));
    const d = deler(page);
    await d.kortene.nth(2).getByTestId("faktalinje").click();
    await sjekkValgtPc(page, kort, 2);

    await page.getByRole("button", { name: "Endre søk" }).click();
    kort = turforslag(await finnTur(page));
    await expect(d.linjer).toHaveCount(6);
    await sjekkValgtPc(page, kort, 0);
  });
});

test.describe("Delt Startpunkt (UJ-1 med utsikt)", () => {
  test.use({ viewport: PC, reducedMotion: "reduce" });

  test("den delte markøren velger det første kortet i gruppen som ikke er valgt, og går rundt", async ({ page }) => {
    await page.goto("/?demo=uj-1");
    await page.getByRole("checkbox", { name: "utsikt" }).check();
    const kort = turforslag(await finnTur(page));
    const delt = grupperStartpunkter(kort).find((g) => g.kort.length > 1);
    expect(delt, "UJ-1 med utsikt har et delt Startpunkt").toBeDefined();
    const d = deler(page);
    const numre = delt!.kort.map((k) => k.nummer);
    const m = markor(d.kart, numre[0]);
    // Én knapp for hele gruppen, med navnet til alle kortene.
    await expect(m).toHaveCount(1);
    for (const n of numre) await expect(m).toHaveAccessibleName(new RegExp(`Turforslag ${n}: `));

    let valgt = 0;
    for (let trykk = 0; trykk < delt!.kort.length + 1; trykk++) {
      const neste = velgIGruppe(delt!, valgt);
      expect(neste).not.toBe(valgt);
      await m.click();
      await sjekkValgtPc(page, kort, neste);
      valgt = neste;
    }

    // Med tastaturet: Enter og mellomrom går hvert ett kort videre i gruppen.
    await m.focus();
    for (const tast of ["Enter", " ", "Enter"]) {
      const neste = velgIGruppe(delt!, valgt);
      await page.keyboard.press(tast);
      await sjekkValgtPc(page, kort, neste);
      await expect(m).toBeFocused();
      valgt = neste;
    }
  });
});

/** Kortet som vises i Stokken. */
const iStokken = (page: Page) => page.getByTestId("stokk-valgt").getByRole("article");

for (const [navn, viewport] of [
  ["mobil", MOBIL],
  ["nettbrett", NETTBRETT],
] as const) {
  test.describe(`Kart til kort på ${navn}`, () => {
    test.use({ viewport, reducedMotion: "reduce" });

    test("et trykk på markør 2 i hovedkartet blar Stokken til kortet, og Kartinfoboksen over kartet følger", async ({
      page,
    }) => {
      await page.goto("/?demo=uten-vaer");
      const kort = turforslag(await finnTur(page));
      const d = deler(page);
      await expect(d.linjer).toHaveCount(6);
      await sjekkInfoboks(d.infoboks, kort[0], "Turforslag 1 av 3");
      // Kartinfoboksen står over kartet, ikke på det. Stokknavigasjonen melder valget, så boksen er ikke live.
      const infoboks = await boks(d.infoboks);
      expect(infoboks.y + infoboks.height).toBeLessThanOrEqual((await boks(d.kart)).y);
      await expect(d.infoboks).not.toHaveAttribute("aria-live");

      const gruppe = grupperStartpunkter(kort).find((g) => g.kort.some((k) => k.indeks === 1))!;
      const forventet = velgIGruppe(gruppe, 0);
      await markor(d.kart, 2).click();
      await expect(iStokken(page)).toHaveAttribute("aria-label", new RegExp(`^Turforslag ${forventet + 1} av 3`));
      await sjekkInfoboks(d.infoboks, kort[forventet], `Turforslag ${forventet + 1} av 3`);
      await expect.poll(() => sirkelfarge(d.startpunkter, forventet + 1)).toBe(FOREST);
    });
  });
}

test("Kartinfoboksen står over kartet ved 1199 px og på kartet ved 1200 px", async ({ page }) => {
  await page.setViewportSize({ width: 1199, height: 1000 });
  await page.goto("/?demo=uten-vaer");
  turforslag(await finnTur(page));
  const d = deler(page);
  await expect(d.linjer).toHaveCount(6);
  let infoboks = await boks(d.infoboks);
  let kart = await boks(d.kart);
  expect(infoboks.y + infoboks.height).toBeLessThanOrEqual(kart.y);
  await expect(d.infoboks).not.toHaveAttribute("aria-live");

  await page.setViewportSize({ width: 1200, height: 1000 });
  await expect(d.infoboks).toHaveAttribute("aria-live", "polite");
  await expect.poll(async () => (await boks(d.infoboks)).y > (await boks(d.kart)).y).toBe(true);
  infoboks = await boks(d.infoboks);
  kart = await boks(d.kart);
  expect(infoboks.y - kart.y).toBeLessThan(24);
  expect(kart.x + kart.width - (infoboks.x + infoboks.width)).toBeLessThan(24);
  await sjekkVenstreForInfoboks(d);
});

test.describe("Valg på mobil", () => {
  test.use({ viewport: MOBIL, reducedMotion: "reduce" });

  test("«Neste Turforslag» og en rad i Stokkoversikten flytter ruten og Kartinfoboksen", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);

    await page.getByRole("button", { name: "Neste Turforslag" }).click();
    await sjekkInfoboks(d.infoboks, kort[1], "Turforslag 2 av 3");
    await expect.poll(() => sirkelfarge(d.startpunkter, 2)).toBe(FOREST);

    await page.getByTestId("stokkoversikt").getByRole("button").nth(2).click();
    await sjekkInfoboks(d.infoboks, kort[2], "Turforslag 3 av 3");
    await expect.poll(() => sirkelfarge(d.startpunkter, 3)).toBe(FOREST);
    await expect(iStokken(page)).toHaveAttribute("aria-label", /^Turforslag 3 av 3/);
  });

  test("et trykk på ruten i hovedkartet blar Stokken til kortet", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    const d = deler(page);
    await expect(d.linjer).toHaveCount(6);
    await d.kart.scrollIntoViewIfNeeded();
    const p = await punktPaRute(d.kart, 3);
    await page.mouse.click(p.x, p.y);
    await expect(iStokken(page)).toHaveAttribute("aria-label", /^Turforslag 3 av 3/);
    await sjekkInfoboks(d.infoboks, kort[2], "Turforslag 3 av 3");
  });
});

for (const [navn, viewport] of [
  ["PC", PC],
  ["mobil", MOBIL],
] as const) {
  test(`Alternativ på ${navn}: Kartinfoboksen viser den korteste Turen`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/?demo=uten-vaer");
    await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
    const visning = await finnTur(page);
    if (visning.utfall.type !== "kortesteTur") throw new Error(`Utfallet er ${visning.utfall.type}`);
    const d = deler(page);
    await sjekkInfoboks(d.infoboks, visning.utfall.kort, "Alternativ");
    await expect(d.infoboks.getByTestId("stempel-pil")).toBeVisible();
    // Kartinfoboksen ved Alternativet endrer seg aldri, så den er ikke et live-område.
    await expect(d.infoboks).not.toHaveAttribute("aria-live");
    await expect(d.linjer).toHaveCount(2);
    if (navn === "PC") await sjekkVenstreForInfoboks(d);
    // Alternativet har ingen valg i kartet: markøren er ikke en knapp.
    await expect(d.kart.getByRole("button", { name: /^Turforslag/ })).toHaveCount(0);
  });
}
