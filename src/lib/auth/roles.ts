/**
 * Admin access rules (AGENTS.md §2, §11). Pure so they're unit tested; used by the
 * middleware (cheap redirect) and by every admin page and action (real check).
 */
export type AdminRole = "ADMIN" | "STAFF";

const RANK: Record<AdminRole, number> = { STAFF: 1, ADMIN: 2 };

/** ADMIN can do everything STAFF can. */
export function hasRole(role: AdminRole | null | undefined, required: AdminRole): boolean {
  return role !== null && role !== undefined && RANK[role] >= RANK[required];
}

export const ADMIN_HOME = "/admin";
export const SIGN_IN_PATH = "/admin/sign-in";

/** Auth.js session cookie names (the `__Secure-` one is used over HTTPS). */
export const SESSION_COOKIES = ["authjs.session-token", "__Secure-authjs.session-token"] as const;

const isAdminPath = (path: string) =>
  path === ADMIN_HOME || path.startsWith(`${ADMIN_HOME}/`) || path.startsWith(`${ADMIN_HOME}?`);

/**
 * Where the middleware sends a request for an admin page, or null to let it through.
 * Only checks that a session cookie exists; pages and actions verify the session itself.
 */
export function adminGuardRedirect(
  pathname: string,
  search: string,
  hasSessionCookie: boolean,
): string | null {
  if (pathname === SIGN_IN_PATH || pathname.startsWith(`${SIGN_IN_PATH}/`)) return null;
  if (hasSessionCookie) return null;
  return `${SIGN_IN_PATH}?callbackUrl=${encodeURIComponent(`${pathname}${search}`)}`;
}

/** Only same-site admin paths are allowed after sign-in (no open redirects). */
export function safeCallbackUrl(value: string | null | undefined): string {
  if (!value || !isAdminPath(value) || value.includes("\\") || value.includes("//")) {
    return ADMIN_HOME;
  }
  return value.startsWith(SIGN_IN_PATH) ? ADMIN_HOME : value;
}
