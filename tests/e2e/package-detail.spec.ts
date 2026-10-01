import { expect, test } from "@playwright/test";

test.describe("package detail page", () => {
  test("opens from the packages list", async ({ page }) => {
    await page.goto("/en/packages");
    await page.getByRole("link", { name: "Wedding", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/packages\/wedding$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding");
  });

  test("shows price, deliverables, inclusions and exclusions", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const aside = page.getByRole("complementary");
    await expect(aside).toContainText("$2,800.00 CAD");
    await expect(aside).toContainText("8 hours");
    await expect(aside).toContainText("Within 42 days");
    await expect(page.getByRole("region", { name: "What's included" })).toContainText(
      "Planning consultation",
    );
    await expect(page.getByRole("region", { name: "Not included" })).toContainText(
      "Printed album (add-on)",
    );
  });

  test("lists the add-ons linked to the package with unit prices", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const addOns = page.getByRole("region", { name: "Available add-ons" });
    await expect(addOns.getByRole("listitem")).toHaveCount(6);
    await expect(addOns).toContainText("Videographer");
    await expect(addOns).toContainText("$150.00 / hour");
  });

  test("shows the deposit but hides placeholder policy text", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const terms = page.getByRole("region", { name: "Booking terms" });
    await expect(terms).toContainText("A 30% deposit confirms your date.");
    await expect(page.getByText(/TODO\(owner\)/)).toHaveCount(0);
  });

  test("calls to action carry the package", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    await expect(
      page.getByRole("complementary").getByRole("link", { name: "Customize quote" }),
    ).toHaveAttribute("href", "/en/quote?package=wedding");
  });

  test("breadcrumb links back to the category", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const crumbs = page.getByRole("navigation", { name: "Breadcrumb" });
    await expect(crumbs.getByRole("link", { name: "Weddings" })).toHaveAttribute(
      "href",
      "/en/packages?category=wedding",
    );
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/packages/wedding");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Mariage");
    await expect(page.getByRole("region", { name: "Ce qui est inclus" })).toContainText(
      "Consultation de planification",
    );
  });

  test("unknown packages return 404", async ({ page }) => {
    const response = await page.goto("/en/packages/does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
