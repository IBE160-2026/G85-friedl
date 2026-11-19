import type { Locator, Page } from "@playwright/test";
import { expect, KARTFLISER, KARTFLISER_URL, test } from "./fixtures";
import type { Resultatvisning, Turkort } from "../src/kjerne/visning/skjema";
import { grupperStartpunkter } from "../src/ui/kart-data";
import { BAKGRUNNSKART } from "../src/ui/tekster";

// Story 3.1: kartet i Resultatet, på PC (1440 px), nettbrett (768 px) og mobil (360 px). Kartflisene er stubbet av
// fixtures.ts, så ingen test kaller Kartverket. Alle Søk går med `?demo=`. Testene sjekker tilstand,
// antall og plassering, aldri Turnavn (AR-26). Kartet er ikke interaktivt ennå (story 3.5).
//
// Story 3.2: Kartutsnittet øverst i kortene på mobil og nettbrett, og det statiske kartet over Moldemarka
// på Frarådet-kortet, nederst i fila.

const PC = { width: 1440, height: 1000 } as const;
const NETTBRETT = { width: 768, height: 1024 } as const;
const MOBIL = { width: 360, height: 800 } as const;

/** `{colors.forest}` (#1F4A38): det valgte Startpunktet og Målet til den valgte Turen. */
const FOREST = "rgb(31, 74, 56)";
const MAKS_ZOOM = 17;

const ER_SOK = (url: URL) => url.pathname === "/api/sok";

/** Sender Søket med «Finn tur» og gir Resultatvisningen serveren svarte med. */
async function finnTur(page: Page): Promise<Resultatvisning> {
  const svar = page.waitForResponse((r) => r.request().method() === "POST" && ER_SOK(new URL(r.url())));
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
  // Ved Alternativet står kartet både for PC og for mobil i DOM-en, og CSS viser ett.
  const kart = page.getByTestId("kart").filter({ visible: true });
  return {
    kart,
    stier: kart.locator(".leaflet-overlay-pane path"),
    startpunkter: kart.getByTestId("kart-startpunkt"),
    etikett: kart.getByTestId("kart-etikett"),
    forklaring: kart.getByTestId("tegnforklaring"),
    kreditering: kart.getByRole("link", { name: /© Kartverket/ }),
    zoomInn: kart.getByRole("button", { name: "Zoom inn" }),
    zoomUt: kart.getByRole("button", { name: "Zoom ut" }),
  };
};

/** Numrene i hver Startpunkt-markør, markør for markør i DOM-rekkefølge, og sirklene i markøren i rekkefølge. */
async function numre(startpunkter: Locator): Promise<number[][]> {
  return startpunkter.evaluateAll((markorer) =>
    markorer.map((m) => [...m.children].map((sirkel) => Number(sirkel.textContent))),
  );
}

/** Bakgrunnsfargen til sirkelen med `nummer`. */
const sirkelfarge = (startpunkter: Locator, nummer: number) =>
  startpunkter
    .locator("span", { hasText: new RegExp(`^${nummer}$`) })
    .evaluate((el) => getComputedStyle(el).backgroundColor);

