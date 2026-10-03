"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import {
  passwordProblem,
  superAdminProblem,
  teamChangeProblem,
  teamMemberSchema,
} from "@/lib/admin/team";
import type { ActionResult } from "@/lib/admin/action-result";
import { hashPassword, temporaryPassword } from "@/lib/auth/password";
import { isSuperAdminEmail, superAdminConfig } from "@/lib/auth/super-admin";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { withSerializableRetry } from "@/server/serialization";

import type { SaveResult } from "./packages";

/**
 * Adds (no id) or updates a team member (AGENTS.md §2, §6.10). ADMIN only. New members get a
 * temporary password they must replace at first sign-in; setting a new one for someone else
 * does the same. Deactivating someone or resetting their password signs them out everywhere.
 */
export async function saveTeamMember(id: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = teamMemberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { password, ...values } = parsed.data;
  const missingPassword = passwordProblem(id, password);
  if (missingPassword) return { ok: false, fieldErrors: { password: missingPassword } };
  // Hashed outside the transaction: it's deliberately slow.
  const passwordData = password
    ? { passwordHash: await hashPassword(password), mustChangePassword: id !== actor.id }
    : {};
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
            select: { id: true, email: true, role: true, isActive: true },
          });
          const reason =
            superAdminProblem(
              { id, email: values.email },
              members,
              superAdminConfig()?.email ?? null,
            ) ?? teamChangeProblem({ id, ...values }, actor.id, members);
          if (reason) return reason;
          if (id) {
            await tx.user.update({ where: { id }, data: { ...values, ...passwordData } });
            if (!values.isActive || (password && id !== actor.id)) {
              await tx.session.deleteMany({ where: { userId: id } });
            }
          } else {
            await tx.user.create({ data: { ...values, ...passwordData } });
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
      // The password itself is never logged — only that it changed.
      summary: before
        ? auditSummary(values.email, [
            ...describeChanges(before, values, {
              name: { label: "name" },
              email: { label: "email" },
              role: { label: "role" },
              isActive: { label: "active", format: (value) => (value ? "yes" : "no") },
            }),
            ...(password ? ["new password set"] : []),
          ])
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

type RowTarget =
  | { ok: true; member: { id: string; email: string; role: "ADMIN" | "STAFF"; isActive: boolean } }
  | { ok: false; error: string };

/** Rules shared by the row actions: the super admin and your own account are off limits. */
async function rowActionTarget(id: string, actorId: string): Promise<RowTarget> {
  const member = await db.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!member) return { ok: false, error: "This team member no longer exists." };
  if (isSuperAdminEmail(member.email)) {
    return { ok: false, error: "The super admin is managed in the server settings (.env)." };
  }
  if (member.id === actorId) {
    return {
      ok: false,
      error: "Use the Password page or ask another admin to change your own account.",
    };
  }
  return { ok: true, member };
}

/** Enables or disables someone's sign-in (ADMIN only). Disabling signs them out everywhere. */
export async function setTeamMemberActive(id: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const target = await rowActionTarget(id, actor.id);
  if (!target.ok) return target;
  const { member } = target;
  const problem = await withSerializableRetry(() =>
    db.$transaction(
      async (tx) => {
        const members = await tx.user.findMany({
          select: { id: true, role: true, isActive: true },
        });
        const reason = teamChangeProblem({ id, role: member.role, isActive }, actor.id, members);
        if (reason) return reason;
        await tx.user.update({ where: { id }, data: { isActive } });
        if (!isActive) await tx.session.deleteMany({ where: { userId: id } });
        return null;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  if (problem) return { ok: false, error: problem };
  await audit(actor, {
    action: "team.update",
    entityType: "User",
    entityId: id,
    summary: `${member.email}: ${isActive ? "enabled" : "disabled"}`,
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export type ResetPasswordResult = { ok: true; password: string } | { ok: false; error: string };

/**
 * Gives someone a new random temporary password (ADMIN only), shown once to the admin to
 * share privately. Signs them out; they choose their own at next sign-in.
 */
export async function resetTeamMemberPassword(id: string): Promise<ResetPasswordResult> {
  const actor = await requireRole("ADMIN");
  const target = await rowActionTarget(id, actor.id);
  if (!target.ok) return target;
  const password = temporaryPassword();
  await db.$transaction([
    db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), mustChangePassword: true },
    }),
    db.session.deleteMany({ where: { userId: id } }),
  ]);
  // The password itself is never logged.
  await audit(actor, {
    action: "team.update",
    entityType: "User",
    entityId: id,
    summary: `${target.member.email}: password reset`,
  });
  return { ok: true, password };
}
