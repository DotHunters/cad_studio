import { createHmac } from "node:crypto";

import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { bookingClientEmail } from "./booking-fixture";
import { queryDb } from "./db";

// Quote references in a year the app never issues.
const referenceFor = (testInfo: TestInfo) =>
  `CAD-Q-9991-${testInfo.project.name === "mobile" ? 1 : 0}${String(testInfo.line).padStart(3, "0")}`;

test.afterEach(async ({}, testInfo) => {
  await queryDb(
    `delete from "Booking" where "quoteId" in (select id from "Quote" where reference = $1)`,
    [referenceFor(testInfo)],
  );
  await queryDb(`delete from "Quote" where reference = $1`, [referenceFor(testInfo)]);
  await queryDb(`delete from "Customer" where email = $1`, [bookingClientEmail(testInfo, "quote")]);
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function createExpiredQuote(testInfo: TestInfo, { expired = true } = {}) {
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
    taxLines: [{ code: "HST", rate: "13%", amountCents: 41_600 }],
    depositCents: 108_480,
    flags: { customTravelQuote: false, suggestedPhotographers: null },
    packageSlug: "wedding",
    startTime: "13:00",
  };
  await queryDb(
    `insert into "Quote" (id, reference, category, "packageId", "eventDate", "durationHours",
       photographers, province, city, "distanceKm", "addOns", breakdown, "subtotalCents",
       "taxCents", "totalCents", status, "expiresAt", "customerId", "createdAt")
     values (gen_random_uuid()::text, $1, 'WEDDING', (select id from "Package" where slug = 'wedding'),
       $5::timestamp, 10, 2, 'ON', 'Markham', 25, '[]'::jsonb, $2::jsonb, 320000, 41600,
       361600, 'SENT', now() + $4::interval, $3, now() - interval '20 days')`,
    [
      reference,
      JSON.stringify(breakdown),
      customer.id,
      expired ? "-2 days" : "10 days",
      // 13:00 Toronto (EST), one Saturday per project so bookings can't compete for capacity.
      testInfo.project.name === "mobile" ? "2027-11-20 18:00" : "2027-11-13 18:00",
    ],
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

// Same signing as src/lib/signing.ts with the local development secret.
const quoteToken = (reference: string) =>
  createHmac("sha256", "cad-studio-local-development-link-secret")
    .update(`quote:${reference}`)
    .digest("base64url")
    .slice(0, 32);

test("staff adjust a quote's price; the client's quote shows it", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = await createExpiredQuote(testInfo, { expired: false });
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await page.goto(`/admin/quotes/${reference}`);
  const adjust = page.getByRole("form", { name: "Adjust price" });
  await expect(adjust.locator("xpath=self::*[@data-hydrated='true']")).toHaveCount(1);

  await adjust.getByRole("button", { name: "Apply adjustment" }).click();
  await expect(adjust.getByText("Required.")).toHaveCount(2); // label and amount

  await adjust.getByLabel("Shown as").fill("Returning client");
  await adjust.getByLabel("Amount (CAD, before tax)").fill("200");
  await adjust.getByRole("button", { name: "Apply adjustment" }).click();
  await expect(adjust.getByRole("status")).toContainText("Price updated");

  // $3,200 − $200 = $3,000 + 13 % HST = $3,390; deposit 30 % = $1,017.
  const price = page.getByRole("region", { name: "Price" });
  await expect(price).toContainText("Returning client");
  await expect(price).toContainText("-$200.00");
  await expect(price).toContainText("$3,390.00");
  await expect(price).toContainText("Deposit $1,017.00");

  // The client's private quote page shows the same price.
  await page.goto(`/fr/quote/${reference}?t=${quoteToken(reference)}`);
  await expect(page.getByText("Returning client")).toBeVisible();
  await expect(page.getByText(/3\s390,00/).first()).toBeVisible();

  await page.goto(`/admin/quotes/${reference}`);
  await page.getByRole("button", { name: "Remove adjustment" }).click();
  await expect(page.getByRole("form", { name: "Adjust price" }).getByRole("status")).toHaveText(
    "Adjustment removed.",
  );
  await expect(page.getByRole("region", { name: "Price" })).toContainText("$3,616.00");
});

test("staff book an open quote for the client at the quoted price", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = await createExpiredQuote(testInfo, { expired: false });
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await page.goto(`/admin/quotes/${reference}`);
  const convert = page.getByRole("form", { name: "Book this quote" });
  await expect(convert.locator("xpath=self::*[@data-hydrated='true']")).toHaveCount(1);

  await convert.getByRole("button", { name: "Create booking" }).click();
  await expect(convert.getByText("Choose how the client will pay.")).toBeVisible();
  await expect(convert.getByText(/Confirm the client asked to book/)).toBeVisible();

  await convert.getByLabel("Venue").fill("Kortright Centre, Woodbridge");
  await convert.getByLabel("Deposit paid by").selectOption("BANK_TRANSFER");
  await convert.getByLabel(/client asked to book/).check();
  await convert.getByRole("button", { name: "Create booking" }).click();

  // Lands on the new booking, linked to the quote, at the quoted price.
  await expect(page).toHaveURL(/\/admin\/bookings\/CAD-B-\d{4}-\d{4,}$/);
  await expect(page.getByText(`from quote ${reference}`)).toBeVisible();
  await expect(page.getByRole("region", { name: "Event" })).toContainText("Kortright Centre");
  await expect(page.getByRole("region", { name: "Price" })).toContainText("$3,616.00");
  const [quote] = await queryDb<{ status: string }>(
    `select status from "Quote" where reference = $1`,
    [reference],
  );
  expect(quote.status).toBe("ACCEPTED");

  // Booked quotes can't be booked, adjusted or re-sent again.
  await page.goto(`/admin/quotes/${reference}`);
  await expect(
    page.getByRole("form", { name: /Book this quote|Adjust price|Re-send quote/ }),
  ).toHaveCount(0);
});

test("expired quotes must be renewed before booking", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = await createExpiredQuote(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await page.goto(`/admin/quotes/${reference}`);
  await expect(page.getByRole("form", { name: "Re-send quote" })).toBeVisible();
  await expect(page.getByRole("form", { name: "Book this quote" })).toHaveCount(0);
});
