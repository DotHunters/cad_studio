import { type CategorySlug, categorySlugs } from "./categories";

/**
 * The photo on each home-page service tile, chosen in Admin → Service tiles. Stored as one
 * `SiteSetting` row mapping category slug → `Image.id`; a missing entry means "use the first
 * launch photo of that category" (`categoryPhoto`).
 */
export const SERVICE_TILES_KEY = "SERVICE_TILE_IMAGES";

export type ServiceTileChoices = Partial<Record<CategorySlug, string>>;

/** Reads the stored setting, dropping unknown categories and empty or non-string ids. */
export function parseServiceTileChoices(value: unknown): ServiceTileChoices {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const choices: ServiceTileChoices = {};
  for (const slug of categorySlugs) {
    const id = record[slug];
    if (typeof id === "string" && id.trim()) choices[slug] = id.trim();
  }
  return choices;
}

/** Sets (or, with `null`, clears) one category's choice, leaving the others as they are. */
export function withServiceTileChoice(
  choices: ServiceTileChoices,
  slug: CategorySlug,
  imageId: string | null,
): ServiceTileChoices {
  const next = { ...choices };
  if (imageId) next[slug] = imageId;
  else delete next[slug];
  return next;
}
