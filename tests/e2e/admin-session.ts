import { randomBytes } from "node:crypto";

import type { BrowserContext, TestInfo } from "@playwright/test";

import { queryDb } from "./db";

/** Per-test admin email, so parallel workers never share a user. */
export const adminEmailFor = (testInfo: TestInfo, label = "admin") =>
  `e2e-${label}-${testInfo.project.name}-${testInfo.testId}@example.com`.toLowerCase();

/**
 * Creates a user with a database session and sets the Auth.js cookie — the same state the
 * magic link leaves behind (the link itself is covered in admin-auth.spec.ts).
 */
export async function signInAsAdmin(
  context: BrowserContext,
  baseURL: string,
  email: string,
  role: "ADMIN" | "STAFF" = "ADMIN",
) {
  const [user] = await queryDb<{ id: string }>(
    `insert into "User" (id, email, role, "updatedAt")
     values (gen_random_uuid()::text, $1, $2::"Role", now())
     on conflict (email) do update set role = excluded.role, "isActive" = true
     returning id`,
    [email, role],
  );
  const token = randomBytes(32).toString("hex");
  await queryDb(
    `insert into "Session" ("sessionToken", "userId", expires, "updatedAt")
     values ($1, $2, now() + interval '1 day', now())`,
    [token, user.id],
  );
  await context.addCookies([
    { name: "authjs.session-token", value: token, url: baseURL, httpOnly: true, sameSite: "Lax" },
  ]);
  return { userId: user.id, token };
}

/** Removes the user (sessions cascade). */
export async function deleteAdmin(email: string) {
  await queryDb(`delete from "User" where email = $1`, [email]);
}