/** Zoomnivået til en kartflis: {z} i …/webmercator/{z}/{y}/{x}.png. */
const flisezoom = (url: string) => Number(/\/webmercator\/(\d+)\//.exec(url)![1]);

/**
 * Zoomnivået kartet viser, lest av flisene: Leaflet gir flisenivået som vises, høyest z-index, og
 * {z} står i URL-en til flisene der. `null` før det finnes fliser.
 */
function kartzoom(kart: Locator): Promise<number | null> {
  return kart.locator(".leaflet-tile-container").evaluateAll((nivaer) => {
    const zIndex = (el: Element) => Number((el as HTMLElement).style.zIndex);
    const naa = nivaer.reduce<Element | null>((a, b) => (a === null || zIndex(b) > zIndex(a) ? b : a), null);
    const src = naa?.querySelector("img")?.getAttribute("src");
    const z = src ? /\/webmercator\/(\d+)\//.exec(src) : null;
    return z ? Number(z[1]) : null;
  });
}

/** Venter til zoomnivået står stille i 300 ms (etter at kartet har zoomet til rutene), og gir det. */
async function rolig(kart: Locator): Promise<number> {
  let forrige: number | null = null;
  await expect
    .poll(async () => {
      const naa = await kartzoom(kart);
      const stille = naa !== null && naa === forrige;
      forrige = naa;
      return stille;
    }, { intervals: [300] })
    .toBe(true);
  return forrige!;
}

/**
 * Venter til kartet viser zoomnivå `z` og zoom-animasjonen er ferdig. Leaflet overser et nytt trykk mens
 * kartet zoomer, slik Leaflets egne knapper også gjør.
 */
async function ventPaZoom(kart: Locator, z: number) {
  await expect.poll(() => kartzoom(kart)).toBe(z);
  await expect(kart.locator(".leaflet-zoom-anim")).toHaveCount(0);
}

/** Venter litt, så en forespørsel som ikke skal komme, rekker å komme. */
const ventLitt = (page: Page) => page.waitForTimeout(500);

test.describe("Turforslag på PC", () => {
  test.use({ viewport: PC });

  test("kartet står over kortene, er 340 px høyt og har ruter, Startpunkter, etikett og kreditering", async ({
    page,
    kartfliser,
  }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    expect(kort).toHaveLength(3);
    const d = deler(page);

    await expect(page.getByTestId("kart")).toHaveCount(1);
    await expect(d.kart).toBeVisible();
    const kart = await boks(d.kart);
    expect(kart.height).toBeCloseTo(340, 0);
    const kortraden = await boks(page.getByTestId("kortraden"));
    expect(kart.y + kart.height).toBeLessThanOrEqual(kortraden.y);
    // Kartet står etter overskriften og fyller bredden over kortene.
    expect(kart.y).toBeGreaterThan((await boks(page.getByRole("heading", { level: 1 }))).y);
    expect(Math.abs(kart.width - kortraden.width)).toBeLessThan(2);
    // Kartflaten har avrundede hjørner (rounded.map).
    expect(await d.kart.evaluate((el) => getComputedStyle(el).borderTopLeftRadius)).toBe("24px");

    // Tre ruter, hver med halo og linje.
    await expect(d.stier).toHaveCount(6);
    // Én markør per Startpunkt, og numrene 1–3 til sammen.
    const grupper = grupperStartpunkter(kort);
    await expect(d.startpunkter).toHaveCount(grupper.length);
    expect((await numre(d.startpunkter)).flat().sort()).toEqual([1, 2, 3]);
    expect(await sirkelfarge(d.startpunkter, 1)).toBe(FOREST);
    expect(await sirkelfarge(d.startpunkter, 2)).not.toBe(FOREST);

    await expect(d.etikett).toHaveText("omtrentlig rute");
    await expect(d.etikett).toBeVisible();
    expect(await d.etikett.evaluate((el) => getComputedStyle(el).fontStyle)).toBe("italic");

    // Tegnforklaringen nede til venstre, uten Mål (ingen Tur har Mål).
    await expect(d.forklaring).toBeVisible();
    await expect(d.forklaring).toContainText("Startpunkt");
    await expect(d.forklaring).toContainText("omtrentlig rute");
    await expect(d.forklaring).not.toContainText("Mål");
    await expect(d.kart.getByTestId("kart-mal")).toHaveCount(0);
    const forklaring = await boks(d.forklaring);
    expect(forklaring.x - kart.x).toBeLessThan(40);
    expect(kart.y + kart.height - (forklaring.y + forklaring.height)).toBeLessThan(40);

    // «© Kartverket» som lenke i ny fane, nede til høyre.
    await expect(d.kreditering).toHaveAttribute("href", BAKGRUNNSKART.lenke);
    await expect(d.kreditering).toHaveAttribute("target", "_blank");
    await expect(d.kreditering).toHaveAttribute("rel", "noopener noreferrer");
    const kreditering = await boks(d.kreditering);
    expect(kart.x + kart.width - (kreditering.x + kreditering.width)).toBeLessThan(40);
    expect(kreditering.y).toBeGreaterThan(forklaring.y - 20);

    // Leaflets egen kreditering og zoomknapper er slått av.
    await expect(d.kart.locator(".leaflet-control-attribution, .leaflet-control-zoom")).toHaveCount(0);
    // Bakgrunnen er Kartverkets gråtonekart, og flisene er stubbet.
    await expect.poll(() => kartfliser.length).toBeGreaterThan(0);
    const prefiks = KARTFLISER_URL.slice(0, KARTFLISER_URL.indexOf("{z}"));
    expect(kartfliser.every((u) => u.startsWith(prefiks))).toBe(true);
  });

  test("Tab fra overskriften går bare til zoomknappene og krediteringen i kartet, som alle har navn", async ({
    page,
  }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const d = deler(page);
    await expect(d.stier).toHaveCount(6);
    await expect(page.getByRole("heading", { level: 1 })).toBeFocused();

    // Selve kartflaten er ikke et tabulatorstopp, og den er skjult for skjermlesere.
    const leaflet = d.kart.locator(".leaflet-container");
    await expect(leaflet).not.toHaveAttribute("tabindex");
    await expect(d.kart.locator('[aria-hidden="true"] > .leaflet-container')).toHaveCount(1);

    const navn: string[] = [];
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      const fokus = page.locator(":focus");
      const iKartet = await fokus.evaluate((el) => el.closest('[data-testid="kart"]') !== null);
      if (!iKartet) {
        if (navn.length > 0) break;
        continue;
      }
      await expect(fokus).toHaveAccessibleName(/\S/);
      navn.push((await fokus.getAttribute("aria-label")) ?? (await fokus.innerText()));
    }
    expect(navn).toEqual(["Zoom inn", "Zoom ut", expect.stringContaining("© Kartverket")]);
  });

  test("zoomer inn og ut med knappene på 44 × 44 px, og «Zoom inn» er inaktiv ved største zoom", async ({
    page,
    kartfliser,
  }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const d = deler(page);
    await expect(d.stier).toHaveCount(6);

    for (const knapp of [d.zoomInn, d.zoomUt]) {
      const b = await boks(knapp);
      expect(b.width).toBeGreaterThanOrEqual(44);
      expect(b.height).toBeGreaterThanOrEqual(44);
    }

    const start = await rolig(d.kart);
    expect(start).toBeLessThan(MAKS_ZOOM);
    kartfliser.length = 0;
    await d.zoomInn.click();
    await ventPaZoom(d.kart, start + 1);
    // Flisene til det nye nivået er hentet etter trykket, og stubbet.
    await expect.poll(() => kartfliser.some((u) => flisezoom(u) === start + 1)).toBe(true);

    await d.zoomUt.click();
    await ventPaZoom(d.kart, start);

    for (let z = start + 1; z <= MAKS_ZOOM; z++) {
      await d.zoomInn.click();
      await ventPaZoom(d.kart, z);
    }
    await expect(d.zoomInn).toHaveAttribute("aria-disabled", "true");
    await expect(d.zoomUt).not.toHaveAttribute("aria-disabled");
    // Playwright venter ellers på at en knapp med aria-disabled blir aktiv. Et ekte trykk går fram.
    await d.zoomInn.click({ force: true });
    await ventLitt(page);
    expect(await kartzoom(d.kart)).toBe(MAKS_ZOOM);
  });

  test("Mål er en trekant per Tur med Mål, og bare Målet til det valgte kortet er uthevet", async ({ page }) => {
    // Ingen Tur i Turdatasettet har Mål. Svaret fra serveren får Mål på kort 1 og 2: siste punkt i ruten.
    await page.route(ER_SOK, async (route) => {
      const svar = await route.fetch();
      const visning = (await svar.json()) as Resultatvisning;
      const kort = turforslag(visning).map((k, i) => {
        if (i > 1) return k;
        const [lon, lat] = k.kart.rute.geometry.coordinates.at(-1)!.at(-1)!;
        return { ...k, kart: { ...k.kart, malpunkt: { lat, lon } } };
      });
      await route.fulfill({ response: svar, json: { ...visning, utfall: { type: "turforslag", kort } } });
    });
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    expect(kort.filter((k) => k.kart.malpunkt)).toHaveLength(2);

    const d = deler(page);
    await expect(d.stier).toHaveCount(6);
    const mal = d.kart.getByTestId("kart-mal");
    await expect(mal).toHaveCount(2);
    const fyll = await mal.evaluateAll((trekanter) => trekanter.map((t) => getComputedStyle(t).fill));
    expect(fyll.filter((f) => f === FOREST)).toHaveLength(1);

    // Trekantene står inne i kartet.
    const kart = await boks(d.kart);
    for (const trekant of await mal.all()) {
      const b = await boks(trekant);
      expect(b.x).toBeGreaterThanOrEqual(kart.x);
      expect(b.y).toBeGreaterThanOrEqual(kart.y);
      expect(b.x + b.width).toBeLessThanOrEqual(kart.x + kart.width);
      expect(b.y + b.height).toBeLessThanOrEqual(kart.y + kart.height);
    }

    // Tegnforklaringen viser Mål.
    await expect(d.forklaring.getByTestId("tegnforklaring-mal")).toBeVisible();
    await expect(d.forklaring).toContainText("Mål");
  });
});

