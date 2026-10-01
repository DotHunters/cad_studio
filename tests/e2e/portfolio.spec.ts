import { expect, test } from "@playwright/test";

test.describe("portfolio page", () => {
  test("lists all published sample case studies", async ({ page }) => {
    await page.goto("/en/portfolio");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stories we've told");
    await expect(page.getByRole("main").getByRole("status")).toHaveText("4 case studies");
    await expect(page.getByRole("heading", { name: "Cultural Festival" })).toBeVisible();
  });

  test("filters by category, reach and year, keeping other filters", async ({ page }) => {
    await page.goto("/en/portfolio");
    const filters = page.getByRole("navigation", { name: "Filter case studies" });
    await filters.getByRole("link", { name: "Local", exact: true }).click();
    await expect(page).toHaveURL(/\?reach=local$/);
    await expect(page.getByRole("main").getByRole("status")).toHaveText("3 case studies");

    await filters.getByRole("link", { name: "2024" }).click();
    await expect(page).toHaveURL(/reach=local&year=2024/);
    await expect(page.getByRole("main").getByRole("status")).toHaveText("1 case study");
    await expect(filters.getByRole("link", { name: "2024" })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  test("shows an empty state with a way to clear filters", async ({ page }) => {
    await page.goto("/en/portfolio?category=family");
    await expect(page.getByText("No case studies match these filters yet.")).toBeVisible();
    await page.getByRole("link", { name: "Clear filters" }).click();
    await expect(page).toHaveURL(/\/en\/portfolio$/);
  });

  test("package pages link to the matching portfolio filter", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    await page.getByRole("link", { name: "See Weddings in our portfolio" }).click();
    await expect(page).toHaveURL(/\/en\/portfolio\?category=wedding$/);
    await expect(page.getByRole("main").getByRole("status")).toHaveText("1 case study");
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/portfolio?reach=global");
    await expect(page.getByRole("main").getByRole("status")).toHaveText("1 étude de cas");
    await expect(page.getByRole("heading", { name: "Catalogue du printemps" })).toBeVisible();
  });
});
