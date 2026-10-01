import { expect, test, type TestInfo } from "@playwright/test";

import { queryDb } from "./db";

// Tests in a project share one blocked date: run them one after another.
test.describe.configure({ mode: "serial" });

/** A date key N days after today in the studio's time zone. */
function studioDatePlus(days: number) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Toronto" }).format(
    new Date(),
  );
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

// Each project blocks its own day so parallel runs don't collide on the unique date.
const blockedFor = (testInfo: TestInfo) =>
  studioDatePlus(testInfo.project.name === "mobile" ? 11 : 10);

test.beforeEach(async ({}, testInfo) => {
  const date = blockedFor(testInfo);
  await queryDb(`delete from "BlockedDate" where date = $1::date`, [date]);
  await queryDb(
    `insert into "BlockedDate" (id, date, reason) values (gen_random_uuid()::text, $1::date, 'e2e')`,
    [date],
  );
});

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "BlockedDate" where date = $1::date`, [blockedFor(testInfo)]);
});

// AGENTS.md §15 scenario 4.
test("a blocked date can't be selected in the booking calendar", async ({ page }, testInfo) => {
  const date = blockedFor(testInfo);
  await page.goto("/en/book?package=family-event");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Checking availability…")).toHaveCount(0);

  // The blocked day may fall in next month.
  const cell = page.locator(`[data-day="${date}"]`);
  if ((await cell.count()) === 0 || (await cell.getAttribute("class"))?.includes("rdp-outside")) {
    await page.getByRole("button", { name: "Go to the Next Month" }).click();
    await expect(page.getByText("Checking availability…")).toHaveCount(0);
  }
  const day = page.locator(`[data-day="${date}"]:not(.rdp-outside) button`);
  await expect(day).toBeDisabled();
  await expect(page.locator(`[data-day="${date}"]:not(.rdp-outside)`)).toHaveClass(/rdp-disabled/);

  // Clicking does nothing: no date gets selected.
  await day.click({ force: true });
  await expect(page.getByText("No date selected yet.")).toBeVisible();
});

test("the public availability shows the blocked date as full", async ({ request }, testInfo) => {
  const date = blockedFor(testInfo);
  const body = (await (
    await request.get(`/api/availability?month=${date.slice(0, 7)}`)
  ).json()) as {
    days: Array<{ date: string; status: string }>;
  };
  expect(body.days.find((day) => day.date === date)?.status).toBe("full");
});
