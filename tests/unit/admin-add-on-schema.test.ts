import { describe, expect, it } from "vitest";

import { addOnFormSchema } from "@/lib/validators/admin/add-on";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";

const valid = {
  code: "photo_booth",
  name: "Photo booth",
  nameFr: "",
  price: "450",
  unit: "FLAT",
  categories: ["wedding", "corporate"],
  isActive: "on",
  sortOrder: "3",
};

const errors = (input: Record<string, unknown>) => {
  const result = addOnFormSchema.safeParse(input);
  return result.success ? {} : fieldErrorsOf(result.error);
};

describe("addOnFormSchema", () => {
  it("normalizes a valid add-on", () => {
    expect(addOnFormSchema.parse(valid)).toEqual({
      code: "PHOTO_BOOTH",
      name: "Photo booth",
      nameFr: null,
      price: 45_000,
      unit: "FLAT",
      categories: ["wedding", "corporate"],
      isActive: true,
      sortOrder: 3,
    });
  });

  it("accepts a single category (one checkbox ticked)", () => {
    expect(addOnFormSchema.parse({ ...valid, categories: "family" }).categories).toEqual([
      "family",
    ]);
  });

  it("allows editing without a code (codes never change)", () => {
    expect(addOnFormSchema.parse({ ...valid, code: undefined }).code).toBeUndefined();
  });

  it("explains what's wrong", () => {
    expect(
      errors({ ...valid, code: "photo booth", unit: "PER_DAY", categories: undefined, price: "" }),
    ).toEqual({
      code: "Use capital letters, numbers and underscores, e.g. PHOTO_BOOTH.",
      unit: "Choose how it's charged.",
      categories: "Choose at least one service.",
      price: "Required.",
    });
  });
});
