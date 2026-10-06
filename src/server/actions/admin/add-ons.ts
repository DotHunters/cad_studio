"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/action-result";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { addOnFormSchema } from "@/lib/validators/admin/add-on";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";
import { addOnUsage, inUseMessage } from "@/server/queries/usage";

import type { SaveResult } from "./packages";

/**
 * Creates (no id) or updates an add-on (AGENTS.md §6.10, §8.1). ADMIN only. The code is
 * only set on creation — saved quotes refer to it. Unused add-ons can be deleted; used ones
 * only disabled (see `deleteAddOn`).
 */
export async function saveAddOn(id: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = addOnFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { code, price, categories, ...rest } = parsed.data;
  if (!id && !code) return { ok: false, fieldErrors: { code: "Required." } };
  const data = { ...rest, priceCents: price };

  const beforeRow = id
    ? await db.addOn.findUnique({
        where: { id },
        include: { services: { select: { slug: true } } },
      })
    : null;
  const before = beforeRow
    ? { ...beforeRow, categories: beforeRow.services.map((s) => s.slug) }
    : null;
  let savedCode: string;
  try {
    const saved = id
      ? await db.addOn.update({
          where: { id },
          data: { ...data, services: { set: categories.map((slug) => ({ slug })) } },
          select: { code: true },
        })
      : await db.addOn.create({
          data: {
            ...data,
            code: code!,
            services: { connect: categories.map((slug) => ({ slug })) },
          },
          select: { code: true },
        });
    savedCode = saved.code;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { code: "Another add-on already uses this code." } };
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2003" || error.code === "P2025")
    ) {
      return { ok: false, fieldErrors: { categories: "Choose at least one service." } };
    }
    console.error("[admin] saveAddOn failed", error);
    return { ok: false, error: "server" };
  }

  await audit(actor, {
    action: id ? "addon.update" : "addon.create",
    entityType: "AddOn",
    entityId: id,
    summary: before
      ? auditSummary(
          `${data.name} (${savedCode})`,
          describeChanges(
            before,
            { ...data, categories },
            {
              name: { label: "name" },
              priceCents: {
                label: "price",
                format: (value) => formatCAD(Number(value), "en", { suffix: false }),
              },
              unit: { label: "charged" },
              categories: { label: "services" },
              isActive: { label: "active", format: (value) => (value ? "yes" : "no") },
            },
          ),
          "details updated",
        )
      : `Created ${data.name} (${savedCode}) at ${formatCAD(data.priceCents, "en", { suffix: false })}`,
  });
  // Quote form, quote engine and package pages read add-ons under the packages tag.
  revalidateContent("packages");
  redirect(`/admin/add-ons?saved=${encodeURIComponent(savedCode)}`);
}

/** Shows or hides an add-on in the quote calculator (ADMIN only). */
export async function setAddOnActive(id: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const addOn = await db.addOn.findUnique({ where: { id }, select: { name: true, code: true } });
  if (!addOn) return { ok: false, error: "This add-on no longer exists." };
  await db.addOn.update({ where: { id }, data: { isActive } });
  await audit(actor, {
    action: "addon.update",
    entityType: "AddOn",
    entityId: id,
    summary: `${addOn.name} (${addOn.code}): ${isActive ? "enabled" : "disabled"}`,
  });
  revalidateContent("packages");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Deletes an add-on that no quote or booking uses (ADMIN only); used ones are disabled instead. */
export async function deleteAddOn(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const addOn = await db.addOn.findUnique({ where: { id }, select: { name: true, code: true } });
  if (!addOn) return { ok: false, error: "This add-on no longer exists." };
  const used = await addOnUsage(addOn.code);
  if (used > 0) return { ok: false, error: inUseMessage(used, "Disable it instead.") };
  await db.addOn.delete({ where: { id } });
  await audit(actor, {
    action: "addon.delete",
    entityType: "AddOn",
    entityId: id,
    summary: `Deleted ${addOn.name} (${addOn.code})`,
  });
  revalidateContent("packages");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
