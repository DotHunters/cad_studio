import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, openAdminMenu, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// "E2E Package" names are ignored by packages.spec.ts's counts.
const slugFor = (testInfo: TestInfo) =>
  `e2e-pkg-${testInfo.project.name}-${testInfo.testId}`.toLowerCase().slice(0, 60);
const nameFor = (testInfo: TestInfo) => `E2E Package ${testInfo.project.name}`;

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Package" where slug = $1`, [slugFor(testInfo)]);
  await deleteAdmin(adminEmailFor(testInfo));
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function openNewPackageForm(page: Page) {
  await page.goto("/admin/packages");
  await page.getByRole("link", { name: "New package" }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
}

test.describe("admin packages", () => {
  test("create a package with French text and an FAQ, then hide it", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const slug = slugFor(testInfo);
    await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
    await openNewPackageForm(page);

    await page.getByLabel("Slug").fill(slug);
    await page.getByLabel("Service").selectOption("family");
    await page.getByLabel("Name (English)").fill(nameFor(testInfo));
    await page.getByLabel("Name (French)").fill(`Forfait E2E ${testInfo.project.name}`);
    await page.getByLabel("Summary (English)").fill("A short test package.");
    await page.getByLabel("Description (English)").fill("Created by an end-to-end test.");
    await page.getByLabel("Starting price (CAD)").fill("1,234.50");
    await page.getByLabel("Hours included").fill("2");
    await page.getByLabel("Inclusions (English)").fill("Online gallery\nTwo hours of coverage");
    await page.getByRole("button", { name: "Add FAQ" }).click();
    await page.getByLabel("Question 1 (English)").fill("Is this a test?");
    await page.getByLabel("Answer 1 (English)").fill("Yes, it is removed afterwards.");
    await page.getByRole("button", { name: "Save package" }).click();

    await expect(page.getByRole("status")).toContainText(`Saved “${slug}”`);
    // Recorded in the audit log under the admin who made the change.
    const [entry] = await queryDb<{ summary: string }>(
      `select summary from "AuditLog" where "userEmail" = $1 and action = 'package.create'`,
      [adminEmailFor(testInfo)],
    );
    expect(entry.summary).toBe(`Created ${nameFor(testInfo)} ($1,234.50)`);
    const row = page.getByRole("row", { name: new RegExp(nameFor(testInfo)) });
    await expect(row).toContainText("$1,234.50");
    await expect(row).toContainText("Active");

    // The public site picks up the change right away (cache tag revalidated).
    await page.goto(`/en/packages/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(nameFor(testInfo));
    await expect(page.getByText("$1,234.50 CAD").first()).toBeVisible();
    await expect(page.getByText("Is this a test?")).toBeVisible();
    await page.goto(`/fr/packages/${slug}`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      `Forfait E2E ${testInfo.project.name}`,
    );

    // Hide it again.
    await page.goto("/admin/packages");
    await page.getByRole("link", { name: nameFor(testInfo), exact: true }).click();
    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
    await expect(page.getByLabel("Starting price (CAD)")).toHaveValue("1234.50");
    await page.getByLabel("Active (shown on the site)").uncheck();
    await page.getByRole("button", { name: "Save package" }).click();
    await expect(
      page.getByRole("switch", { name: `Active: ${nameFor(testInfo)}` }),
    ).toHaveAttribute("aria-checked", "false");
    const response = await page.goto(`/en/packages/${slug}`);
    expect(response?.status()).toBe(404);
  });

  test("shows field errors and keeps what was typed", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
    await openNewPackageForm(page);
    await page.getByLabel("Slug").fill("Not A Slug");
    await page.getByLabel("Starting price (CAD)").fill("lots");
    await page.getByLabel("Summary (English)").fill("Typed before the error.");
    await page.getByRole("button", { name: "Save package" }).click();

    await expect(page.getByRole("alert").first()).toContainText("highlighted fields");
    await expect(page.getByText("Use lowercase letters, numbers and dashes.")).toBeVisible();
    await expect(page.getByText("Enter an amount like 1200 or 1,200.50.")).toBeVisible();
    await expect(page.getByLabel("Name (English)")).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("Summary (English)")).toHaveValue("Typed before the error.");
  });

  test("staff can't manage packages", async ({ page, context, baseURL }, testInfo) => {
    await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
    await page.goto("/admin");
    await openAdminMenu(page);
    await expect(page.getByRole("navigation", { name: "Admin" })).not.toContainText("Packages");
    await page.goto("/admin/packages");
    await expect(page).toHaveURL(/\/admin\?error=forbidden$/);
    await expect(page.getByText("You don't have permission to open that page.")).toBeVisible();
  });
});

test("package rows: deactivate, refuse to delete while quoted, delete once unused", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const slug = slugFor(testInfo);
  const name = `E2E Package row ${testInfo.project.name}`;
  const reference = `CAD-Q-9988-${testInfo.project.name === "mobile" ? 1 : 0}002`;
  const email = `e2e-pkg-row-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await queryDb(`delete from "Quote" where reference = $1`, [reference]);
  const [pkg] = await queryDb<{ id: string }>(
    `insert into "Package" (id, slug, category, name, summary, description, "basePriceCents",
       "includedHours", "updatedAt")
     values (gen_random_uuid()::text, $1, 'family', $2, 'Row test', 'Row test', 50000, 2, now())
     returning id`,
    [slug, name],
  );
  const [customer] = await queryDb<{ id: string }>(
    `insert into "Customer" (id, name, email) values (gen_random_uuid()::text, 'Package Tester', $1)
     on conflict (email) do update set name = excluded.name returning id`,
    [email],
  );
  await queryDb(
    `insert into "Quote" (id, reference, category, "packageId", "eventDate", "durationHours",
       photographers, province, "addOns", breakdown, "subtotalCents", "taxCents", "totalCents",
       status, "expiresAt", "customerId")
     values (gen_random_uuid()::text, $1, 'family', $2, '2027-10-16 18:00', 2, 1, 'ON',
       '[]'::jsonb, '{"lineItems":[]}'::jsonb, 50000, 6500, 56500, 'SENT',
       now() + interval '10 days', $3)`,
    [reference, pkg.id, customer.id],
  );

  try {
    await page.goto("/admin/packages");
    const row = page.getByRole("row", { name: new RegExp(name) });
    const active = row.getByRole("switch", { name: `Active: ${name}` });
    await expect(active).toHaveAttribute("aria-checked", "true");
    await active.click();
    await expect
      .poll(
        async () =>
          (
            await queryDb<{ isActive: boolean }>(`select "isActive" from "Package" where id = $1`, [
              pkg.id,
            ])
          )[0].isActive,
      )
      .toBe(false);
    // The refreshed list (not just the optimistic switch) shows it inactive.
    await page.reload();
    await expect(active).toHaveAttribute("aria-checked", "false");
    expect((await page.goto(`/en/packages/${slug}`))?.status()).toBe(404);

    await page.goto("/admin/packages");
    await row.getByRole("button", { name: `Delete ${name}` }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect(row.getByRole("alert")).toContainText("Used by 1 quote or booking");

    await queryDb(`delete from "Quote" where reference = $1`, [reference]);
    await row.getByRole("button", { name: `Delete ${name}` }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
    expect(await queryDb(`select 1 from "Package" where id = $1`, [pkg.id])).toHaveLength(0);
  } finally {
    await queryDb(`delete from "Quote" where reference = $1`, [reference]);
    await queryDb(`delete from "Customer" where email = $1`, [email]);
  }
});
