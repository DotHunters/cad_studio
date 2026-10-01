/**
 * Service categories (AGENTS.md §1). URL slugs are lowercase; the DB enum is uppercase.
 */
import type { Category } from "@/generated/prisma/enums";

export const categorySlugs = [
  "corporate",
  "wedding",
  "family",
  "gathering",
  "professional",
  "product",
] as const;

export type CategorySlug = (typeof categorySlugs)[number];

export function categoryFromSlug(slug: string): Category | null {
  return (categorySlugs as readonly string[]).includes(slug)
    ? (slug.toUpperCase() as Category)
    : null;
}

export function slugFromCategory(category: Category): CategorySlug {
  return category.toLowerCase() as CategorySlug;
}
