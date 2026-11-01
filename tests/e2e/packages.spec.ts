import { expect, test } from "@playwright/test";

const tabs = (page: import("@playwright/test").Page) =>
  page.getByRole("navigation", { name: "Filter packages by category" });

test.describe("packages page", () => {
  test("opens the first category and shows each package's options", async ({ page }) => {
    await page.goto("/en/packages?category=wedding");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Find the right package");
    const wedding = page.getByRole("region", { name: "Wedding" });
    await expect(wedding.getByRole("article")).toHaveCount(3);
    const essential = wedding.getByRole("article", { name: "Essential" });
    await expect(essential).toContainText("$2,000.00 CAD");
    await expect(page.getByRole("region", { name: "Engagement & Couples" })).toBeVisible();
  });

  test("switches category via the tabs", async ({ page }) => {
    await page.goto("/en/packages?category=wedding");
    await tabs(page).getByRole("link", { name: "Family Events" }).click();
    await expect(page).toHaveURL(/\/en\/packages\?category=family$/);
    await expect(tabs(page).getByRole("link", { name: "Family Events" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(page.getByRole("region", { name: "Wedding" })).toBeHidden();
  });

  test("home category tiles land on the right tab", async ({ page }) => {
    await page.goto("/en/packages?category=product");
    await expect(page.getByRole("article", { name: "Product Photography" })).toBeVisible();
  });

  test("unknown categories open the first tab", async ({ page }) => {
    await page.goto("/en/packages?category=birthday");
    await expect(tabs(page).locator("[aria-current=page]")).toHaveCount(1);
  });

  test("an option links to booking and the quote with the package and option", async ({ page }) => {
    await page.goto("/en/packages?category=wedding");
    const signature = page
      .getByRole("region", { name: "Wedding" })
      .getByRole("article", { name: "Signature" });
    await expect(signature.getByRole("link", { name: "Select package" })).toHaveAttribute(
      "href",
      "/en/book?package=wedding&tier=signature",
    );
    await expect(signature.getByRole("link", { name: "Customize quote" })).toHaveAttribute(
      "href",
      "/en/quote?package=wedding&tier=signature",
    );
  });

  test("French page uses French names and Canadian French currency format", async ({ page }) => {
    await page.goto("/fr/packages?category=wedding");
    const card = page.getByRole("region", { name: "Mariage" }).getByRole("article").first();
    // fr-CA: "2 000,00 $ CAD" with non-breaking spaces.
    await expect(card).toContainText(/2\s000,00\s\$\sCAD/);
  });
});
