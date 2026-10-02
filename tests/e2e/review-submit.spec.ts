import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { queryDb } from "./db";

const form = (page: Page) => page.getByRole("region", { name: /Share your experience/ });
/** Clicks a star like a user would (the radio itself is visually hidden). */
const pickStars = async (page: Page, label: string) => {
  const radio = form(page).getByRole("radio", { name: label });
  // `has` is evaluated relative to each label, so it must be built from `page`.
  await form(page)
    .locator("label", { has: page.getByRole("radio", { name: label }) })
    .click();
  await expect(radio).toBeChecked();
};
const nameFor = (testInfo: TestInfo) => `E2E ${testInfo.project.name} ${testInfo.testId}`;

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "Review" where "authorName" = $1`, [nameFor(testInfo)]);
});

test.describe("submit a review", () => {
  test("is saved as pending and not shown publicly", async ({ page }, testInfo) => {
    await page.goto("/en/reviews");
    const section = form(page);
    await pickStars(page, "5 stars");
    await section.getByLabel("Your name").fill(nameFor(testInfo));
    await section.getByLabel("Service (optional)").selectOption("family");
    await section
      .getByLabel("Your review")
      .fill("Lovely family session, relaxed and fun for the kids.");
    await section.getByRole("checkbox", { name: /may publish this review/ }).check();
    await section.getByRole("button", { name: "Submit review" }).click();
    await expect(section.getByRole("status")).toContainText("Thank you!");

    const [row] = await queryDb<{
      status: string;
      rating: number;
      flagged: boolean;
      category: string;
    }>(`select status, rating, flagged, category from "Review" where "authorName" = $1`, [
      nameFor(testInfo),
    ]);
    expect(row).toEqual({ status: "PENDING", rating: 5, flagged: false, category: "FAMILY" });

    // AGENTS.md §15 scenario 5 (first half): not visible until an admin approves it.
    await page.reload();
    await expect(page.getByText("Lovely family session")).toHaveCount(0);
  });

  test("flags likely spam for the moderator", async ({ page }, testInfo) => {
    await page.goto("/en/reviews");
    const section = form(page);
    await pickStars(page, "1 star");
    await section.getByLabel("Your name").fill(nameFor(testInfo));
    await section
      .getByLabel("Your review")
      .fill("Cheap deals at https://spam.example — click now!!!");
    await section.getByRole("checkbox", { name: /may publish this review/ }).check();
    await section.getByRole("button", { name: "Submit review" }).click();
    await expect(section.getByRole("status")).toBeVisible();

    const [row] = await queryDb<{ flagged: boolean; status: string }>(
      `select flagged, status from "Review" where "authorName" = $1`,
      [nameFor(testInfo)],
    );
    expect(row).toEqual({ flagged: true, status: "PENDING" });
  });

  test("validates rating, length and consent", async ({ page }) => {
    await page.goto("/en/reviews");
    const section = form(page);
    await section.getByLabel("Your review").fill("Too short");
    await section.getByRole("button", { name: "Submit review" }).click();
    await expect(section.getByText("Choose a rating from 1 to 5 stars.")).toBeVisible();
    await expect(section.getByText("Please write at least 20 characters.")).toBeVisible();
    await expect(section.getByText("Please confirm to continue.")).toBeVisible();
  });

  test("recommendations need a company and no rating", async ({ page }, testInfo) => {
    await page.goto("/en/reviews");
    const section = form(page);
    await section.getByRole("checkbox", { name: /on behalf of a company/ }).check();
    await expect(section.getByText("Your rating")).toHaveCount(0);
    await section.getByLabel("Your name").fill(nameFor(testInfo));
    await section
      .getByLabel("Your review")
      .fill("Professional, punctual and the photos were superb.");
    await section.getByRole("checkbox", { name: /may publish this review/ }).check();
    await section.getByRole("button", { name: "Submit review" }).click();
    await expect(section.getByText("This field is required.")).toBeVisible();

    await section.getByLabel("Company", { exact: true }).fill("E2E Corp");
    await section.getByRole("button", { name: "Submit review" }).click();
    await expect(section.getByRole("status")).toContainText("Thank you!");
    const [row] = await queryDb<{ type: string; rating: number | null; company: string }>(
      `select type, rating, company from "Review" where "authorName" = $1`,
      [nameFor(testInfo)],
    );
    expect(row).toEqual({ type: "RECOMMENDATION", rating: null, company: "E2E Corp" });
  });
});
