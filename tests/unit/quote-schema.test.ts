import { describe, expect, it } from "vitest";

import { provinceCodes, quoteDetailsSchema, quoteRequestSchema } from "@/lib/validators/quote";

const details = {
  category: "wedding",
  packageSlug: "wedding",
  eventDate: "2026-08-15",
  startTime: "14:00",
  durationHours: 8,
  photographers: 2,
  guestCount: 150,
  province: "ON",
  city: "Toronto",
  distanceKm: 25,
  isInternational: false,
  addOns: [{ code: "DRONE", qty: 1 }],
};

const contact = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  marketingOptIn: false,
  website: "",
};

const errorsFor = (
  schema: typeof quoteDetailsSchema | typeof quoteRequestSchema,
  input: unknown,
) => {
  const result = schema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
};

describe("quoteDetailsSchema", () => {
  it("accepts valid details and coerces numbers from form strings", () => {
    const parsed = quoteDetailsSchema.parse({
      ...details,
      durationHours: "8.5",
      photographers: "2",
      guestCount: "",
      distanceKm: "25",
    });
    expect(parsed.durationHours).toBe(8.5);
    expect(parsed.photographers).toBe(2);
    expect(parsed.guestCount).toBeUndefined();
  });

  it("covers every province and territory plus outside Canada", () => {
    expect(provinceCodes).toHaveLength(14);
    expect(provinceCodes).toContain("INTL");
  });

  it("returns translation keys for invalid fields", () => {
    expect(
      errorsFor(quoteDetailsSchema, {
        ...details,
        category: "pizza",
        eventDate: "2026-02-30",
        startTime: "25:00",
        durationHours: 4.25,
        photographers: 0,
        province: "XX",
        distanceKm: -1,
      }),
    ).toEqual({
      category: "required",
      eventDate: "invalidDate",
      startTime: "invalidTime",
      durationHours: "invalidDuration",
      photographers: "invalidNumber",
      province: "required",
      distanceKm: "invalidNumber",
    });
  });

  it("forces INTL when the event is outside Canada", () => {
    const parsed = quoteDetailsSchema.parse({ ...details, isInternational: true, province: "ON" });
    expect(parsed.province).toBe("INTL");
    expect(parsed.distanceKm).toBeUndefined();
  });

  it("drops add-ons with zero quantity and rejects bad quantities", () => {
    expect(
      quoteDetailsSchema.parse({ ...details, addOns: [{ code: "DRONE", qty: 0 }] }).addOns,
    ).toEqual([]);
    expect(
      errorsFor(quoteDetailsSchema, { ...details, addOns: [{ code: "DRONE", qty: 1.5 }] }),
    ).toEqual({ "addOns.0.qty": "invalidNumber" });
  });
});

describe("quoteRequestSchema", () => {
  it("requires contact details on top of the event details", () => {
    expect(quoteRequestSchema.safeParse({ ...details, ...contact }).success).toBe(true);
    expect(errorsFor(quoteRequestSchema, { ...details, ...contact, email: "nope" })).toEqual({
      email: "invalidEmail",
    });
  });

  it("defaults marketing consent to false (CASL: never pre-checked)", () => {
    const withoutOptIn: Partial<typeof contact> = { ...contact };
    delete withoutOptIn.marketingOptIn;
    expect(quoteRequestSchema.parse({ ...details, ...withoutOptIn }).marketingOptIn).toBe(false);
  });

  it("flags honeypot submissions", () => {
    expect(errorsFor(quoteRequestSchema, { ...details, ...contact, website: "spam" })).toEqual({
      website: "spam",
    });
  });
});
