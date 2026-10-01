import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";

import { CACHE_TAGS } from "./home";

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
  { tags: [CACHE_TAGS.portfolio], revalidate: 3600 },
);

/** All published case studies, newest first. The sample flag is part of the cache key. */
export const getPublishedProjects = () => cachedPublishedProjects(shouldShowSampleContent());

export type ProjectSummary = Awaited<ReturnType<typeof getPublishedProjects>>[number];
