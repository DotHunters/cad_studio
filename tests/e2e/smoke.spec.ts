import { expect, test } from "@playwright/test";

test("root redirects to the English home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en-CA");
  await expect(page).toHaveTitle(/Cad Studio/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cad Studio");
});

test("French home page is served under /fr", async ({ page }) => {
  await page.goto("/fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr-CA");
  await expect(page).toHaveTitle(/Photographie au Canada/);
  // Content (not just metadata) must be French — guards the middleware matcher.
  await expect(page.getByRole("link", { name: "View the site in English" })).toBeVisible();
});

test("pages declare hreflang alternates", async ({ page }) => {
  await page.goto("/en");
  await expect(page.locator('link[rel="alternate"][hreflang="fr-CA"]')).toHaveAttribute(
    "href",
    /\/fr$/,
  );
});

test("unknown pages show a localized 404", async ({ page }) => {
  const response = await page.goto("/fr/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page introuvable");
});
