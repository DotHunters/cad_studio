import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
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
    await page.getByLabel("Category").selectOption("family");
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
    await page.getByRole("link", { name: nameFor(testInfo) }).click();
    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
    await expect(page.getByLabel("Starting price (CAD)")).toHaveValue("1234.50");
    await page.getByLabel("Active (shown on the site)").uncheck();
    await page.getByRole("button", { name: "Save package" }).click();
    await expect(page.getByRole("row", { name: new RegExp(nameFor(testInfo)) })).toContainText(
      "Hidden",
    );
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
    await expect(page.getByRole("navigation", { name: "Admin" })).not.toContainText("Packages");
    await page.goto("/admin/packages");
    await expect(page).toHaveURL(/\/admin\?error=forbidden$/);
    await expect(page.getByText("You don't have permission to open that page.")).toBeVisible();
  });
});
