import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { createPendingBooking, deleteBookingFixture } from "./booking-fixture";
import { queryDb } from "./db";

// Per-project references in a year the app never issues (9996–9999 are used by other specs).
const referenceFor = (testInfo: TestInfo) =>
  `CAD-B-9995-${testInfo.project.name === "mobile" ? 1 : 0}${String(testInfo.line).padStart(3, "0")}`;

test.afterEach(async ({}, testInfo) => {
  await deleteBookingFixture(testInfo, referenceFor(testInfo));
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function open(page: Page, reference: string) {
  await page.goto(`/admin/bookings/${reference}`);
  await expect(page.locator('[data-hydrated="true"]').first()).toBeVisible();
}

test("payment requests need real payment instructions and an https link", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const reference = referenceFor(testInfo);
  await createPendingBooking(testInfo, reference);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await open(page, reference);

  const request = page.getByRole("form", { name: /payment request/i });
  await request.getByLabel("Payment link (optional)").fill("http://pay.example/abc");
  await request.getByRole("button", { name: "Send payment request" }).click();
  await expect(request.getByText("Use a full https:// link.")).toBeVisible();

  // The seeded instructions are still a placeholder, so nothing is sent.
  await request.getByLabel("Payment link (optional)").fill("");
  await request.getByRole("button", { name: "Send payment request" }).click();
  await expect(request.getByRole("alert")).toHaveText(
    "Add your payment instructions (English and French) in Settings first.",
  );
  const [row] = await queryDb<{ requested: Date | null }>(
    `select "paymentRequestedAt" as requested from "Booking" where reference = $1`,
    [reference],
  );
  expect(row.requested).toBeNull();
});

test("recording the deposit confirms the booking", async ({ page, context, baseURL }, testInfo) => {
  const reference = referenceFor(testInfo);
  await createPendingBooking(testInfo, reference);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await open(page, reference);

  const deposit = page.getByRole("form", { name: "Record deposit" });
  await expect(deposit.getByLabel("Amount (CAD)")).toHaveValue("305.10");
  await deposit.getByRole("button", { name: "Record deposit and confirm" }).click();
  await expect(deposit.getByText("Choose how it was paid.")).toBeVisible();

  await deposit.getByLabel("Paid by").selectOption("CASH");
  await deposit.getByLabel("Amount (CAD)").fill("300");
  await deposit.getByRole("button", { name: "Record deposit and confirm" }).click();

  // The page refreshes: confirmed, and the payment forms are gone.
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
  await expect(page.getByRole("form", { name: "Record deposit" })).toHaveCount(0);
  const payment = page.getByRole("region", { name: "Payment" });
  await expect(payment).toContainText("$300.00");
  await expect(payment).toContainText("Cash");

  const [row] = await queryDb<{ status: string; deposit: number; paid: Date | null }>(
    `select status, "depositCents" as deposit, "depositPaidAt" as paid from "Booking"
     where reference = $1`,
    [reference],
  );
  expect(row.status).toBe("CONFIRMED");
  expect(row.deposit).toBe(30_000);
  expect(row.paid).not.toBeNull();
});
