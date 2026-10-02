import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";

import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

const cachedPublishedProjects = unstable_cache(
  async (includeSamples: boolean) => {
    const projects = await db.portfolioProject.findMany({
      where: { publishedAt: { not: null }, ...(includeSamples ? {} : { isSample: false }) },
      orderBy: [{ year: "desc" }, { publishedAt: "desc" }],
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    return projects.map(({ images, ...project }) => ({
      ...project,
      // Client names appear only with consent (AGENTS.md §13).
      clientName: project.consentToPublish ? project.clientName : null,
      cover: images.find((image) => image.id === project.coverId) ?? images[0] ?? null,
    }));
  },
  ["portfolio:published"],
  { tags: [CACHE_TAGS.portfolio], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** All published case studies, newest first. The sample flag is part of the cache key. */
export const getPublishedProjects = () => cachedPublishedProjects(shouldShowSampleContent());

export type ProjectSummary = Awaited<ReturnType<typeof getPublishedProjects>>[number];

const cachedProjectBySlug = unstable_cache(
  async (slug: string, includeSamples: boolean) => {
    const project = await db.portfolioProject.findFirst({
      where: { slug, publishedAt: { not: null }, ...(includeSamples ? {} : { isSample: false }) },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!project) return null;

    const clientName = project.consentToPublish ? project.clientName : null;
    // A published recommendation from the same (consented) client, if any.
    const recommendation = clientName
      ? await db.review.findFirst({
          where: {
            type: "RECOMMENDATION",
            status: "APPROVED",
            consentToPublish: true,
            company: clientName,
            ...(includeSamples ? {} : { isSample: false }),
          },
          orderBy: { createdAt: "desc" },
        })
      : null;

    return { ...project, clientName, recommendation };
  },
  ["portfolio:by-slug"],
  { tags: [CACHE_TAGS.portfolio, CACHE_TAGS.reviews], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** One published case study with all its images, or null (unknown, unpublished or hidden sample). */
export const getProjectBySlug = (slug: string) =>
  cachedProjectBySlug(slug, shouldShowSampleContent());

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProjectBySlug>>>;
