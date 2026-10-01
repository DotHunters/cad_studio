import { expect, test } from "@playwright/test";

test.describe("packages page", () => {
  test("lists all six packages with DB prices", async ({ page }) => {
    await page.goto("/en/packages");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the right package");
    await expect(page.getByRole("article")).toHaveCount(6);
    const wedding = page.getByRole("article", { name: "Wedding" });
    await expect(wedding).toContainText("$2,800.00 CAD");
    await expect(wedding).toContainText("8 hours");
    await expect(wedding).toContainText("2 photographers");
  });

  test("filters by category via the tabs", async ({ page }) => {
    await page.goto("/en/packages");
    const filter = page.getByRole("navigation", { name: "Filter packages by category" });
    await filter.getByRole("link", { name: "Weddings" }).click();
    await expect(page).toHaveURL(/\/en\/packages\?category=wedding$/);
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(filter.getByRole("link", { name: "Weddings" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  test("home category tiles land on the filtered list", async ({ page }) => {
    await page.goto("/en/packages?category=product");
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("article")).toContainText("Product Photography");
  });

  test("unknown categories fall back to all packages", async ({ page }) => {
    await page.goto("/en/packages?category=birthday");
    await expect(page.getByRole("article")).toHaveCount(6);
  });

  test("cards link to the quote and booking flows with the package", async ({ page }) => {
    await page.goto("/en/packages?category=wedding");
    await expect(page.getByRole("link", { name: "Customize quote" })).toHaveAttribute(
      "href",
      "/en/quote?package=wedding",
    );
    await expect(page.getByRole("link", { name: "Book", exact: true })).toHaveAttribute(
      "href",
      "/en/book?package=wedding",
    );
  });

  test("French page uses French names and Canadian French currency format", async ({ page }) => {
    await page.goto("/fr/packages?category=wedding");
    const card = page.getByRole("article", { name: "Mariage" });
    await expect(card).toBeVisible();
    // fr-CA: "2 800,00 $ CAD" with non-breaking spaces.
    await expect(card).toContainText(/2\s800,00\s\$\sCAD/);
  });
});
