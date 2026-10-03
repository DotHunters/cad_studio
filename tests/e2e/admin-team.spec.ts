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
  browser,
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
  await expect(add.getByText("Set a temporary password for the new team member.")).toHaveCount(0);

  await add.getByLabel("Name").fill(memberName);
  await add.getByLabel("Email").fill(newEmail.toUpperCase());
  await add.getByLabel("Role").selectOption("STAFF");
  await add.getByRole("button", { name: "Add team member" }).click();
  await expect(add.getByText("Set a temporary password for the new team member.")).toBeVisible();
  await add.getByLabel("Temporary password").fill("short");
  await add.getByRole("button", { name: "Add team member" }).click();
  await expect(add.getByText("Use at least 12 characters.")).toBeVisible();
  await add.getByLabel("Temporary password").fill("temporary password 1");
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
    .getByLabel("Temporary password")
    .fill("temporary password 2");
  await page
    .getByRole("region", { name: "Add a team member" })
    .getByRole("button", { name: "Add team member" })
    .click();
  await expect(page.getByText("Someone on the team already uses this email.")).toBeVisible();

  // The new member signs in with the temporary password and must choose their own.
  const [member] = await queryDb<{ id: string; mustChangePassword: boolean }>(
    `select id, "mustChangePassword" from "User" where email = $1`,
    [newEmail],
  );
  expect(member.mustChangePassword).toBe(true);
  const newcomer = await (await browser.newContext({ baseURL })).newPage();
  await newcomer.goto("/admin/sign-in");
  await newcomer.getByLabel("Email").fill(newEmail);
  await newcomer.getByLabel("Password").fill("temporary password 1");
  await newcomer.getByRole("button", { name: "Sign in" }).click();
  await expect(newcomer.getByRole("heading", { name: "Choose your password" })).toBeVisible();
  await newcomer.context().close();

  // Deactivating signs them out everywhere.
  await queryDb(
    `insert into "Session" ("sessionToken", "userId", expires, "updatedAt")
     values ($1, $2, now() + interval '1 day', now())`,
    [`e2e-team-${testInfo.testId}-${testInfo.project.name}`, member.id],
  );
  await page.getByRole("link", { name: memberName, exact: true }).click();
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

test("admins set a new password for a team member", async ({
  page,
  context,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  const email = adminEmailFor(testInfo, "new-photographer");
  const [member] = await queryDb<{ id: string }>(
    `insert into "User" (id, email, role, "updatedAt") values (gen_random_uuid()::text, $1, 'STAFF', now())
     on conflict (email) do update set "passwordHash" = null returning id`,
    [email],
  );
  await queryDb(
    `insert into "Session" ("sessionToken", "userId", expires, "updatedAt")
     values ($1, $2, now() + interval '1 day', now())`,
    [`e2e-reset-${testInfo.testId}-${testInfo.project.name}`, member.id],
  );

  await page.goto(`/admin/team/${member.id}`);
  await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
  await page.getByLabel("New password").fill("a brand new password");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toHaveText(`Saved ${email}.`);

  const [after] = await queryDb<{ passwordHash: string; mustChangePassword: boolean }>(
    `select "passwordHash", "mustChangePassword" from "User" where id = $1`,
    [member.id],
  );
  expect(after.passwordHash).toMatch(/^scrypt\$/);
  expect(after.passwordHash).not.toContain("a brand new password");
  expect(after.mustChangePassword).toBe(true);
  // Their old sessions end.
  expect(await queryDb(`select 1 from "Session" where "userId" = $1`, [member.id])).toHaveLength(0);
  const [entry] = await queryDb<{ summary: string }>(
    `select summary from "AuditLog" where "entityId" = $1 order by "createdAt" desc limit 1`,
    [member.id],
  );
  expect(entry.summary).toBe(`${email}: new password set`);
});

test("team rows: disable, enable and reset a password from the list", async ({
  page,
  context,
  browser,
  baseURL,
}, testInfo) => {
  await signInAsAdmin(context, baseURL!, adminEmailFor(testInfo));
  const email = adminEmailFor(testInfo, "new-photographer");
  const [member] = await queryDb<{ id: string }>(
    `insert into "User" (id, email, role, "updatedAt") values (gen_random_uuid()::text, $1, 'STAFF', now())
     on conflict (email) do update set "isActive" = true returning id`,
    [email],
  );
  await queryDb(
    `insert into "Session" ("sessionToken", "userId", expires, "updatedAt")
     values ($1, $2, now() + interval '1 day', now())`,
    [`e2e-row-${testInfo.testId}-${testInfo.project.name}`, member.id],
  );

  await page.goto("/admin/team");
  const row = page.getByRole("row", { name: new RegExp(email.replace(/[.+]/g, "\\$&")) });
  const access = row.getByRole("switch", { name: `Can sign in: ${email}` });
  await expect(access).toHaveAttribute("aria-checked", "true");
  await access.click();
  await expect(access).toHaveAttribute("aria-checked", "false");
  await expect
    .poll(
      async () =>
        (
          await queryDb<{ isActive: boolean }>(`select "isActive" from "User" where id = $1`, [
            member.id,
          ])
        )[0].isActive,
    )
    .toBe(false);
  expect(await queryDb(`select 1 from "Session" where "userId" = $1`, [member.id])).toHaveLength(0);
  await access.click();
  await expect(access).toHaveAttribute("aria-checked", "true");

  await row.getByRole("button", { name: `Reset password for ${email}` }).click();
  await row.getByRole("button", { name: "Yes, reset" }).click();
  const shown = row.getByRole("status");
  await expect(shown).toContainText("Temporary password");
  const password = (await shown.locator("code").textContent())!.trim();
  expect(password).toMatch(/^[\w]{4}(-[\w]{4}){3}$/);

  // The temporary password works once, then must be replaced.
  const newcomer = await (await browser.newContext({ baseURL })).newPage();
  await newcomer.goto("/admin/sign-in");
  await newcomer.getByLabel("Email").fill(email);
  await newcomer.getByLabel("Password").fill(password);
  await newcomer.getByRole("button", { name: "Sign in" }).click();
  await expect(newcomer.getByRole("heading", { name: "Choose your password" })).toBeVisible();
  await newcomer.context().close();

  // Your own row and the super admin have no switch.
  await expect(
    page.getByRole("row", { name: /\(you\)/ }).getByRole("link", { name: "Change my password" }),
  ).toBeVisible();
});
