import { randomBytes } from "node:crypto";

import { type BrowserContext, expect, type Page, test, type TestInfo } from "@playwright/test";

import { hashPassword } from "../../src/lib/auth/password";
import { queryDb } from "./db";

// Must match SUPER_ADMIN_* in playwright.config.ts.
const SUPER_ADMIN = { email: "e2e-super-admin@example.com", password: "e2e super admin password" };
const PASSWORD = "a long test password";

const emailFor = (testInfo: TestInfo, label = "admin") =>
  `e2e-${label}-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();

async function createUser(
  email: string,
  { role = "ADMIN", isActive = true, password = PASSWORD, mustChangePassword = false } = {},
) {
  const [user] = await queryDb<{ id: string }>(
    `insert into "User" (id, email, role, "isActive", "passwordHash", "mustChangePassword", "updatedAt")
     values (gen_random_uuid()::text, $1, $2::"Role", $3, $4, $5, now())
     -- A crashed earlier run may have left this user behind.
     on conflict (email) do update set role = excluded.role, "isActive" = excluded."isActive",
       "passwordHash" = excluded."passwordHash", "mustChangePassword" = excluded."mustChangePassword"
     returning id`,
    [email, role, isActive, await hashPassword(password), mustChangePassword],
  );
  return user.id;
}

async function signInWithForm(page: Page, email: string, password: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

const CREDENTIALS_ERROR = "That email and password don't match an active account.";

/** Signs in by creating a database session directly, like Auth.js does after the link. */
async function signInAs(context: BrowserContext, baseURL: string, userId: string) {
  const token = randomBytes(32).toString("hex");
  await queryDb(
    `insert into "Session" ("sessionToken", "userId", expires, "updatedAt")
     values ($1, $2, now() + interval '1 day', now())`,
    [token, userId],
  );
  await context.addCookies([
    { name: "authjs.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" },
  ]);
  return token;
}

test.afterEach(async ({}, testInfo) => {
  const emails = [emailFor(testInfo), emailFor(testInfo, "stranger")];
  await queryDb(`delete from "User" where email = any($1)`, [emails]);
});

test.describe("admin sign-in", () => {
  // AGENTS.md §15 scenario 7.
  test("admin routes redirect unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in\?callbackUrl=%2Fadmin$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.goto("/admin/bookings?status=PENDING");
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fbookings%3Fstatus%3DPENDING/);
  });

  test("a forged session cookie doesn't get in", async ({ page, context, baseURL }) => {
    await context.addCookies([
      { name: "authjs.session-token", value: "forged", url: baseURL!, sameSite: "Lax" },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });

  test("admin pages are not indexed", async ({ page }) => {
    await page.goto("/admin/sign-in");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("the super admin from .env signs in and lands on the requested page", async ({ page }) => {
    await page.goto("/admin/bookings");
    await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fbookings/);
    await signInWithForm(page, SUPER_ADMIN.email.toUpperCase(), SUPER_ADMIN.password);
    await expect(page).toHaveURL(/\/admin\/bookings$/);
    await expect(page.getByTestId("admin-user")).toContainText(
      `${SUPER_ADMIN.email} · Super admin`,
    );

    // Listed on the team page, but nobody can edit it there.
    await page.goto("/admin/team");
    const row = page.getByRole("row", { name: /e2e-super-admin@example\.com/ });
    await expect(row).toContainText("Super admin");
    await expect(row.getByRole("link")).toHaveCount(0);
  });

  test("a wrong password, an unknown email and a deactivated account get the same answer", async ({
    page,
  }, testInfo) => {
    const known = emailFor(testInfo);
    const stranger = emailFor(testInfo, "stranger");
    await createUser(known);
    await createUser(stranger, { isActive: false });

    for (const [email, password] of [
      [known, "the wrong password"],
      [`nobody-${testInfo.testId}@example.com`, PASSWORD],
      [stranger, PASSWORD],
      [SUPER_ADMIN.email, PASSWORD],
    ]) {
      await page.goto("/admin/sign-in?callbackUrl=%2Fadmin%2Fquotes");
      await signInWithForm(page, email, password);
      await expect(page.locator("#sign-in-error")).toContainText(CREDENTIALS_ERROR);
      await expect(page).toHaveURL(/callbackUrl=%2Fadmin%2Fquotes/);
    }

    await signInWithForm(page, known, PASSWORD);
    await expect(page).toHaveURL(/\/admin\/quotes$/);
  });

  test("a temporary password must be replaced before anything else", async ({ page }, testInfo) => {
    const email = emailFor(testInfo);
    await createUser(email, { role: "STAFF", mustChangePassword: true });

    await page.goto("/admin/sign-in");
    await signInWithForm(page, email, PASSWORD);
    await expect(page).toHaveURL(/\/admin\/account\/password/);
    await expect(page.getByRole("heading", { name: "Choose your password" })).toBeVisible();
    await page.goto("/admin/bookings");
    await expect(page).toHaveURL(/\/admin\/account\/password/);

    await expect(page.locator('form[data-hydrated="true"]')).toBeVisible();
    await page.getByLabel("Current password").fill(PASSWORD);
    await page.getByLabel("New password", { exact: true }).fill("my own new password");
    await page.getByLabel("Confirm new password").fill("my own new pasword");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("The passwords don't match.")).toBeVisible();

    await page.getByLabel("Confirm new password").fill("my own new password");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // The new password works; the temporary one doesn't.
    await page.getByRole("button", { name: "Sign out" }).click();
    await signInWithForm(page, email, PASSWORD);
    await expect(page.locator("#sign-in-error")).toContainText(CREDENTIALS_ERROR);
    await signInWithForm(page, email, "my own new password");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("signed-in staff see the dashboard and can sign out", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const email = emailFor(testInfo);
    const token = await signInAs(context, baseURL!, await createUser(email, { role: "STAFF" }));

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByTestId("admin-user")).toContainText(`${email} · Staff`);

    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    const sessions = await queryDb(`select 1 from "Session" where "sessionToken" = $1`, [token]);
    expect(sessions).toHaveLength(0);
  });

  test("deactivated users lose access immediately", async ({
    page,
    context,
    baseURL,
  }, testInfo) => {
    const userId = await createUser(emailFor(testInfo));
    await signInAs(context, baseURL!, userId);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await queryDb(`update "User" set "isActive" = false where id = $1`, [userId]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/sign-in/);
  });
});
