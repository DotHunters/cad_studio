import type { TestInfo } from "@playwright/test";

import { queryDb } from "./db";

/*
 * Booking references for e2e fixtures use years the app never issues. One year per spec, so
 * parallel specs never delete each other's rows:
 *   9999 change-request · 9998 cron-api · 9997 admin-dashboard · 9996 admin-bookings
 *   9995 admin-booking-payments (+ 9995-2001 admin-settings.global) · 9994 admin-booking-status
 *   9993 review-verified · 9992 admin-assignments · 9990 admin-availability (March 2028) · 9989 seo-audit · 9988 admin-add-ons + admin-packages (quotes only, x001/x002)
 * Event dates: September 2027 belongs to availability-api.spec.ts (it asserts every day), so
 * fixtures here use October 2027.
 */

/** Client email for booking fixtures, unique per test. */
export const bookingClientEmail = (testInfo: TestInfo, label = "client") =>
  `e2e-${label}-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();

/**
 * A PENDING booking with a $305.10 deposit, created with SQL. `reference` must be unique per
 * project (use a year the app never issues, e.g. CAD-B-9995-…).
 */
export async function createPendingBooking(
  testInfo: TestInfo,
  reference: string,
  { locale = "en", label = "client" }: { locale?: "en" | "fr"; label?: string } = {},
) {
  await queryDb(`delete from "Booking" where reference = $1`, [reference]);
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email, locale)
     values (gen_random_uuid()::text, 'Payment Tester', $1, $2::"Locale")
     on conflict (email) do update set name = excluded.name returning id`,
    [bookingClientEmail(testInfo, label), locale],
  );
  await queryDb(
    `insert into "Booking" (id, reference, category, "startAt", "endAt", photographers, status,
       "subtotalCents", "taxCents", "totalCents", "depositCents", "paymentMethod", "customerId",
       "updatedAt")
     values (gen_random_uuid()::text, $1, 'FAMILY', '2027-10-16 18:00', '2027-10-16 20:00', 1,
       'PENDING', 90000, 11700, 101700, 30510, 'BANK_TRANSFER', $2, now())`,
    [reference, customer.id],
  );
}

export async function deleteBookingFixture(
  testInfo: TestInfo,
  reference: string,
  label = "client",
) {
  await queryDb(`delete from "Booking" where reference = $1`, [reference]);
  await queryDb(`delete from "Customer" where email = $1`, [bookingClientEmail(testInfo, label)]);
}
