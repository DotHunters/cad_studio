import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Global (runs after the parallel projects): it publishes a wedding package, which would
// change the package counts packages.spec.ts checks. "E2E Package" names are ignored there.
const slugFor = (project: string, testId: string) =>
  `e2e-pkg-tiers-${project}-${testId}`.toLowerCase().slice(0, 60);

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Package" where slug = $1`, [
    slugFor(testInfo.project.name, testInfo.testId),
  ]);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("options (Silver / Gold): admin adds them, clients compare and quote the one they pick", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const slug = slugFor(testInfo.project.name, testInfo.testId);
  const name = `E2E Package tiers ${testInfo.project.name}`;
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto("/admin/packages");
  await page.getByRole("link", { name: "New package" }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByLabel("Slug").fill(slug);
  await page.getByLabel("Service").selectOption("wedding");
  await page.getByLabel("Name (English)", { exact: true }).fill(name);
  await page.getByLabel("Summary (English)").fill("A package with options.");
  await page.getByLabel("Description (English)").fill("Created by an end-to-end test.");
  await page.getByLabel("Starting price (CAD)").fill("1000");
  await page.getByLabel("Hours included", { exact: true }).fill("4");
  const options: Array<[string, string, string, string]> = [
    ["Silver", "2,000", "6", "1"],
    ["Gold", "3000", "10", "2"],
  ];
  for (const [index, [tier, price, hours, shooters]] of options.entries()) {
    await page.getByRole("button", { name: "Add option" }).click();
    const n = index + 1;
    await page.getByLabel(`Name (English) for option ${n}`).fill(tier);
    await page.getByLabel(`Price (CAD) for option ${n}`).fill(price);
    await page.getByLabel(`Hours included for option ${n}`).fill(hours);
    await page.getByLabel(`Photographers included for option ${n}`).fill(shooters);
  }
  await page.getByLabel("Inclusions (English) for option 2").fill("Second photographer\nAlbum");
  await page.getByRole("button", { name: "Save package" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toContainText(slug);
  const row = page.getByRole("row", { name: new RegExp(name) });
  // "From" is the cheapest option.
  await expect(row).toContainText("$2,000.00");
  await expect(row).toContainText("Silver · Gold");

  await page.goto(`/en/packages/${slug}`);
  await expect(page.getByText("$2,000.00 CAD").first()).toBeVisible();
  const compare = page.getByRole("region", { name: "Compare options" });
  const gold = compare.getByRole("article", { name: "Gold" });
  await expect(gold).toContainText("$3,000.00 CAD");
  await expect(gold).toContainText("10 hours");
  await expect(gold).toContainText("Album");
  await gold.getByRole("link", { name: "Customize quote" }).click();

  await expect(page).toHaveURL(new RegExp(`/en/quote\\?package=${slug}&tier=gold`));
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await expect(page.getByLabel("Package")).toHaveValue(`${slug}:gold`);
  await page.getByLabel("Event date").fill("2027-06-09");
  // Gold's $3,000 for its 10 hours and 2 photographers, + 13% HST — no extras.
  await expect(page.getByTestId("quote-total")).toHaveText(/^\$3,390\.00/);

  // Removing Silver keeps Gold's key, so quotes made for Gold still find it.
  await page.goto("/admin/packages");
  await page.getByRole("link", { name: `Edit ${name}` }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Remove Silver" }).click();
  await page.getByRole("button", { name: "Save package" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Saved" })).toBeVisible();
  const tiers = await queryDb<{ key: string }>(
    `select t.key from "PackageTier" t join "Package" p on p.id = t."packageId" where p.slug = $1`,
    [slug],
  );
  expect(tiers).toEqual([{ key: "gold" }]);
});
