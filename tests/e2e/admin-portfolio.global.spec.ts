import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Runs in the "global" project (after other specs): publishing a project changes the public
// portfolio counts that portfolio.spec.ts asserts.
const slugFor = (testInfo: TestInfo) =>
  `e2e-project-${testInfo.project.name}-${testInfo.testId}`.toLowerCase().slice(0, 80);
const titleFor = (testInfo: TestInfo) => `E2E Project ${testInfo.project.name}`;

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "PortfolioProject" where slug = $1`, [slugFor(testInfo)]);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("projects: client named only with consent, unpublishing hides them", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const slug = slugFor(testInfo);
  const title = titleFor(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  await page.goto("/admin/portfolio");
  await page.getByRole("link", { name: "New project" }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Category").selectOption("corporate");
  await page.getByLabel("Local or global").selectOption("LOCAL");
  await page.getByLabel("City").fill("Toronto");
  await page.getByLabel("Client name").fill("Lakeshore Test Co.");
  await page.getByLabel("Title (English)").fill(title);
  await page.getByLabel("Story (English)").fill("A test case study written by an e2e test.");
  await page.getByLabel("Published (shown on the website)").check();
  await page.getByRole("button", { name: "Save project" }).click();

  await expect(page.getByRole("status")).toContainText(`Saved “${slug}”`);
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row).toContainText("Not named publicly (no consent)");
  await expect(row).toContainText("Published");

  // No consent → "Private client" on the website.
  await page.goto(`/en/portfolio/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText("Private client").first()).toBeVisible();
  await expect(page.getByText("Lakeshore Test Co.")).toHaveCount(0);

  // With consent the name appears.
  await page.goto("/admin/portfolio");
  await page.getByRole("link", { name: title }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Client agreed to be named publicly").check();
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(`/en/portfolio/${slug}`);
  await expect(page.getByText("Lakeshore Test Co.").first()).toBeVisible();

  // Unpublished → gone from the website.
  await page.goto("/admin/portfolio");
  await page.getByRole("link", { name: title }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Published (shown on the website)").uncheck();
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("row", { name: new RegExp(title) })).toContainText("Draft");
  const response = await page.goto(`/en/portfolio/${slug}`);
  expect(response?.status()).toBe(404);
});

test("projects: validation", async ({ page, context, baseURL }, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto("/admin/portfolio/new");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Year").fill("26");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByText("Choose local or global.")).toBeVisible();
  await expect(page.getByText("Must be at least 1990.")).toBeVisible();
  await expect(page.getByLabel("Title (English)")).toHaveAttribute("aria-invalid", "true");
});
