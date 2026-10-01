import "server-only";

import { revalidateTag } from "next/cache";

/**
 * Cache tags for public content (AGENTS.md §10). Queries tag their unstable_cache entries;
 * admin mutations call `revalidateContent()` so edits appear without a deploy.
 */
export const CACHE_TAGS = {
  packages: "packages",
  portfolio: "portfolio",
  gallery: "gallery",
  reviews: "reviews",
  settings: "settings",
} as const;

export type ContentKind = keyof typeof CACHE_TAGS;

/** Default time-based revalidation for cached content queries (seconds). */
export const CONTENT_REVALIDATE_SECONDS = 3600;

/** Invalidate cached content after an admin change, e.g. `revalidateContent("gallery")`. */
export function revalidateContent(...kinds: ContentKind[]): void {
  for (const kind of new Set(kinds)) revalidateTag(CACHE_TAGS[kind]);
}
