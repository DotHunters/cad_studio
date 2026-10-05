import { describe, expect, it } from "vitest";

import { parseServiceTileChoices, withServiceTileChoice } from "@/lib/service-tiles";

describe("parseServiceTileChoices", () => {
  it("keeps image ids for known categories", () => {
    expect(parseServiceTileChoices({ wedding: "img1", corporate: " img2 " })).toEqual({
      wedding: "img1",
      corporate: "img2",
    });
  });

  it("drops unknown categories, empty and non-string ids", () => {
    expect(
      parseServiceTileChoices({
        WEDDING: "x",
        party: "y",
        family: "",
        product: 3,
        gathering: null,
      }),
    ).toEqual({});
  });

  it("treats anything but an object as no choices", () => {
    for (const value of [null, undefined, "wedding", 1, ["img1"]]) {
      expect(parseServiceTileChoices(value)).toEqual({});
    }
  });
});

describe("withServiceTileChoice", () => {
  it("sets one category and keeps the rest", () => {
    expect(withServiceTileChoice({ wedding: "a" }, "family", "b")).toEqual({
      wedding: "a",
      family: "b",
    });
  });

  it("clears a category back to the default", () => {
    const before = { wedding: "a", family: "b" };
    expect(withServiceTileChoice(before, "wedding", null)).toEqual({ family: "b" });
    expect(before).toEqual({ wedding: "a", family: "b" });
  });
});
