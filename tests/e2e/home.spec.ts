import { expect, test } from "@playwright/test";

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
    await page.goto("/en/packages");
    await expect(page.locator("header")).toHaveAttribute("data-transparent", "false");
  });

  test("owner intro shows the founder signature", async ({ page }) => {
    await page.goto("/en");
    const intro = page.getByRole("region", { name: /The light, the laughter/ });
    await expect(intro.getByText("I. Rukshan", { exact: true })).toBeVisible();
    await expect(intro.getByRole("link", { name: "About the studio" })).toHaveAttribute(
      "href",
      "/en/about",
    );
  });

  test("why-us band hides unconfirmed stats and lists clients", async ({ page }) => {
    await page.goto("/en");
    const band = page.getByRole("region", { name: /Planned like an event/ });
    // Only "years" is confirmed so far; a single stat is not shown on its own, and
    // unconfirmed stats (events, countries) stay hidden until the owner provides them.
    await expect(band.getByText("Events photographed", { exact: true })).toHaveCount(0);
    await expect(band.getByText("Years of experience", { exact: true })).toHaveCount(0);
    await expect(band.getByText("Northwind Corp (Sample)")).toBeVisible();
  });

  test("featured portfolio lists sample projects with badges", async ({ page }) => {
    await page.goto("/en");
    const portfolio = page.getByRole("region", { name: /Stories we've told/ });
    await expect(portfolio.getByRole("listitem")).toHaveCount(3);
    await expect(portfolio.getByText("Sample").first()).toBeVisible();
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
    await expect(page.getByRole("heading", { name: "Mariage au jardin" })).toBeVisible();
    await expect(page.getByText(/sur 5 selon 3 avis/)).toBeVisible();
  });

  test("final call to action links to quote and booking", async ({ page }) => {
    await page.goto("/en");
    const cta = page.getByRole("region", { name: /Let's create something timeless/ });
    await expect(cta.getByRole("link", { name: "Get a Quote" })).toHaveAttribute(
      "href",
      "/en/quote",
    );
  });

  test("French final heading renders its accent word (ICU apostrophe regression)", async ({
    page,
  }) => {
    await page.goto("/fr");
    await expect(
      page.getByRole("heading", { name: "Créons quelque chose d’intemporel" }),
    ).toBeVisible();
  });

  test("portfolio images get a blur-up placeholder", async ({ page }) => {
    await page.goto("/en");
    const image = page
      .getByRole("region", { name: /Stories we've told/ })
      .getByRole("img")
      .first();
    await expect(image).toHaveAttribute("style", /data:image\/svg\+xml;base64/);
  });
});
