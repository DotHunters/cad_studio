import { type CategorySlug, categoryFromSlug } from "@/lib/categories";

export type ReachSlug = "local" | "global";

export type PortfolioFilters = {
  category: CategorySlug | null;
  reach: ReachSlug | null;
  year: number | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

const single = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);

/** Reads `?category=&reach=&year=` — invalid or repeated values are ignored. */
export function parsePortfolioFilters(params: SearchParams): PortfolioFilters {
  const category = single(params.category);
  const reach = single(params.reach);
  const year = single(params.year);
  return {
    category: category && categoryFromSlug(category) ? (category as CategorySlug) : null,
    reach: reach === "local" || reach === "global" ? reach : null,
    year: year && /^\d{4}$/.test(year) ? Number(year) : null,
  };
}

type Filterable = { category: string; reach: string; year: number | null };

export function filterProjects<T extends Filterable>(
  projects: readonly T[],
  filters: PortfolioFilters,
): T[] {
  return projects.filter(
    (project) =>
      (!filters.category || project.category === filters.category.toUpperCase()) &&
      (!filters.reach || project.reach === filters.reach.toUpperCase()) &&
      (!filters.year || project.year === filters.year),
  );
}

/** Link target that changes some filters and keeps the rest (works without JavaScript). */
export function filterHref(current: PortfolioFilters, change: Partial<PortfolioFilters>) {
  const next = { ...current, ...change };
  const query: Record<string, string> = {};
  if (next.category) query.category = next.category;
  if (next.reach) query.reach = next.reach;
  if (next.year) query.year = String(next.year);
  return { pathname: "/portfolio" as const, query };
}

/** "Toronto, Canada" — empty when the owner hasn't filled in the location yet. */
export function projectPlace(project: { city: string | null; country: string }): string {
  return [project.city, project.country].filter(Boolean).join(", ");
}

/** Distinct known years, newest first (projects without a year are left out). */
export function projectYears(projects: readonly { year: number | null }[]): number[] {
  const years = projects.map((project) => project.year).filter((year) => year !== null);
  return [...new Set(years)].sort((a, b) => b - a);
}
