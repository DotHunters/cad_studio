import { describe, expect, it } from "vitest";

import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { projectImagesSchema } from "@/lib/validators/admin/uploads";

const photo = {
  url: "https://ab12cd.public.blob.vercel-storage.com/portfolio/x/a-k3j2.jpg",
  width: 6000,
  height: 4000,
  blurDataUrl: "data:image/jpeg;base64,/9j/4AAQ",
};
const valid = { consent: true, altPrefix: "Maternity session", images: [photo] };

describe("projectImagesSchema", () => {
  it("accepts uploaded photos with consent", () => {
    expect(projectImagesSchema.parse(valid)).toEqual(valid);
    expect(
      projectImagesSchema.parse({ ...valid, images: [{ ...photo, blurDataUrl: null }] }).images[0]
        .blurDataUrl,
    ).toBeNull();
  });

  it("needs consent, a description and at least one photo", () => {
    const result = projectImagesSchema.safeParse({ consent: false, altPrefix: " ", images: [] });
    expect(fieldErrorsOf(result.error!)).toMatchObject({
      consent: "Confirm that the client agreed to publish these photos.",
      altPrefix: "Required.",
      images: "Choose at least one photo.",
    });
  });

  it("only takes files from the studio's Blob store and a real preview", () => {
    for (const bad of [
      { ...photo, url: "https://evil.example/a.jpg" },
      { ...photo, blurDataUrl: "javascript:alert(1)" },
      { ...photo, width: 0 },
    ]) {
      expect(projectImagesSchema.safeParse({ ...valid, images: [bad] }).success).toBe(false);
    }
    expect(projectImagesSchema.safeParse({ ...valid, images: Array(31).fill(photo) }).success).toBe(
      false,
    );
  });
});
