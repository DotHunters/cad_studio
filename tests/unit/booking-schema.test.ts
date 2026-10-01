import { describe, expect, it } from "vitest";

import {
  bookingContactSchema,
  bookingDetailsSchema,
  bookingRequestSchema,
  durationFromTimes,
} from "@/lib/validators/booking";

const details = {
  category: "wedding",
  packageSlug: "wedding",
  eventDate: "2027-06-12",
  startTime: "14:00",
  endTime: "22:00",
  photographers: "2",
  guestCount: "120",
  venue: "Casa Loma",
  city: "Toronto",
  province: "ON",
  distanceKm: "25",
  isInternational: false,
  notes: "",
  addOns: [],
};

const contact = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  paymentMethod: "BANK_TRANSFER",
  consentTerms: true,
  consentPrivacy: true,
  marketingOptIn: false,
  website: "",
};

type Issue = { path: PropertyKey[]; message: string };
type Parser = { safeParse: (value: unknown) => { success: boolean; error?: { issues: Issue[] } } };

function errors(schema: Parser, input: unknown) {
  const result = schema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(
    result.error!.issues.map((issue) => [issue.path.join("."), issue.message]),
  );
}

describe("durationFromTimes", () => {
  it("returns hours between two same-day times", () => {
    expect(durationFromTimes("14:00", "22:00")).toBe(8);
    expect(durationFromTimes("09:30", "13:00")).toBe(3.5);
  });

  it("returns null when the end isn't after the start", () => {
    expect(durationFromTimes("14:00", "14:00")).toBeNull();
    expect(durationFromTimes("22:00", "02:00")).toBeNull();
  });
});

describe("bookingDetailsSchema", () => {
  it("accepts valid details and derives the duration", () => {
    const parsed = bookingDetailsSchema.parse(details);
    expect(parsed.durationHours).toBe(8);
    expect(parsed.photographers).toBe(2);
    expect(parsed.guestCount).toBe(120);
    expect(parsed.notes).toBeUndefined();
  });

  it("requires times on half-hour steps with the end after the start", () => {
    expect(errors(bookingDetailsSchema, { ...details, startTime: "14:15" })).toEqual({
      startTime: "invalidTime",
    });
    expect(errors(bookingDetailsSchema, { ...details, endTime: "13:00" })).toEqual({
      endTime: "endBeforeStart",
    });
  });

  it("limits notes length", () => {
    expect(errors(bookingDetailsSchema, { ...details, notes: "x".repeat(2001) })).toEqual({
      notes: "tooLong",
    });
  });

  it("forces INTL outside Canada", () => {
    const parsed = bookingDetailsSchema.parse({ ...details, isInternational: true });
    expect(parsed.province).toBe("INTL");
    expect(parsed.distanceKm).toBeUndefined();
  });
});

describe("bookingContactSchema", () => {
  it("requires terms and privacy consent but not marketing", () => {
    expect(bookingContactSchema.safeParse(contact).success).toBe(true);
    expect(errors(bookingContactSchema, { ...contact, consentTerms: false })).toEqual({
      consentTerms: "consentRequired",
    });
    expect(errors(bookingContactSchema, { ...contact, consentPrivacy: false })).toEqual({
      consentPrivacy: "consentRequired",
    });
  });

  it("offers bank transfer or cash for the deposit", () => {
    expect(bookingContactSchema.safeParse({ ...contact, paymentMethod: "CASH" }).success).toBe(
      true,
    );
    expect(errors(bookingContactSchema, { ...contact, paymentMethod: "STRIPE" })).toEqual({
      paymentMethod: "required",
    });
  });

  it("defaults marketing consent to false (CASL)", () => {
    const withoutOptIn: Partial<typeof contact> = { ...contact };
    delete withoutOptIn.marketingOptIn;
    expect(bookingContactSchema.parse(withoutOptIn).marketingOptIn).toBe(false);
  });
});

describe("bookingRequestSchema", () => {
  it("combines details, contact and an optional signed quote", () => {
    const parsed = bookingRequestSchema.parse({
      ...details,
      ...contact,
      quoteReference: "CAD-Q-2026-0004",
      quoteToken: "a".repeat(32),
    });
    expect(parsed.quoteReference).toBe("CAD-Q-2026-0004");
    expect(parsed.durationHours).toBe(8);
  });
});
