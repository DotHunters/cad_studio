import { type CategorySlug, categoryFromSlug } from "@/lib/categories";

/** Images per "load more" step. */
export const GALLERY_PAGE_SIZE = 12;
const MAX_PAGE = 50;

export type GalleryFilters = { category: CategorySlug | null; tag: string | null; page: number };

type SearchParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

/** Reads `?category=&tag=&page=`; invalid or repeated values are ignored. */
export function parseGalleryFilters(params: SearchParams): GalleryFilters {
  const category = single(params.category);
  const tag = single(params.tag)?.trim();
  const page = Number(single(params.page));
  return {
    category: category && categoryFromSlug(category) ? (category as CategorySlug) : null,
    tag: tag || null,
    page: Number.isInteger(page) && page > 0 ? Math.min(page, MAX_PAGE) : 1,
  };
}

type Filterable = { category: string | null; tags: readonly string[] };

export function filterGallery<T extends Filterable>(
  images: readonly T[],
  filters: GalleryFilters,
): T[] {
  return images.filter(
    (image) =>
      (!filters.category || image.category === filters.category.toUpperCase()) &&
      (!filters.tag || image.tags.includes(filters.tag)),
  );
}

/** Unique tags, most used first (ties alphabetical). */
export function galleryTags(images: readonly Filterable[]): string[] {
  const counts = new Map<string, number>();
  for (const image of images)
    for (const tag of image.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts.entries()]
    .sort(([a, countA], [b, countB]) => countB - countA || a.localeCompare(b))
    .map(([tag]) => tag);
}

/** "Load more" pagination: page N shows the first N × size items. */
export function paginateGallery<T>(items: readonly T[], page: number) {
  const visible = items.slice(0, page * GALLERY_PAGE_SIZE);
  return { items: visible, hasMore: items.length > visible.length };
}

export function galleryHref(current: GalleryFilters, change: Partial<GalleryFilters>) {
  const next = { ...current, page: 1, ...change };
  const query: Record<string, string> = {};
  if (next.category) query.category = next.category;
  if (next.tag) query.tag = next.tag;
  if (next.page > 1) query.page = String(next.page);
  return { pathname: "/gallery" as const, query };
}
