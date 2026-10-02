import { describe, expect, it } from "vitest";

import { cloudinaryLoader, cloudinaryUrl, solidBlurDataUrl } from "@/lib/cloudinary";

describe("cloudinaryUrl", () => {
  it("builds a delivery URL with automatic format and quality", () => {
    expect(cloudinaryUrl("cad/weddings/abc", { cloudName: "demo" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/cad/weddings/abc",
    );
  });

  it("adds width limiting and explicit quality", () => {
    expect(cloudinaryUrl("x", { cloudName: "demo", width: 640, quality: 60 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_60,c_limit,w_640/x",
    );
  });

  it("encodes unsafe characters in the public id but keeps folders", () => {
    expect(cloudinaryUrl("folder/my photo", { cloudName: "demo" })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto/folder/my%20photo",
    );
  });

  it("throws a clear error when the cloud name is missing", () => {
    expect(() => cloudinaryUrl("x", { cloudName: "" })).toThrow(
      /NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME/,
    );
  });
});

describe("cloudinaryLoader", () => {
  it("maps next/image width and quality to Cloudinary transformations", () => {
    const loader = cloudinaryLoader("demo");
    expect(loader({ src: "cad/a", width: 1080, quality: 75 })).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_75,c_limit,w_1080/cad/a",
    );
  });
});

describe("solidBlurDataUrl", () => {
  it("returns a tiny inline SVG in the given colour", () => {
    const url = solidBlurDataUrl("1c1c1c");
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(atob(url.split(",")[1])).toContain('fill="#1c1c1c"');
  });
});
