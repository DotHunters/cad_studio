import { describe, expect, it } from "vitest";

import {
  isBlobUrl,
  isLocalId,
  localImagePath,
  pickCover,
  placeholderImage,
  storedImageSrc,
  uploadedPhotoAlt,
} from "@/lib/images";

describe("placeholderImage", () => {
  it("builds a blank PNG by default (text colour matches background)", () => {
    expect(placeholderImage(800, 600)).toBe("https://placehold.co/800x600/1a1a1a/1a1a1a.png");
  });

  it("adds an optional label and background", () => {
    expect(placeholderImage(800, 600, { text: "Corporate Events", background: "262626" })).toBe(
      "https://placehold.co/800x600/262626/c79856.png?text=Corporate+Events&font=playfair-display",
    );
  });

  it("encodes special characters in the label", () => {
    expect(placeholderImage(10, 10, { text: "Événements & Co" })).toContain(
      "text=%C3%89v%C3%A9nements+%26+Co",
    );
  });
});

describe("storedImageSrc", () => {
  it("renders seeded placeholder ids as blank placeholders at their size", () => {
    const src = storedImageSrc({
      publicId: "placeholder/sample-wedding-2",
      width: 1600,
      height: 1067,
    });
    expect(src).toMatch(/^https:\/\/placehold\.co\/1600x1067\/(\w{6})\/\1\.png$/);
  });

  it("varies the shade by image number", () => {
    const a = storedImageSrc({ publicId: "placeholder/x-1", width: 10, height: 10 });
    const b = storedImageSrc({ publicId: "placeholder/x-2", width: 10, height: 10 });
    expect(a).not.toBe(b);
  });

  it("delivers real ids through Cloudinary", () => {
    expect(storedImageSrc({ publicId: "cad/real", width: 10, height: 10 }, "demo")).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/cad/real",
    );
  });

  it("needs a cloud name for real ids", () => {
    expect(() => storedImageSrc({ publicId: "cad/real", width: 10, height: 10 }, "")).toThrow(
      /NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME/,
    );
  });
});

describe("pickCover", () => {
  const images = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("uses the chosen cover wherever it is in the list", () => {
    expect(pickCover(images, "c")).toEqual({ id: "c" });
  });

  it("falls back to the first image when the cover is missing or not publishable", () => {
    expect(pickCover(images, null)).toEqual({ id: "a" });
    expect(pickCover(images, "hidden")).toEqual({ id: "a" });
  });

  it("is null without images", () => {
    expect(pickCover([], "a")).toBeNull();
  });
});

describe("local photos", () => {
  const image = {
    publicId: "local/photos/hindu-wedding/hindu-wedding-01.webp",
    width: 1,
    height: 1,
  };

  it("recognizes local ids and maps them to public paths", () => {
    expect(isLocalId(image.publicId)).toBe(true);
    expect(isLocalId("placeholder/x-1")).toBe(false);
    expect(localImagePath(image.publicId)).toBe("/photos/hindu-wedding/hindu-wedding-01.webp");
  });

  it("returns an absolute URL on the site for Open Graph and JSON-LD", () => {
    expect(storedImageSrc(image, "", "https://cadstudio.example")).toBe(
      "https://cadstudio.example/photos/hindu-wedding/hindu-wedding-01.webp",
    );
  });
});

describe("Vercel Blob photos", () => {
  const url = "https://ab12cd.public.blob.vercel-storage.com/portfolio/x/photo-k3j2.jpg";

  it("recognizes only Blob storage URLs", () => {
    expect(isBlobUrl(url)).toBe(true);
    expect(isBlobUrl("https://evil.example/public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isBlobUrl("https://ab12cd.public.blob.vercel-storage.com.evil.example/x.jpg")).toBe(
      false,
    );
    expect(isBlobUrl("http://ab12cd.public.blob.vercel-storage.com/x.jpg")).toBe(false);
    expect(isBlobUrl("local/photos/x.webp")).toBe(false);
  });

  it("serves them by their own URL and numbers their alt text", () => {
    expect(storedImageSrc({ publicId: url, width: 10, height: 10 })).toBe(url);
    expect(uploadedPhotoAlt(" Maternity Session ", 3)).toBe("Maternity Session — photo 3");
  });
});
