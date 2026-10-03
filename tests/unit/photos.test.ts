import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { categoryPhoto, localPublicId, type PhotoGroup, photos } from "@/lib/photos";

const photo = { src: "/photos/a/a-01.webp", width: 2, height: 1, blurDataUrl: "data:," };
const group = (slug: string, category: PhotoGroup["category"]): PhotoGroup => ({
  slug,
  category,
  tags: [],
  title: slug,
  titleFr: slug,
  alt: slug,
  altFr: slug,
  featured: false,
  year: null,
  images: [{ ...photo, src: `/photos/${slug}/${slug}-01.webp` }],
});

describe("categoryPhoto", () => {
  const groups = [group("model-shoot", "PROFESSIONAL"), group("wedding-a", "WEDDING")];

  it("returns the first photo of the first group in the category", () => {
    expect(categoryPhoto("wedding", groups)?.src).toBe("/photos/wedding-a/wedding-a-01.webp");
  });

  it("returns null for a category without photos", () => {
    expect(categoryPhoto("product", groups)).toBeNull();
  });
});

describe("localPublicId", () => {
  it("prefixes the public path", () => {
    expect(localPublicId("/photos/a/a-01.webp")).toBe("local/photos/a/a-01.webp");
  });
});

describe("photos manifest (src/data/photos.json)", () => {
  const all = [...photos.groups.flatMap((g) => g.images), ...photos.hero, ...photos.owner];

  it("points only at optimized WebP files that exist in public/", () => {
    for (const image of all) {
      expect(image.src).toMatch(/^\/photos\/[a-z0-9-]+\/[a-z0-9-]+-\d{2}\.webp$/);
      expect(existsSync(path.join("public", image.src))).toBe(true);
    }
  });

  it("has a hero, an owner portrait and alt text for every group", () => {
    expect(photos.hero.length).toBeGreaterThanOrEqual(3);
    expect(photos.owner.length).toBeGreaterThan(0);
    for (const g of photos.groups) expect(g.alt && g.altFr).toBeTruthy();
  });
});
