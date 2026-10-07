import { describe, expect, it } from "vitest";

import {
  addHeroSlide,
  heroImageSrc,
  MAX_HERO_SLIDES,
  moveHeroSlide,
  parseHeroSlides,
  removeHeroSlide,
  setHeroSlideFocus,
} from "@/lib/hero-slides";

describe("parseHeroSlides", () => {
  it("keeps valid slides in order", () => {
    expect(
      parseHeroSlides([
        { imageId: "a", focus: "top" },
        { imageId: " b ", focus: "bottom" },
      ]),
    ).toEqual([
      { imageId: "a", focus: "top" },
      { imageId: "b", focus: "bottom" },
    ]);
  });

  it("defaults an unknown focus to centre and drops bad or repeated entries", () => {
    expect(
      parseHeroSlides([
        { imageId: "a", focus: "left" },
        { imageId: "a", focus: "top" },
        { imageId: "" },
        { focus: "top" },
        "c",
        null,
      ]),
    ).toEqual([{ imageId: "a", focus: "center" }]);
  });

  it("caps the list", () => {
    const many = Array.from({ length: MAX_HERO_SLIDES + 3 }, (_, i) => ({ imageId: `i${i}` }));
    expect(parseHeroSlides(many)).toHaveLength(MAX_HERO_SLIDES);
  });

  it("treats anything but an array as no slides", () => {
    for (const value of [null, undefined, "a", 1, { imageId: "a" }]) {
      expect(parseHeroSlides(value)).toEqual([]);
    }
  });
});

describe("list edits", () => {
  const slides = [
    { imageId: "a", focus: "center" as const },
    { imageId: "b", focus: "top" as const },
    { imageId: "c", focus: "bottom" as const },
  ];

  it("adds to the end, ignoring repeats and a full list", () => {
    expect(addHeroSlide(slides, "d").map((s) => s.imageId)).toEqual(["a", "b", "c", "d"]);
    expect(addHeroSlide(slides, "b")).toEqual(slides);
    const full = Array.from({ length: MAX_HERO_SLIDES }, (_, i) => ({
      imageId: `i${i}`,
      focus: "center" as const,
    }));
    expect(addHeroSlide(full, "x")).toEqual(full);
  });

  it("removes, moves and refocuses one slide", () => {
    expect(removeHeroSlide(slides, "b").map((s) => s.imageId)).toEqual(["a", "c"]);
    expect(moveHeroSlide(slides, "b", "up").map((s) => s.imageId)).toEqual(["b", "a", "c"]);
    expect(moveHeroSlide(slides, "c", "down")).toEqual(slides);
    expect(setHeroSlideFocus(slides, "a", "bottom")[0]).toEqual({ imageId: "a", focus: "bottom" });
  });
});

describe("heroImageSrc", () => {
  it("serves launch photos and uploads, nothing else", () => {
    expect(heroImageSrc("local/photos/a/a-01.webp")).toBe("/photos/a/a-01.webp");
    const blob = "https://abc.public.blob.vercel-storage.com/x.jpg";
    expect(heroImageSrc(blob)).toBe(blob);
    expect(heroImageSrc("placeholder/wedding-1")).toBeNull();
    expect(heroImageSrc("cad/old-cloudinary-id")).toBeNull();
  });
});
