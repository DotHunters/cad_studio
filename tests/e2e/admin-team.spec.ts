import { expect, test } from "@playwright/test";

import { adminEmailFor, deleteAdmin, signInAsAdmin } from "./admin-session";
import { queryDb } from "./db";

test.afterEach(async ({}, testInfo) => {
  await deleteAdmin(adminEmailFor(testInfo));
  await deleteAdmin(adminEmailFor(testInfo, "new-photographer"));
});

test("admins add, edit and deactivate team members", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const newEmail = adminEmailFor(testInfo, "new-photographer");
  const memberName = `Jordan Lee ${testInfo.project.name}`;
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto("/admin/team");
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();

  const add = page.getByRole("region", { name: "Add a team member" });
  await add.getByLabel("Email").fill("not-an-email");
  await add.getByRole("button", { name: "Add team member" }).click();
  await expect(add.getByText("Enter a valid email address.")).toBeVisible();
  await expect(add.getByText("Choose a role.")).toBeVisible();

  await add.getByLabel("Name").fill(memberName);
  await add.getByLabel("Email").fill(newEmail.toUpperCase());
  await add.getByLabel("Role").selectOption("STAFF");
  await add.getByRole("button", { name: "Add team member" }).click();
  await expect(page.getByRole("status")).toHaveText(`Saved ${newEmail}.`);
  const row = page.getByRole("row", { name: new RegExp(memberName) });
  await expect(row).toContainText("Staff");
  await expect(row).toContainText("Active");

  // Adding the same email again is refused.
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByRole("region", { name: "Add a team member" }).getByLabel("Email").fill(newEmail);
  await page
    .getByRole("region", { name: "Add a team member" })
    .getByLabel("Role")
    .selectOption("STAFF");
  await page
    .getByRole("region", { name: "Add a team member" })
    .getByRole("button", { name: "Add team member" })
    .click();
  await expect(page.getByText("Someone on the team already uses this email.")).toBeVisible();

  // Deactivating signs them out everywhere.
  const [member] = await queryDb<{ id: string }>(`select id from "User" where email = $1`, [
    newEmail,
  ]);
  await queryDb(
    `insert into "Session" ("sessionToken", "userId", expires, "updatedAt")
     values ($1, $2, now() + interval '1 day', now())`,
    [`e2e-team-${testInfo.testId}-${testInfo.project.name}`, member.id],
  );
  await page.getByRole("link", { name: memberName }).click();
  // The list page also has a hydrated form with an "Active" box — wait for the edit page.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(memberName);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Active (can sign in)").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("row", { name: new RegExp(memberName) })).toContainText(
    "Deactivated",
  );
  const sessions = await queryDb(`select 1 from "Session" where "userId" = $1`, [member.id]);
  expect(sessions).toHaveLength(0);
});

test("admins can't demote or deactivate themselves", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  const { userId } = await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  await page.goto(`/admin/team/${userId}`);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("Role").selectOption("STAFF");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("You can't change your own role.")).toBeVisible();

  await page.getByLabel("Role").selectOption("ADMIN");
  await page.getByLabel("Active (can sign in)").uncheck();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("You can't deactivate your own account.")).toBeVisible();
});

test("staff can't open the team page", async ({ page, context, baseURL }, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo), "STAFF");
  await page.goto("/admin/team");
  await expect(page).toHaveURL(/\/admin\?error=forbidden$/);
});
