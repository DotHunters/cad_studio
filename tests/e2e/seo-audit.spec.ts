import { createHmac } from "node:crypto";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { createPendingBooking, deleteBookingFixture } from "./booking-fixture";
import { queryDb } from "./db";

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
      expect(title).toContain("CAD Studio Photography");
      if (path) expect(title).toMatch(/\| CAD Studio Photography$/);

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

      expect(await meta(page, 'meta[property="og:title"]')).toContain("CAD Studio Photography");
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

// Same signing as src/lib/signing.ts with the local development secret.
const sign = (value: string) =>
  createHmac("sha256", "cad-studio-local-development-link-secret")
    .update(value)
    .digest("base64url")
    .slice(0, 32);

// Years the app never issues (see booking-fixture.ts); one reference per project.
const privateRefs = (testInfo: TestInfo) => {
  const p = testInfo.project.name === "mobile" ? 1 : 0;
  return { quote: `CAD-Q-9989-${p}001`, booking: `CAD-B-9989-${p}001` };
};

test.afterEach(async ({}, testInfo) => {
  if (!testInfo.title.startsWith("private")) return;
  const { quote, booking } = privateRefs(testInfo);
  await queryDb(`delete from "Quote" where reference = $1`, [quote]);
  await deleteBookingFixture(testInfo, booking, "seo");
});

test("private quote and booking pages are not indexed", async ({ page }, testInfo) => {
  const { quote, booking } = privateRefs(testInfo);
  await createPendingBooking(testInfo, booking, { label: "seo" });
  await queryDb(`delete from "Quote" where reference = $1`, [quote]);
  await queryDb(
    `insert into "Quote" (id, reference, category, "eventDate", "durationHours", photographers,
       province, "addOns", breakdown, "subtotalCents", "taxCents", "totalCents", status,
       "expiresAt", "customerId")
     select gen_random_uuid()::text, $1, 'family', '2027-10-16 18:00', 2, 1, 'ON', '[]'::jsonb,
       $2::jsonb, 60000, 7800, 67800, 'SENT', now() + interval '10 days', "customerId"
     from "Booking" where reference = $3`,
    [
      quote,
      JSON.stringify({
        lineItems: [{ kind: "base", amountCents: 60_000 }],
        taxLines: [{ code: "HST", rate: "13%", amountCents: 7_800 }],
        depositCents: 20_340,
        flags: { customTravelQuote: false, suggestedPhotographers: null },
        packageSlug: "family-event",
        startTime: "14:00",
      }),
      booking,
    ],
  );

  for (const path of [
    `/en/quote/${quote}?t=${sign(`quote:${quote}`)}`,
    `/en/book/${booking}?t=${sign(`booking:${booking}`)}`,
  ]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    expect(await meta(page, 'meta[name="robots"]'), path).toMatch(/noindex/);
  }
});