test.describe("Reduser bevegelse", () => {
  test.use({ viewport: PC, reducedMotion: "reduce" });

  test("kartet zoomer og toner inn fliser uten animasjon", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const d = deler(page);
    await expect(d.stier).toHaveCount(6);
    await expect(d.kart.locator(".leaflet-container")).not.toHaveClass(/leaflet-fade-anim/);
    await expect(d.kart.locator(".leaflet-proxy")).toHaveCount(0);
  });

  test("uten «Reduser bevegelse» er animasjonene på", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const d = deler(page);
    await expect(d.stier).toHaveCount(6);
    await expect(d.kart.locator(".leaflet-container")).toHaveClass(/leaflet-fade-anim/);
    await expect(d.kart.locator(".leaflet-proxy")).toHaveCount(1);
  });
});

for (const [navn, viewport] of [
  ["mobil", MOBIL],
  ["nettbrett", NETTBRETT],
] as const) {
  test.describe(`Turforslag på ${navn}`, () => {
    test.use({ viewport });

    test("kartet står etter Stokken og før Stokkoversikten, er 250 px høyt og følger kortet i Stokken", async ({
      page,
    }) => {
      await page.goto("/?demo=uten-vaer");
      turforslag(await finnTur(page));
      const d = deler(page);

      await expect(page.getByTestId("kart")).toHaveCount(1);
      await expect(d.kart).toBeVisible();
      const kart = await boks(d.kart);
      expect(kart.height).toBeCloseTo(250, 0);
      const navigasjon = await boks(page.getByTestId("stokknavigasjon"));
      const oversikt = await boks(page.getByTestId("stokkoversikt"));
      expect(kart.y).toBeGreaterThanOrEqual(navigasjon.y + navigasjon.height);
      expect(kart.y + kart.height).toBeLessThanOrEqual(oversikt.y);
      await expect(page.getByTestId("kortraden")).toBeHidden();

      await expect(d.stier).toHaveCount(6);
      expect(await sirkelfarge(d.startpunkter, 1)).toBe(FOREST);

      // Et annet kort i Stokken uthever ruten og Startpunktet til det kortet, og ruten tegnes øverst.
      await page.getByRole("button", { name: "Neste Turforslag" }).click();
      await expect.poll(() => sirkelfarge(d.startpunkter, 2)).toBe(FOREST);
      expect(await sirkelfarge(d.startpunkter, 1)).not.toBe(FOREST);
      await expect(d.stier).toHaveCount(6);
      const sisteStrek = await d.stier.last().evaluate((el) => getComputedStyle(el).stroke);
      expect(sisteStrek).toBe(FOREST);

      // Tegnforklaringen og krediteringspillen overlapper ikke.
      const forklaring = await boks(d.forklaring);
      const pille = await boks(d.kreditering.locator("span").first());
      expect(forklaring.x + forklaring.width).toBeLessThanOrEqual(pille.x);
    });
  });
}

