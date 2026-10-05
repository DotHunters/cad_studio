import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Runs in the "global" project: choosing a tile photo changes the public home page.
test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "SiteSetting" where key = 'SERVICE_TILE_IMAGES'`);
  await deleteAdmin(adminEmailFor(testInfo));
});

test("an admin chooses the photo on a home-page service tile, then resets it", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  // A consented launch photo from another category: Corporate has none of its own.
  const [photo] = await queryDb<{ id: string; publicId: string }>(
    `select id, "publicId" from "Image"
     where "consentToPublish" and "publicId" like 'local/%' and category <> 'CORPORATE'
     order by "publicId" limit 1`,
  );
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));

  await page.goto("/admin/service-tiles");
  await expect(page.getByRole("link", { name: /^Change photo: / })).toHaveCount(6);
  await page.getByRole("link", { name: "Change photo: Corporate Events" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Corporate Events tile");
  await expect(page.getByRole("radio")).not.toHaveCount(0);
  await page.locator(`input[name="imageId"][value="${photo.id}"]`).check();
  await page.getByRole("button", { name: "Use this photo" }).click();

  await expect(page.getByRole("status")).toHaveText(
    "Corporate Events tile saved. The home page shows it now.",
  );
  const corporate = page.getByRole("listitem").filter({ hasText: "Corporate Events" });
  await expect(corporate).toContainText("Chosen photo");

  // The home page shows it straight away (cache tag revalidated).
  const path = photo.publicId.slice("local".length);
  await page.goto("/en");
  const tile = page.getByRole("link", { name: /Corporate Events/ }).locator("img");
  await expect(tile).toHaveAttribute("src", new RegExp(encodeURIComponent(path)));

  // Back to the default: the tile has no launch photo of its own.
  await page.goto("/admin/service-tiles/corporate");
  await page.locator('input[name="imageId"][value=""]').check();
  await page.getByRole("button", { name: "Use this photo" }).click();
  await expect(corporate).toContainText("Default: first launch photo");
  await page.goto("/en");
  await expect(tile).not.toHaveAttribute("src", new RegExp(encodeURIComponent(path)));
});

test("tile choices are admin-only and unknown categories 404", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "STAFF");
  await page.goto("/admin/service-tiles");
  await expect(page.getByRole("heading", { name: "Service tiles" })).toHaveCount(0);

  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "ADMIN");
  const response = await page.goto("/admin/service-tiles/parties");
  expect(response?.status()).toBe(404);
});
