import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

const cachedPublishedReviews = unstable_cache(
  async (includeSamples: boolean) =>
    db.review.findMany({
      // Never auto-published: only admin-approved reviews with consent (AGENTS.md §6.7).
      where: {
        status: "APPROVED",
        consentToPublish: true,
        ...(includeSamples ? {} : { isSample: false }),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        authorName: true,
        authorTitle: true,
        company: true,
        logoPublicId: true,
        logoPermission: true,
        rating: true,
        category: true,
        body: true,
        locale: true,
        verified: true,
        isSample: true,
        createdAt: true,
      },
    }),
  ["reviews:published"],
  { tags: [CACHE_TAGS.reviews], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/**
 * Approved, consented reviews; the sample flag is part of the cache key. unstable_cache
 * stores JSON, so Dates come back as strings on a cache hit — revive them here.
 */
export const getPublishedReviews = async () =>
  (await cachedPublishedReviews(shouldShowSampleContent())).map((review) => ({
    ...review,
    createdAt: new Date(review.createdAt),
  }));

export type PublishedReview = Awaited<ReturnType<typeof getPublishedReviews>>[number];