test.describe("Delt Startpunkt (UJ-1 med utsikt)", () => {
  test.use({ viewport: PC });

  test("kort med samme Startpunkt får én markør med numrene side om side", async ({ page }) => {
    await page.goto("/?demo=uj-1");
    await page.getByRole("checkbox", { name: "utsikt" }).check();
    const kort = turforslag(await finnTur(page));
    const grupper = grupperStartpunkter(kort);
    const delt = grupper.find((g) => g.kort.length > 1);
    expect(delt, "UJ-1 med utsikt har et delt Startpunkt").toBeDefined();

    const d = deler(page);
    await expect(d.startpunkter).toHaveCount(grupper.length);
    const forventet = grupper.map((g) => g.kort.map((k) => k.nummer));
    expect((await numre(d.startpunkter)).sort()).toEqual(forventet.sort());

    // Numrene står side om side, på samme høyde.
    const markor = d.startpunkter.filter({ has: page.locator("span:nth-child(2)") });
    await expect(markor).toHaveCount(1);
    const [a, b] = await markor.locator("span").all();
    const [ba, bb] = [await boks(a), await boks(b)];
    expect(Math.abs(ba.y - bb.y)).toBeLessThan(1);
    expect(bb.x).toBeGreaterThan(ba.x + ba.width / 2);
  });
});

for (const [navn, viewport] of [
  ["PC", PC],
  ["mobil", MOBIL],
] as const) {
  test.describe(`Alternativ på ${navn}`, () => {
    test.use({ viewport });

    test("kartet viser én rute med nummer 1, like bredt som kortet, over det på PC og etter det på mobil", async ({
      page,
    }) => {
      await page.goto("/?demo=uten-vaer");
      await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
      const visning = await finnTur(page);
      expect(visning.utfall.type).toBe("kortesteTur");

      const d = deler(page);
      await expect(d.kart).toHaveCount(1);
      await expect(page.getByTestId("kart")).toHaveCount(2);
      await expect(d.stier).toHaveCount(2);
      expect(await numre(d.startpunkter)).toEqual([[1]]);
      await expect(d.etikett).toHaveText("omtrentlig rute");

      const kart = await boks(d.kart);
      const alternativkort = await boks(page.getByTestId("alternativkort"));
      const ansvarsmerknad = await boks(page.getByTestId("ansvarsmerknad"));
      expect(Math.abs(kart.width - alternativkort.width)).toBeLessThan(2);
      expect(Math.abs(kart.x - alternativkort.x)).toBeLessThan(2);
      if (navn === "PC") {
        expect(kart.height).toBeCloseTo(340, 0);
        expect(kart.y + kart.height).toBeLessThanOrEqual(alternativkort.y);
      } else {
        expect(kart.height).toBeCloseTo(250, 0);
        expect(kart.y).toBeGreaterThanOrEqual(alternativkort.y + alternativkort.height);
        expect(kart.y).toBeGreaterThan((await boks(page.getByTestId("passer-med"))).y);
      }
      expect(kart.y + kart.height).toBeLessThanOrEqual(ansvarsmerknad.y);
    });
  });
}

