"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { MODERATION_INTENTS, moderationUpdate } from "@/lib/admin/moderation";
import { db } from "@/lib/db";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

const inputSchema = z.object({
  id: z.string().min(1).max(40),
  intent: z.enum(MODERATION_INTENTS),
  returnTo: z.enum(["PENDING", "APPROVED", "REJECTED"]).catch("PENDING"),
});

/**
 * Approve / reject / feature a review, or record logo permission (AGENTS.md §6.7, §8.4).
 * Staff can moderate. Used as a plain form action so it works before JavaScript loads.
 */
export async function moderateReview(formData: FormData): Promise<void> {
  await requireRole("STAFF");
  const parsed = inputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/admin/reviews?error=invalid");
  const { id, intent, returnTo } = parsed.data;

  const review = await db.review.findUnique({
    where: { id },
    select: { status: true, type: true, featured: true },
  });
  if (!review) redirect(`/admin/reviews?status=${returnTo}&error=missing`);

  const update = moderationUpdate(intent, review);
  if (!update.ok) {
    redirect(`/admin/reviews?status=${returnTo}&error=${encodeURIComponent(update.reason)}`);
  }
  await db.review.update({ where: { id }, data: update.data });

  // Reviews page, home carousel, case-study recommendations and the dashboard.
  revalidateContent("reviews");
  revalidatePath("/admin", "layout");
  redirect(`/admin/reviews?status=${returnTo}&done=${intent}`);
}
