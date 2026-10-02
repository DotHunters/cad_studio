"use server";

import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { categoryFromSlug } from "@/lib/categories";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { fieldErrorsOf, packageFormSchema } from "@/lib/validators/admin/package";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

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

  const { basePrice, category, faqs, ...rest } = parsed.data;
  const data = {
    ...rest,
    category: categoryFromSlug(category)!,
    basePriceCents: basePrice,
    faqs: faqs as Prisma.InputJsonValue,
  };

  const before = id ? await db.package.findUnique({ where: { id } }) : null;
  try {
    if (id) {
      await db.package.update({ where: { id }, data });
    } else {
      await db.package.create({ data });
    }
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
          describeChanges(before, data, {
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
          "text or details updated",
        )
      : `Created ${data.name} (${formatCAD(data.basePriceCents, "en", { suffix: false })})`,
  });
  // Package pages, the quote engine and booking terms all read packages.
  revalidateContent("packages");
  redirect(`/admin/packages?saved=${encodeURIComponent(data.slug)}`);
}
