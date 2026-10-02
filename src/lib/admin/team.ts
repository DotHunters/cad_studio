/**
 * Team accounts (AGENTS.md §2 roles, §6.10). Admins add photographers/staff; sign-in is by
 * emailed link, so the email must be a real inbox. Pure rules, unit tested.
 */
import { z } from "zod";

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
