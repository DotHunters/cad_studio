import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

const codeFor = (testInfo: TestInfo) =>
  `E2E_${testInfo.project.name}_${testInfo.testId}`
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_")
    .slice(0, 30);
const nameFor = (testInfo: TestInfo) => `E2E Add-on ${testInfo.project.name}`;

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "AddOn" where code = $1`, [codeFor(testInfo)]);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("admins add an add-on that the quote calculator offers, then hide it", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const code = codeFor(testInfo);
  const name = nameFor(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  await page.goto("/admin/add-ons");
  await page.getByRole("link", { name: "New add-on" }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Save add-on" }).click();
  await expect(page.getByText("Choose at least one service.")).toBeVisible();

  await page.getByLabel("Code").fill(code.toLowerCase());
  await page.getByLabel("Name (English)").fill(name);
  await page.getByLabel("Price (CAD)").fill("123");
  await page.getByLabel("Charged").selectOption("FLAT");
  await page.getByRole("checkbox", { name: "Weddings" }).check();
  await page.getByRole("checkbox", { name: "Corporate Events" }).check();
  await page.getByRole("button", { name: "Save add-on" }).click();

  await expect(page.getByRole("status")).toContainText(`Saved “${code}”`);
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("$123.00 flat");
  await expect(row).toContainText("Corporate Events, Weddings");

  // Offered right away for weddings, not for other services.
  await page.goto("/en/quote?package=wedding");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("checkbox", { name })).toBeVisible();
  await page.goto("/en/quote?package=family");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("checkbox", { name })).toHaveCount(0);

  // The code is fixed once saved; hiding removes it from quotes.
  await page.goto("/admin/add-ons");
  await page.getByRole("link", { name }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Code")).toHaveAttribute("readonly", "");
  await page.getByLabel("Active (offered in quotes)").uncheck();
  await page.getByRole("button", { name: "Save add-on" }).click();
  await expect(page.getByRole("row", { name: new RegExp(name) })).toContainText("Hidden");

  await page.goto("/en/quote?package=wedding");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("checkbox", { name })).toHaveCount(0);
});
