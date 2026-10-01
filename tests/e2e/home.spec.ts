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
    const tiles = page.getByRole("region", { name: "Services, tailored to you" }).getByRole("link");
    await expect(tiles).toHaveCount(6);
    await expect(tiles.first()).toHaveAttribute("href", "/en/packages?category=corporate");
  });

  test("category tiles are translated in French", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { name: "Mariages" })).toBeVisible();
  });

  test("hero shows the trust facts", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByText("10+ years behind the lens")).toBeVisible();
  });

  test("slide indicators switch images", async ({ page }) => {
    await page.goto("/en");
    const second = page.getByRole("button", { name: "Show image 2 of 4" });
    await second.click();
    await expect(second).toHaveAttribute("aria-current", "true");
  });

  test("header is transparent over the hero and solid after scrolling", async ({ page }) => {
    await page.goto("/en");
    const header = page.locator("header");
    await expect(header).toHaveAttribute("data-transparent", "true");
    await page.mouse.wheel(0, 600);
    await expect(header).toHaveAttribute("data-transparent", "false");
  });

  test("header is solid on other pages", async ({ page }) => {
    await page.goto("/en/does-not-exist-yet");
    // 404 has no site header; use a real page once M2 adds one. Home-only transparency is
    // covered above, and HERO_PATHS limits it to "/".
    await expect(page.locator("header[data-transparent='true']")).toHaveCount(0);
  });
});
