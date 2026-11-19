import { expect, type Locator, type Page, test } from "@playwright/test";
import { HOYDEMERKNAD } from "../src/kjerne/vaer/sammendrag";
import type { Resultatvisning, Vaer } from "../src/kjerne/visning/skjema";
import { VAERVARSLING_FORKLARING } from "../src/ui/tekster";

// Story 2.9: vær-delen i Resultatet mot Værscenarioene, på PC (1440 px) og mobil (360 px).
// Værsammendraget ved god vær (uj-1), Værvarslingen ved dårlig vær (uj-2), live-teksten, og
// Værmangel-linjen uten Værmelding (uten-vaer). Alle Søk går med `?demo=`, så ingen test kaller MET.
// Testene sjekker tilstand og felt, aldri Turnavn (AR-26).

type VaerVurdert = Extract<Vaer, { type: "vurdert" }>;

/** `{colors.rust}` (#A13E17). */
const RUST = "rgb(161, 62, 23)";

const PC = { width: 1440, height: 1000 } as const;
const MOBIL = { width: 360, height: 800 } as const;

/** Sender Søket med «Finn tur» og gir Resultatvisningen serveren svarte med. */
async function finnTur(page: Page): Promise<Resultatvisning> {
  const svar = page.waitForResponse((r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/sok");
  await page.getByRole("button", { name: "Finn tur" }).click();
  const respons = await svar;
  expect(respons.ok(), `/api/sok svarte ${respons.status()}`).toBe(true);
  const visning = (await respons.json()) as Resultatvisning;
  await expect(page.getByRole("heading", { level: 1, name: visning.overskrift })).toBeVisible();
  return visning;
}

function vurdert(visning: Resultatvisning): VaerVurdert {
  if (visning.vaer.type !== "vurdert") throw new Error(`Været er ${visning.vaer.type}`);
  return visning.vaer;
}

/** UJ-1: I dag 13:30 («nå» i uj-1), 2 t, Middels og utsikt. */
async function uj1(page: Page): Promise<Resultatvisning> {
  await page.goto("/?demo=uj-1");
  await page.getByRole("checkbox", { name: "utsikt" }).check();
  return finnTur(page);
}

/**
 * UJ-2: I morgen (man. 9. nov.) 10:00, 3 t, Krevende og utsikt. «Nå» i uj-2 er søn. 8. nov. kl. 20.
 * `tilgjengeligMin` bytter Tilgjengelig tid, for eksempel 15 min for Alternativet.
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

/** Alle foresporsler siden gjør, så testen kan sjekke at nettleseren bare kontakter vår egen server. */
function foresporsler(page: Page): URL[] {
  const urler: URL[] = [];
  page.on("request", (r) => urler.push(new URL(r.url())));
  return urler;
}

const boks = async (l: Locator) => (await l.boundingBox())!;

for (const [navn, viewport] of [
  ["PC", PC],
  ["mobil", MOBIL],
] as const) {
  test.describe(`UJ-1 ${navn}`, () => {
    test.use({ viewport });

    test("Værsammendraget med klasse, ikon, ord, verdier, Tidsvindu og Høydemerknad", async ({ page, baseURL }) => {
      const urler = foresporsler(page);
      const visning = await uj1(page);
      const vaer = vurdert(visning);
      expect(vaer).toMatchObject({ klasse: "god", tidsvindu: "13:30–15:30" });

      const sammendrag = page.getByTestId("vaersammendrag");
      await expect(sammendrag).toBeVisible();
      await expect(sammendrag.getByTestId("vaerklasse")).toHaveText("Værklasse god");
      const ikon = sammendrag.locator("img");
      await expect(ikon).toHaveAttribute("src", "/vaerikoner/clearsky_day.svg");
      await expect(ikon).toHaveAttribute("alt", "");
      await expect(sammendrag.getByRole("img")).toHaveCount(0);
      expect(await ikon.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), "ikonet lastes").toBe(true);
      await expect(sammendrag.getByTestId("vaersymbol")).toHaveText("klarvær");
      await expect(sammendrag.getByTestId("vaerverdier")).toHaveText("3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s");
      await expect(sammendrag.getByTestId("tidsvindu")).toHaveText("13:30–15:30");
      await expect(sammendrag.getByTestId("hoydemerknad")).toHaveText(HOYDEMERKNAD);
      expect(vaer.sammendrag).toBe("klarvær · 3–5 °C · nedbør 0 mm/t · vind opptil 4,5 m/s");

      await expect(page.getByTestId("vaermangel")).toHaveCount(0);
      await expect(page.getByTestId("vaervarsling")).toHaveCount(0);
      await expect(page.locator('div[aria-live="polite"]')).toHaveText(visning.overskrift);

      // Mellom Ditt søk og overskriften.
      const dittSok = page.getByTestId(navn === "PC" ? "ditt-sok" : "ditt-sok-linje").filter({ visible: true });
      const overskrift = page.getByRole("heading", { level: 1 });
      expect((await boks(dittSok)).y).toBeLessThan((await boks(sammendrag)).y);
      expect((await boks(sammendrag)).y).toBeLessThan((await boks(overskrift)).y);

      // Ikonet er 32 px på PC og 24 px på mobil.
      const storrelse = navn === "PC" ? 32 : 24;
      const i = await boks(ikon);
      expect(i.width).toBeCloseTo(storrelse, 0);
      expect(i.height).toBeCloseTo(storrelse, 0);

      const klasse = await boks(sammendrag.getByTestId("vaerklasse"));
      const symbol = await boks(sammendrag.getByTestId("vaersymbol"));
      const verdier = await boks(sammendrag.getByTestId("vaerverdier"));
      const tidsvindu = await boks(sammendrag.getByTestId("tidsvindu"));
      const panel = await boks(sammendrag);
      const midt = (b: { y: number; height: number }) => b.y + b.height / 2;
      // Klassen og symbolet står på én linje.
      expect(Math.abs(midt(klasse) - midt(symbol))).toBeLessThan(6);
      if (navn === "PC") {
        // Alt på én linje, med Tidsvinduet helt til høyre.
        expect(Math.abs(midt(verdier) - midt(klasse))).toBeLessThan(6);
        expect(tidsvindu.x + tidsvindu.width).toBeGreaterThan(panel.x + panel.width - 40);
      } else {
        // Verdiene på neste linje.
        expect(verdier.y).toBeGreaterThanOrEqual(klasse.y + klasse.height - 1);
      }

      // Nettleseren kontakter bare vår egen server, og ikonet ligger lokalt.
      const egen = new URL(baseURL!).origin;
      expect(urler.filter((u) => u.protocol.startsWith("http") && u.origin !== egen).map(String)).toEqual([]);
    });
  });

  test.describe(`UJ-2 ${navn}`, () => {
    test.use({ viewport });

    test("Værvarslingen med tittelen i rust, den utløsende verdien først og forklaringen", async ({ page }) => {
      const visning = await uj2(page);
      const vaer = vurdert(visning);
      expect(vaer.klasse).toBe("darlig");
      if (!vaer.vaervarsling) throw new Error("Forventet en Værvarsling.");

      const varsling = page.getByTestId("vaervarsling");
      await expect(varsling).toBeVisible();
      const tittel = varsling.getByTestId("vaervarsling-tittel");
      await expect(tittel).toHaveText("Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00");
      await expect(tittel).toHaveCSS("color", RUST);
      // Nedbøren (3,4 mm/t) utløste Værklassen og står først.
      await expect(varsling.getByTestId("vaervarsling-tekst")).toHaveText(vaer.vaervarsling.tekst);
      await expect(varsling.getByTestId("vaervarsling-tekst")).toHaveText(/^Nedbør opptil \d+(,\d)? mm\/t, vind opptil .+ °C\.$/);
      await expect(varsling.getByText(VAERVARSLING_FORKLARING, { exact: true })).toBeVisible();
      await expect(varsling.getByTestId("hoydemerknad")).toHaveText(HOYDEMERKNAD);
      if (vaer.symbol) {
        await expect(varsling.getByTestId("vaersymbol")).toHaveText(vaer.symbol.ord);
        await expect(varsling.locator("img")).toHaveCount(vaer.symbol.ikonSti ? 1 : 0);
        if (vaer.symbol.ikonSti) {
          await expect(varsling.locator("img")).toHaveAttribute("src", vaer.symbol.ikonSti);
          await expect(varsling.locator("img")).toHaveAttribute("alt", "");
        }
      }
      // Panelet er en region med tittelen som navn.
      await expect(page.getByRole("region", { name: vaer.vaervarsling.tittel })).toBeVisible();
      await expect(page.getByTestId("vaersammendrag")).toHaveCount(0);
      await expect(page.getByTestId("vaermangel")).toHaveCount(0);
      // Den eneste knappen i Værvarslingen er den i Bedre tidsvindu-boksen (story 2.10).
      await expect(varsling.getByRole("button")).toHaveCount(1);
      await expect(varsling.getByTestId("bedre-tidsvindu-boks").getByRole("button")).toHaveCount(1);

      // Over Turforslagene.
      const overskrift = page.getByRole("heading", { level: 1, name: "Tre Turforslag i dårlig vær" });
      const kort1 = page.getByTestId("turkort").filter({ visible: true }).first();
      expect((await boks(varsling)).y).toBeLessThan((await boks(overskrift)).y);
      expect((await boks(overskrift)).y).toBeLessThan((await boks(kort1)).y);

      // Vær-raden på kort 1: «Værklasse dårlig» med se opp, og verdien i rust.
      const vaerRad = kort1.getByRole("group", { name: "Værklasse" });
      await expect(vaerRad.getByRole("img", { name: "se opp" })).toBeVisible();
      const verdi = vaerRad.getByText("Værklasse dårlig", { exact: true });
      await expect(verdi).toBeVisible();
      await expect(verdi).toHaveCSS("color", RUST);
      if (visning.utfall.type !== "turforslag") throw new Error("Forventet Turforslag.");
      expect(visning.utfall.kort[0].kriterier[1]).toMatchObject({ merke: "se-opp", tekst: "Værklasse dårlig" });
    });

    test("live-området melder overskriften og Værvarslingen", async ({ page }) => {
      await uj2(page);
      await expect(page.locator('div[aria-live="polite"]')).toHaveText(
        "Tre Turforslag i dårlig vær. Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–13:00.",
      );
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tre Turforslag i dårlig vær");
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
    });
  });
}

test.describe("UJ-2 med 15 min", () => {
  test.use({ viewport: PC });

  test("Værvarslingen står over Alternativkortet", async ({ page }) => {
    const visning = await uj2(page, 15);
    expect(vurdert(visning).klasse).toBe("darlig");
    expect(visning.utfall.type).toBe("kortesteTur");
    const varsling = page.getByTestId("vaervarsling");
    const overskrift = page.getByRole("heading", { level: 1, name: "Ingen Tur passer 15 min." });
    const alternativ = page.getByTestId("alternativkort");
    await expect(varsling).toBeVisible();
    await expect(alternativ).toBeVisible();
    expect((await boks(varsling)).y).toBeLessThan((await boks(overskrift)).y);
    expect((await boks(overskrift)).y).toBeLessThan((await boks(alternativ)).y);
    await expect(page.locator('div[aria-live="polite"]')).toHaveText(
      "Ingen Tur passer 15 min. Værvarsling: Værklasse dårlig i Tidsvinduet 10:00–10:15.",
    );
  });
});

test.describe("uten-vaer", () => {
  test.use({ viewport: PC });

  test("Værmangel-linjen som før, uten Værsammendrag og Værvarsling", async ({ page }) => {
    await page.goto("/?demo=uten-vaer");
    const visning = await finnTur(page);
    expect(visning.vaer.type).toBe("mangler");
    await expect(page.getByTestId("vaermangel")).toHaveText("Været er ikke vurdert. Vi fikk ikke hentet Værmeldingen fra MET.");
    await expect(page.getByTestId("vaersammendrag")).toHaveCount(0);
    await expect(page.getByTestId("vaervarsling")).toHaveCount(0);
    await expect(page.locator('div[aria-live="polite"]')).toHaveText("Tre Turforslag som passer tiden din");
  });
});
