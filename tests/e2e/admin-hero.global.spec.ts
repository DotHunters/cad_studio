import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";
import { heroSlideCount } from "./photo-counts";

// Runs in the "global" project: choosing hero photos changes the public home page.
test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "SiteSetting" where key = 'HERO_SLIDES'`);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("an admin replaces the home hero photos, reorders them, then goes back to the defaults", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const photos = await queryDb<{ id: string; publicId: string; alt: string }>(
    `select id, "publicId", alt from "Image"
     where "consentToPublish" and "publicId" like 'local/%'
     order by "publicId" limit 2`,
  );
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  await page.goto("/admin/hero");
  await expect(page.getByRole("heading", { name: "Showing the launch photos" })).toBeVisible();

  // Add two photos.
  for (const photo of photos) {
    await page.getByRole("link", { name: "Add photo" }).click();
    await page.locator(`input[name="imageId"][value="${photo.id}"]`).check();
    await page.getByRole("button", { name: "Add to slideshow" }).click();
    await expect(page.getByRole("status")).toHaveText("Photo added. The home page shows it now.");
  }
  await expect(page.getByRole("listitem").filter({ hasText: photos[0].alt })).toBeVisible();

  // The home page shows exactly those two, in order.
  const path = (publicId: string) => encodeURIComponent(publicId.slice("local".length));
  await page.goto("/en");
  await expect(page.getByRole("button", { name: /^Show image \d+ of 2$/ })).toHaveCount(2);
  const images = page.locator("main section").first().locator("img");
  await expect(images.first()).toHaveAttribute("src", new RegExp(path(photos[0].publicId)));

  // Move the second photo first and keep its bottom in frame.
  await page.goto("/admin/hero");
  const saved = async () => {
    const [row] = await queryDb<{ value: Array<{ imageId: string; focus: string }> }>(
      `select value from "SiteSetting" where key = 'HERO_SLIDES'`,
    );
    return row?.value;
  };
  await page.getByRole("button", { name: "Move slide 2 earlier" }).click();
  await expect.poll(async () => (await saved())?.[0].imageId).toBe(photos[1].id);
  await page.reload();
  await page.getByLabel("Keep in frame: slide 1").selectOption("bottom");
  await expect.poll(saved).toEqual([
    { imageId: photos[1].id, focus: "bottom" },
    { imageId: photos[0].id, focus: "center" },
  ]);
  await page.goto("/en");
  await expect(images.first()).toHaveAttribute("src", new RegExp(path(photos[1].publicId)));
  await expect(images.first()).toHaveCSS("object-position", "50% 75%");

  // Removing both goes back to the launch photos.
  await page.goto("/admin/hero");
  for (let i = 0; i < 2; i++) {
    await page.getByRole("button", { name: "Remove slide 1" }).click();
  }
  await expect(page.getByRole("heading", { name: "Showing the launch photos" })).toBeVisible();
  await page.goto("/en");
  await expect(
    page.getByRole("button", { name: new RegExp(`^Show image \\d+ of ${heroSlideCount}$`) }),
  ).toHaveCount(heroSlideCount);
});

test("hero slides are admin-only", async ({ page, context, baseURL }, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "STAFF");
  await page.goto("/admin/hero");
  await expect(page.getByRole("heading", { name: "Hero slides" })).toHaveCount(0);
});
