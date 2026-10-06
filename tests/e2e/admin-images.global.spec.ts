import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Runs in the "global" project (after other specs): its published project changes the public
// portfolio counts. Own project and images (never in the gallery) so gallery counts stay intact. Data is
// written with SQL, which doesn't revalidate the page cache — and that cache survives between
// runs — so slugs are unique per run.
const RUN = Date.now().toString(36);
const slugFor = (testInfo: TestInfo) =>
  `e2e-images-${RUN}-${testInfo.project.name}-${testInfo.testId}`.toLowerCase().slice(0, 80);
/** This test's rows from any run — a crashed run leaves rows a later run must still remove. */
const anyRunPattern = (testInfo: TestInfo) =>
  // The whole test id: its first half identifies the file, shared by every test in it.
  `e2e-images-%-${testInfo.project.name}-${testInfo.testId}%`.toLowerCase();

async function removeFixtures(testInfo: TestInfo) {
  await queryDb(`delete from "Image" where "publicId" like $1`, [
    `placeholder/${anyRunPattern(testInfo)}`,
  ]);
  await queryDb(`delete from "PortfolioProject" where slug like $1`, [anyRunPattern(testInfo)]);
}
const altFor = (testInfo: TestInfo, label: string) =>
  `E2E ${label} photo ${testInfo.project.name} ${testInfo.testId.slice(-6)}`;

async function createFixtures(testInfo: TestInfo) {
  await removeFixtures(testInfo);
  const slug = slugFor(testInfo);
  const [project] = await queryDb<{ id: string }>(
    `insert into "PortfolioProject" (id, slug, title, category, reach, country, year, story,
       "publishedAt")
     values (gen_random_uuid()::text, $1, $2, 'corporate', 'LOCAL', 'Canada', 2026,
       'Created by an e2e test.', now())
     returning id`,
    [slug, `E2E Images ${testInfo.project.name}`],
  );
  const insertImage = async (label: string, consent: boolean, projectId: string | null) => {
    const [image] = await queryDb<{ id: string }>(
      `insert into "Image" (id, "publicId", width, height, alt, "inGallery", "sortOrder",
         "consentToPublish", "projectId")
       values (gen_random_uuid()::text, $1, 1600, 1067, $2, false, 1, $3, $4) returning id`,
      [`placeholder/${slug}-${label}`, altFor(testInfo, label), consent, projectId],
    );
    return image.id;
  };
  return {
    slug,
    projectId: project.id,
    approvedId: await insertImage("approved", true, project.id),
    unapprovedId: await insertImage("unapproved", false, project.id),
    newId: await insertImage("new", false, null),
  };
}

test.afterEach(async ({}, testInfo) => {
  await removeFixtures(testInfo);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("only consented images appear on a case study", async ({ page }, testInfo) => {
  const { slug } = await createFixtures(testInfo);
  await page.goto(`/en/portfolio/${slug}`);
  await expect(page.getByRole("img", { name: altFor(testInfo, "approved") })).toBeVisible();
  await expect(page.getByRole("img", { name: altFor(testInfo, "unapproved") })).toHaveCount(0);
});

test("admins describe, approve and file an image as a project cover", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const { slug, projectId, newId } = await createFixtures(testInfo);
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  await page.goto("/admin/gallery");
  await expect(page.getByText(/hidden until consent is confirmed/)).toBeVisible();
  await page.getByRole("link", { name: altFor(testInfo, "new") }).click();
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  // Can't publish without consent.
  await page.getByLabel("Project", { exact: true }).selectOption(projectId);
  await page.getByLabel("Use as the project's cover image").check();
  await page.getByRole("button", { name: "Save image" }).click();
  await expect(page.getByText(/Confirm the client agreed/)).toBeVisible();

  const alt = `${altFor(testInfo, "new")} described`;
  await page.getByLabel("Alt text (English)").fill(alt);
  await page.getByLabel("Tags").fill("Stage, keynote , stage");
  await page.getByLabel("Client consent to publish obtained").check();
  await page.getByRole("button", { name: "Save image" }).click();
  await expect(page.getByRole("status")).toHaveText("Image saved.");

  const [image] = await queryDb<{ tags: string[]; consent: boolean; cover: string | null }>(
    `select i.tags, i."consentToPublish" as consent, p."coverId" as cover
     from "Image" i join "PortfolioProject" p on p.id = i."projectId" where i.id = $1`,
    [newId],
  );
  expect(image).toEqual({ tags: ["stage", "keynote"], consent: true, cover: newId });

  await page.goto(`/en/portfolio/${slug}`);
  await expect(page.getByRole("img", { name: alt }).first()).toBeVisible();
});
