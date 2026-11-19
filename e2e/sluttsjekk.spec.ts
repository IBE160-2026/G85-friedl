import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import type { Resultatvisning } from "../src/kjerne/visning/skjema";

// Story 1.15: sjekklisten i SM-4 (NFR-1) ved 360, 768 og 1440 px, for Søk, Turforslag (standard-Søk),
// Alternativ (15 min), Kontaktfeil og panelet for en ukjent demo-ID, mot ?demo=uten-vaer, fra
// story 2.9 Værsammendraget (?demo=uj-1) og Værvarslingen med Bedre tidsvindu-boksen (?demo=uj-2), og fra
// story 2.10 Frarådet (?demo=uj-3) og boksen uten Bedre tidsvindu (?demo=ingen-bedre). For hver
// visning og bredde sjekkes det at siden ikke ruller sidelengs, at alle synlige kontroller har en
// trykkflate på minst 44 × 44 px, og at ingenting krever hover: ingen title-attributter, ingen
// SVG-<title> og ingen :hover-regel som viser, skjuler eller flytter noe.
// Testene sjekker tilstand og mål, aldri Turnavn (AR-26).

const DEMO = "/?demo=uten-vaer";
const TRYKKFLATE = 44;

const BREDDER = [
  { bredde: 360, hoyde: 800 },
  { bredde: 768, hoyde: 1024 },
  { bredde: 1440, hoyde: 1000 },
] as const;

/** Sender Søket med «Finn tur» og venter på overskriften i svaret. */
async function finnTur(page: Page): Promise<Resultatvisning> {
  const svar = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/sok");
  await page.getByRole("button", { name: "Finn tur" }).click();
  const respons = await svar;
  expect(respons.ok(), `/api/sok svarte ${respons.status()}`).toBe(true);
  const visning = (await respons.json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeVisible();
  return visning;
}

const VISNINGER: { navn: string; url?: string; apne: (page: Page) => Promise<void> }[] = [
  {
    navn: "Søk",
    apne: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" })).toBeVisible();
      // Story 3.3: fra 1200 px står Søk-kartet med zoomknappene og krediteringen, og de sjekkes også. Under
      // 1200 px venter testen til siden er hydrert og stille, så et kart som ikke skulle kommet, rekker å komme.
      const bredde = page.viewportSize()?.width ?? (await page.evaluate(() => window.innerWidth));
      const kart = page.getByTestId("sok-kart");
      if (bredde >= 1200) {
        await expect(kart.getByRole("button", { name: "Zoom inn" })).toBeVisible();
        await expect(kart.getByRole("button", { name: "Zoom ut" })).toBeVisible();
        await expect(kart.getByRole("link", { name: /© Kartverket/ })).toBeVisible();
      } else {
        await page.waitForLoadState("networkidle");
        await expect(kart).toHaveCount(0);
      }
    },
  },
  {
    navn: "Turforslag",
    apne: async (page) => {
      const visning = await finnTur(page);
      expect(visning.utfall.type).toBe("turforslag");
      await expect(page.getByTestId("turkort").filter({ visible: true }).first()).toBeVisible();
    },
  },
  {
    navn: "Alternativ",
    apne: async (page) => {
      await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("15");
      const visning = await finnTur(page);
      expect(visning.utfall.type).toBe("kortesteTur");
      await expect(page.getByTestId("alternativkort")).toBeVisible();
    },
  },
  {
    // Story 2.9: Værsammendraget (UJ-1, god).
    navn: "Værsammendrag (uj-1)",
    url: "/?demo=uj-1",
    apne: async (page) => {
      await page.getByRole("checkbox", { name: "utsikt" }).check();
      const visning = await finnTur(page);
      expect(visning.vaer).toMatchObject({ type: "vurdert", klasse: "god" });
      await expect(page.getByTestId("vaersammendrag")).toBeVisible();
    },
  },
  {
    // Story 2.9: Værvarslingen (UJ-2, dårlig, i morgen 10:00, 3 t, Krevende).
    navn: "Værvarsling (uj-2)",
    url: "/?demo=uj-2",
    apne: async (page) => {
      await page.getByRole("radio", { name: "I morgen" }).check();
      await page.getByRole("combobox", { name: "Tilgjengelig tid" }).selectOption("180");
      await page.getByRole("radio", { name: "Krevende" }).check();
      await page.getByRole("checkbox", { name: "utsikt" }).check();
      const visning = await finnTur(page);
      expect(visning.vaer).toMatchObject({ type: "vurdert", klasse: "darlig" });
      await expect(page.getByTestId("vaervarsling")).toBeVisible();
      await expect(page.getByRole("button", { name: "Bruk 14:00" })).toBeVisible();
    },
  },
  {
    // Story 2.10: Frarådet-kortet og Bedre tidsvindu-kortet (UJ-3, standard-Søket).
    navn: "Frarådet (uj-3)",
    url: "/?demo=uj-3",
    apne: async (page) => {
      const visning = await finnTur(page);
      expect(visning.utfall.type).toBe("fraradet");
      await expect(page.getByTestId("fraradet-kort")).toBeVisible();
      await expect(page.getByTestId("bedre-tidsvindu-kort")).toBeVisible();
      await expect(page.getByRole("button", { name: "Bruk i morgen 11:00" })).toBeVisible();
    },
  },
  {
    // Story 2.10: Værvarslingen med boksen uten Bedre tidsvindu (standard-Søket).
    navn: "Ingen Bedre tidsvindu (ingen-bedre)",
    url: "/?demo=ingen-bedre",
    apne: async (page) => {
      const visning = await finnTur(page);
      expect(visning.bedreTidsvindu?.type).toBe("ingen");
      await expect(page.getByTestId("bedre-tidsvindu-boks")).toBeVisible();
    },
  },
  {
    navn: "Kontaktfeil",
    apne: async (page) => {
      await page.route((url) => url.pathname === "/api/sok", (route) => route.abort());
      await page.getByRole("button", { name: "Finn tur" }).click();
      await expect(page.getByTestId("kontaktfeil")).toBeVisible();
    },
  },
  {
    navn: "Ukjent demo",
    url: "/?demo=finnes-ikke",
    apne: async (page) => {
      await expect(page.getByRole("heading", { level: 1, name: "Ukjent demo" })).toBeVisible();
      await expect(page.getByRole("link", { name: "uten-vaer" })).toBeVisible();
    },
  },
];

