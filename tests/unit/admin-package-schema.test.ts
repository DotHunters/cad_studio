import { describe, expect, it } from "vitest";

import { fieldErrorsOf, packageFormSchema } from "@/lib/validators/admin/package";

const valid = {
  slug: "Mini-Session",
  category: "family",
  name: "Mini session",
  nameFr: "",
  summary: "A short family session.",
  summaryFr: "Une courte séance familiale.",
  description: "Thirty relaxed minutes outdoors.",
  descriptionFr: "",
  basePrice: "$1,250.50",
  includedHours: "1",
  includedShooters: "1",
  editedImages: "",
  turnaroundDays: "14",
  inclusions: "Online gallery\n\n  20 edited images  \n",
  inclusionsFr: "",
  exclusions: "",
  exclusionsFr: "",
  faqs: JSON.stringify([{ q: "Where?", a: "Any park in the GTA.", qFr: "", aFr: "" }]),
  isActive: "on",
  sortOrder: "5",
};

const errors = (input: Record<string, unknown>) => {
  const result = packageFormSchema.safeParse(input);
  return result.success ? {} : fieldErrorsOf(result.error);
};

describe("packageFormSchema", () => {
  it("normalizes a valid form", () => {
    expect(packageFormSchema.parse(valid)).toMatchObject({
      slug: "mini-session",
      category: "family",
      nameFr: null,
      summaryFr: "Une courte séance familiale.",
      basePrice: 125_050,
      includedHours: 1,
      editedImages: null,
      turnaroundDays: 14,
      inclusions: ["Online gallery", "20 edited images"],
      inclusionsFr: [],
      faqs: [{ q: "Where?", a: "Any park in the GTA." }],
      isActive: true,
      sortOrder: 5,
    });
  });

  it("treats an unchecked box as inactive", () => {
    expect(packageFormSchema.parse({ ...valid, isActive: undefined }).isActive).toBe(false);
  });

  it("rejects bad slugs, prices and numbers with readable messages", () => {
    expect(
      errors({
        ...valid,
        slug: "mini session!",
        basePrice: "twelve",
        includedHours: "1.5",
        includedShooters: "0",
      }),
    ).toEqual({
      slug: "Use lowercase letters, numbers and dashes.",
      basePrice: "Enter an amount like 1200 or 1,200.50.",
      includedHours: "Use a whole number.",
      includedShooters: "Must be at least 1.",
    });
  });

  it("requires the English text and a category", () => {
    expect(errors({ ...valid, name: "  ", category: "" })).toEqual({
      name: "Required.",
      category: "Choose a category.",
    });
  });

  it("reports broken or incomplete FAQs on the faqs field", () => {
    expect(errors({ ...valid, faqs: "{not json" })).toEqual({ faqs: "FAQs couldn't be read." });
    expect(errors({ ...valid, faqs: JSON.stringify([{ q: "Only a question", a: "" }]) })).toEqual({
      faqs: "Required.",
    });
  });
});
