"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { teamChangeProblem, teamMemberSchema } from "@/lib/admin/team";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { withSerializableRetry } from "@/server/serialization";

import type { SaveResult } from "./packages";

/**
 * Adds (no id) or updates a team member (AGENTS.md §2, §6.10). ADMIN only. New members sign
 * in with an emailed link — no passwords. Deactivating someone signs them out everywhere.
 */
export async function saveTeamMember(id: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const values = parsed.data;
  const before = id
    ? await db.user.findUnique({
        where: { id },
        select: { name: true, email: true, role: true, isActive: true },
      })
    : null;

  try {
    const problem = await withSerializableRetry(() =>
      db.$transaction(
        async (tx) => {
          const members = await tx.user.findMany({
            select: { id: true, role: true, isActive: true },
          });
          const reason = teamChangeProblem({ id, ...values }, actor.id, members);
          if (reason) return reason;
          if (id) {
            await tx.user.update({ where: { id }, data: values });
            if (!values.isActive) await tx.session.deleteMany({ where: { userId: id } });
          } else {
            await tx.user.create({ data: values });
          }
          return null;
        },
        // Two admins demoting each other at once can't leave the studio without an admin.
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
    if (problem) return { ok: false, fieldErrors: { form: problem } };
    await audit(actor, {
      action: id ? "team.update" : "team.add",
      entityType: "User",
      entityId: id,
      summary: before
        ? auditSummary(
            values.email,
            describeChanges(before, values, {
              name: { label: "name" },
              email: { label: "email" },
              role: { label: "role" },
              isActive: { label: "active", format: (value) => (value ? "yes" : "no") },
            }),
          )
        : `Added ${values.email} as ${values.role.toLowerCase()}`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { email: "Someone on the team already uses this email." } };
    }
    console.error("[admin] saveTeamMember failed", error);
    return { ok: false, error: "server" };
  }
  // Without this the client router can show the cached team list from an earlier save.
  revalidatePath("/admin", "layout");
  redirect(`/admin/team?saved=${encodeURIComponent(values.email)}`);
}
