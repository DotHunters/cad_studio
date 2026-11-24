import { expect, type Page, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// "global" project: a seasonal service changes the home page for every other test.
const SERVICE_SLUG = "seasonal";
const SERVICE_NAME = "E2E Seasonal Offers";
const PACKAGE_SLUG = "e2e-seasonal-mini";
const PACKAGE_NAME = "E2E Mini Session";

async function deleteFixtures() {
  await queryDb(`delete from "Package" where slug = $1`, [PACKAGE_SLUG]);
  await queryDb(`delete from "Service" where slug = $1`, [SERVICE_SLUG]);
}

test.beforeEach(deleteFixtures);
test.afterEach(async ({}, testInfo) => {
  // Safety net if the test failed half way; a passing test already cleaned up through the UI.
  await deleteFixtures();
  await deleteAdmin(adminEmailFor(testInfo));
});

async function createService(page: Page) {
  await page.goto("/admin/services/new");
  await page.getByLabel("Name (English)").fill(SERVICE_NAME);
  await page.getByLabel("Name (French)").fill("Offres saisonnières E2E");
  await page.getByLabel("Description (English)").fill("Limited seasonal offers for the test.");
  await page.getByLabel("Web address").fill(SERVICE_SLUG);
  await page.getByRole("button", { name: "Save service" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved. The site shows it now.");
}

async function createPackage(page: Page) {
  await page.goto("/admin/packages/new");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Slug").fill(PACKAGE_SLUG);
  await page.getByLabel("Service").selectOption(SERVICE_SLUG);
  await page.getByLabel("Name (English)").fill(PACKAGE_NAME);
  await page.getByLabel("Summary (English)").fill("Per couple shoot, family shoot or small event.");
  await page.getByLabel("Description (English)").fill("Created by an end-to-end test.");
  await page.getByLabel("Starting price (CAD)").fill("250");
  await page.getByLabel("Regular price (CAD)").fill("350");
  await page.getByLabel("Hours included").fill("2");
  await page.getByLabel("Edited images").fill("15");
  await page.getByRole("button", { name: "Save package" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved “${PACKAGE_SLUG}”`);
}

const strip = (page: Page) => page.getByRole("region", { name: SERVICE_NAME });

test("an admin creates a seasonal offer, it shows after the hero, and it hides when it ends", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  // Nothing seasonal yet: no strip, no page.
  await page.goto("/en");
  await expect(strip(page)).toHaveCount(0);
  const none = await page.goto("/en/seasonal");
  expect(none?.status()).toBe(404);

  // A service without packages still shows nothing.
  await createService(page);
  await page.goto("/en");
  await expect(strip(page)).toHaveCount(0);

  // First package: strip appears right after the hero.
  await createPackage(page);
  await page.goto("/en");
  await expect(strip(page)).toBeVisible();
  await expect(page.locator("main section").nth(1)).toHaveAccessibleName(SERVICE_NAME);
  const card = strip(page).getByRole("article", { name: PACKAGE_NAME });
  await expect(card).toContainText("$250.00 CAD");
  await expect(card.locator("s")).toContainText("$350.00");
  await expect(card).toContainText("Offer");
  await expect(card.getByRole("link", { name: "Book this session" })).toHaveAttribute(
    "href",
    `/en/book?package=${PACKAGE_SLUG}`,
  );

  // The French home page uses the French service name.
  await page.goto("/fr");
  await expect(page.getByRole("region", { name: "Offres saisonnières E2E" })).toBeVisible();

  // The landing page and the booking link work.
  await page.goto("/en/seasonal");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(SERVICE_NAME);
  await expect(page.getByRole("article", { name: PACKAGE_NAME })).toBeVisible();
  await page.getByRole("link", { name: "Book this session" }).click();
  await expect(page).toHaveURL(new RegExp(`/en/book\\?package=${PACKAGE_SLUG}$`));

  // Ending the offer (two days ago) hides it everywhere.
  const ended = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await page.goto("/admin/packages");
  await page.getByRole("link", { name: PACKAGE_NAME }).first().click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Offer ends on").fill(ended);
  await page.getByRole("button", { name: "Save package" }).click();
  await expect(page.getByRole("status")).toContainText(`Saved “${PACKAGE_SLUG}”`);
  await expect(page.getByRole("row", { name: new RegExp(PACKAGE_NAME) })).toContainText(
    "Offer expired",
  );

  await page.goto("/en");
  await expect(strip(page)).toHaveCount(0);
  expect((await page.goto("/en/seasonal"))?.status()).toBe(404);
  expect((await page.goto(`/en/packages/${PACKAGE_SLUG}`))?.status()).toBe(404);

  // Clean up through the UI so the site caches are refreshed too.
  await page.goto("/admin/packages");
  const packageRow = page.getByRole("row").filter({ hasText: PACKAGE_NAME });
  await packageRow.getByRole("button", { name: `Delete ${PACKAGE_NAME}` }).click();
  await packageRow.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("row").filter({ hasText: PACKAGE_NAME })).toHaveCount(0);

  await page.goto("/admin/services");
  const serviceRow = page.getByRole("row").filter({ hasText: SERVICE_NAME });
  await serviceRow.getByRole("button", { name: `Delete ${SERVICE_NAME}` }).click();
  await serviceRow.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByRole("row").filter({ hasText: SERVICE_NAME })).toHaveCount(0);
});
