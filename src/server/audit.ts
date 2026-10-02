import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type AuditEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
};

/**
 * Records an admin change (AGENTS.md §6.10). Called after the change succeeded; a failure
 * here is logged but never undoes or blocks the change itself.
 */
export async function audit(user: { id: string; email?: string | null }, entry: AuditEntry) {
  try {
    await db.auditLog.create({
      data: { userId: user.id, userEmail: user.email ?? "unknown", ...entry },
    });
  } catch (error) {
    console.error("[audit] failed to record", entry.action, error);
  }
}
