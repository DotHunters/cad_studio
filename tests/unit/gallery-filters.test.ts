import { describe, expect, it } from "vitest";

import {
  GALLERY_PAGE_SIZE,
  galleryHref,
  paginateGallery,
  parseGalleryFilters,
  filterGallery,
  galleryTags,
} from "@/lib/gallery-filters";

const images = [
  { category: "WEDDING", tags: ["outdoor", "sample"] },
  { category: "WEDDING", tags: ["sample"] },
  { category: "PRODUCT", tags: ["flat-lay"] },
  { category: null, tags: [] },
] as const;

describe("parseGalleryFilters", () => {
  it("reads category, tag and page", () => {
    expect(parseGalleryFilters({ category: "wedding", tag: "outdoor", page: "2" })).toEqual({
      category: "wedding",
      tag: "outdoor",
      page: 2,
    });
  });

  it("ignores invalid values and defaults to page 1", () => {
    expect(parseGalleryFilters({ category: "x", tag: ["a", "b"], page: "-3" })).toEqual({
      category: null,
      tag: null,
      page: 1,
    });
    expect(parseGalleryFilters({ page: "abc" }).page).toBe(1);
  });

  it("caps the page to keep requests bounded", () => {
    expect(parseGalleryFilters({ page: "9999" }).page).toBe(50);
  });
});

describe("filterGallery", () => {
  it("filters by category and tag together", () => {
    expect(filterGallery(images, { category: "wedding", tag: null, page: 1 })).toHaveLength(2);
    expect(filterGallery(images, { category: "wedding", tag: "outdoor", page: 1 })).toEqual([
      images[0],
    ]);
    expect(filterGallery(images, { category: null, tag: "flat-lay", page: 1 })).toEqual([
      images[2],
    ]);
  });
});

describe("galleryTags", () => {
  it("lists unique tags sorted by how often they appear", () => {
    expect(galleryTags(images)).toEqual(["sample", "flat-lay", "outdoor"]);
  });
});

describe("paginateGallery", () => {
  const many = Array.from({ length: GALLERY_PAGE_SIZE * 2 + 3 }, (_, index) => index);

  it("shows page × size items and reports whether more exist", () => {
    expect(paginateGallery(many, 1)).toEqual({
      items: many.slice(0, GALLERY_PAGE_SIZE),
      hasMore: true,
    });
    expect(paginateGallery(many, 3)).toEqual({ items: many, hasMore: false });
  });
});

describe("galleryHref", () => {
  it("keeps filters and resets the page unless given", () => {
    const current = { category: "wedding" as const, tag: "outdoor", page: 3 };
    expect(galleryHref(current, { tag: null })).toEqual({
      pathname: "/gallery",
      query: { category: "wedding" },
    });
    expect(galleryHref(current, { page: 4 })).toEqual({
      pathname: "/gallery",
      query: { category: "wedding", tag: "outdoor", page: "4" },
    });
  });
});