test.describe("Ingen kart i Resultatet", () => {
  test.use({ viewport: PC });

  test("ved frarådet (uj-3), bare det statiske kartet i Frarådet-kortet", async ({ page }) => {
    await page.goto("/?demo=uj-3");
    const visning = await finnTur(page);
    expect(visning.utfall.type).toBe("fraradet");
    await expect(page.getByTestId("fraradet-kort")).toBeVisible();
    await expect(page.getByTestId("kart")).toHaveCount(0);
    await expect(page.getByTestId("kart-laster")).toHaveCount(0);
    // Story 3.2: Frarådet-kortet har et statisk kart over Moldemarka (se «Kartutsnitt» under).
    await expect(page.locator(".leaflet-container")).toHaveCount(1);
    await expect(page.getByTestId("fraradet-kort").locator(".leaflet-container")).toHaveCount(1);
  });

  test("ved Kontaktfeil", async ({ page, kartfliser }) => {
    await page.goto("/?demo=uten-vaer");
    await page.route(ER_SOK, (route) => route.abort());
    await page.getByRole("button", { name: "Finn tur" }).click();
    await expect(page.getByTestId("kontaktfeil")).toBeVisible();
    await expect(page.getByTestId("kart")).toHaveCount(0);
    await expect(page.getByTestId("kart-laster")).toHaveCount(0);
    await ventLitt(page);
    expect(kartfliser, "ingen kartfliser").toEqual([]);
  });

  test("mens svaret venter", async ({ page, kartfliser }) => {
    await page.goto("/?demo=uten-vaer");
    await page.route(ER_SOK, () => {});
    await page.getByRole("button", { name: "Finn tur" }).click();
    await expect(page.getByTestId("plassholder")).toBeVisible();
    await expect(page.getByTestId("kart")).toHaveCount(0);
    await expect(page.getByTestId("kart-laster")).toHaveCount(0);
    await ventLitt(page);
    expect(kartfliser, "ingen kartfliser").toEqual([]);
  });
});

test.describe("Trafikk (AR-20)", () => {
  test.use({ viewport: PC });

  for (const demo of ["uten-vaer", "uj-1"]) {
    test(`nettleseren kontakter bare egen server og cache.kartverket.no, og flisene er stubbet (${demo})`, async ({
      page,
      baseURL,
      kartfliser,
    }) => {
      const urler: URL[] = [];
      page.on("request", (r) => urler.push(new URL(r.url())));
      await page.goto(`/?demo=${demo}`);
      await finnTur(page);
      await expect(deler(page).stier).toHaveCount(6);
      await expect.poll(() => kartfliser.length).toBeGreaterThan(0);

      const http = urler.filter((u) => u.protocol.startsWith("http"));
      const fremmede = http.filter((u) => u.origin !== new URL(baseURL!).origin && u.origin !== KARTFLISER);
      expect(fremmede.map(String)).toEqual([]);
      // Hver forespørsel til Kartverket ble stubbet av fixtures.ts.
      const tilKartverket = http.filter((u) => u.origin === KARTFLISER).map(String);
      expect(tilKartverket.length).toBeGreaterThan(0);
      expect(tilKartverket.every((u) => kartfliser.includes(u))).toBe(true);
    });
  }
});

// --- Story 3.2: Kartutsnittet og Frarådet-kortet ---

/** Det synlige kortet i Stokken. */
const synligKort = (page: Page) => page.getByTestId("stokk-valgt").getByRole("article");

/** Delene av Kartutsnittet i et kort: knappen, kartet i den, merkene og lenken. */
const utsnitt = (kort: Locator) => {
  const knapp = kort.getByTestId("kartutsnitt");
  const kart = knapp.getByTestId("kart-statisk");
  return {
    knapp,
    kart,
    leaflet: kart.locator(".leaflet-container"),
    stier: kart.locator(".leaflet-overlay-pane path"),
    startpunkter: kart.getByTestId("kart-startpunkt"),
    merke: knapp.getByTestId("kartutsnitt-merke"),
    bunnmerke: kort.getByTestId("kartmerke"),
    /** De synlige pillene: merket øverst og delene av merket nederst. */
    piller: kort.locator("[data-pille]"),
    kreditering: kort.getByRole("link", { name: /© Kartverket/ }),
  };
};

type Boks = { x: number; y: number; width: number; height: number };

/** `a` ligger helt inne i `b`, med en halv piksel slingringsmonn. */
function inneI(a: Boks, b: Boks) {
  const t = 0.5;
  return a.x >= b.x - t && a.y >= b.y - t && a.x + a.width <= b.x + b.width + t && a.y + a.height <= b.y + b.height + t;
}

/** `a` og `b` overlapper, med en halv piksel slingringsmonn. */
function overlapper(a: Boks, b: Boks) {
  const t = 0.5;
  return a.x < b.x + b.width - t && b.x < a.x + a.width - t && a.y < b.y + b.height - t && b.y < a.y + a.height - t;
}

/**
 * Geometrien i Kartutsnittet: Leaflet-flaten fyller knappen, en lastet flis synes i den, og ruten og
 * Startpunktet står inne i knappen, klar av pillene.
 */
