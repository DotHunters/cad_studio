"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";

const inputSchema = z.object({
  reference: z.string().min(1).max(40),
  assigneeIds: z.array(z.string().min(1).max(40)).max(50),
});

/**
 * Sets who covers a booking (AGENTS.md §6.10). STAFF+. Only active team members can be
 * assigned; anyone else in the request is ignored. Works as a plain form action.
 */
export async function assignPhotographers(formData: FormData): Promise<void> {
  const actor = await requireRole("STAFF");
  const parsed = inputSchema.safeParse({
    reference: formData.get("reference"),
    assigneeIds: formData.getAll("assigneeIds"),
  });
  if (!parsed.success) return;
  const { reference, assigneeIds } = parsed.data;

  const active = await db.user.findMany({
    where: { id: { in: assigneeIds }, isActive: true },
    select: { id: true, name: true, email: true },
  });
  try {
    await db.booking.update({
      where: { reference },
      data: { assignees: { set: active.map(({ id }) => ({ id })) } },
    });
  } catch (error) {
    // The booking was deleted meanwhile: nothing to assign.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")) {
      throw error;
    }
  }
  await audit(actor, {
    action: "booking.assign",
    entityType: "Booking",
    entityId: reference,
    summary: `${reference}: photographers ${active.map((user) => user.name ?? user.email).join(", ") || "none"}`,
  });
  revalidatePath("/admin", "layout");
}
