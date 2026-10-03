/**
 * Team accounts (AGENTS.md §2 roles, §6.10). Admins add photographers/staff with a temporary
 * password; the super admin comes from .env and can't be changed here. Pure rules, unit tested.
 */
import * as z from "zod";

import { passwordSchema } from "@/lib/auth/password-rules";
import { checkbox, optionalText } from "@/lib/validators/admin/fields";

export const teamMemberSchema = z.object({
  name: optionalText(80),
  email: z
    .string("Required.")
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.").max(254)),
  role: z.enum(["ADMIN", "STAFF"], "Choose a role."),
  isActive: checkbox,
  /** Empty keeps the current password (required for new members — see `passwordProblem`). */
  password: z
    .string()
    .optional()
    .transform((value) => value || undefined)
    .pipe(passwordSchema.optional()),
});

export type TeamMemberValues = z.output<typeof teamMemberSchema>;

type Member = { id: string; role: "ADMIN" | "STAFF"; isActive: boolean };

/**
 * Why a change isn't allowed, or null. Nobody can demote or deactivate themselves, and the
 * studio always keeps at least one active admin.
 */
export function teamChangeProblem(
  change: { id: string | null; role: "ADMIN" | "STAFF"; isActive: boolean },
  currentUserId: string,
  members: readonly Member[],
): string | null {
  const existing = change.id ? members.find((member) => member.id === change.id) : undefined;
  if (change.id && !existing) return "This team member no longer exists.";
  if (existing && existing.id === currentUserId) {
    if (change.role !== existing.role) return "You can't change your own role.";
    if (!change.isActive) return "You can't deactivate your own account.";
  }
  const activeAdmins =
    members.filter(
      (member) => member.isActive && member.role === "ADMIN" && member.id !== change.id,
    ).length + (change.isActive && change.role === "ADMIN" ? 1 : 0);
  return activeAdmins === 0 ? "The studio needs at least one active admin." : null;
}

/** New members need a temporary password; existing ones keep theirs when it's left empty. */
export function passwordProblem(id: string | null, password: string | undefined): string | null {
  return !id && !password ? "Set a temporary password for the new team member." : null;
}

/**
 * The super admin's account is managed in .env: nobody can edit it here, and no other account
 * can take its email (that would open a second way in).
 */
export function superAdminProblem(
  change: { id: string | null; email: string },
  members: readonly { id: string; email: string }[],
  superAdminEmail: string | null,
): string | null {
  if (!superAdminEmail) return null;
  const existing = change.id ? members.find((member) => member.id === change.id) : undefined;
  if (existing?.email === superAdminEmail) {
    return "The super admin is managed in the server settings (.env) and can't be changed here.";
  }
  return change.email === superAdminEmail ? "This email belongs to the super admin." : null;
}
