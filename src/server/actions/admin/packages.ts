"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/action-result";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { tierKeyFor } from "@/lib/pricing/options";
import {
  fieldErrorsOf,
  packageFormSchema,
  type TierFormValues,
} from "@/lib/validators/admin/package";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";
import { inUseMessage, packageUsage } from "@/server/queries/usage";

export type SaveResult =
  { ok: false; fieldErrors: Record<string, string> } | { ok: false; error: "server" };

/**
 * Creates (no id) or updates a package (AGENTS.md §6.10). Prices and everything shown on
 * /packages come from here — nothing is hardcoded. ADMIN only. Packages are never deleted
 * (quotes and bookings point at them); unticking "Active" hides them from the site.
 */
export async function savePackage(id: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = packageFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { basePrice, category, faqs, tiers, ...rest } = parsed.data;
  const data = {
    ...rest,
    category: category,
    basePriceCents: basePrice,
    faqs: faqs as Prisma.InputJsonValue,
  };

  const before = id
    ? await db.package.findUnique({
        where: { id },
        include: { tiers: { orderBy: { sortOrder: "asc" }, select: { key: true, name: true } } },
      })
    : null;
  try {
    await db.$transaction(async (tx) => {
      const saved = id
        ? await tx.package.update({ where: { id }, data, select: { id: true } })
        : await tx.package.create({ data, select: { id: true } });
      await saveTiers(tx, saved.id, tiers, before?.tiers.map((tier) => tier.key) ?? []);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { slug: "Another package already uses this slug." } };
    }
    console.error("[admin] savePackage failed", error);
    return { ok: false, error: "server" };
  }

  await audit(actor, {
    action: id ? "package.update" : "package.create",
    entityType: "Package",
    entityId: id,
    summary: before
      ? auditSummary(
          data.name,
          [
            ...describeChanges(before, data, {
              name: { label: "name" },
              slug: { label: "slug" },
              basePriceCents: {
                label: "price",
                format: (value) => formatCAD(Number(value), "en", { suffix: false }),
              },
              includedHours: { label: "hours" },
              includedShooters: { label: "photographers" },
              isActive: { label: "active", format: (value) => (value ? "yes" : "no") },
              sortOrder: { label: "order" },
            }),
            ...tierChanges(before.tiers, tiers),
          ],
          "text or details updated",
        )
      : `Created ${data.name} (${formatCAD(data.basePriceCents, "en", { suffix: false })})`,
  });
  // Package pages, the quote engine and booking terms all read packages.
  revalidateContent("packages");
  redirect(`/admin/packages?saved=${encodeURIComponent(data.slug)}`);
}

type TierWriter = Pick<Prisma.TransactionClient, "packageTier">;

/**
 * Replaces a package's tiers with the submitted list, in that order. Existing tiers keep
 * their key (saved quotes and bookings refer to it); new ones get one from their name.
 */
async function saveTiers(
  tx: TierWriter,
  packageId: string,
  tiers: readonly TierFormValues[],
  existingKeys: readonly string[],
) {
  const taken = new Set(existingKeys);
  const keyed = tiers.map((tier) => {
    if (tier.key && existingKeys.includes(tier.key)) return { ...tier, key: tier.key };
    const key = tierKeyFor(tier.name, taken);
    taken.add(key);
    return { ...tier, key };
  });
  await tx.packageTier.deleteMany({
    where: { packageId, key: { notIn: keyed.map((tier) => tier.key) } },
  });
  for (const [sortOrder, { key, basePrice, ...tier }] of keyed.entries()) {
    const values = { ...tier, basePriceCents: basePrice, sortOrder };
    await tx.packageTier.upsert({
      where: { packageId_key: { packageId, key } },
      create: { ...values, packageId, key },
      update: values,
    });
  }
}

/** "options Silver, Gold → Silver, Gold, Platinum" when the list of tiers changed. */
function tierChanges(
  before: readonly { name: string }[],
  after: readonly { name: string }[],
): string[] {
  const names = (list: readonly { name: string }[]) =>
    list.map((tier) => tier.name).join(", ") || "none";
  return names(before) === names(after) ? [] : [`options ${names(before)} → ${names(after)}`];
}

/** Shows or hides a package on the website and in the quote calculator (ADMIN only). */
export async function setPackageActive(id: string, isActive: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const pkg = await db.package.findUnique({ where: { id }, select: { name: true } });
  if (!pkg) return { ok: false, error: "This package no longer exists." };
  await db.package.update({ where: { id }, data: { isActive } });
  await audit(actor, {
    action: "package.update",
    entityType: "Package",
    entityId: id,
    summary: `${pkg.name}: ${isActive ? "activated" : "deactivated"}`,
  });
  revalidateContent("packages");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/**
 * Deletes a package no quote or booking was made for (ADMIN only); used ones can only be
 * deactivated. Its sample images stay in the image library, unlinked.
 */
export async function deletePackage(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const pkg = await db.package.findUnique({ where: { id }, select: { name: true, slug: true } });
  if (!pkg) return { ok: false, error: "This package no longer exists." };
  const used = await packageUsage(id);
  if (used > 0) return { ok: false, error: inUseMessage(used, "Deactivate it instead.") };
  await db.package.delete({ where: { id } });
  await audit(actor, {
    action: "package.delete",
    entityType: "Package",
    entityId: id,
    summary: `Deleted ${pkg.name} (${pkg.slug})`,
  });
  revalidateContent("packages");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
