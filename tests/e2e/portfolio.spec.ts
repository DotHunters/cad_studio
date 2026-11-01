import { expect, test } from "@playwright/test";

import { pickFilter } from "./filters";
import { caseStudies, portfolioCounts } from "./photo-counts";

test.describe("portfolio page", () => {
  test("lists all published case studies, real and sample", async ({ page }) => {
    await page.goto("/en/portfolio");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stories we've told");
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      caseStudies(portfolioCounts.total),
    );
    await expect(page.getByRole("heading", { name: "Sinhala Wedding" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cultural Festival" })).toBeVisible();
  });

  test("filters by category only", async ({ page }) => {
    await page.goto("/en/portfolio");
    const filters = page.getByRole("navigation", { name: "Filter case studies" });
    await expect(filters.getByRole("link", { name: "Local", exact: true })).toHaveCount(0);
    await pickFilter(filters, "Weddings");
    await expect(page).toHaveURL(/\?category=wedding$/);
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      caseStudies(portfolioCounts.wedding),
    );
    await expect(
      filters.getByRole("link", { name: "Weddings", includeHidden: true }).first(),
    ).toHaveAttribute("aria-current", "true");
  });

  test("ignores reach and year from old links", async ({ page }) => {
    await page.goto("/en/portfolio?reach=global&year=2024");
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      caseStudies(portfolioCounts.total),
    );
  });

  test("package pages link to the matching portfolio filter", async ({ page }) => {
    await page.goto("/en/packages/wedding");
    await page.getByRole("link", { name: "See Weddings in our portfolio" }).click();
    await expect(page).toHaveURL(/\/en\/portfolio\?category=wedding$/);
    await expect(page.getByRole("main").getByRole("status")).toHaveText(
      caseStudies(portfolioCounts.wedding),
    );
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/portfolio?category=product");
    await expect(page.getByRole("main").getByRole("status")).toHaveText("1 étude de cas");
    await expect(page.getByRole("heading", { name: "Catalogue du printemps" })).toBeVisible();
  });
});
