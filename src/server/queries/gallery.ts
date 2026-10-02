import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";

import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

const cachedGalleryImages = unstable_cache(
  async (includeSamples: boolean) =>
    db.image.findMany({
      // Only images the admin marked for the gallery and with client consent (AGENTS.md §9).
      where: {
        inGallery: true,
        consentToPublish: true,
        ...(includeSamples ? {} : { isSample: false }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        publicId: true,
        width: true,
        height: true,
        blurDataUrl: true,
        alt: true,
        altFr: true,
        category: true,
        tags: true,
        isSample: true,
      },
    }),
  ["gallery:images"],
  { tags: [CACHE_TAGS.gallery, CACHE_TAGS.portfolio], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** Gallery images in display order. The sample flag is part of the cache key. */
export const getGalleryImages = () => cachedGalleryImages(shouldShowSampleContent());

export type GalleryImage = Awaited<ReturnType<typeof getGalleryImages>>[number];
