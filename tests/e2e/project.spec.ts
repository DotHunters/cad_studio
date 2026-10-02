import { expect, test } from "@playwright/test";

test.describe("portfolio case study", () => {
  test("opens from the portfolio list", async ({ page }) => {
    await page.goto("/en/portfolio");
    await page.getByRole("link", { name: /Annual Leadership Summit/ }).click();
    await expect(page).toHaveURL(/\/en\/portfolio\/sample-northwind-annual-summit$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Annual Leadership Summit");
  });

  test("shows facts, story and the remaining images", async ({ page }) => {
    await page.goto("/en/portfolio/sample-northwind-annual-summit");
    const facts = page.getByRole("complementary");
    await expect(facts).toContainText("Northwind Corp (Sample)");
    await expect(facts).toContainText("Toronto, Canada");
    await expect(facts).toContainText("2025");
    await expect(page.getByRole("article")).toContainText("[SAMPLE] Fictional case study");
    const gallery = page.getByRole("region", { name: "Images from this project" });
    await expect(gallery).toContainText("6 images");
    await expect(gallery.getByRole("listitem")).toHaveCount(5);
  });

  test("shows the matching client recommendation", async ({ page }) => {
    await page.goto("/en/portfolio/sample-northwind-annual-summit");
    await expect(page.getByRole("figure")).toContainText(
      "[SAMPLE] Placeholder recommendation text",
    );
  });

  test("has no recommendation when the client has none", async ({ page }) => {
    await page.goto("/en/portfolio/sample-maple-co-garden-wedding");
    await expect(page.getByRole("figure")).toHaveCount(0);
  });

  test("links to packages for the same category", async ({ page }) => {
    await page.goto("/en/portfolio/sample-maple-co-garden-wedding");
    await expect(page.getByRole("link", { name: "View Weddings packages" })).toHaveAttribute(
      "href",
      "/en/packages?category=wedding",
    );
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/portfolio/sample-maple-co-garden-wedding");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mariage au jardin");
    await expect(page.getByRole("article")).toContainText("[EXEMPLE]");
  });

  test("unknown case studies return 404", async ({ page }) => {
    const response = await page.goto("/en/portfolio/nope");
    expect(response?.status()).toBe(404);
  });
});
