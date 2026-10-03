/**
 * The owner's photos, optimized by `pnpm photos` (scripts/optimize-photos.mjs) into
 * `public/photos`. Hero, owner portrait and section backgrounds read this manifest directly;
 * portfolio and gallery images are seeded into the DB from it (prisma/seed.ts).
 */
import manifest from "@/data/photos.json";

import type { Category } from "@/generated/prisma/enums";

import { type CategorySlug, categoryFromSlug } from "./categories";

export type Photo = { src: string; width: number; height: number; blurDataUrl: string };

export type PhotoGroup = {
  slug: string;
  category: Category;
  tags: string[];
  title: string;
  titleFr: string;
  alt: string;
  altFr: string;
  featured: boolean;
  /** Most common EXIF year in the set; null when the photos carry no date. */
  year: number | null;
  images: Photo[];
};

export type HeroPhoto = Photo & { group: string; position: string };

type Manifest = {
  groups: PhotoGroup[];
  hero: HeroPhoto[];
  owner: Photo[];
  background: Photo[];
};

export const photos = manifest as Manifest;

/** DB `Image.publicId` for a local photo: `/photos/a/a-01.webp` → `local/photos/a/a-01.webp`. */
export function localPublicId(src: string): string {
  return `local${src}`;
}

/** First photo of the first group in a category (category tiles), or null if none yet. */
export function categoryPhoto(
  slug: CategorySlug,
  groups: readonly PhotoGroup[] = photos.groups,
): Photo | null {
  const category = categoryFromSlug(slug);
  return groups.find((group) => group.category === category)?.images[0] ?? null;
}
