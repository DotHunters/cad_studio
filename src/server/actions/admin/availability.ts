"use server";

import { revalidatePath } from "next/cache";

import { blockDatesSchema } from "@/lib/admin/blocked-dates";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { requireRole } from "@/server/auth/guards";

export type BlockResult =
  | { ok: true; added: number; alreadyBlocked: number }
  | { ok: false; fieldErrors: Record<string, string> };

/** Blocks one day or a range so it can't be booked online (AGENTS.md §6.10, §8.3). STAFF+. */
export async function blockDates(input: unknown): Promise<BlockResult> {
  await requireRole("STAFF");
  const parsed = blockDatesSchema(studioDateKey(new Date())).safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { days, reason } = parsed.data;

  const { count } = await db.blockedDate.createMany({
    data: days.map((day) => ({ date: new Date(`${day}T00:00:00Z`), reason })),
    skipDuplicates: true,
  });
  revalidatePath("/admin", "layout");
  return { ok: true, added: count, alreadyBlocked: days.length - count };
}

/** Makes a blocked day bookable again. Plain form action. */
export async function unblockDate(formData: FormData): Promise<void> {
  await requireRole("STAFF");
  const id = String(formData.get("id") ?? "");
  if (id) await db.blockedDate.deleteMany({ where: { id } });
  revalidatePath("/admin", "layout");
}
