import { createHmac } from "node:crypto";

import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { queryDb } from "./db";

// Same signing as src/lib/signing.ts with the local development secret.
const SECRET = "cad-studio-local-development-link-secret";
const sign = (value: string) =>
  createHmac("sha256", SECRET).update(value).digest("base64url").slice(0, 32);

// Per-project references in a year the app never issues (9999 is used by change requests).
const referenceFor = (testInfo: TestInfo, n: number) =>
  `CAD-B-9998-${testInfo.project.name === "mobile" ? 1 : 0}${String(n).padStart(3, "0")}`;
const emailFor = (testInfo: TestInfo) =>
  `e2e-review-${testInfo.project.name}-${testInfo.testId}@example.com`;
const nameFor = (testInfo: TestInfo) => `E2E verified ${testInfo.project.name} ${testInfo.testId}`;

const inDays = (days: number) => Math.floor(Date.now() / 1000) + days * 86_400;
const linkFor = (reference: string, exp: number, signature = sign(`review:${reference}|${exp}`)) =>
  `/en/reviews?booking=${reference}&exp=${exp}&t=${signature}#share`;

async function createBooking(testInfo: TestInfo, n: number, status = "COMPLETED") {
  const reference = referenceFor(testInfo, n);
  await queryDb(
    `delete from "Review" where "bookingId" in (select id from "Booking" where reference = $1)`,
    [reference],
  );
  await queryDb(`delete from "Booking" where reference = $1`, [reference]);
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Review Tester', $1)
     on conflict (email) do update set name = excluded.name returning id`,
    [emailFor(testInfo)],
  );
  await queryDb(
    `insert into "Booking" (id, reference, category, "startAt", "endAt", photographers, status,
       "depositCents", "totalCents", "paymentMethod", "customerId", "updatedAt")
     values (gen_random_uuid()::text, $1, 'PROFESSIONAL', '2026-05-14 18:00', '2026-05-14 20:00', 1,
       $2::"BookingStatus", 10000, 40000, 'CASH', $3, now())`,
    [reference, status, customer.id],
  );
  return reference;
}

async function submit(page: Page, testInfo: TestInfo) {
  const section = page.getByRole("region", { name: /Share your experience/ });
  // Hydration can take a while when the whole suite runs in parallel.
  await expect(section.locator('form[data-hydrated="true"]')).toBeVisible({ timeout: 15_000 });
  await section.locator("label", { has: page.getByRole("radio", { name: "5 stars" }) }).click();
  await section.getByLabel("Your name").fill(nameFor(testInfo));
  await section.getByLabel("Your review").fill("Relaxed headshot session with beautiful results.");
  await section.getByRole("checkbox", { name: /may publish this review/ }).check();
  await section.getByRole("button", { name: "Submit review" }).click();
  await expect(section.getByRole("status")).toContainText("Thank you!");
  const [row] = await queryDb<{ verified: boolean; category: string | null; linked: boolean }>(
    `select verified, category, "bookingId" is not null as linked from "Review"
     where "authorName" = $1`,
    [nameFor(testInfo)],
  );
  return row;
}

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Review" where "authorName" = $1`, [nameFor(testInfo)]);
  await queryDb(
    `delete from "Booking" where "customerId" in (select id from "Customer" where email = $1)`,
    [emailFor(testInfo)],
  );
});

test.describe("verified client reviews", () => {
  test("a signed link from a completed booking marks the review verified", async ({
    page,
  }, testInfo) => {
    const reference = await createBooking(testInfo, 1);
    await page.goto(linkFor(reference, inDays(30)));
    await expect(page.getByRole("note")).toContainText(`booking ${reference}`);
    await expect(page.getByLabel("Service (optional)")).toHaveValue("professional");
    expect(await submit(page, testInfo)).toEqual({
      verified: true,
      category: "PROFESSIONAL",
      linked: true,
    });

    // Only one verified review per booking.
    await page.goto(linkFor(reference, inDays(30)));
    await expect(page.getByRole("note")).toContainText("expired or was already used");
  });

  test("expired or tampered links are not verified", async ({ page }, testInfo) => {
    const reference = await createBooking(testInfo, 2);
    const expired = inDays(-1);
    await page.goto(linkFor(reference, expired));
    await expect(page.getByRole("note")).toContainText("expired or was already used");

    // Extending the expiry invalidates the signature.
    await page.goto(linkFor(reference, inDays(30), sign(`review:${reference}|${expired}`)));
    await expect(page.getByRole("note")).toContainText("expired or was already used");
    expect(await submit(page, testInfo)).toMatchObject({ verified: false, linked: false });
  });

  test("bookings that aren't completed can't leave verified reviews", async ({
    page,
  }, testInfo) => {
    const reference = await createBooking(testInfo, 3, "CONFIRMED");
    await page.goto(linkFor(reference, inDays(30)));
    await expect(page.getByRole("note")).toContainText("expired or was already used");
  });
});
