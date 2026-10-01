import { describe, expect, it } from "vitest";

import { placeholderImage, storedImageSrc } from "@/lib/images";

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
