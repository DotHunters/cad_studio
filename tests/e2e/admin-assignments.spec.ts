import { expect, test, type TestInfo } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { createPendingBooking, deleteBookingFixture } from "./booking-fixture";
import { queryDb } from "./db";

// Year 9992 (see booking-fixture.ts); two bookings on the same day per project.
const refs = (testInfo: TestInfo) => {
  const p = testInfo.project.name === "mobile" ? 1 : 0;
  return { main: `CAD-B-9992-${p}001`, other: `CAD-B-9992-${p}002` };
};
const photographer = (testInfo: TestInfo, who: string) => ({
  name: `${who} ${testInfo.project.name}`,
  email: adminEmailFor(testInfo, `ph-${who.toLowerCase()}`),
});

test.afterEach(async ({}, testInfo) => {
  const { main, other } = refs(testInfo);
  await deleteBookingFixture(testInfo, main);
  await deleteBookingFixture(testInfo, other, "other");
  for (const who of ["Avery", "Blake"]) await deleteAdmin(photographer(testInfo, who).email);
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
});

test("staff assign photographers and see same-day clashes", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const { main, other } = refs(testInfo);
  await createPendingBooking(testInfo, main);
  await createPendingBooking(testInfo, other, { label: "other" });
  const ids: Record<string, string> = {};
  for (const who of ["Avery", "Blake"]) {
    const { name, email } = photographer(testInfo, who);
    const [user] = await queryDb<{ id: string }>(
      `insert into "User" (id, name, email, role, "updatedAt")
       values (gen_random_uuid()::text, $1, $2, 'STAFF', now())
       on conflict (email) do update set name = excluded.name, "isActive" = true
       returning id`,
      [name, email],
    );
    ids[who] = user.id;
  }
  // Avery already covers the other booking that day.
  await queryDb(
    `insert into "_BookingAssignees" ("A", "B") select id, $2 from "Booking" where reference = $1`,
    [other, ids.Avery],
  );

  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  await page.goto(`/admin/bookings/${main}`);
  const section = page.getByRole("region", { name: "Photographers" });
  await expect(section).toContainText("0 of 1 assigned · 1 more photographer needed");
  const avery = photographer(testInfo, "Avery").name;
  const blake = photographer(testInfo, "Blake").name;
  await expect(section.getByText(`Also on ${other} that day`)).toBeVisible();

  await section.getByRole("checkbox", { name: new RegExp(avery) }).check();
  await section.getByRole("checkbox", { name: new RegExp(blake) }).check();
  await section.getByRole("button", { name: "Save photographers" }).click();
  await expect(section).toContainText("2 of 1 assigned · 1 more than the 1 booked");
  await expect(section.getByRole("checkbox", { name: new RegExp(avery) })).toBeChecked();

  const assigned = await queryDb<{ name: string }>(
    `select u.name from "_BookingAssignees" a join "Booking" b on b.id = a."A"
     join "User" u on u.id = a."B" where b.reference = $1 order by u.name`,
    [main],
  );
  expect(assigned.map((row) => row.name)).toEqual([avery, blake]);

  // Deactivated people can't be assigned (and drop off when the list is saved again).
  await queryDb(`update "User" set "isActive" = false where id = $1`, [ids.Blake]);
  await page.reload();
  await expect(section.getByRole("checkbox", { name: new RegExp(blake) })).toHaveCount(0);
  await section.getByRole("button", { name: "Save photographers" }).click();
  await expect(section).toContainText("1 of 1 assigned");

  await page.goto(`/admin/bookings?q=${main}`);
  await expect(page.getByRole("row", { name: new RegExp(main) })).toContainText(avery);
});
