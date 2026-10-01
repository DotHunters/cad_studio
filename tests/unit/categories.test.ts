import { describe, expect, it } from "vitest";

import { categoryFromSlug, categorySlugs, slugFromCategory } from "@/lib/categories";

describe("categories", () => {
  it("lists the six services from AGENTS.md §1", () => {
    expect(categorySlugs).toEqual([
      "corporate",
      "wedding",
      "family",
      "gathering",
      "professional",
      "product",
    ]);
  });

  it("maps slugs to DB enum values and back", () => {
    for (const slug of categorySlugs) {
      const category = categoryFromSlug(slug);
      expect(category).toBe(slug.toUpperCase());
      expect(slugFromCategory(category!)).toBe(slug);
    }
  });

  it("rejects unknown or differently-cased slugs", () => {
    expect(categoryFromSlug("birthday")).toBeNull();
    expect(categoryFromSlug("WEDDING")).toBeNull();
    expect(categoryFromSlug("")).toBeNull();
  });
});
