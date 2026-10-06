import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// The end of the test id is what differs between tests in this file (the start is the file).
const codeFor = (testInfo: TestInfo) =>
  `E2E_${testInfo.project.name}_${testInfo.testId.slice(-12)}`
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, "_");
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

  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText(
    `Saved “${code}”`,
  );
  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("$123.00 flat");
  await expect(row).toContainText("Corporate Events, Weddings");

  // Offered right away for weddings, not for other services.
  await page.goto("/en/quote?package=wedding");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("checkbox", { name })).toBeVisible();
  await page.goto("/en/quote?package=family-event");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Event type")).toHaveValue("family");
  // Seeded add-ons for family events are listed, but not this wedding/corporate one.
  await expect(page.getByRole("checkbox", { name: "Printed album" })).toBeVisible();
  await expect(page.getByRole("checkbox", { name })).toHaveCount(0);

  // The code is fixed once saved; hiding removes it from quotes.
  await page.goto("/admin/add-ons");
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Code")).toHaveAttribute("readonly", "");
  await page.getByLabel("Active (offered in quotes)").uncheck();
  await page.getByRole("button", { name: "Save add-on" }).click();
  await expect(
    page
      .getByRole("row", { name: new RegExp(name) })
      .getByRole("switch", { name: `Enabled: ${name}` }),
  ).toHaveAttribute("aria-checked", "false");

  await page.goto("/en/quote?package=wedding");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByRole("checkbox", { name })).toHaveCount(0);
});

test("add-on rows: switch off, refuse to delete while used, delete once unused", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const code = codeFor(testInfo);
  const name = `E2E Row add-on ${testInfo.project.name}`;
  const reference = `CAD-Q-9988-${testInfo.project.name === "mobile" ? 1 : 0}001`;
  const email =
    `e2e-addon-row-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await queryDb(`delete from "Quote" where reference = $1`, [reference]);
  await queryDb(
    `with addon as (
       insert into "AddOn" (id, code, name, "priceCents", unit)
       values (gen_random_uuid()::text, $1, $2, 5000, 'FLAT') returning id
     )
     insert into "_AddOnToService" ("A", "B") select id, 'family' from addon`,
    [code, name],
  );
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Add-on Tester', $1)
     on conflict (email) do update set name = excluded.name returning id`,
    [email],
  );
  await queryDb(
    `insert into "Quote" (id, reference, category, "eventDate", "durationHours", photographers,
       province, "addOns", breakdown, "subtotalCents", "taxCents", "totalCents", status,
       "expiresAt", "customerId")
     values (gen_random_uuid()::text, $1, 'family', '2027-10-16 18:00', 2, 1, 'ON', $2::jsonb,
       '{"lineItems":[]}'::jsonb, 65000, 8450, 73450, 'SENT', now() + interval '10 days', $3)`,
    [reference, JSON.stringify([{ code, qty: 1 }]), customer.id],
  );

  try {
    await page.goto("/admin/add-ons");
    const row = page.getByRole("row", { name: new RegExp(name) });
    const enabled = row.getByRole("switch", { name: `Enabled: ${name}` });
    await expect(enabled).toHaveAttribute("aria-checked", "true");
    await enabled.click();
    await expect(enabled).toHaveAttribute("aria-checked", "false");
    await expect
      .poll(
        async () =>
          (
            await queryDb<{ isActive: boolean }>(`select "isActive" from "AddOn" where code = $1`, [
              code,
            ])
          )[0].isActive,
      )
      .toBe(false);

    await row.getByRole("button", { name: `Delete ${name}` }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect(row.getByRole("alert")).toContainText("Used by 1 quote or booking");

    await queryDb(`delete from "Quote" where reference = $1`, [reference]);
    await row.getByRole("button", { name: `Delete ${name}` }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect
      .poll(async () => (await queryDb(`select 1 from "AddOn" where code = $1`, [code])).length)
      .toBe(0);
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
  } finally {
    await queryDb(`delete from "Quote" where reference = $1`, [reference]);
    await queryDb(`delete from "Customer" where email = $1`, [email]);
  }
});
