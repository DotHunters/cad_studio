import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

// April 2028 is reserved for this spec; one day per project.
const dayFor = (project: string) => (project === "mobile" ? "2028-04-12" : "2028-04-05");

// Also before: a crashed earlier run can leave this test's audit rows behind.
test.beforeEach(async ({}, testInfo) => {
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
  await deleteAdmin(adminEmailFor(testInfo));
});

test.afterEach(async ({}, testInfo) => {
  await queryDb(`delete from "BlockedDate" where date = $1::date`, [dayFor(testInfo.project.name)]);
  await deleteAdmin(adminEmailFor(testInfo, "staff"));
  await deleteAdmin(adminEmailFor(testInfo));
});

test("admin changes appear in the audit log with who made them", async ({
  browser,
  baseURL,
}, testInfo) => {
  const day = dayFor(testInfo.project.name);
  const reason = `E2E audit ${testInfo.project.name}`;

  // A staff member blocks a day…
  const staffContext = await browser.newContext();
  await signInAsAdmin(staffContext, baseURL!, adminEmailFor(testInfo, "staff"), "STAFF");
  const staff = await staffContext.newPage();
  await staff.goto("/admin/availability");
  await expect(staff.locator('form[data-hydrated="true"]')).toBeVisible();
  await staff.getByLabel("From").fill(day);
  await staff.getByLabel("Reason").fill(reason);
  await staff.getByRole("button", { name: "Block dates" }).click();
  await expect(staff.getByRole("status")).toHaveText("Blocked 1 day.");
  // …but can't read the audit log.
  await staff.goto("/admin/audit");
  await expect(staff).toHaveURL(/\/admin\?error=forbidden$/);
  await staffContext.close();

  // An admin sees the entry.
  const adminContext = await browser.newContext();
  await signInAsAdmin(adminContext, baseURL!, adminEmailFor(testInfo));
  const admin = await adminContext.newPage();
  await admin.goto(`/admin/audit?area=BlockedDate&q=${encodeURIComponent(reason)}`);
  const row = admin.getByRole("row", { name: new RegExp(reason) });
  await expect(row).toContainText(adminEmailFor(testInfo, "staff"));
  await expect(row).toContainText("availability.block");
  await expect(row).toContainText(`Blocked ${day} (${reason})`);
  await adminContext.close();
});
