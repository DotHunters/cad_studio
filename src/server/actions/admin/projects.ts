"use server";

import { redirect } from "next/navigation";

import { Prisma } from "@/generated/prisma/client";
import { categoryFromSlug } from "@/lib/categories";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { nextPublishedAt, projectFormSchema } from "@/lib/validators/admin/project";
import { requireRole } from "@/server/auth/guards";
import { revalidateContent } from "@/server/cache";

import type { SaveResult } from "./packages";

/**
 * Creates (no id) or updates a portfolio project (AGENTS.md §6.3, §6.10). ADMIN only.
 * Projects are unpublished rather than deleted. Images are managed separately.
 */
export async function saveProject(id: string | null, input: unknown): Promise<SaveResult> {
  await requireRole("ADMIN");
  const parsed = projectFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const { category, published, ...rest } = parsed.data;
  try {
    const current = id
      ? await db.portfolioProject.findUnique({ where: { id }, select: { publishedAt: true } })
      : null;
    if (id && !current) return { ok: false, error: "server" };
    const data = {
      ...rest,
      category: categoryFromSlug(category)!,
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

  // Portfolio list/detail, the home page and the gallery read projects.
  revalidateContent("portfolio");
  redirect(`/admin/portfolio?saved=${encodeURIComponent(rest.slug)}`);
}
