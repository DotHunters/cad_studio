"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/action-result";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { canArchiveService, canDeleteService, moveSlug, usageTotal } from "@/lib/services";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { serviceFormSchema } from "@/lib/validators/admin/service";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";
import { getServiceUsage } from "@/server/queries/services";

import type { SaveResult } from "./packages";

// Service names show on packages, portfolio, gallery, reviews, quotes and the home page.
const refresh = () => {
  revalidateContent("services", "packages", "portfolio", "gallery", "reviews");
  revalidatePath("/admin", "layout");
};

/** Creates (no slug) or updates a service (Admin → Services). ADMIN only. */
export async function saveService(slug: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = serviceFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { slug: newSlug, ...data } = parsed.data;
  if (!slug && !newSlug) return { ok: false, fieldErrors: { slug: "Required." } };

  const before = slug ? await db.service.findUnique({ where: { slug } }) : null;
  if (slug && !before) return { ok: false, error: "server" };
  try {
    if (slug) {
      await db.service.update({ where: { slug }, data });
    } else {
      const last = await db.service.aggregate({ _max: { sortOrder: true } });
      await db.service.create({
        data: { ...data, slug: newSlug!, sortOrder: (last._max.sortOrder ?? -1) + 1 },
      });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        ok: false,
        fieldErrors: { slug: "Another service already uses this web address." },
      };
    }
    console.error("[admin] saveService failed", error);
    return { ok: false, error: "server" };
  }

  await audit(actor, {
    action: slug ? "service.update" : "service.create",
    entityType: "Service",
    entityId: slug ?? newSlug!,
    summary: before
      ? auditSummary(
          `${data.name} (${slug})`,
          describeChanges(before, data, {
            name: { label: "name" },
            nameFr: { label: "French name" },
            description: { label: "description" },
            descriptionFr: { label: "French description" },
          }),
          "details updated",
        )
      : `Created ${data.name} (${newSlug})`,
  });
  refresh();
  redirect(`/admin/services?saved=${encodeURIComponent(slug ?? newSlug!)}`);
}

const INVALID_REQUEST = { ok: false, error: "Invalid request." } as const;
const moveSchema = z.object({ slug: z.string().min(1), direction: z.enum(["up", "down"]) });

/** Moves a service one place up or down in the display order. ADMIN only. */
export async function moveService(slug: string, direction: "up" | "down"): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const args = moveSchema.safeParse({ slug, direction });
  if (!args.success) return INVALID_REQUEST;
  ({ slug, direction } = args.data);
  const services = await db.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { slug: true, name: true },
  });
  const service = services.find((s) => s.slug === slug);
  if (!service) return { ok: false, error: "This service no longer exists." };
  const order = moveSlug(
    services.map((s) => s.slug),
    slug,
    direction,
  );
  await db.$transaction(
    order.map((s, index) => db.service.update({ where: { slug: s }, data: { sortOrder: index } })),
  );
  await audit(actor, {
    action: "service.update",
    entityType: "Service",
    entityId: slug,
    summary: `${service.name}: moved ${direction}`,
  });
  refresh();
  return { ok: true };
}

/** Archives (hides from the site and new quotes/bookings) or restores a service. ADMIN only. */
export async function setServiceArchived(slug: string, archived: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  if (typeof slug !== "string" || !z.boolean().safeParse(archived).success) return INVALID_REQUEST;
  const services = await db.service.findMany({
    select: { slug: true, name: true, archivedAt: true },
  });
  const service = services.find((s) => s.slug === slug);
  if (!service) return { ok: false, error: "This service no longer exists." };
  const rows = services.map((s) => ({ slug: s.slug, active: s.archivedAt === null }));
  if (archived && !canArchiveService(rows, slug)) {
    return { ok: false, error: "The site needs at least one active service." };
  }
  await db.service.update({ where: { slug }, data: { archivedAt: archived ? new Date() : null } });
  await audit(actor, {
    action: "service.update",
    entityType: "Service",
    entityId: slug,
    summary: `${service.name}: ${archived ? "archived" : "restored"}`,
  });
  refresh();
  return { ok: true };
}

/** The Active switch on Admin → Services (checked = not archived). ADMIN only. */
export async function setServiceActive(slug: string, active: boolean): Promise<ActionResult> {
  if (!z.boolean().safeParse(active).success) {
    await requireRole("ADMIN");
    return INVALID_REQUEST;
  }
  return setServiceArchived(slug, !active);
}

/** Deletes a service nothing refers to; otherwise explains and points to Archive. ADMIN only. */
export async function deleteService(slug: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const [service, usage] = await Promise.all([
    db.service.findUnique({ where: { slug }, select: { name: true } }),
    getServiceUsage(slug),
  ]);
  if (!service || !usage) return { ok: false, error: "This service no longer exists." };
  if (!canDeleteService(usage)) {
    return {
      ok: false,
      error: `Used by ${usageTotal(usage)} package, quote, booking, project, photo, review or add-on records, so it can't be deleted. Archive it instead.`,
    };
  }
  const active = await db.service.count({ where: { archivedAt: null, slug: { not: slug } } });
  if (active === 0) return { ok: false, error: "The site needs at least one active service." };
  try {
    await db.service.delete({ where: { slug } });
  } catch (error) {
    // Something started using it between the check and the delete.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { ok: false, error: "This service is now in use. Archive it instead." };
    }
    throw error;
  }
  await audit(actor, {
    action: "service.delete",
    entityType: "Service",
    entityId: slug,
    summary: `Deleted ${service.name} (${slug})`,
  });
  refresh();
  return { ok: true };
}

const tileSchema = z.object({
  slug: z.string().min(1).max(40),
  // "" = back to the default launch photo.
  imageId: z.string().trim().max(64),
});

/** Chooses the home-page tile photo of a service (Admin → Services → Change photo). ADMIN only. */
export async function setServiceTile(formData: FormData): Promise<void> {
  const actor = await requireRole("ADMIN");
  const parsed = tileSchema.safeParse({
    slug: formData.get("slug"),
    imageId: formData.get("imageId") ?? "",
  });
  if (!parsed.success) redirect("/admin/services");
  const { slug, imageId } = parsed.data;

  const service = await db.service.findUnique({ where: { slug }, select: { name: true } });
  if (!service) redirect("/admin/services");

  // Only photos the client agreed to publish may go on the home page (AGENTS.md §9).
  const image = imageId
    ? await db.image.findFirst({
        where: { id: imageId, consentToPublish: true },
        select: { id: true, alt: true },
      })
    : null;
  if (imageId && !image) redirect(`/admin/services/${slug}/photo?error=photo`);

  await db.service.update({ where: { slug }, data: { tileImageId: image?.id ?? null } });
  await audit(actor, {
    action: "service.update",
    entityType: "Service",
    entityId: slug,
    summary: image
      ? `${service.name} tile: photo "${image.alt}"`
      : `${service.name} tile: default photo`,
  });
  refresh();
  redirect(`/admin/services?saved=${encodeURIComponent(slug)}`);
}
