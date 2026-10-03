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
  await expect(row.getByRole("switch", { name: `Published: ${title}` })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // No consent → "Private client" on the website.
  await page.goto(`/en/portfolio/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
  await expect(page.getByText("Private client").first()).toBeVisible();
  await expect(page.getByText("Lakeshore Test Co.")).toHaveCount(0);

  // With consent the name appears.
  await page.goto("/admin/portfolio");
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Client agreed to be named publicly").check();
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.goto(`/en/portfolio/${slug}`);
  await expect(page.getByText("Lakeshore Test Co.").first()).toBeVisible();

  // Unpublished → gone from the website.
  await page.goto("/admin/portfolio");
  await page.getByRole("link", { name: title, exact: true }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Published (shown on the website)").uncheck();
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(page.getByRole("switch", { name: `Published: ${title}` })).toHaveAttribute(
    "aria-checked",
    "false",
  );
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

test("project rows: publish, feature and delete from the list", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const slug = `e2e-row-${testInfo.testId}`.toLowerCase().slice(0, 60);
  const title = `E2E Row project ${testInfo.project.name}`;
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await queryDb(`delete from "PortfolioProject" where slug = $1`, [slug]);
  const [project] = await queryDb<{ id: string }>(
    `insert into "PortfolioProject" (id, slug, title, category, reach, country, story)
     values (gen_random_uuid()::text, $1, $2, 'FAMILY', 'LOCAL', 'Canada', 'A row test.')
     returning id`,
    [slug, title],
  );
  const state = async () =>
    (
      await queryDb<{ published: boolean; featured: boolean }>(
        `select "publishedAt" is not null as published, featured from "PortfolioProject" where id = $1`,
        [project.id],
      )
    )[0];

  try {
    expect((await page.goto(`/en/portfolio/${slug}`))?.status()).toBe(404);
    await page.goto("/admin/portfolio");
    const row = page.getByRole("row", { name: new RegExp(title) });
    await row.getByRole("switch", { name: `Published: ${title}` }).click();
    await expect.poll(async () => (await state()).published).toBe(true);
    await row.getByRole("switch", { name: `Featured on the home page: ${title}` }).click();
    await expect.poll(async () => (await state()).featured).toBe(true);

    // The refreshed list shows both, and the case study is live.
    await page.reload();
    await expect(row.getByRole("switch", { name: `Published: ${title}` })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await expect(
      row.getByRole("switch", { name: `Featured on the home page: ${title}` }),
    ).toHaveAttribute("aria-checked", "true");
    expect((await page.goto(`/en/portfolio/${slug}`))?.status()).toBe(200);

    await page.goto("/admin/portfolio");
    await row.getByRole("button", { name: `Delete ${title}` }).click();
    await row.getByRole("button", { name: "Yes, delete" }).click();
    await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
    expect(
      await queryDb(`select 1 from "PortfolioProject" where id = $1`, [project.id]),
    ).toHaveLength(0);
  } finally {
    await queryDb(`delete from "PortfolioProject" where slug = $1`, [slug]);
  }
});

test("a project page lists its photos and offers upload once storage is set up", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  const [project] = await queryDb<{ id: string; title: string; images: number }>(
    `select p.id, p.title, count(i.id)::int as images from "PortfolioProject" p
     join "Image" i on i."projectId" = p.id group by p.id order by p.slug limit 1`,
  );
  await page.goto(`/admin/portfolio/${project.id}`);
  const photos = page.getByRole("region", { name: `Photos (${project.images})` });
  await expect(photos.getByRole("link", { name: /^Edit photo: / })).toHaveCount(project.images);
  // The e2e server has no BLOB_READ_WRITE_TOKEN: the page explains what's missing.
  await expect(photos).toContainText("Photo upload isn't set up yet.");
  // And the upload endpoint refuses to start without it.
  const response = await page.request.post("/api/admin/uploads", { data: {} });
  expect(response.status()).toBe(503);
});
