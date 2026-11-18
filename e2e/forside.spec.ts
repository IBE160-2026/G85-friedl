import { expect, test } from "@playwright/test";

test("forsiden er Søk-flaten, på bokmål i Nunito Sans", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Turplanlegger");
  const overskrift = page.getByRole("heading", { level: 1, name: "Hvor lenge vil du gå?" });
  await expect(overskrift).toBeVisible();
  await expect(overskrift).toHaveCSS("font-family", /Nunito Sans/);
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
  await expect(page.getByRole("button", { name: "Finn tur" })).toBeEnabled();
  // Uten demo er det ikke Demomodus.
  await expect(page.getByTestId("demomodus")).toHaveCount(0);
});
