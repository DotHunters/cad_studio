import { describe, expect, it } from "vitest";

import { serviceFormSchema } from "@/lib/validators/admin/service";

const valid = {
  slug: "graduations",
  name: "Graduations",
  nameFr: "",
  description: "Caps, gowns and families.",
  descriptionFr: "",
};

describe("serviceFormSchema", () => {
  it("accepts a new service and blanks optional French", () => {
    const parsed = serviceFormSchema.parse(valid);
    expect(parsed).toMatchObject({ slug: "graduations", nameFr: null, descriptionFr: null });
  });

  it("lowercases and trims the slug, but rejects bad shapes", () => {
    expect(serviceFormSchema.parse({ ...valid, slug: " Graduations " }).slug).toBe("graduations");
    expect(serviceFormSchema.safeParse({ ...valid, slug: "grad uations" }).success).toBe(false);
    expect(serviceFormSchema.safeParse({ ...valid, slug: "a".repeat(41) }).success).toBe(false);
  });

  it("lets edits omit the slug", () => {
    const edit: Partial<typeof valid> = { ...valid };
    delete edit.slug;
    expect(serviceFormSchema.parse(edit).slug).toBeUndefined();
  });

  it("requires English name and description", () => {
    const result = serviceFormSchema.safeParse({ ...valid, name: " ", description: "" });
    expect(result.success).toBe(false);
  });
});
