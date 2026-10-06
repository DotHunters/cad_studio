import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// "global" project: services and tile photos change the public site for every test.
const SLUG = "e2e-graduations";
const NAME = "E2E Graduations";
const QUOTE_REFERENCE = "CAD-Q-9987-0001";
const QUOTE_EMAIL = "e2e-services-quote@example.com";

// Tests in this file run in parallel, so each one cleans up only what it changed.
test.afterEach(async ({}, testInfo) => {
  await deleteAdmin(adminEmailFor(testInfo));
});

async function deleteServiceFixtures() {
  await queryDb(`delete from "Quote" where reference = $1 or category = $2`, [
    QUOTE_REFERENCE,
    SLUG,
  ]);
  await queryDb(`delete from "Customer" where email = $1`, [QUOTE_EMAIL]);
  await queryDb(`delete from "Service" where slug = $1`, [SLUG]);
}

/** A throwaway quote for the new service, so an existing quote is never touched. */
async function createQuoteFor(category: string) {
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Service Tester', $1)
     on conflict (email) do update set name = excluded.name returning id`,
    [QUOTE_EMAIL],
  );
  await queryDb(
    `insert into "Quote" (id, reference, category, "eventDate", "durationHours", photographers,
       province, "addOns", breakdown, "subtotalCents", "taxCents", "totalCents", status,
       "expiresAt", "customerId")
     values (gen_random_uuid()::text, $1, $2, '2027-10-16 18:00', 2, 1, 'ON', '[]'::jsonb,
       '{"lineItems":[]}'::jsonb, 60000, 7800, 67800, 'SENT', now() + interval '10 days', $3)`,
    [QUOTE_REFERENCE, category, customer.id],
  );
}

test.describe("service lifecycle", () => {
  test.afterEach(deleteServiceFixtures);

  test("an admin adds, archives and deletes a service", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

    // Create
    await page.goto("/admin/services/new");
    await page.getByLabel("Name (English)").fill(NAME);
    await page.getByLabel("Name (French)").fill("E2E Remises de diplômes");
    await page.getByLabel("Description (English)").fill("Caps, gowns and proud families.");
    await page.getByLabel("Web address").fill(SLUG);
    await page.getByRole("button", { name: "Save service" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved. The site shows it now.");

    // Shown on the site, in both languages
    await page.goto("/en");
    await expect(page.getByRole("link", { name: new RegExp(NAME) })).toBeVisible();
    await page.goto("/fr");
    await expect(page.getByRole("link", { name: /E2E Remises de diplômes/ })).toBeVisible();
    await page.goto("/en/packages");
    await expect(page.getByRole("link", { name: NAME, exact: true })).toBeVisible();
    await page.goto("/en/quote");
    await expect(page.locator(`select[name="category"] option[value="${SLUG}"]`)).toHaveCount(1);

    // An old quote keeps the name after archiving
    await createQuoteFor(SLUG);
    await page.goto("/admin/services");
    const active = page.getByRole("switch", { name: `Active: ${NAME}` });
    await active.click();
    await expect(active).toHaveAttribute("aria-checked", "false");
    // The switch flips optimistically; wait for the action to save before leaving the page.
    await expect(active).toBeEnabled();
    await expect
      .poll(async () => {
        const [service] = await queryDb<{ archived: boolean }>(
          `select "archivedAt" is not null as archived from "Service" where slug = $1`,
          [SLUG],
        );
        return service?.archived;
      })
      .toBe(true);

    await page.goto("/en");
    await expect(page.getByRole("link", { name: new RegExp(NAME) })).toHaveCount(0);
    await page.goto("/en/quote");
    await expect(page.locator(`select[name="category"] option[value="${SLUG}"]`)).toHaveCount(0);
    await page.goto(`/admin/quotes/${QUOTE_REFERENCE}`);
    await expect(page.getByText(NAME).first()).toBeVisible();

    // Delete is refused while a quote uses it, allowed once unused
    await page.goto("/admin/services");
    const row = page.getByRole("row").filter({ hasText: NAME });
    await expect(row.getByRole("button", { name: `Delete ${NAME}` })).toBeDisabled();
    await expect(row).toContainText("In use — archive instead.");

    await queryDb(`delete from "Quote" where reference = $1`, [QUOTE_REFERENCE]);
    await page.reload();
    await row.getByRole("button", { name: `Delete ${NAME}` }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("row").filter({ hasText: NAME })).toHaveCount(0);
    const left = await queryDb(`select 1 from "Service" where slug = $1`, [SLUG]);
    expect(left).toHaveLength(0);
  });
});

test.describe("tile photo", () => {
  test.afterEach(async () => {
    await queryDb(`update "Service" set "tileImageId" = null where slug = 'corporate'`);
  });

  test("an admin chooses the photo on a home-page service tile, then resets it", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    // A consented launch photo from another service: Corporate has none of its own.
    const [photo] = await queryDb<{ id: string; publicId: string }>(
      `select id, "publicId" from "Image"
     where "consentToPublish" and "publicId" like 'local/%' and category <> 'corporate'
     order by "publicId" limit 1`,
    );
    await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

    await page.goto("/admin/services");
    await page.getByRole("link", { name: "Change photo: Corporate Events" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Corporate Events tile");
    await expect(page.getByRole("radio")).not.toHaveCount(0);
    await page.locator(`input[name="imageId"][value="${photo.id}"]`).check();
    await page.getByRole("button", { name: "Use this photo" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved. The site shows it now.");

    // The home page shows it straight away (cache tag revalidated).
    const path = photo.publicId.slice("local".length);
    await page.goto("/en");
    const tile = page.getByRole("link", { name: /Corporate Events/ }).locator("img");
    await expect(tile).toHaveAttribute("src", new RegExp(encodeURIComponent(path)));

    // Back to the default: the tile has no launch photo of its own.
    await page.goto("/admin/services/corporate/photo");
    await page.getByRole("radio", { name: "First launch photo" }).check();
    await page.getByRole("button", { name: "Use this photo" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved. The site shows it now.");
    await page.goto("/en");
    await expect(tile).not.toHaveAttribute("src", new RegExp(encodeURIComponent(path)));
  });
});

test("services are admin-only and the old tiles pages redirect", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "STAFF");
  await page.goto("/admin/services");
  await expect(page.getByRole("heading", { name: "Services" })).toHaveCount(0);

  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "ADMIN");
  await page.goto("/admin/service-tiles");
  await expect(page).toHaveURL(/\/admin\/services$/);
  await page.goto("/admin/service-tiles/wedding");
  await expect(page).toHaveURL(/\/admin\/services\/wedding\/photo$/);
  const response = await page.goto("/admin/services/parties/photo");
  expect(response?.status()).toBe(404);
});
