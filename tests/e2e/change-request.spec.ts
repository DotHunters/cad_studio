import { createHmac } from "node:crypto";

import { expect, test, type TestInfo } from "@playwright/test";

import { queryDb } from "./db";

// Same signing as src/lib/signing.ts with the local development secret.
const SECRET = process.env.LINK_TOKEN_SECRET ?? "cad-studio-local-development-link-secret";
const sign = (value: string) =>
  createHmac("sha256", SECRET).update(value).digest("base64url").slice(0, 32);

// Per-project references in a year the app never issues, so runs can't collide.
const referenceFor = (testInfo: TestInfo, n: number) =>
  `CAD-B-9999-${testInfo.project.name === "mobile" ? 1 : 0}${String(n).padStart(3, "0")}`;
const emailFor = (testInfo: TestInfo) =>
  `e2e-change-${testInfo.project.name}-${testInfo.testId}@example.com`;

async function createBooking(testInfo: TestInfo, n: number, status = "PENDING") {
  const reference = referenceFor(testInfo, n);
  await queryDb(`delete from "Booking" where reference = $1`, [reference]);
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Change Tester', $1)
     on conflict (email) do update set name = excluded.name returning id`,
    [emailFor(testInfo)],
  );
  await queryDb(
    `insert into "Booking" (id, reference, category, "startAt", "endAt", photographers, status,
       "depositCents", "totalCents", "paymentMethod", "customerId", "updatedAt")
     values (gen_random_uuid()::text, $1, 'wedding', '2027-08-14 18:00', '2027-08-15 02:00', 2,
       $2::"BookingStatus", 94920, 316400, 'BANK_TRANSFER', $3, now())`,
    [reference, status, customer.id],
  );
  return { reference, url: `/en/book/${reference}?t=${sign(`booking:${reference}`)}` };
}

test.afterEach(async ({}, testInfo) => {
  await queryDb(
    `delete from "Booking" where "customerId" in (select id from "Customer" where email = $1)`,
    [emailFor(testInfo)],
  );
});

test.describe("booking change requests", () => {
  test("sends a reschedule request and records it for the studio", async ({ page }, testInfo) => {
    const { reference, url } = await createBooking(testInfo, 1);
    await page.goto(url);
    const section = page.getByRole("region", { name: "Need to change something?" });
    await expect(section).toBeVisible();

    await section.getByRole("button", { name: "Send request" }).click();
    await expect(section.getByText("Add a preferred date or a note.")).toBeVisible();

    await section.getByLabel(/Preferred new date/).fill("2027-08-21");
    await section.getByLabel("Message (optional)").fill("Venue moved the date by a week.");
    await section.getByRole("button", { name: "Send request" }).click();
    await expect(section.getByRole("status")).toContainText("Request sent");

    const rows = await queryDb<{ type: string; preferredDate: string; status: string }>(
      `select r.type, r."preferredDate", r.status from "BookingChangeRequest" r
         join "Booking" b on b.id = r."bookingId" where b.reference = $1`,
      [reference],
    );
    expect(rows).toEqual([{ type: "RESCHEDULE", preferredDate: "2027-08-21", status: "OPEN" }]);
  });

  test("sends a cancellation request without changing the booking", async ({ page }, testInfo) => {
    const { reference, url } = await createBooking(testInfo, 2);
    await page.goto(url);
    await page.getByRole("radio", { name: "Cancel the booking" }).check();
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("main").getByRole("status")).toContainText("Request sent");

    const [booking] = await queryDb<{ status: string }>(
      `select status from "Booking" where reference = $1`,
      [reference],
    );
    // The studio decides; nothing is cancelled automatically.
    expect(booking.status).toBe("PENDING");
  });

  test("limits open requests per booking", async ({ page }, testInfo) => {
    const { url } = await createBooking(testInfo, 3);
    for (let i = 0; i < 4; i++) {
      await page.goto(url);
      await page.getByRole("radio", { name: "Cancel the booking" }).check();
      await page.getByRole("button", { name: "Send request" }).click();
      if (i < 3) {
        await expect(page.getByRole("main").getByRole("status")).toContainText("Request sent");
      } else {
        await expect(page.getByText("can no longer be changed online")).toBeVisible();
      }
    }
  });

  test("isn't offered for cancelled bookings", async ({ page }, testInfo) => {
    const { url } = await createBooking(testInfo, 4, "CANCELLED");
    await page.goto(url);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: "Need to change something?" })).toHaveCount(0);
  });

  test("requires a valid signed link", async ({ request }, testInfo) => {
    const { reference } = await createBooking(testInfo, 5);
    expect((await request.get(`/en/book/${reference}`)).status()).toBe(404);
    expect((await request.get(`/en/book/${reference}?t=${"x".repeat(32)}`)).status()).toBe(404);
  });
});
