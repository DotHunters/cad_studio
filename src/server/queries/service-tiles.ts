import "server-only";

import { unstable_cache } from "next/cache";

import { type CategorySlug, categorySlugs, slugFromCategory } from "@/lib/categories";
import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";
import { categoryPhoto, localPublicId } from "@/lib/photos";
import { parseServiceTileChoices, SERVICE_TILES_KEY } from "@/lib/service-tiles";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

export type TileImage = {
  publicId: string;
  width: number;
  height: number;
  blurDataUrl: string | null;
};

const tileImageSelect = { publicId: true, width: true, height: true, blurDataUrl: true } as const;

/** The first launch photo of a category, as a stored image; null when there is none yet. */
function defaultTileImage(slug: CategorySlug): TileImage | null {
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

async function readChoices() {
  const setting = await db.siteSetting.findUnique({ where: { key: SERVICE_TILES_KEY } });
  return parseServiceTileChoices(setting?.value);
}

// The sample flag is an argument so it is part of the cache key (see queries/home.ts).
const cachedTileImages = unstable_cache(
  async (includeSamples: boolean) => {
    const choices = await readChoices();
    const chosen = await db.image.findMany({
      where: {
        id: { in: Object.values(choices) },
        // A chosen photo whose consent is later withdrawn falls back to the default.
        consentToPublish: true,
        ...(includeSamples ? {} : { isSample: false }),
      },
      select: { id: true, ...tileImageSelect },
    });
    const byId = new Map(chosen.map(({ id, ...image }) => [id, image]));
    return Object.fromEntries(
      categorySlugs.map((slug) => {
        const id = choices[slug];
        return [slug, (id && byId.get(id)) || defaultTileImage(slug)];
      }),
    ) as Record<CategorySlug, TileImage | null>;
  },
  ["home:service-tiles"],
  {
    tags: [CACHE_TAGS.settings, CACHE_TAGS.gallery, CACHE_TAGS.portfolio],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

/** Photo for each home-page service tile: the admin's choice, else the first launch photo. */
export const getServiceTileImages = () => cachedTileImages(shouldShowSampleContent());

/** Admin overview: each tile's current photo and whether it is a choice or the default. */
export async function getServiceTilesForAdmin() {
  const [choices, images] = await Promise.all([readChoices(), getServiceTileImages()]);
  return categorySlugs.map((slug) => ({
    slug,
    image: images[slug],
    chosen: Boolean(choices[slug]),
  }));
}

/** Photos that may go on a tile (consent given), the tile's own category first. Uncached. */
export async function getServiceTileOptions(slug: CategorySlug) {
  const [choices, images] = await Promise.all([
    readChoices(),
    db.image.findMany({
      where: {
        consentToPublish: true,
        ...(shouldShowSampleContent() ? {} : { isSample: false }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true, alt: true, category: true, ...tileImageSelect },
    }),
  ]);
  const inCategory = (image: (typeof images)[number]) =>
    image.category !== null && slugFromCategory(image.category) === slug;
  return {
    currentId: choices[slug] ?? null,
    defaultImage: defaultTileImage(slug),
    sameCategory: images.filter(inCategory),
    others: images.filter((image) => !inCategory(image)),
  };
}
