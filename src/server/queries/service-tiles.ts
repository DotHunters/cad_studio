import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";
import { categoryPhoto, localPublicId } from "@/lib/photos";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

export type TileImage = {
  publicId: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
};

const tileImageSelect = { publicId: true, width: true, height: true, blurDataUrl: true } as const;

/** The first launch photo of a service, as a stored image; null when there is none yet. */
export function defaultTileImage(slug: string): TileImage | null {
  const photo = categoryPhoto(slug);
  return photo
    ? {
        publicId: localPublicId(photo.src),
        width: photo.width,
        height: photo.height,
        blurDataUrl: photo.blurDataUrl,
      }
    : null;
}

// The sample flag is an argument so it is part of the cache key (see queries/home.ts).
const cachedTileImages = unstable_cache(
  async (includeSamples: boolean) => {
    const services = await db.service.findMany({
      select: {
        slug: true,
        tileImage: { select: { ...tileImageSelect, consentToPublish: true, isSample: true } },
      },
    });
    return Object.fromEntries(
      services.map(({ slug, tileImage }) => {
        // A chosen photo whose consent is later withdrawn falls back to the default.
        if (tileImage && tileImage.consentToPublish && (includeSamples || !tileImage.isSample)) {
          const { publicId, width, height, blurDataUrl } = tileImage;
          return [slug, { publicId, width, height, blurDataUrl }];
        }
        return [slug, defaultTileImage(slug)];
      }),
    ) as Record<string, TileImage | null>;
  },
  ["home:service-tiles"],
  {
    tags: [CACHE_TAGS.services, CACHE_TAGS.gallery, CACHE_TAGS.portfolio],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

/** Photo for each home-page service tile: the admin's choice, else the first launch photo. */
export const getServiceTileImages = () => cachedTileImages(shouldShowSampleContent());

/** Photos that may go on a tile (consent given), the service's own photos first. Uncached. */
export async function getServiceTileOptions(slug: string) {
  const [service, images] = await Promise.all([
    db.service.findUnique({ where: { slug }, select: { tileImageId: true } }),
    db.image.findMany({
      where: { consentToPublish: true, ...(shouldShowSampleContent() ? {} : { isSample: false }) },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, alt: true, category: true, ...tileImageSelect },
    }),
  ]);
  if (!service) return null;
  return {
    currentId: service.tileImageId,
    defaultImage: defaultTileImage(slug),
    sameCategory: images.filter((image) => image.category === slug),
    others: images.filter((image) => image.category !== slug),
  };
}
