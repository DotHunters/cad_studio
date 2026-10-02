import { expect, type APIRequestContext, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { createPendingBooking, deleteBookingFixture } from "./booking-fixture";
import { queryDb } from "./db";

// March 2028 is reserved for this spec; one week per project.
const daysFor = (testInfo: TestInfo) =>
  testInfo.project.name === "mobile"
    ? ["2028-03-13", "2028-03-14", "2028-03-15"]
    : ["2028-03-06", "2028-03-07", "2028-03-08"];
const referenceFor = (testInfo: TestInfo) =>
  `CAD-B-9990-${testInfo.project.name === "mobile" ? 1 : 0}001`;

test.afterEach(async ({}, testInfo) => {
  const days = daysFor(testInfo);
  await queryDb(`delete from "BlockedDate" where date between $1::date and $2::date`, [
    days[0],
    days[2],
  ]);
  await deleteBookingFixture(testInfo, referenceFor(testInfo));
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

async function publicStatus(request: APIRequestContext, day: string) {
  const response = await request.get("/api/availability?month=2028-03");
  const body = (await response.json()) as { days: Array<{ date: string; status: string }> };
  return body.days.find((entry) => entry.date === day)?.status;
}

test("staff block a range of days, see clashing bookings and unblock", async ({
  page,
  context,
  baseURL,
  request,
}, testInfo) => {
  const [first, middle, last] = daysFor(testInfo);
  const reason = `E2E vacation ${testInfo.project.name}`;
  const reference = referenceFor(testInfo);
  // An existing booking on the middle day (13:00 Toronto time).
  await createPendingBooking(testInfo, reference);
  await queryDb(
    `update "Booking" set "startAt" = $2::timestamp + interval '18 hours',
       "endAt" = $2::timestamp + interval '20 hours' where reference = $1`,
    [reference, middle],
  );
  expect(await publicStatus(request, first)).toBe("available");

  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await page.goto("/admin/availability");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  await page.getByLabel("From").fill(middle);
  await page.getByLabel("To").fill(first);
  await page.getByRole("button", { name: "Block dates" }).click();
  await expect(page.getByText("Must be on or after the start.")).toBeVisible();

  await page.getByLabel("From").fill(first);
  await page.getByLabel("To").fill(last);
  await page.getByLabel("Reason").fill(reason);
  await page.getByRole("button", { name: "Block dates" }).click();
  await expect(page.getByRole("status")).toHaveText("Blocked 3 days.");

  const list = page.getByRole("region", { name: "Upcoming blocked days" });
  await expect(list.getByRole("listitem").filter({ hasText: reason })).toHaveCount(3);
  await expect(list.getByRole("link", { name: reference })).toBeVisible();
  expect(await publicStatus(request, first)).toBe("full");

  // Blocking the same days again only reports them.
  await page.getByLabel("From").fill(first);
  await page.getByRole("button", { name: "Block dates" }).click();
  await expect(page.getByRole("status")).toHaveText("Blocked 0 days (1 already blocked).");

  const firstLabel = new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${first}T00:00:00Z`));
  await list.getByRole("button", { name: `Unblock ${firstLabel}` }).click();
  await expect(list.getByRole("listitem").filter({ hasText: reason })).toHaveCount(2);
  expect(await publicStatus(request, first)).toBe("available");
});