async function sjekkGeometri(kort: Locator) {
  const u = utsnitt(kort);
  await expect(u.stier).toHaveCount(2);
  await expect(u.startpunkter).toHaveCount(1);
  const knapp = await boks(u.knapp);
  const flate = await boks(u.leaflet);
  for (const k of ["x", "y", "width", "height"] as const) expect(Math.abs(flate[k] - knapp[k]), k).toBeLessThan(1);

  const flis = u.kart.locator(".leaflet-tile-loaded").first();
  await expect(flis).toBeVisible();
  expect(overlapper(await boks(flis), knapp), "en lastet flis i knappen").toBe(true);

  const piller = await Promise.all((await u.piller.all()).map(boks));
  expect(piller.length).toBeGreaterThanOrEqual(2);
  const innhold = { startpunkt: await boks(u.startpunkter), rute: await boks(u.stier.last()) };
  for (const [navn, b] of Object.entries(innhold)) {
    expect(inneI(b, knapp), `${navn} inne i knappen`).toBe(true);
    for (const pille of piller) expect(overlapper(b, pille), `${navn} overlapper ikke en pille`).toBe(false);
  }
}

test.describe("Kartutsnitt på mobil", () => {
  test.use({ viewport: MOBIL });

  test("det synlige kortet har Kartutsnittet øverst, 104 px høyt, med merkene, én rute og ett Startpunkt", async ({
    page,
    kartfliser,
  }) => {
    await page.goto("/?demo=uten-vaer");
    const kort = turforslag(await finnTur(page));
    expect(kort).toHaveLength(3);
    const artikkel = synligKort(page);
    const u = utsnitt(artikkel);
    await expect(u.stier).toHaveCount(2);

    await expect(u.knapp).toBeVisible();
    await expect(u.knapp).toHaveAccessibleName("Vis på kartet");
    const knapp = await boks(u.knapp);
    expect(knapp.height).toBeCloseTo(104, 0);
    // Øverst i kortet, fra kant til kant innenfor kortkanten.
    const ramme = await boks(artikkel);
    expect(knapp.y - ramme.y).toBeLessThan(3);
    expect(ramme.width - knapp.width).toBeLessThan(4);
    // Kortet har avrundede hjørner øverst, og utsnittet følger dem.
    expect(await u.knapp.evaluate((el) => parseFloat(getComputedStyle(el).borderTopLeftRadius))).toBeGreaterThan(20);
    expect(await u.knapp.evaluate((el) => getComputedStyle(el).borderBottomLeftRadius)).toBe("0px");

    await expect(u.merke).toHaveText("Turforslag 1 av 3");
    await expect(u.bunnmerke).toContainText("omtrentlig rute · © Kartverket");
    // Én rute (halo og linje) og ett Startpunkt med nummer 1, uten tegnforklaring, zoomknapper og etikett.
    await expect(u.stier).toHaveCount(2);
    expect(await numre(u.startpunkter)).toEqual([[1]]);
    expect(await sirkelfarge(u.startpunkter, 1)).toBe(FOREST);
    await expect(u.kart.getByTestId("tegnforklaring")).toHaveCount(0);
    await expect(u.kart.getByTestId("kart-etikett")).toHaveCount(0);
    await expect(u.kart.getByRole("button")).toHaveCount(0);
    // Kartet i knappen er skjult for skjermlesere og har ingen fokuserbare elementer.
    await expect(u.knapp.locator('[aria-hidden="true"] .leaflet-container')).toHaveCount(1);
    await expect(u.knapp.locator("a, button, input, [tabindex]")).toHaveCount(0);

    // «© Kartverket» er en lenke i ny fane, utenfor knappen, med trykkflate på 44 × 44 px.
    await expect(u.kreditering).toHaveAttribute("href", BAKGRUNNSKART.lenke);
    await expect(u.kreditering).toHaveAttribute("target", "_blank");
    await expect(u.knapp.getByRole("link")).toHaveCount(0);
    const lenke = await boks(u.kreditering);
    expect(lenke.width).toBeGreaterThanOrEqual(44);
    expect(lenke.height).toBeGreaterThanOrEqual(44);
    expect(lenke.y + lenke.height).toBeLessThanOrEqual(knapp.y + knapp.height);

    // Bare det synlige kortet i Stokken har et Leaflet-kart. Kortene bak har den tomme flaten.
    await expect(page.getByTestId("stokk").locator(".leaflet-container")).toHaveCount(1);
    await expect(page.getByTestId("kartutsnitt")).toHaveCount(3);

    // Flisene er stubbet.
    await expect.poll(() => kartfliser.length).toBeGreaterThan(0);
  });

  test("ruten og Startpunktet står klar av pillene i alle tre kortene, og «Neste» gir utsnittet til kort 2", async ({
    page,
  }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    for (const nummer of [1, 2, 3]) {
      const u = utsnitt(synligKort(page));
      await expect(u.merke).toHaveText(`Turforslag ${nummer} av 3`);
      // Kortet er ferdig med å løftes fram fra Stokken.
      await expect.poll(async () => (await boks(u.knapp)).height).toBeCloseTo(104, 0);
      await expect.poll(() => numre(u.startpunkter)).toEqual([[nummer]]);
      await sjekkGeometri(synligKort(page));
      await expect(page.getByTestId("stokk").locator(".leaflet-container")).toHaveCount(1);
      if (nummer < 3) await page.getByRole("button", { name: "Neste Turforslag" }).click();
    }
  });

  test("Kartutsnittet viser ikke Mål, selv når kortet har Mål", async ({ page }) => {
    // Som Mål-testen på PC: kort 1 får Mål på siste punkt i ruten.
    await page.route(ER_SOK, async (route) => {
      const svar = await route.fetch();
      const visning = (await svar.json()) as Resultatvisning;
      const kort = turforslag(visning).map((k, i) => {
        if (i > 0) return k;
        const [lon, lat] = k.kart.rute.geometry.coordinates.at(-1)!.at(-1)!;
        return { ...k, kart: { ...k.kart, malpunkt: { lat, lon } } };
      });
      await route.fulfill({ response: svar, json: { ...visning, utfall: { type: "turforslag", kort } } });
    });
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const u = utsnitt(synligKort(page));
    await expect(u.stier).toHaveCount(2);
    await expect(u.kart.getByTestId("kart-mal")).toHaveCount(0);
    // Det store kartet viser Målet.
    await expect(deler(page).kart.getByTestId("kart-mal")).toHaveCount(1);
  });

  test("et trykk på Kartutsnittet ruller til kartet og gir kartområdet fokus", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const kart = page.getByTestId("kart").filter({ visible: true });
    await expect(kart).not.toBeInViewport();
    await utsnitt(synligKort(page)).knapp.click();
    await expect(kart).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("region", { name: "Kart" })).toBeFocused();
    // Valget er fortsatt kort 1.
    await expect(page.getByTestId("stokk")).toHaveAccessibleName("Turforslag 1 av 3");
  });

  test("Tab: Kartutsnittet er én tabulatorstopp «Vis på kartet», og «© Kartverket» er en egen lenke", async ({
    page,
  }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    const u = utsnitt(synligKort(page));
    await expect(u.stier).toHaveCount(2);
    await page.getByTestId("stokk").focus();

    await page.keyboard.press("Tab");
    await expect(u.knapp).toBeFocused();
    await expect(page.locator(":focus")).toHaveAccessibleName("Vis på kartet");
    await page.keyboard.press("Tab");
    await expect(u.kreditering).toBeFocused();
    await expect(page.locator(":focus")).toHaveAccessibleName(/^© Kartverket/);
    await page.keyboard.press("Tab");
    await expect(synligKort(page).getByRole("link", { name: /^Kilde: / })).toBeFocused();

    // Enter på knappen ruller til kartet, og fokus følger med til kartområdet.
    await u.knapp.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("kart").filter({ visible: true })).toBeInViewport({ ratio: 1 });
    const omrade = page.getByRole("region", { name: "Kart" });
    await expect(omrade).toBeFocused();
    // Kartområdet er ikke et tabulatorstopp.
    await expect(omrade).toHaveAttribute("tabindex", "-1");
  });

  test("Alternativkortet (15 min) har Kartutsnittet med «Alternativ»", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
    expect((await finnTur(page)).utfall.type).toBe("kortesteTur");
    const kort = page.getByTestId("alternativkort");
    const u = utsnitt(kort);
    await expect(u.knapp).toBeVisible();
    expect((await boks(u.knapp)).height).toBeCloseTo(104, 0);
    await expect(u.merke).toHaveText("Alternativ");
    await expect(u.bunnmerke).toContainText("omtrentlig rute · © Kartverket");
    await expect.poll(() => numre(u.startpunkter)).toEqual([[1]]);
    await sjekkGeometri(kort);

    await u.knapp.click();
    await expect(page.getByTestId("kart").filter({ visible: true })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("region", { name: "Kart" }).filter({ visible: true })).toBeFocused();
  });
});

