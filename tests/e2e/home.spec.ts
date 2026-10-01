import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test("hero has both calls to action", async ({ page }) => {
    await page.goto("/en");
    const main = page.locator("main");
    await expect(main.getByRole("link", { name: "Get a Quote" })).toHaveAttribute(
      "href",
      "/en/quote",
    );
    await expect(main.getByRole("link", { name: "Book a Date" })).toHaveAttribute(
      "href",
      "/en/book",
    );
  });

  test("slideshow can be paused", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto("/en");
    await page.getByRole("button", { name: "Pause slideshow" }).click();
    await expect(page.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  });

  test("slideshow starts paused for reduced-motion users", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/en");
    await expect(page.getByRole("button", { name: "Play slideshow" })).toBeVisible();
  });

  test("shows six category tiles linking to filtered packages", async ({ page }) => {
    await page.goto("/en");
    const tiles = page.getByRole("region", { name: "What we photograph" }).getByRole("link");
    await expect(tiles).toHaveCount(6);
    await expect(tiles.first()).toHaveAttribute("href", "/en/packages?category=corporate");
  });

  test("category tiles are translated in French", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { name: "Mariages" })).toBeVisible();
  });
});
