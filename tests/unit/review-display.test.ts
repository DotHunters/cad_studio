import { describe, expect, it } from "vitest";

import {
  applyReviewFilters,
  customerDisplayName,
  parseReviewFilters,
  reviewsHref,
} from "@/lib/review-display";

describe("customerDisplayName", () => {
  it.each([
    ["Alex Martin", "Alex M."],
    ["  alex   martin ", "alex M."],
    ["Marie-Ève Côté", "Marie-Ève C."],
    ["Jean Paul Tremblay", "Jean T."],
    ["Alex M.", "Alex M."],
    ["Alex M", "Alex M."],
    ["Alex", "Alex"],
    ["", ""],
  ])("%j → %j", (input, expected) => {
    expect(customerDisplayName(input)).toBe(expected);
  });
});

describe("parseReviewFilters", () => {
  it("reads category and sort, defaulting to newest", () => {
    expect(parseReviewFilters({ category: "wedding", sort: "highest" })).toEqual({
      category: "wedding",
      sort: "highest",
    });
    expect(parseReviewFilters({ category: "bad slug", sort: "random" })).toEqual({
      category: null,
      sort: "newest",
    });
  });
});

describe("applyReviewFilters", () => {
  const day = (n: number) => new Date(Date.UTC(2026, 0, n));
  const reviews = [
    { id: "a", rating: 4, createdAt: day(3), category: "wedding" },
    { id: "b", rating: 5, createdAt: day(1), category: "family" },
    { id: "c", rating: 5, createdAt: day(2), category: "wedding" },
    { id: "d", rating: null, createdAt: day(4), category: null },
  ];
  const ids = (list: Array<{ id: string }>) => list.map((review) => review.id);

  it("sorts newest first by default", () => {
    expect(ids(applyReviewFilters(reviews, { category: null, sort: "newest" }))).toEqual([
      "d",
      "a",
      "c",
      "b",
    ]);
  });

  it("sorts by rating, newest first among ties", () => {
    expect(ids(applyReviewFilters(reviews, { category: null, sort: "highest" }))).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
  });

  it("filters by category", () => {
    expect(ids(applyReviewFilters(reviews, { category: "wedding", sort: "newest" }))).toEqual([
      "a",
      "c",
    ]);
  });
});

describe("reviewsHref", () => {
  it("keeps filters and omits defaults", () => {
    expect(reviewsHref({ category: "wedding", sort: "newest" }, { sort: "highest" })).toEqual({
      pathname: "/reviews",
      query: { category: "wedding", sort: "highest" },
    });
    expect(
      reviewsHref({ category: "wedding", sort: "highest" }, { category: null, sort: "newest" }),
    ).toEqual({
      pathname: "/reviews",
      query: {},
    });
  });
});
