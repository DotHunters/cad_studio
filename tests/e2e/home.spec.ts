import { expect, test } from "@playwright/test";

import { heroSlideCount } from "./photo-counts";

test.describe("home page", () => {
  test("hero has both calls to action", async ({ page }) => {
    await page.goto("/en");
    const hero = page.locator("main section").first();
    await expect(hero.getByRole("link", { name: "Get a Quote" })).toHaveAttribute(
      "href",
      "/en/quote",
    );
    await expect(hero.getByRole("link", { name: "Book a Date" })).toHaveAttribute(
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

  test("slide indicators switch images", async ({ page }) => {
    await page.goto("/en");
    const second = page.getByRole("button", { name: `Show image 2 of ${heroSlideCount}` });
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
    await page.goto("/en/packages");
    await expect(page.locator("header")).toHaveAttribute("data-transparent", "false");
  });

  test("owner intro shows the founder signature", async ({ page }) => {
    await page.goto("/en");
    const intro = page.getByRole("region", { name: /Genuine emotions, meaningful moments/ });
    await expect(intro.getByText("I. Rukshan", { exact: true })).toBeVisible();
    await expect(intro.getByRole("link", { name: "About the studio" })).toHaveAttribute(
      "href",
      "/en/about",
    );
  });

  test("why-us band shows cards on desktop, stats on phones, and lists clients", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/en");
    const band = page.getByRole("region", { name: /Planned like an event/ });
    const stats = band.getByText("Events photographed", { exact: true });
    const card = band.getByRole("heading", { name: "2,000+ occasions captured" });
    if (isMobile) {
      await expect(stats).toBeVisible();
      await expect(band.getByText("2,000+", { exact: true })).toBeVisible();
      // Countries is an exact count, so no "+".
      await expect(band.getByText("2", { exact: true })).toBeVisible();
      await expect(card).toBeHidden();
    } else {
      await expect(card).toBeVisible();
      await expect(stats).toBeHidden();
    }
    await expect(band.getByText("Northwind Corp (Sample)")).toBeVisible();
  });

  test("featured portfolio shows the studio's real work before samples", async ({ page }) => {
    await page.goto("/en");
    const portfolio = page.getByRole("region", { name: /Stories we've told/ });
    // Six featured photo groups (scripts/photos.config.mjs) fill the row before any sample.
    await expect(portfolio.getByRole("listitem")).toHaveCount(6);
    await expect(portfolio.getByText("Sample", { exact: true })).toHaveCount(0);
    // The row scrolls sideways; the arrows page through it.
    const previous = portfolio.getByRole("button", { name: "Previous projects" });
    await expect(previous).toBeDisabled();
    await portfolio.getByRole("button", { name: "More projects" }).click();
    await expect(previous).toBeEnabled();
    await expect(portfolio.getByRole("link", { name: "View all work" })).toHaveAttribute(
      "href",
      "/en/portfolio",
    );
  });

  test("reviews carousel shows featured reviews and the average", async ({ page }) => {
    await page.goto("/en");
    const reviews = page.getByRole("region", { name: /What our clients say/ });
    await expect(reviews.getByText(/out of 5 from 3 reviews/)).toBeVisible();
    await expect(reviews.getByRole("listitem")).toHaveCount(3);
  });

  test("portfolio and reviews are localized in French", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { name: "Mariage hindou" })).toBeVisible();
    await expect(page.getByText(/4,7 sur 5 selon 3 avis/)).toBeVisible();
  });

  test("final call to action links to quote and booking", async ({ page }) => {
    await page.goto("/en");
    const cta = page.getByRole("region", { name: /Your story deserves timeless memories/ });
    await expect(cta.getByRole("link", { name: "Get a Quote" })).toHaveAttribute(
      "href",
      "/en/quote",
    );
  });

  test("French final heading renders its accent word", async ({ page }) => {
    await page.goto("/fr");
    await expect(
      page.getByRole("heading", { name: "Votre histoire mérite des souvenirs intemporels" }),
    ).toBeVisible();
  });

  test("portfolio images get a blur-up placeholder", async ({ page }) => {
    // Next.js drops the blur style once an image loads; hold image responses so the
    // placeholder state is observable regardless of network speed.
    await page.route("**/_next/image**", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });
    await page.goto("/en");
    const image = page
      .getByRole("region", { name: /Stories we've told/ })
      .getByRole("img")
      .first();
    await expect(image).toHaveAttribute("style", /data:image\/(svg\+xml|webp);base64/);
  });
});
