import { expect, type Page, test } from "@playwright/test";

// SEO pass (AGENTS.md §10): every public page has a proper head and one h1.
// Checked as Googlebot: Next streams metadata to regular browsers but puts it in the initial
// <head> for crawlers, which is what search engines index.
test.use({ userAgent: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)" });
const PAGES = [
  "",
  "/packages",
  "/packages/wedding",
  "/portfolio",
  "/portfolio/sample-northwind-annual-summit",
  "/gallery",
  "/quote",
  "/book",
  "/reviews",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
];

/** A head tag's content, or null when the tag is absent (no waiting). */
const meta = (page: Page, selector: string) =>
  page.evaluate(
    (css) => document.head.querySelector(css)?.getAttribute("content") ?? null,
    selector,
  );

for (const locale of ["en", "fr"] as const) {
  for (const path of PAGES) {
    test(`${locale}${path || "/"} has complete SEO metadata`, async ({ page }) => {
      await page.goto(`/${locale}${path}`);

      await expect(page.locator("html")).toHaveAttribute(
        "lang",
        locale === "fr" ? "fr-CA" : "en-CA",
      );
      const title = await page.title();
      expect(title).toContain("Cad Studio");
      if (path) expect(title).toMatch(/\| Cad Studio — /);

      const description = await meta(page, 'meta[name="description"]');
      expect(description?.length ?? 0).toBeGreaterThan(50);
      expect(description!.length).toBeLessThanOrEqual(200);

      const canonical = await page.locator('head link[rel="canonical"]').getAttribute("href");
      expect(canonical).toMatch(new RegExp(`^https?://[^/]+/${locale}${path}$`));
      for (const hreflang of ["en-CA", "fr-CA", "x-default"]) {
        await expect(
          page.locator(`head link[rel="alternate"][hreflang="${hreflang}"]`),
        ).toHaveCount(1);
      }

      expect(await meta(page, 'meta[property="og:title"]')).toContain("Cad Studio");
      expect(await meta(page, 'meta[property="og:description"]')).toBeTruthy();
      expect(await meta(page, 'meta[property="og:image"]')).toMatch(/^https?:\/\//);
      expect(await meta(page, 'meta[property="og:url"]')).toBe(canonical);
      expect(await meta(page, 'meta[name="twitter:card"]')).toBe("summary_large_image");

      await expect(page.locator("h1")).toHaveCount(1);
      // Public pages must be indexable.
      expect((await meta(page, 'meta[name="robots"]')) ?? "").not.toMatch(/noindex/);
    });
  }
}

test("private quote and booking pages are not indexed", async ({ page }) => {
  for (const path of ["/en/quote/CAD-Q-2026-0001", "/en/book/CAD-B-2026-0001"]) {
    await page.goto(path);
    expect(await meta(page, 'meta[name="robots"]'), path).toMatch(/noindex/);
  }
});