test.describe("Kartutsnitt på nettbrett", () => {
  test.use({ viewport: NETTBRETT });

  test("Kartutsnittet er 160 px høyt, og ruten og Startpunktet står klar av pillene", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    for (const nummer of [1, 2, 3]) {
      const u = utsnitt(synligKort(page));
      await expect(u.knapp).toBeVisible();
      // Kortet er ferdig med å løftes fram fra Stokken.
      await expect.poll(async () => (await boks(u.knapp)).height).toBeCloseTo(160, 0);
      await expect(u.merke).toHaveText(`Turforslag ${nummer} av 3`);
      await sjekkGeometri(synligKort(page));
      if (nummer < 3) await page.getByRole("button", { name: "Neste Turforslag" }).click();
    }
  });
});

test.describe("Kartutsnitt på PC", () => {
  test.use({ viewport: PC });

  for (const [navn, min] of [
    ["Turforslag", null],
    ["Alternativ", "15"],
  ] as const) {
    test(`ingen synlig Kartutsnitt og ingen Leaflet-kart i kortene (${navn})`, async ({ page }) => {
      await page.goto("/?demo=uten-vaer");
      if (min) await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption(min);
      await finnTur(page);
      await expect(deler(page).stier).toHaveCount(min ? 2 : 6);
      await expect(page.getByTestId("kartutsnitt").filter({ visible: true })).toHaveCount(0);
      await expect(page.getByTestId("kart-statisk")).toHaveCount(0);
      await expect(page.getByTestId("kart-statisk-laster")).toHaveCount(0);
      await expect(page.getByRole("article").locator(".leaflet-container")).toHaveCount(0);
    });
  }
});

