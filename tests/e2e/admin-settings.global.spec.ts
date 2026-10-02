import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { createPendingBooking, deleteBookingFixture } from "./booking-fixture";
import { queryDb } from "./db";

// Settings are global: this runs in the "global" project after all other specs. Only payment
// instructions (never shown on the site) are changed, and they're restored afterwards.
const SEEDED_PAYMENT = {
  en: "TODO(owner): bank transfer details.",
  fr: "TODO(owner): coordonnées pour le virement bancaire.",
};

test.afterEach(async ({}, testInfo) => {
  await queryDb(`update "SiteSetting" set value = $1::jsonb where key = 'PAYMENT_INSTRUCTIONS'`, [
    JSON.stringify(SEEDED_PAYMENT),
  ]);
  await deleteBookingFixture(testInfo, PAYMENT_REFERENCE);
  await deleteAdmin(adminEmailFor(testInfo));
});

// A year the app never issues; this spec runs once (global project).
const PAYMENT_REFERENCE = "CAD-B-9995-2001";

test("admins edit payment instructions in both languages", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto("/admin/settings");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  const payment = page.getByRole("group", { name: "Payment instructions" });
  await expect(payment).toContainText("Still placeholder text");

  await payment
    .getByLabel("Payment instructions (English)")
    .fill("Interac e-Transfer to the studio.");
  await payment.getByLabel("Payment instructions (French)").fill("");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Please fill in both languages.")).toBeVisible();
  await expect(payment.getByLabel("Payment instructions (French)")).toHaveAttribute(
    "aria-invalid",
    "true",
  );

  await payment.getByLabel("Payment instructions (French)").fill("Virement Interac au studio.");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByRole("status")).toHaveText("Saved.");

  const [row] = await queryDb<{ value: unknown }>(
    `select value from "SiteSetting" where key = 'PAYMENT_INSTRUCTIONS'`,
  );
  expect(row.value).toEqual({
    en: "Interac e-Transfer to the studio.",
    fr: "Virement Interac au studio.",
  });

  await page.reload();
  await expect(page.getByRole("group", { name: "Payment instructions" })).not.toContainText(
    "Still placeholder text",
  );

  // With real instructions in place, payment requests go out (in the client's language).
  await createPendingBooking(testInfo, PAYMENT_REFERENCE, { locale: "fr" });
  await page.goto(`/admin/bookings/${PAYMENT_REFERENCE}`);
  await expect(page.locator('[data-hydrated="true"]')).toBeVisible();
  const request = page.getByRole("form", { name: /payment request/i });
  await request.getByLabel("Payment link (optional)").fill("https://pay.example/cad-test");
  await request.getByRole("button", { name: "Send payment request" }).click();
  await expect(request.getByRole("status")).toHaveText("Payment request sent to the client.");
  const [booking] = await queryDb<{ requested: Date | null; link: string | null }>(
    `select "paymentRequestedAt" as requested, "paymentLinkUrl" as link from "Booking"
     where reference = $1`,
    [PAYMENT_REFERENCE],
  );
  expect(booking.requested).not.toBeNull();
  expect(booking.link).toBe("https://pay.example/cad-test");
  await expect(page.getByRole("region", { name: "Payment" })).toContainText(
    "https://pay.example/cad-test",
  );
});
