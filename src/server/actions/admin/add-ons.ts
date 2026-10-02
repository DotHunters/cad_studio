"use server";

import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { categoryFromSlug } from "@/lib/categories";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { addOnFormSchema } from "@/lib/validators/admin/add-on";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

import type { SaveResult } from "./packages";

/**
 * Creates (no id) or updates an add-on (AGENTS.md §6.10, §8.1). ADMIN only. The code is
 * only set on creation — saved quotes refer to it. Add-ons are hidden, never deleted.
 */
export async function saveAddOn(id: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = addOnFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { code, price, categories, ...rest } = parsed.data;
  if (!id && !code) return { ok: false, fieldErrors: { code: "Required." } };
  const data = {
    ...rest,
    priceCents: price,
    categories: categories.map((slug) => categoryFromSlug(slug)!),
  };

  const before = id ? await db.addOn.findUnique({ where: { id } }) : null;
  let savedCode: string;
  try {
    const saved = id
      ? await db.addOn.update({ where: { id }, data, select: { code: true } })
      : await db.addOn.create({ data: { ...data, code: code! }, select: { code: true } });
    savedCode = saved.code;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { code: "Another add-on already uses this code." } };
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
          describeChanges(before, data, {
            name: { label: "name" },
            priceCents: {
              label: "price",
              format: (value) => formatCAD(Number(value), "en", { suffix: false }),
            },
            unit: { label: "charged" },
            categories: { label: "services" },
            isActive: { label: "active", format: (value) => (value ? "yes" : "no") },
          }),
          "details updated",
        )
      : `Created ${data.name} (${savedCode}) at ${formatCAD(data.priceCents, "en", { suffix: false })}`,
  });
  // Quote form, quote engine and package pages read add-ons under the packages tag.
  revalidateContent("packages");
  redirect(`/admin/add-ons?saved=${encodeURIComponent(savedCode)}`);
}
