import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Pricing rules and tax rates are global. This spec only changes values no other spec
// depends on (guest hint, Nunavut), runs on one project, and restores them afterwards.
// Serial, so one test's clean-up can't reset the other's change mid-test.
test.describe.configure({ mode: "serial" });
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Edits global settings — run once.");
});

test.afterEach(async ({}, testInfo) => {
  await queryDb(
    `update "PricingRule" set value = '100'::jsonb where key = 'GUESTS_PER_PHOTOGRAPHER_HINT'`,
  );
  await queryDb(`update "TaxRate" set gst = 0.05, label = 'GST' where province = 'NU'`);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("pricing rules: validation, save, and the quote form uses the new value", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto("/admin/pricing");
  const rules = page.getByRole("region", { name: "Pricing and booking rules" });
  await expect(rules.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(rules.getByLabel("Extra hour rate")).toHaveValue("200.00");

  await rules.getByLabel("Deposit").fill("150");
  await rules.getByRole("button", { name: "Save rules" }).click();
  await expect(rules.getByText("Enter a number from 0 to 100.")).toBeVisible();

  await rules.getByLabel("Deposit").fill("30");
  await rules.getByLabel("Guests per photographer (hint)").fill("50");
  await rules.getByRole("button", { name: "Save rules" }).click();
  await expect(rules.getByRole("status")).toHaveText(
    "Saved. New quotes use these rules right away.",
  );
  const [rule] = await queryDb<{ value: number }>(
    `select value from "PricingRule" where key = 'GUESTS_PER_PHOTOGRAPHER_HINT'`,
  );
  expect(rule.value).toBe(50);

  await page.reload();
  await expect(rules.getByLabel("Guests per photographer (hint)")).toHaveValue("50");

  // Wedding includes 2 photographers: 120 guests ÷ 50 → suggest 3 (at 100 there was no hint).
  await page.goto("/en/quote?package=wedding");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Event date").fill("2027-06-09");
  await page.getByLabel(/Guest count/).fill("120");
  await expect(page.getByText("For about 120 guests we suggest 3 photographers.")).toBeVisible();
});

test("sales tax: validation and saving a province", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto("/admin/pricing");
  const tax = page.getByRole("region", { name: "Sales tax" });
  await expect(tax.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(tax.getByLabel("ON HST %")).toHaveValue("13");
  await expect(tax.getByLabel("QC PST/QST %")).toHaveValue("9.975");

  await tax.getByLabel("NU GST %").fill("abc");
  await tax.getByRole("button", { name: "Save tax rates" }).click();
  await expect(tax.getByText("Use a percentage like 5, 13 or 9.975.")).toBeVisible();

  await tax.getByLabel("NU GST %").fill("5.5");
  await tax.getByLabel("NU Label on quotes").fill("GST (test)");
  await tax.getByRole("button", { name: "Save tax rates" }).click();
  await expect(tax.getByRole("status")).toHaveText("Saved. New quotes use these rates right away.");

  const [nunavut] = await queryDb<{ gst: string; label: string }>(
    `select gst::text, label from "TaxRate" where province = 'NU'`,
  );
  expect(nunavut).toEqual({ gst: "0.05500", label: "GST (test)" });
  const [ontario] = await queryDb<{ hst: string }>(
    `select hst::text from "TaxRate" where province = 'ON'`,
  );
  expect(ontario.hst).toBe("0.13000");
});
