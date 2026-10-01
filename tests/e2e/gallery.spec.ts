import { expect, test } from "@playwright/test";

const count = (page: import("@playwright/test").Page) => page.getByRole("main").getByRole("status");

test.describe("gallery page", () => {
  test("shows the first page of images and a load-more link", async ({ page }) => {
    await page.goto("/en/gallery");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Moments, framed");
    await expect(count(page)).toHaveText("Showing 12 of 25 images");
    await expect(page.getByRole("main").locator("li img")).toHaveCount(12);
  });

  test("loads more images without losing filters", async ({ page }) => {
    await page.goto("/en/gallery");
    await page.getByRole("link", { name: "Load more" }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(count(page)).toHaveText("Showing 24 of 25 images");
    await page.getByRole("link", { name: "Load more" }).click();
    await expect(count(page)).toHaveText("Showing 25 of 25 images");
    await expect(page.getByRole("link", { name: "Load more" })).toHaveCount(0);
  });

  test("filters by category and resets paging", async ({ page }) => {
    await page.goto("/en/gallery?page=2");
    const filters = page.getByRole("navigation", { name: "Filter images" });
    await filters.getByRole("link", { name: "Weddings" }).click();
    await expect(page).toHaveURL(/\/en\/gallery\?category=wedding$/);
    await expect(count(page)).toHaveText("Showing 8 of 8 images");
  });

  test("every image has alt text and lazy-loads below the first row", async ({ page }) => {
    await page.goto("/en/gallery");
    const images = page.getByRole("main").locator("li img");
    await expect(images.first()).toHaveAttribute("alt", /Sample placeholder image/);
    await expect(images.nth(5)).toHaveAttribute("loading", "lazy");
  });

  test("shows an empty state for filters with no images", async ({ page }) => {
    await page.goto("/en/gallery?category=family");
    await expect(page.getByText("No images match these filters yet.")).toBeVisible();
  });

  test("is localized in French", async ({ page }) => {
    await page.goto("/fr/gallery?category=product");
    await expect(count(page)).toHaveText("6 sur 6 images");
    await expect(page.getByRole("main").locator("li img").first()).toHaveAttribute(
      "alt",
      /Image d’exemple|Image d'exemple/,
    );
  });
});
