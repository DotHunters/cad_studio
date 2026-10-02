import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { createPendingBooking, deleteBookingFixture } from "./booking-fixture";
import { queryDb } from "./db";

// Per-project, per-test references in a year the app never issues.
const referenceFor = (testInfo: TestInfo) =>
  `CAD-B-9994-${testInfo.project.name === "mobile" ? 1 : 0}${String(testInfo.line).padStart(3, "0")}`;

test.afterEach(async ({}, testInfo) => {
  await deleteBookingFixture(testInfo, referenceFor(testInfo));
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function open(page: Page, reference: string) {
  await page.goto(`/admin/bookings/${reference}`);
  await expect(page.locator('[data-hydrated="true"]').first()).toBeVisible();
}

const statusOf = async (reference: string) =>
  (
    await queryDb<{ status: string }>(`select status from "Booking" where reference = $1`, [
      reference,
    ])
  )[0].status;

test("completing a past confirmed booking", async ({ page, context, baseURL }, testInfo) => {
  const reference = referenceFor(testInfo);
  await createPendingBooking(testInfo, reference);
  await queryDb(
    `update "Booking" set status = 'CONFIRMED', "depositPaidAt" = now(),
       "startAt" = now() - interval '3 days', "endAt" = now() - interval '3 days' + interval '2 hours'
     where reference = $1`,
    [reference],
  );
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await open(page, reference);

  const complete = page.getByRole("form", { name: "Mark as completed" });
  await expect(complete.getByLabel(/thank-you with their review link/)).toBeChecked();
  await complete.getByRole("button", { name: "Mark as completed" }).click();
  await expect(page.getByText("Completed", { exact: true })).toBeVisible();
  expect(await statusOf(reference)).toBe("COMPLETED");
  // Nothing left to do with a completed booking.
  await expect(page.getByRole("form", { name: /Cancel booking|Mark as completed/ })).toHaveCount(0);
});

test("future bookings can't be completed; cancelling needs confirmation", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = referenceFor(testInfo);
  await createPendingBooking(testInfo, reference);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await open(page, reference);

  await expect(page.getByRole("form", { name: "Mark as completed" })).toHaveCount(0);
  const cancel = page.getByRole("form", { name: "Cancel booking" });
  await cancel.getByRole("button", { name: "Cancel this booking" }).click();
  // The confirmation box is required, so nothing happens yet.
  expect(await statusOf(reference)).toBe("PENDING");

  await cancel.getByLabel(`Yes, cancel ${reference}`).check();
  await cancel.getByRole("button", { name: "Cancel this booking" }).click();
  await expect(page.getByText("Cancelled", { exact: true })).toBeVisible();
  expect(await statusOf(reference)).toBe("CANCELLED");
  // A cancelled booking no longer takes payments.
  await expect(page.getByRole("form", { name: "Record deposit" })).toHaveCount(0);
});

test("change requests can be marked as handled", async ({ page, context, baseURL }, testInfo) => {
  const reference = referenceFor(testInfo);
  await createPendingBooking(testInfo, reference);
  await queryDb(
    `insert into "BookingChangeRequest" (id, "bookingId", type, message)
     select gen_random_uuid()::text, id, 'CANCEL', 'Family emergency, sorry.' from "Booking"
     where reference = $1`,
    [reference],
  );
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await open(page, reference);

  const requests = page.getByRole("region", { name: "Change requests" });
  await expect(requests).toContainText("Cancellation · Open");
  await requests.getByRole("button", { name: "Mark as handled" }).click();
  await expect(requests).toContainText("Cancellation · Resolved");
  await expect(requests.getByRole("button", { name: "Mark as handled" })).toHaveCount(0);
});