test.describe("Kartutsnitt over 1200 px", () => {
  test("fra PC til mobil får det synlige kortet kart, og tilbake forsvinner kartene i kortene", async ({ page }) => {
    await page.setViewportSize(PC);
    await page.goto("/?demo=uten-vaer");
    await finnTur(page);
    await expect(deler(page).stier).toHaveCount(6);
    await expect(page.getByTestId("kart-statisk")).toHaveCount(0);

    await page.setViewportSize(MOBIL);
    const u = utsnitt(synligKort(page));
    await expect(u.knapp).toBeVisible();
    await expect(u.leaflet).toHaveCount(1);
    await sjekkGeometri(synligKort(page));
    await expect(page.getByTestId("stokk").locator(".leaflet-container")).toHaveCount(1);

    // Knappen er den samme, ikke en ny, når bredden passerer 1200 px og tilbake. Bare kartet i den forsvinner.
    await u.knapp.evaluate((el) => el.setAttribute("data-merket", ""));
    await page.setViewportSize(PC);
    await expect(page.getByTestId("stokk").getByTestId("kart-statisk")).toHaveCount(0);
    await expect(page.getByRole("article").locator(".leaflet-container")).toHaveCount(0);
    await expect(page.locator("[data-merket]")).toHaveCount(1);
    await page.setViewportSize(MOBIL);
    await expect(u.knapp).toHaveAttribute("data-merket", "");
    await expect(u.leaflet).toHaveCount(1);
  });
});

for (const [navn, viewport, hoyde] of [
  ["mobil", MOBIL, 104],
  ["nettbrett", NETTBRETT, 160],
  ["PC", PC, 200],
] as const) {
  test.describe(`Frarådet-kortet på ${navn}`, () => {
    test.use({ viewport });

    test("har et statisk kart over Moldemarka uten ruter, med vindstreker over og ingen Kartutsnitt-knapp", async ({
      page,
      kartfliser,
    }) => {
      await page.goto("/?demo=uj-3");
      expect((await finnTur(page)).utfall.type).toBe("fraradet");
      const kort = page.getByTestId("fraradet-kort");
      const flate = kort.getByTestId("vindflate");
      await expect(flate).toBeVisible();
      const kart = flate.getByTestId("kart-statisk");
      await expect(kart.locator(".leaflet-container")).toHaveCount(1);
      await expect(kart.locator(".leaflet-tile-loaded").first()).toBeVisible();
      // Ingen ruter, Startpunkter, Mål, etikett eller kontroller.
      await expect(kart.locator(".leaflet-overlay-pane path")).toHaveCount(0);
      await expect(kart.getByTestId("kart-startpunkt")).toHaveCount(0);
      await expect(kart.getByTestId("kart-mal")).toHaveCount(0);
      await expect(kart.getByRole("button")).toHaveCount(0);
      await expect(kort.getByTestId("kartutsnitt")).toHaveCount(0);
      await expect(page.getByTestId("kartutsnitt")).toHaveCount(0);

      // Vindstrekene står over kartet, i hele flaten.
      const streker = flate.getByTestId("vindstreker");
      await expect(streker).toBeVisible();
      const [a, b] = [await boks(streker), await boks(kart)];
      expect(Math.abs(a.width - b.width)).toBeLessThan(1);
      expect(Math.abs(a.height - b.height)).toBeLessThan(1);
      const z = (l: Locator) => l.evaluate((el) => Number(getComputedStyle(el).zIndex) || 0);
      expect(await z(streker)).toBeGreaterThan(await z(kart.locator("xpath=..")));
      // Samme høyde som papirflaten hadde: 104 px på mobil, 160 px på nettbrett og 200 px på PC.
      const vind = await boks(flate);
      expect(vind.height).toBeCloseTo(hoyde, 0);

      // «© Kartverket» er en lenke i ny fane med trykkflate på 44 × 44 px, inne i flaten og klar av stempelet.
      const lenke = flate.getByRole("link", { name: /© Kartverket/ });
      await expect(lenke).toHaveAttribute("href", BAKGRUNNSKART.lenke);
      await expect(lenke).toHaveAttribute("target", "_blank");
      const l = await boks(lenke);
      expect(l.width).toBeGreaterThanOrEqual(44);
      expect(l.height).toBeGreaterThanOrEqual(44);
      expect(inneI(l, vind), "lenken inne i flaten").toBe(true);
      expect(overlapper(l, await boks(kort.getByTestId("nummerstempel"))), "lenken overlapper stempelet").toBe(false);
      await expect(flate.getByTestId("kartmerke")).not.toContainText("omtrentlig rute");

      // Kartet viser Moldemarka: flisene er stubbet.
      await expect.poll(() => kartfliser.length).toBeGreaterThan(0);
    });
  });
}
