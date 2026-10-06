"use server";

import { redirect } from "next/navigation";

import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { imageFormSchema } from "@/lib/validators/admin/image";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

import type { SaveResult } from "./packages";

/**
 * Updates an image's details, project and cover (AGENTS.md §6.4, §9). ADMIN only. New images
 * arrive by upload (7.4c); here the admin describes, files and approves them.
 */
export async function saveImage(id: string, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = imageFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { category, isCover, projectId, ...rest } = parsed.data;

  const before = await db.image.findUnique({ where: { id } });
  try {
    const result = await db.$transaction(async (tx) => {
      const current = await tx.image.findUnique({ where: { id }, select: { projectId: true } });
      if (!current) return "missing" as const;
      if (projectId && !(await tx.portfolioProject.findUnique({ where: { id: projectId } }))) {
        return "no-project" as const;
      }
      await tx.image.update({
        where: { id },
        data: { ...rest, projectId, category: category ?? null },
      });
      // A project's cover must be one of its own images.
      await tx.portfolioProject.updateMany({
        where: { coverId: id, ...(isCover && projectId ? { id: { not: projectId } } : {}) },
        data: { coverId: null },
      });
      if (isCover && projectId) {
        await tx.portfolioProject.update({ where: { id: projectId }, data: { coverId: id } });
      }
      return "ok" as const;
    });
    if (result === "no-project")
      return { ok: false, fieldErrors: { projectId: "Choose a project." } };
    if (result === "missing") return { ok: false, error: "server" };
  } catch (error) {
    console.error("[admin] saveImage failed", error);
    return { ok: false, error: "server" };
  }

  await audit(actor, {
    action: "image.update",
    entityType: "Image",
    entityId: id,
    summary: auditSummary(
      rest.alt.slice(0, 60),
      before
        ? describeChanges(
            before,
            { ...rest, projectId },
            {
              consentToPublish: { label: "consent", format: (value) => (value ? "yes" : "no") },
              inGallery: { label: "in gallery", format: (value) => (value ? "yes" : "no") },
              projectId: { label: "project" },
              sortOrder: { label: "order" },
            },
          ).concat(isCover ? ["set as cover"] : [])
        : [],
      "description updated",
    ),
  });
  revalidateContent("gallery", "portfolio");
  redirect(`/admin/gallery?saved=${encodeURIComponent(id)}`);
}
