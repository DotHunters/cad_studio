import { describe, expect, it } from "vitest";

import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { imageFormSchema, parseTags } from "@/lib/validators/admin/image";

const valid = {
  alt: "Bride and groom laughing under a maple tree",
  altFr: "",
  category: "wedding",
  tags: "Outdoor, golden hour , outdoor",
  inGallery: "on",
  sortOrder: "4",
  projectId: "",
  isCover: undefined,
  consentToPublish: "on",
};

const errors = (input: Record<string, unknown>) => {
  const result = imageFormSchema.safeParse(input);
  return result.success ? {} : fieldErrorsOf(result.error);
};

describe("parseTags", () => {
  it("trims, lowercases and de-duplicates", () => {
    expect(parseTags("Outdoor, golden hour , outdoor,,")).toEqual(["outdoor", "golden hour"]);
    expect(parseTags(undefined)).toEqual([]);
  });
});

describe("imageFormSchema", () => {
  it("normalizes valid details", () => {
    expect(imageFormSchema.parse(valid)).toEqual({
      alt: "Bride and groom laughing under a maple tree",
      altFr: null,
      category: "wedding",
      tags: ["outdoor", "golden hour"],
      inGallery: true,
      sortOrder: 4,
      projectId: null,
      isCover: false,
      consentToPublish: true,
    });
  });

  it("needs consent before an image is shown anywhere", () => {
    expect(errors({ ...valid, consentToPublish: undefined })).toEqual({
      consentToPublish:
        "Confirm the client agreed before showing this image in the gallery or a project.",
    });
    expect(
      errors({ ...valid, consentToPublish: undefined, inGallery: undefined, projectId: "p1" }),
    ).toHaveProperty("consentToPublish");
    // Kept private: no consent needed yet.
    expect(errors({ ...valid, consentToPublish: undefined, inGallery: undefined })).toEqual({});
  });

  it("requires alt text and a project for a cover", () => {
    expect(errors({ ...valid, alt: " ", isCover: "on" })).toEqual({
      alt: "Required.",
      isCover: "Choose a project first.",
    });
  });
});