/**
 * Synlige kontroller som er mindre enn 44 × 44 px. Bare radioknapper og avkrysningsbokser kan i stedet
 * ligge i en etikett av den størrelsen, fordi de trykkes via etiketten.
 */
function smaTrykkflater(page: Page) {
  return page.evaluate((min) => {
    const KONTROLLER =
      'a[href], button, input, select, textarea, summary, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])';
    const storNok = (el: Element) => {
      const r = el.getBoundingClientRect();
      // Avrunding: en flate på 44 px kan måles som 43,99.
      return r.width >= min - 0.05 && r.height >= min - 0.05;
    };
    const beskriv = (el: Element) => {
      const r = el.getBoundingClientRect();
      const navn = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
      return `<${el.tagName.toLowerCase()}> «${navn}» ${Math.round(r.width)}×${Math.round(r.height)}`;
    };
    return [...document.querySelectorAll(KONTROLLER)]
      .filter((el) => el.checkVisibility({ visibilityProperty: true }))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })
      .filter((el) => {
        if (storNok(el)) return false;
        if (!el.matches('input[type="radio"], input[type="checkbox"]')) return true;
        const etiketter = [...((el as HTMLInputElement).labels ?? []), el.closest("label")].filter(
          (e): e is HTMLLabelElement => e !== null,
        );
        return !etiketter.some(storNok);
      })
      .map(beskriv);
  }, TRYKKFLATE);
}

/**
 * :hover-regler i de innlastede stilarkene som viser, skjuler eller flytter noe. Går også inn i
 * @import og grupperegler som @media. Et stilark som ikke kan leses (annet opphav), hoppes over.
 */
function hoverRegler(page: Page) {
  return page.evaluate(() => {
    const EGENSKAPER = [
      "display",
      "visibility",
      "opacity",
      "max-height",
      "height",
      "transform",
      "clip-path",
      "pointer-events",
    ];
    const funn: string[] = [];
    const regler = (ark: CSSStyleSheet | CSSGroupingRule): CSSRuleList | null => {
      try {
        return ark.cssRules;
      } catch {
        return null;
      }
    };
    const gjennomga = (liste: CSSRuleList | null) => {
      for (const regel of liste ?? []) {
        if (regel instanceof CSSStyleRule && regel.selectorText.includes(":hover")) {
          const treff = EGENSKAPER.filter((e) => regel.style.getPropertyValue(e) !== "");
          if (treff.length > 0) funn.push(`${regel.selectorText} { ${treff.join(", ")} }`);
        }
        if (regel instanceof CSSImportRule && regel.styleSheet) gjennomga(regler(regel.styleSheet));
        if (regel instanceof CSSGroupingRule) gjennomga(regler(regel));
        // Nøstede regler (CSS nesting) ligger i en CSSStyleRule.
        else if (regel instanceof CSSStyleRule && regel.cssRules?.length) gjennomga(regel.cssRules);
      }
    };
    for (const ark of document.styleSheets) gjennomga(regler(ark));
    return funn;
  });
}

