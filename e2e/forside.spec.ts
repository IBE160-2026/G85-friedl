import { expect, test } from "@playwright/test";

test("forsiden viser overskriften Turplanlegger på bokmål i Nunito Sans", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Turplanlegger");
  const overskrift = page.getByRole("heading", { level: 1, name: "Turplanlegger" });
  await expect(overskrift).toBeVisible();
  await expect(overskrift).toHaveCSS("font-family", /Nunito Sans/);
  await expect(page.locator("html")).toHaveAttribute("lang", "nb");
});
