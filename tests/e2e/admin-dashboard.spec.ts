import { expect, test, type TestInfo } from "@playwright/test";

import { signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Per-project references in a year the app never issues (9998/9999 are used by other specs).
const referenceFor = (testInfo: TestInfo) =>
  `CAD-B-9997-${testInfo.project.name === "mobile" ? 1 : 0}001`;
const emailFor = (testInfo: TestInfo, label: string) =>
  `e2e-dash-${label}-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Booking" where reference = $1`, [referenceFor(testInfo)]);
  await queryDb(`delete from "Customer" where email = $1`, [emailFor(testInfo, "client")]);
  await queryDb(`delete from "User" where email = $1`, [emailFor(testInfo, "admin")]);
});

test("dashboard shows bookings, quotes, reviews, revenue and what needs attention", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = referenceFor(testInfo);
  await signInAsAdmin(context, baseURL!, emailFor(testInfo, "admin"));

  await queryDb(`delete from "Booking" where reference = $1`, [reference]);
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Dashboard Tester', $1)
     on conflict (email) do update set name = excluded.name returning id`,
    [emailFor(testInfo, "client")],
  );
  // Requested 30 hours ago and still no payment request → flagged (AGENTS.md §8.3).
  await queryDb(
    `insert into "Booking" (id, reference, category, "startAt", "endAt", photographers, status,
       "subtotalCents", "totalCents", "customerId", "createdAt", "updatedAt")
     values (gen_random_uuid()::text, $1, 'FAMILY', now() + interval '20 hours',
       now() + interval '22 hours', 1, 'PENDING', 60000, 67800, $2,
       now() - interval '30 hours', now())`,
    [reference, customer.id],
  );

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const attention = page.getByRole("region", { name: "Needs attention" });
  await expect(attention).toContainText(`${reference} (Dashboard Tester)`);
  await expect(attention).toContainText("no payment request sent");

  const upcoming = page.getByRole("region", { name: "Upcoming bookings" });
  await expect(upcoming.getByRole("listitem").filter({ hasText: reference })).toContainText(
    "Family Events",
  );

  for (const label of ["Upcoming bookings", "New quotes", "Pending reviews", "Revenue"]) {
    await expect(page.locator("dt", { hasText: label })).toBeVisible();
  }
  await expect(page.getByRole("region", { name: "Recent quotes" })).toBeVisible();
});