for (const { bredde, hoyde } of BREDDER) {
  for (const visning of VISNINGER) {
    test(`SM-4: ${visning.navn} ved ${bredde} px`, async ({ page }) => {
      await page.setViewportSize({ width: bredde, height: hoyde });
      await page.goto(visning.url ?? DEMO);
      await visning.apne(page);

      const [scrollbredde, klientbredde] = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        document.documentElement.clientWidth,
      ]);
      expect(scrollbredde, "horisontal rulling").toBeLessThanOrEqual(klientbredde);

      expect(await smaTrykkflater(page), "trykkflater under 44 × 44 px").toEqual([]);

      await expect(page.locator("[title]"), "title-attributter").toHaveCount(0);
      await expect(page.locator("svg title"), "SVG-<title>").toHaveCount(0);
      expect(await hoverRegler(page), ":hover-regler som viser eller skjuler noe").toEqual([]);
    });
  }
}

// Kriterieradene ved 200 % zoom ved 360 px (180 px): verdien står under etiketten og får mesteparten av
// raden. Fra 360 px står verdien i egen kolonne til høyre for etiketten.
for (const bredde of [180, 360]) {
  test(`Kriterieradene ved ${bredde} px`, async ({ page }) => {
    await page.setViewportSize({ width: bredde, height: 800 });
    await page.goto(DEMO);
    await finnTur(page);
    const kort = page.getByTestId("turkort").filter({ visible: true }).first();
    const rader = kort.locator("[data-rad]").filter({ visible: true });
    await expect(rader).toHaveCount(4);

    for (const rad of await rader.all()) {
      const r = (await rad.boundingBox())!;
      const etikett = (await rad.locator(":scope > span").boundingBox())!;
      const verdi = (await rad.locator(":scope > div > p").first().boundingBox())!;
      const navn = await rad.getAttribute("data-rad");
      if (bredde < 360) {
        expect(Math.abs(verdi.x - etikett.x), `${navn}: verdien starter ved etiketten`).toBeLessThanOrEqual(2);
        expect(verdi.width, `${navn}: verdien er bredere enn halve raden`).toBeGreaterThan(r.width / 2);
      } else {
        expect(verdi.x, `${navn}: verdien står til høyre for etiketten`).toBeGreaterThanOrEqual(
          etikett.x + etikett.width,
        );
      }
    }
  });
}

// Story 3.2: Kartutsnittet og kartet på Frarådet-kortet ved 200 % zoom ved 360 px (180 px). Pillene brytes
// eller står inne i kortet, og siden ruller ikke sidelengs.
for (const { navn, url, kort } of [
  { navn: "Kartutsnittet", url: DEMO, kort: "stokk-valgt" },
  { navn: "Frarådet-kortet", url: "/?demo=uj-3", kort: "fraradet-kort" },
]) {
  test(`${navn} ved 180 px`, async ({ page }) => {
    await page.setViewportSize({ width: 180, height: 800 });
    await page.goto(url);
    await finnTur(page);
    const ramme = page.getByTestId(kort);
    await expect(ramme.locator(".leaflet-container")).toHaveCount(1);

    const [scrollbredde, klientbredde] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollbredde, "horisontal rulling").toBeLessThanOrEqual(klientbredde);

    const r = (await ramme.boundingBox())!;
    const piller = ramme.locator("[data-pille]");
    expect(await piller.count()).toBeGreaterThan(0);
    for (const pille of await piller.all()) {
      const b = (await pille.boundingBox())!;
      expect(b.x, "pillen står inne i kortet").toBeGreaterThanOrEqual(r.x);
      expect(b.x + b.width, "pillen står inne i kortet").toBeLessThanOrEqual(r.x + r.width);
      const overflyt = await pille.evaluate((el) => el.scrollWidth - el.clientWidth);
      expect(overflyt, "teksten i pillen flyter ikke over").toBeLessThanOrEqual(0);
    }
    const lenke = ramme.getByRole("link", { name: /© Kartverket/ });
    const l = (await lenke.boundingBox())!;
    expect(l.x).toBeGreaterThanOrEqual(r.x);
    expect(l.x + l.width).toBeLessThanOrEqual(r.x + r.width);
  });
}
