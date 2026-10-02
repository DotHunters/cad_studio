import { describe, expect, it } from "vitest";

import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { nextPublishedAt, projectFormSchema } from "@/lib/validators/admin/project";

const valid = {
  slug: "Spring-Gala-2026",
  title: "Spring gala",
  titleFr: "",
  clientName: "Maple & Co. Events",
  consentToPublish: "on",
  category: "corporate",
  reach: "LOCAL",
  city: "Toronto",
  country: "Canada",
  year: "2026",
  story: "A two-day conference with an evening gala.",
  storyFr: "",
  featured: undefined,
  published: "on",
};

describe("projectFormSchema", () => {
  it("normalizes a valid project", () => {
    expect(projectFormSchema.parse(valid)).toEqual({
      slug: "spring-gala-2026",
      title: "Spring gala",
      titleFr: null,
      clientName: "Maple & Co. Events",
      consentToPublish: true,
      category: "corporate",
      reach: "LOCAL",
      city: "Toronto",
      country: "Canada",
      year: 2026,
      story: "A two-day conference with an evening gala.",
      storyFr: null,
      featured: false,
      published: true,
    });
  });

  it("explains missing and invalid fields", () => {
    const result = projectFormSchema.safeParse({
      ...valid,
      reach: "",
      country: " ",
      year: "26",
    });
    expect(fieldErrorsOf(result.error!)).toEqual({
      reach: "Choose local or global.",
      country: "Required.",
      year: "Must be at least 1990.",
    });
  });
});

describe("nextPublishedAt", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const earlier = new Date("2026-01-15T12:00:00Z");

  it("sets the date when first published and keeps it afterwards", () => {
    expect(nextPublishedAt(true, null, now)).toBe(now);
    expect(nextPublishedAt(true, earlier, now)).toBe(earlier);
  });

  it("clears it when unpublished", () => {
    expect(nextPublishedAt(false, earlier, now)).toBeNull();
  });
});
