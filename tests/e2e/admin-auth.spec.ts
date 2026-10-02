import { createHash, randomBytes } from "node:crypto";

import { type BrowserContext, expect, test, type TestInfo } from "@playwright/test";

import { queryDb } from "./db";

// Must match AUTH_SECRET in playwright.config.ts (Auth.js hashes magic-link tokens with it).
const AUTH_SECRET = "e2e-auth-secret-not-for-production-use-0000";

const emailFor = (testInfo: TestInfo, label = "admin") =>
  `e2e-${label}-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();

async function createUser(email: string, { role = "ADMIN", isActive = true } = {}) {
  const [user] = await queryDb<{ id: string }>(
    `insert into "User" (id, email, role, "isActive", "updatedAt")
     values (gen_random_uuid()::text, $1, $2::"Role", $3, now())
     -- A crashed earlier run may have left this user behind.
     on conflict (email) do update set role = excluded.role, "isActive" = excluded."isActive"
     returning id`,
    [email, role, isActive],
  );
  return user.id;
}

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
  await queryDb(`delete from "VerificationToken" where identifier = any($1)`, [emails]);
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

  test("only existing users get a sign-in link, without revealing who has access", async ({
    page,
  }, testInfo) => {
    const known = emailFor(testInfo);
    const stranger = emailFor(testInfo, "stranger");
    await createUser(known);

    for (const email of [known, stranger]) {
      await page.goto("/admin/sign-in");
      await page.getByLabel("Email").fill(email);
      await page.getByRole("button", { name: "Email me a sign-in link" }).click();
      await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    }

    const tokens = await queryDb<{ identifier: string }>(
      `select identifier from "VerificationToken" where identifier = any($1)`,
      [[known, stranger]],
    );
    expect(tokens).toEqual([{ identifier: known }]);
  });

  test("the magic link signs in and lands on the requested page", async ({ page }, testInfo) => {
    const email = emailFor(testInfo);
    await createUser(email);
    const token = randomBytes(32).toString("hex");
    await queryDb(
      `insert into "VerificationToken" (identifier, token, expires)
       values ($1, $2, now() + interval '10 minutes')`,
      [email, createHash("sha256").update(`${token}${AUTH_SECRET}`).digest("hex")],
    );

    const params = new URLSearchParams({ token, email, callbackUrl: "/admin" });
    await page.goto(`/api/auth/callback/resend?${params}`);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Links work once.
    await page.context().clearCookies();
    await page.goto(`/api/auth/callback/resend?${params}`);
    await expect(page).toHaveURL(/\/admin\/sign-in/);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toHaveCount(0);
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
