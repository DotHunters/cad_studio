import { describe, expect, it } from "vitest";

import { averageRating } from "@/lib/reviews";

describe("averageRating", () => {
  it("returns null with no ratings", () => {
    expect(averageRating([])).toBeNull();
    expect(averageRating([null, undefined])).toBeNull();
  });

  it("averages to one decimal", () => {
    expect(averageRating([5, 4, 4])).toBe(4.3);
    expect(averageRating([5, 5])).toBe(5);
  });

  it("ignores missing and out-of-range ratings", () => {
    expect(averageRating([5, null, 0, 6, 3])).toBe(4);
  });
});
