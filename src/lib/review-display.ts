import { type CategorySlug, categoryFromSlug } from "@/lib/categories";

/**
 * Public display rules for reviews (AGENTS.md §6.7). Customer names show as first name +
 * last initial by default ("Alex Martin" → "Alex M."); recommendations show the full name.
 */
export function customerDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? "";
  const last = parts[parts.length - 1];
  // Already abbreviated ("Alex M.") or a single letter: keep it as written.
  if (/^\p{L}\.?$/u.test(last)) return `${parts[0]} ${last.replace(/\.?$/, ".")}`;
  return `${parts[0]} ${last[0].toLocaleUpperCase()}.`;
}

export type ReviewSort = "newest" | "highest";

export type ReviewFilters = { category: CategorySlug | null; sort: ReviewSort };

type SearchParams = Record<string, string | string[] | undefined>;
const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

export function parseReviewFilters(params: SearchParams): ReviewFilters {
  const category = single(params.category);
  return {
    category: category && categoryFromSlug(category) ? (category as CategorySlug) : null,
    sort: single(params.sort) === "highest" ? "highest" : "newest",
  };
}

type Sortable = { rating: number | null; createdAt: Date; category: string | null };

/** Filters by category and sorts newest first, or highest rating first (ties: newest). */
export function applyReviewFilters<T extends Sortable>(
  reviews: readonly T[],
  filters: ReviewFilters,
): T[] {
  const category = filters.category ? filters.category.toUpperCase() : null;
  return reviews
    .filter((review) => !category || review.category === category)
    .slice()
    .sort((a, b) => {
      if (filters.sort === "highest") {
        const byRating = (b.rating ?? 0) - (a.rating ?? 0);
        if (byRating !== 0) return byRating;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
}

export function reviewsHref(current: ReviewFilters, change: Partial<ReviewFilters>) {
  const next = { ...current, ...change };
  const query: Record<string, string> = {};
  if (next.category) query.category = next.category;
  if (next.sort !== "newest") query.sort = next.sort;
  return { pathname: "/reviews" as const, query };
}
