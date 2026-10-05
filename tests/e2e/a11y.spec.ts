import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";

// Automated WCAG 2.1 AA checks (AGENTS.md §9). They catch contrast, names, labels, landmarks
// and ARIA misuse; keyboard flows are covered by the feature specs (e.g. the lightbox).
const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function expectNoViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  const summary = violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n` +
      violation.nodes
        .slice(0, 5)
        .map((node) => `   - ${node.target.join(" ")} ${node.failureSummary?.split("\n")[1] ?? ""}`)
        .join("\n"),
  );
  expect(summary, summary.join("\n\n")).toEqual([]);
}

const PUBLIC_PAGES = [
  "/en",
  "/en/packages",
  "/en/packages/wedding",
  "/en/portfolio",
  "/en/portfolio/sample-northwind-annual-summit",
  "/en/gallery",
  "/en/quote",
  "/en/book",
  "/en/reviews",
  "/en/about",
  "/en/contact",
  "/en/privacy",
  "/en/terms",
  "/en/does-not-exist",
  "/fr",
  "/fr/quote",
  "/fr/reviews",
];

test.describe("accessibility (axe, WCAG 2.1 AA)", () => {
  for (const path of PUBLIC_PAGES) {
    test(`public ${path}`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  for (const path of ["/en", "/en/packages", "/en/quote", "/en/reviews"]) {
    test(`dark mode ${path}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
      await page.goto(path);
      await expectNoViolations(page);
    });
  }

  test.describe("interactive states", () => {
    test("open mobile menu", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await page.goto("/en");
      await page.getByRole("button", { name: "Open menu" }).click();
      await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("gallery lightbox open", async ({ page }) => {
      await page.goto("/en/gallery");
      await page.getByRole("button", { name: /^Open image 1 of/ }).click();
      await expect(page.getByRole("dialog", { name: "Image viewer" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("contact form showing errors", async ({ page }) => {
      await page.goto("/en/contact");
      await expect(page.locator("form")).toBeVisible();
      await page.getByRole("button", { name: "Send message" }).click();
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
      await expectNoViolations(page);
    });

    test("quote form showing errors", async ({ page }) => {
      await page.goto("/en/quote?package=wedding");
      await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
      await page.getByRole("button", { name: "Get my quote" }).click();
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
      await expectNoViolations(page);
    });

    test("review form showing errors", async ({ page }) => {
      await page.goto("/en/reviews");
      await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
      await page.getByRole("button", { name: "Submit review" }).click();
      await expect(page.locator('[aria-invalid="true"]').first()).toBeVisible();
      await expectNoViolations(page);
    });
  });

  test("admin sign-in", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await expectNoViolations(page);
  });

  test.describe("admin screens", () => {
    test.afterEach(async ({}, testInfo) => deleteAdmin(adminEmailFor(testInfo, "a11y")));

    for (const path of [
      "/admin",
      "/admin/bookings",
      "/admin/bookings/calendar",
      "/admin/quotes",
      "/admin/availability",
      "/admin/reviews",
      "/admin/packages",
      "/admin/packages/new",
      "/admin/add-ons/new",
      "/admin/pricing",
      "/admin/settings",
      "/admin/portfolio/new",
      "/admin/gallery",
      "/admin/service-tiles",
      "/admin/service-tiles/wedding",
      "/admin/team",
      "/admin/audit",
    ]) {
      test(`admin ${path}`, async ({ page, context, baseURL }, testInfo) => {
        await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "a11y"));
        await page.goto(path);
        await expectNoViolations(page);
      });
    }
  });
});
