import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Per-project references in a year the app never issues (9997–9999 are used by other specs).
const referenceFor = (testInfo: TestInfo) =>
  `CAD-B-9996-${testInfo.project.name === "mobile" ? 1 : 0}${String(testInfo.line).padStart(3, "0")}`;
const clientEmailFor = (testInfo: TestInfo) =>
  `e2e-bookings-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Booking" where reference = $1`, [referenceFor(testInfo)]);
  await queryDb(`delete from "Customer" where email = $1`, [clientEmailFor(testInfo)]);
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function createBooking(testInfo: TestInfo) {
  const reference = referenceFor(testInfo);
  await queryDb(`delete from "Booking" where reference = $1`, [reference]);
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email, phone, locale)
     values (gen_random_uuid()::text, 'Booking Viewer', $1, '416-555-0100', 'fr')
     on conflict (email) do update set name = excluded.name returning id`,
    [clientEmailFor(testInfo)],
  );
  const breakdown = {
    lineItems: [
      { kind: "base", amountCents: 60_000 },
      { kind: "addOn", code: "DRONE", quantity: 1, amountCents: 30_000 },
    ],
    taxLines: [{ code: "HST", rate: "0.13", amountCents: 11_700 }],
    flags: { customTravelQuote: false },
  };
  const [booking] = await queryDb<{ id: string }>(
    `insert into "Booking" (id, reference, category, "packageId", "startAt", "endAt", photographers,
       "guestCount", venue, notes, status, "subtotalCents", "taxCents", "totalCents", breakdown,
       "depositCents", "paymentMethod", "customerId", "updatedAt")
     values (gen_random_uuid()::text, $1, 'FAMILY',
       (select id from "Package" where slug = 'family-event'),
       '2027-10-23 18:00', '2027-10-23 20:00', 1, 40, 'Rouge Park, Scarborough',
       'Grandma''s 90th birthday', 'PENDING', 90000, 11700, 101700, $2::jsonb, 30510,
       'BANK_TRANSFER', $3, now())
     returning id`,
    [reference, JSON.stringify(breakdown), customer.id],
  );
  await queryDb(
    `insert into "BookingChangeRequest" (id, "bookingId", type, "preferredDate", message)
     values (gen_random_uuid()::text, $1, 'RESCHEDULE', '2027-09-25', 'Could we move a week later?')`,
    [booking.id],
  );
  return reference;
}

test("staff find a booking and see its details, price and change requests", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = await createBooking(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");

  await page.goto(`/admin/bookings?q=${reference}`);
  const row = page.getByRole("row", { name: new RegExp(reference) });
  await expect(row).toContainText("Booking Viewer");
  await expect(row).toContainText("Family Events");
  await expect(row).toContainText("$1,017.00");
  await expect(row).toContainText("Change requested");

  // Filters narrow the list.
  await page.goto(`/admin/bookings?q=${reference}&status=CANCELLED`);
  await expect(page.getByText("No bookings match these filters.")).toBeVisible();

  await page.goto(`/admin/bookings?q=${reference}`);
  await page.getByRole("link", { name: reference }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(reference);

  const event = page.getByRole("region", { name: "Event" });
  await expect(event).toContainText("Family Events");
  await expect(event).toContainText("Rouge Park, Scarborough");
  await expect(event).toContainText("Grandma's 90th birthday");
  await expect(page.getByRole("region", { name: "Client" })).toContainText("French");

  const price = page.getByRole("region", { name: "Price" });
  await expect(price).toContainText("Family Event package");
  await expect(price).toContainText("Drone coverage");
  await expect(price).toContainText("HST (13%)");
  await expect(price).toContainText("$1,017.00");

  const payment = page.getByRole("region", { name: "Payment" });
  await expect(payment).toContainText("$305.10");
  await expect(payment).toContainText("Bank transfer");

  await expect(page.getByRole("region", { name: "Change requests" })).toContainText(
    "Could we move a week later?",
  );
});

test("bookings export to CSV, download as .ics and show on the calendar", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = await createBooking(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");

  const csv = await page.request.get(`/admin/bookings/export?q=${reference}&when=all`);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const text = await csv.text();
  expect(text).toContain("Reference,Status,Event date");
  expect(text).toContain(`${reference},PENDING,2027-10-23,14:00,FAMILY,1,Booking Viewer`);
  expect(text).toContain("1017.00");

  const ics = await page.request.get(`/admin/bookings/${reference}/ics`);
  expect(ics.headers()["content-type"]).toContain("text/calendar");
  const event = await ics.text();
  expect(event).toContain("STATUS:TENTATIVE");
  expect(event).toContain(`SUMMARY:Booking Viewer — family (${reference})`);

  await page.goto("/admin/bookings/calendar?month=2027-10");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("October 2027");
  const day = page.locator('td[data-date="2027-10-23"]');
  const link = day.locator(`a[href="/admin/bookings/${reference}"]`);
  await expect(link).toContainText("2:00 PM Booking Viewer");
  await link.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(reference);
});

test("exports aren't available without signing in", async ({ request }) => {
  const response = await request.get("/admin/bookings/export", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers().location).toContain("/admin/sign-in");
});
