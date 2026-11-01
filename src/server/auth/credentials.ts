import "server-only";

import type { AdminRole } from "@/lib/auth/roles";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { checkSuperAdmin, isSuperAdminEmail } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";

export type VerifiedAdmin = {
  id: string;
  email: string;
  role: AdminRole;
  mustChangePassword: boolean;
};

// Compared against when the email is unknown, so a miss takes as long as a wrong password.
const DUMMY_HASH = hashPassword("dummy password for timing");

/**
 * The super admin from .env or an active team member with this email and password, else
 * null — one result for unknown, deactivated and wrong-password, so nobody learns who has
 * access. Callers rate-limit first. Shared by the sign-in form and the package import API.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<VerifiedAdmin | null> {
  if (checkSuperAdmin(email, password)) {
    // The super admin's account row is created on first sign-in and always restored.
    const upsert = () =>
      db.user.upsert({
        where: { email },
        update: { role: "ADMIN", isActive: true, mustChangePassword: false, passwordHash: null },
        create: { email, name: "Super admin", role: "ADMIN" },
        select: { id: true },
      });
    // Two first sign-ins at once: the loser's insert hits the unique email, then updates.
    const { id } = await upsert().catch(upsert);
    return { id, email, role: "ADMIN", mustChangePassword: false };
  }
  if (isSuperAdminEmail(email)) return null;

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, role: true, isActive: true, passwordHash: true, mustChangePassword: true },
  });
  const valid = await verifyPassword(password, user?.passwordHash ?? (await DUMMY_HASH));
  if (!user?.isActive || !user.passwordHash || !valid) return null;
  return { id: user.id, email, role: user.role, mustChangePassword: user.mustChangePassword };
}
