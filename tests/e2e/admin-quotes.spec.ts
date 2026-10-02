import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { bookingClientEmail } from "./booking-fixture";
import { queryDb } from "./db";

// Quote references in a year the app never issues.
const referenceFor = (testInfo: TestInfo) =>
  `CAD-Q-9991-${testInfo.project.name === "mobile" ? 1 : 0}${String(testInfo.line).padStart(3, "0")}`;

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Quote" where reference = $1`, [referenceFor(testInfo)]);
  await queryDb(`delete from "Customer" where email = $1`, [bookingClientEmail(testInfo, "quote")]);
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function createExpiredQuote(testInfo: TestInfo) {
  const reference = referenceFor(testInfo);
  await queryDb(`delete from "Quote" where reference = $1`, [reference]);
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email, locale)
     values (gen_random_uuid()::text, 'Quote Tester', $1, 'fr')
     on conflict (email) do update set name = excluded.name returning id`,
    [bookingClientEmail(testInfo, "quote")],
  );
  const breakdown = {
    lineItems: [
      { kind: "base", amountCents: 280_000 },
      { kind: "extraHours", hours: 2, amountCents: 40_000 },
    ],
    taxLines: [{ code: "HST", rate: "0.13", amountCents: 41_600 }],
    depositCents: 108_480,
    flags: { customTravelQuote: false, suggestedPhotographers: null },
    packageSlug: "wedding",
  };
  await queryDb(
    `insert into "Quote" (id, reference, category, "packageId", "eventDate", "durationHours",
       photographers, province, city, "distanceKm", "addOns", breakdown, "subtotalCents",
       "taxCents", "totalCents", status, "expiresAt", "customerId", "createdAt")
     values (gen_random_uuid()::text, $1, 'WEDDING', (select id from "Package" where slug = 'wedding'),
       '2027-11-13 18:00', 10, 2, 'ON', 'Markham', 25, '[]'::jsonb, $2::jsonb, 320000, 41600,
       361600, 'SENT', now() - interval '2 days', $3, now() - interval '20 days')`,
    [reference, JSON.stringify(breakdown), customer.id],
  );
  return reference;
}

test("staff review an expired quote and re-send it with a fresh validity", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = await createExpiredQuote(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");

  await page.goto(`/admin/quotes?q=${reference}`);
  await expect(page.getByText("No quotes match these filters.")).toBeVisible(); // not open
  await page.goto(`/admin/quotes?view=EXPIRED&q=${reference}`);
  const row = page.getByRole("row", { name: new RegExp(reference) });
  await expect(row).toContainText("Quote Tester");
  await expect(row).toContainText("$3,616.00");
  await expect(row).toContainText("Expired");

  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(reference);
  const price = page.getByRole("region", { name: "Price" });
  await expect(price).toContainText("Wedding package");
  await expect(price).toContainText("Extra hours (2 h)");
  await expect(price).toContainText("HST (13%)");
  await expect(price).toContainText("Deposit $1,084.80");
  await expect(page.getByRole("region", { name: "Event" })).toContainText(
    "Markham, Ontario · 25 km",
  );

  const resend = page.getByRole("form", { name: "Re-send quote" });
  await expect(resend.locator("xpath=self::*[@data-hydrated='true']")).toHaveCount(1);
  await expect(resend.getByRole("checkbox", { name: /valid for another/ })).toBeChecked();
  await resend.getByRole("button", { name: "Re-send quote" }).click();
  await expect(resend.getByRole("status")).toHaveText("Quote sent to the client again.");

  const [quote] = await queryDb<{ valid: boolean }>(
    `select "expiresAt" > now() + interval '13 days' as valid from "Quote" where reference = $1`,
    [reference],
  );
  expect(quote.valid).toBe(true);
  await page.reload();
  await expect(page.getByText("Sent", { exact: true })).toBeVisible();
});
