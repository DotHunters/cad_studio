import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// Approving a review changes the public average and counts that other specs assert, so this
// runs in the "global" project after all other specs, and rejects the review again at the end.
const nameFor = (testInfo: TestInfo) => `E2E Moderation ${testInfo.testId.slice(-6)}`;
const BODY = "Arrived late and rushed the family photos, sadly not what we hoped for.";

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Review" where "authorName" = $1`, [nameFor(testInfo)]);
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

const summary = (page: Page) => page.getByTestId("reviews-summary");

async function ratingJsonLd(page: Page) {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks
    .map((text) => JSON.parse(text) as { aggregateRating?: Record<string, unknown> })
    .find((block) => block.aggregateRating)?.aggregateRating;
}

// AGENTS.md §15 scenario 5.
test("a submitted review is hidden until approved, then counts toward the average", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const name = nameFor(testInfo);

  // 1. Submit (samples are 5, 5 and 4 stars → 4.7 from 3 reviews).
  await page.goto("/en/reviews");
  await expect(summary(page)).toContainText("4.7 out of 5 from 3 reviews");
  const form = page.getByRole("region", { name: /Share your experience/ });
  await form.locator("label", { has: page.getByRole("radio", { name: "1 star" }) }).click();
  await form.getByLabel("Your name").fill(name);
  await form.getByLabel("Your review").fill(BODY);
  await form.getByRole("checkbox", { name: /may publish this review/ }).check();
  await form.getByRole("button", { name: "Submit review" }).click();
  await expect(form.getByRole("status")).toContainText("Thank you!");

  // 2. Not public yet.
  await page.reload();
  await expect(page.getByText(BODY)).toHaveCount(0);
  await expect(summary(page)).toContainText("4.7 out of 5 from 3 reviews");
  expect(await ratingJsonLd(page)).toBeUndefined();

  // 3. Staff approve it.
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await page.goto("/admin/reviews");
  const card = page.getByRole("article", { name: `Review by ${name}` });
  await expect(card).toContainText(BODY);
  await card.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("status")).toHaveText("Approved — it's now on the website.");

  // 4. Public, with the new average (15 / 4 = 3.75 → 3.8) and structured data.
  await page.goto("/en/reviews");
  await expect(page.getByText(BODY)).toBeVisible();
  await expect(summary(page)).toContainText("3.8 out of 5 from 4 reviews");
  // Search engines only see real reviews, never the samples.
  expect(await ratingJsonLd(page)).toMatchObject({ ratingValue: 1, reviewCount: 1 });

  // 5. Featuring needs approval; reject takes it down again.
  await page.goto("/admin/reviews?status=APPROVED");
  await card.getByRole("button", { name: "Feature" }).click();
  await expect(page.getByRole("status")).toHaveText("Featured on the home page.");
  await page
    .getByRole("article", { name: `Review by ${name}` })
    .getByRole("button", { name: "Reject" })
    .click();
  await expect(page.getByRole("status")).toHaveText("Rejected — it won't be shown.");
  const [row] = await queryDb<{ status: string; featured: boolean }>(
    `select status, featured from "Review" where "authorName" = $1`,
    [name],
  );
  expect(row).toEqual({ status: "REJECTED", featured: false });

  await page.goto("/en/reviews");
  await expect(page.getByText(BODY)).toHaveCount(0);
  await expect(summary(page)).toContainText("4.7 out of 5 from 3 reviews");
});
