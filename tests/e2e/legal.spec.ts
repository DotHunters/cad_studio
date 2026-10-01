import { expect, test } from "@playwright/test";

test.describe("legal pages", () => {
  test("privacy policy renders with a draft notice and no TODO markers", async ({ page }) => {
    await page.goto("/en/privacy");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy policy");
    await expect(page.getByRole("note")).toContainText("pending legal review");
    await expect(page.getByRole("heading", { name: "Marketing emails (CASL)" })).toBeVisible();
    await expect(page.getByText(/TODO/)).toHaveCount(0);
  });

  test("internal links keep the locale", async ({ page }) => {
    await page.goto("/fr/privacy");
    await expect(
      page.getByRole("article").getByRole("link", { name: "formulaire de contact" }).first(),
    ).toHaveAttribute("href", "/fr/contact");
  });

  test("terms page renders in French", async ({ page }) => {
    await page.goto("/fr/terms");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conditions d’utilisation");
    await expect(page.getByText(/Dernière mise à jour/)).toBeVisible();
  });

  test("footer links reach both pages", async ({ page }) => {
    await page.goto("/en");
    await page.getByRole("contentinfo").getByRole("link", { name: "Terms" }).click();
    await expect(page).toHaveURL(/\/en\/terms$/);
  });
});
