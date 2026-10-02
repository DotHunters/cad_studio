import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Settings are global. Only payment instructions (never shown on the site) are changed; the
// cancellation policy keeps its placeholder, which package-detail.spec.ts relies on.
const SEEDED_PAYMENT = {
  en: "TODO(owner): bank transfer details.",
  fr: "TODO(owner): coordonnées pour le virement bancaire.",
};

test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Edits global settings — run once.");
});

test.afterEach(async ({}, testInfo) => {
  await queryDb(`update "SiteSetting" set value = $1::jsonb where key = 'PAYMENT_INSTRUCTIONS'`, [
    JSON.stringify(SEEDED_PAYMENT),
  ]);
  await deleteAdmin(adminEmailFor(testInfo));
});

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
});
