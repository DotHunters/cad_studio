import { expect, type Page, test } from "@playwright/test";

const customers = (page: Page) => page.getByRole("region", { name: "Client reviews" });

test.describe("reviews page", () => {
  test("shows the average, client reviews and recommendations", async ({ page }) => {
    await page.goto("/en/reviews");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kind words");
    await expect(page.getByTestId("reviews-summary")).toContainText("4.7 out of 5 from 3 reviews");
    await expect(customers(page).getByRole("listitem")).toHaveCount(3);
    const recommendations = page.getByRole("region", { name: "Recommendations" });
    await expect(recommendations.getByRole("listitem")).toHaveCount(1);
    await expect(recommendations).toContainText("Events Director (Sample)");
  });

  test("shows customer names as first name + last initial", async ({ page }) => {
    await page.goto("/en/reviews");
    // Seeded "Sample Client A." → "Sample A."; recommendations keep the full name.
    await expect(customers(page).getByText("Sample A.", { exact: true })).toBeVisible();
    await expect(customers(page).getByText("Sample Client A.")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Recommendations" })).toContainText(
      "Sample Person",
    );
  });

  test("filters by service and sorts by rating", async ({ page }) => {
    await page.goto("/en/reviews");
    const filters = page.getByRole("navigation", { name: "Filter and sort reviews" });
    await filters.getByRole("link", { name: "Highest rated" }).click();
    await expect(page).toHaveURL(/\?sort=highest$/);
    await expect(customers(page).getByRole("listitem").last()).toContainText("Sample C.");

    await filters.getByRole("link", { name: "Weddings" }).click();
    await expect(page).toHaveURL(/category=wedding&sort=highest/);
    await expect(customers(page).getByRole("listitem")).toHaveCount(1);
  });

  test("shows an empty state for services without reviews", async ({ page }) => {
    await page.goto("/en/reviews?category=product");
    await expect(customers(page)).toContainText("No reviews here yet.");
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/reviews");
    await expect(page.getByTestId("reviews-summary")).toContainText("4,7 sur 5 selon 3 avis");
    await expect(page.getByRole("region", { name: "Avis de clients" })).toBeVisible();
  });
});
