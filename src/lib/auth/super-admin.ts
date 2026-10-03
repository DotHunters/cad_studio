/**
 * The super admin (AGENTS.md §6.10): one account whose email and password live in the server
 * environment, so the owner can always get in — even before any user exists or email is set
 * up. It can't be edited, demoted or deactivated from the admin. Pure, unit tested.
 */
import { safeEqual } from "./password";
import { PASSWORD_MIN_LENGTH } from "./password-rules";

type Env = Record<string, string | undefined>;

export type SuperAdminConfig = { email: string; password: string };

/** The configured super admin, or null when unset or the password is too short to be safe. */
export function superAdminConfig(env: Env = process.env): SuperAdminConfig | null {
  const email = env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.SUPER_ADMIN_PASSWORD;
  if (!email || !password || password.length < PASSWORD_MIN_LENGTH) return null;
  return { email, password };
}

export function isSuperAdminEmail(email: string | null | undefined, env: Env = process.env) {
  const config = superAdminConfig(env);
  return Boolean(config && email && email.trim().toLowerCase() === config.email);
}

/** True when the email and password match the super admin in the environment. */
export function checkSuperAdmin(email: string, password: string, env: Env = process.env) {
  const config = superAdminConfig(env);
  return Boolean(
    config && email.trim().toLowerCase() === config.email && safeEqual(password, config.password),
  );
}
