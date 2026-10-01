import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";

/** Cache tags; admin edits call revalidateTag() with these (AGENTS.md §10). */
export const CACHE_TAGS = {
  portfolio: "portfolio",
  reviews: "reviews",
  gallery: "gallery",
} as const;

const REVALIDATE_SECONDS = 3600;

/** Excludes fictional sample rows unless sample content is enabled (never in production). */
function sampleFilter(includeSamples: boolean) {
  return includeSamples ? {} : { isSample: false };
}

// The sample flag is passed as an argument (not read inside) so it becomes part of the
// unstable_cache key — otherwise results cached under one setting leak into the other.

const cachedFeaturedProjects = unstable_cache(
  async (limit: number, includeSamples: boolean) => {
    const projects = await db.portfolioProject.findMany({
      where: { featured: true, publishedAt: { not: null }, ...sampleFilter(includeSamples) },
      orderBy: [{ year: "desc" }, { publishedAt: "desc" }],
      take: limit,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
    });
    return projects.map((project) => ({
      ...project,
      // Client names appear only with consent (AGENTS.md §13).
      clientName: project.consentToPublish ? project.clientName : null,
      cover: project.images.find((image) => image.id === project.coverId) ?? project.images[0],
    }));
  },
  ["home:featured-projects"],
  { tags: [CACHE_TAGS.portfolio], revalidate: REVALIDATE_SECONDS },
);

const cachedHomeReviews = unstable_cache(
  async (limit: number, includeSamples: boolean) => {
    const where = {
      status: "APPROVED" as const,
      consentToPublish: true,
      ...sampleFilter(includeSamples),
    };
    const [featured, ratings] = await Promise.all([
      db.review.findMany({
        where: { ...where, featured: true },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      db.review.findMany({
        where: { ...where, type: "CUSTOMER", rating: { not: null } },
        select: { rating: true },
      }),
    ]);
    return { featured, ratings: ratings.map((review) => review.rating) };
  },
  ["home:reviews"],
  { tags: [CACHE_TAGS.reviews], revalidate: REVALIDATE_SECONDS },
);

/** Client names for the "trusted by" strip: consented, published projects. */
const cachedClientNames = unstable_cache(
  async (includeSamples: boolean) => {
    const projects = await db.portfolioProject.findMany({
      where: {
        consentToPublish: true,
        clientName: { not: null },
        publishedAt: { not: null },
        ...sampleFilter(includeSamples),
      },
      select: { clientName: true },
      distinct: ["clientName"],
      orderBy: { clientName: "asc" },
    });
    return projects.map((project) => project.clientName!);
  },
  ["home:client-names"],
  { tags: [CACHE_TAGS.portfolio], revalidate: REVALIDATE_SECONDS },
);

export const getFeaturedProjects = (limit = 3) =>
  cachedFeaturedProjects(limit, shouldShowSampleContent());

export const getHomeReviews = (limit = 8) => cachedHomeReviews(limit, shouldShowSampleContent());

export const getClientNames = () => cachedClientNames(shouldShowSampleContent());
