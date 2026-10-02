import "server-only";

import type { Session } from "next-auth";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { type AdminRole, hasRole, SIGN_IN_PATH } from "@/lib/auth/roles";

export type AdminUser = Session["user"];

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

async function currentAdmin(): Promise<AdminUser | null> {
  const session = await auth();
  return session?.user?.isActive ? session.user : null;
}

/**
 * For admin pages and layouts: signed-out visitors go to sign-in; signed-in users without
 * the role are sent back to the dashboard.
 */
export async function requireAdminPage(role: AdminRole = "STAFF"): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user) redirect(SIGN_IN_PATH);
  if (!hasRole(user.role, role)) redirect("/admin?error=forbidden");
  return user;
}

/** For every admin Server Action and route handler (AGENTS.md §11): throws when not allowed. */
export async function requireRole(role: AdminRole): Promise<AdminUser> {
  const user = await currentAdmin();
  if (!user || !hasRole(user.role, role)) throw new ForbiddenError();
  return user;
}

/** For admin route handlers (CSV, .ics): a 403 response when not allowed, else null. */
export async function forbiddenUnlessRole(role: AdminRole): Promise<Response | null> {
  const user = await currentAdmin();
  return user && hasRole(user.role, role) ? null : new Response("Forbidden", { status: 403 });
}
