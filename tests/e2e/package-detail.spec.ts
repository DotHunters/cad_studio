import { expect, test } from "@playwright/test";

test.describe("package detail page", () => {
  test("opens from the packages list", async ({ page }) => {
    await page.goto("/en/packages?category=wedding");
    await page
      .getByRole("region", { name: "Wedding" })
      .getByRole("link", { name: "View details" })
      .click();
    await expect(page).toHaveURL(/\/en\/packages\/wedding$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Wedding");
  });

  test("shows price, options, inclusions and exclusions", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const aside = page.getByRole("complementary");
    await expect(aside).toContainText("$2,000.00 CAD");
    await expect(aside).toContainText("Essential · Signature · Premium");
    const signature = page
      .getByRole("region", { name: "Compare options" })
      .getByRole("article", { name: "Signature" });
    await expect(signature).toContainText("$2,800.00 CAD");
    await expect(signature).toContainText("10 hours");
    await expect(signature).toContainText("2 photographers");
    await expect(signature).toContainText("12 × 24 album, 35 sheets");
    await expect(page.getByRole("region", { name: "What's included" })).toContainText(
      "Couple portraits",
    );
    await expect(page.getByRole("region", { name: "Not included" })).toContainText(
      "Travel beyond 40 km",
    );
  });

  test("lists the add-ons linked to the package with unit prices", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    const addOns = page.getByRole("region", { name: "Available add-ons" });
    await expect(addOns.getByRole("listitem")).toHaveCount(8);
    await expect(addOns).toContainText("Videography with 3–5 min highlight video");
    await expect(addOns).toContainText("$550.00");
    await expect(addOns).not.toContainText("Videographer");
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
      "Portraits du couple",
    );
  });

  test("unknown packages return 404", async ({ page }) => {
    const response = await page.goto("/en/packages/does-not-exist");
    expect(response?.status()).toBe(404);
  });
});
