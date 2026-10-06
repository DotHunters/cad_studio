"use server";

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "@/lib/admin/action-result";
import { auditSummary, describeChanges } from "@/lib/admin/audit";
import { db } from "@/lib/db";
import { isBlobUrl, uploadedPhotoAlt } from "@/lib/images";
import { MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { nextPublishedAt, projectFormSchema } from "@/lib/validators/admin/project";
import { projectImagesSchema } from "@/lib/validators/admin/uploads";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";
import { optimizePhoto } from "@/server/photos/optimize";

import type { SaveResult } from "./packages";

/**
 * Creates (no id) or updates a portfolio project (AGENTS.md §6.3, §6.10). ADMIN only.
 * Images are managed separately; deleting a project leaves them in the image library.
 */
export async function saveProject(id: string | null, input: unknown): Promise<SaveResult> {
  const actor = await requireRole("ADMIN");
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { category, published, ...rest } = parsed.data;
  const before = id ? await db.portfolioProject.findUnique({ where: { id } }) : null;
  try {
    const current = id
      ? await db.portfolioProject.findUnique({ where: { id }, select: { publishedAt: true } })
      : null;
    if (id && !current) return { ok: false, error: "server" };
    const data = {
      ...rest,
      category: category,
      publishedAt: nextPublishedAt(published, current?.publishedAt ?? null, new Date()),
    };
    if (id) await db.portfolioProject.update({ where: { id }, data });
    else await db.portfolioProject.create({ data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, fieldErrors: { slug: "Another project already uses this slug." } };
    }
    console.error("[admin] saveProject failed", error);
    return { ok: false, error: "server" };
  }

  await audit(actor, {
    action: id ? "project.update" : "project.create",
    entityType: "PortfolioProject",
    entityId: id,
    summary: before
      ? auditSummary(
          rest.title,
          describeChanges(
            { ...before, published: before.publishedAt !== null },
            { ...rest, published },
            {
              title: { label: "title" },
              slug: { label: "slug" },
              clientName: { label: "client" },
              consentToPublish: {
                label: "client named",
                format: (value) => (value ? "yes" : "no"),
              },
              published: { label: "published", format: (value) => (value ? "yes" : "no") },
              featured: { label: "featured", format: (value) => (value ? "yes" : "no") },
            },
          ),
          "story or details updated",
        )
      : `Created ${rest.title}${published ? " (published)" : " (draft)"}`,
  });
  // Portfolio list/detail, the home page and the gallery read projects.
  revalidateContent("portfolio");
  redirect(`/admin/portfolio?saved=${encodeURIComponent(rest.slug)}`);
}

async function projectTitle(id: string) {
  return (await db.portfolioProject.findUnique({ where: { id }, select: { title: true } }))?.title;
}

/** Publishes (shown on the site) or sets a project back to pending (ADMIN only). */
export async function setProjectPublished(id: string, published: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const current = await db.portfolioProject.findUnique({
    where: { id },
    select: { title: true, publishedAt: true },
  });
  if (!current) return { ok: false, error: "This project no longer exists." };
  await db.portfolioProject.update({
    where: { id },
    data: { publishedAt: nextPublishedAt(published, current.publishedAt, new Date()) },
  });
  await audit(actor, {
    action: "project.update",
    entityType: "PortfolioProject",
    entityId: id,
    summary: `${current.title}: ${published ? "published" : "set to pending"}`,
  });
  revalidateContent("portfolio");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Features a project on the home page, or stops featuring it (ADMIN only). */
export async function setProjectFeatured(id: string, featured: boolean): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const title = await projectTitle(id);
  if (!title) return { ok: false, error: "This project no longer exists." };
  await db.portfolioProject.update({ where: { id }, data: { featured } });
  await audit(actor, {
    action: "project.update",
    entityType: "PortfolioProject",
    entityId: id,
    summary: `${title}: ${featured ? "featured" : "no longer featured"}`,
  });
  revalidateContent("portfolio");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Deletes a project (ADMIN only). Its images stay in the image library, unlinked. */
export async function deleteProject(id: string): Promise<ActionResult> {
  const actor = await requireRole("ADMIN");
  const title = await projectTitle(id);
  if (!title) return { ok: false, error: "This project no longer exists." };
  await db.portfolioProject.delete({ where: { id } });
  await audit(actor, {
    action: "project.delete",
    entityType: "PortfolioProject",
    entityId: id,
    summary: `Deleted ${title}`,
  });
  revalidateContent("portfolio", "gallery");
  revalidatePath("/admin", "layout");
  return { ok: true };
}

export type AddImagesResult = { ok: true; added: number } | { ok: false; error: string };

/**
 * Records photos uploaded to Vercel Blob as images of a project (ADMIN only): numbered alt
 * text to refine later, consent ticked, shown in the gallery under the project's category.
 * The first photo becomes the cover if the project has none.
 */
export async function addProjectImages(
  projectId: string,
  input: unknown,
): Promise<AddImagesResult> {
  const actor = await requireRole("ADMIN");
  const parsed = projectImagesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const project = await db.portfolioProject.findUnique({
    where: { id: projectId },
    select: { title: true, category: true, coverId: true, _count: { select: { images: true } } },
  });
  if (!project) return { ok: false, error: "This project no longer exists." };

  const { altPrefix, images } = parsed.data;
  const start = project._count.images;
  const created = await db.$transaction(
    images.map((image, index) =>
      db.image.create({
        data: {
          publicId: image.url,
          width: image.width,
          height: image.height,
          blurDataUrl: image.blurDataUrl,
          alt: uploadedPhotoAlt(altPrefix, start + index + 1),
          category: project.category,
          consentToPublish: true,
          projectId,
          sortOrder: start + index,
        },
        select: { id: true },
      }),
    ),
  );
  if (!project.coverId) {
    await db.portfolioProject.update({
      where: { id: projectId },
      data: { coverId: created[0].id },
    });
  }
  await audit(actor, {
    action: "image.upload",
    entityType: "PortfolioProject",
    entityId: projectId,
    summary: `${project.title}: ${images.length} photo${images.length === 1 ? "" : "s"} uploaded`,
  });
  revalidateContent("portfolio", "gallery");
  revalidatePath("/admin", "layout");
  return { ok: true, added: images.length };
}

export type ProcessPhotoResult =
  | {
      ok: true;
      photo: { url: string; width: number; height: number; blurDataUrl: string };
      bytes: { before: number; after: number };
    }
  | { ok: false; error: string };

/**
 * Converts one photo the browser just uploaded (to `portfolio/_incoming/…`) into a web-ready
 * WebP next to the project's other photos, then deletes the original (ADMIN only).
 */
export async function processProjectPhoto(
  projectSlug: string,
  originalUrl: string,
): Promise<ProcessPhotoResult> {
  await requireRole("ADMIN");
  if (
    !isBlobUrl(originalUrl) ||
    !new URL(originalUrl).pathname.startsWith("/portfolio/_incoming/")
  ) {
    return { ok: false, error: "Not an uploaded photo." };
  }
  try {
    const response = await fetch(originalUrl, { cache: "no-store" });
    if (!response.ok) return { ok: false, error: "The uploaded photo couldn't be read." };
    const original = Buffer.from(await response.arrayBuffer());
    if (original.length > MAX_UPLOAD_BYTES) return { ok: false, error: "The photo is too large." };

    const optimized = await optimizePhoto(original);
    const name = new URL(originalUrl).pathname
      .split("/")
      .pop()!
      .replace(/\.[a-z0-9]+$/i, "");
    const folder = projectSlug.replace(/[^a-z0-9-]/g, "") || "project";
    const stored = await put(`portfolio/${folder}/${name}.webp`, optimized.webp, {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: true,
    });
    return {
      ok: true,
      photo: {
        url: stored.url,
        width: optimized.width,
        height: optimized.height,
        blurDataUrl: optimized.blurDataUrl,
      },
      bytes: { before: original.length, after: optimized.webp.length },
    };
  } catch (error) {
    console.error("[admin] processProjectPhoto failed", error);
    return { ok: false, error: "This file couldn't be converted. Is it a photo?" };
  } finally {
    // The original is never shown; remove it whether or not conversion worked.
    await del(originalUrl).catch(() => {});
  }
}
