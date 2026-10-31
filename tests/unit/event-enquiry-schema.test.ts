import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  EVENT_BUDGETS,
  EVENT_ENQUIRY_SERVICES,
  EVENT_TYPES,
  eventEnquirySchema,
} from "@/lib/validators/event-enquiry";

const valid = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  eventType: "corporate",
  eventDate: "2026-12-05",
  guestCount: "150",
  city: "Toronto",
  services: ["management", "av"],
  budget: "",
  message: "Annual gala for our team, looking for décor and sound.",
  website: "",
};

function errorsFor(input: unknown) {
  const result = eventEnquirySchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe("eventEnquirySchema", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 2026-11-01 noon in Toronto.
    vi.setSystemTime(new Date("2026-11-01T16:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("exposes the option lists the form renders", () => {
    expect(EVENT_TYPES).toEqual(["wedding", "corporate", "birthday", "cultural", "other"]);
    expect(EVENT_ENQUIRY_SERVICES).toEqual([
      "management",
      "decor",
      "catering",
      "av",
      "photo",
      "video",
    ]);
    expect(EVENT_BUDGETS).toEqual(["under5k", "5to10k", "10to25k", "over25k"]);
  });

  it("accepts a valid enquiry and normalizes optional fields", () => {
    const result = eventEnquirySchema.parse({ ...valid, name: "  Alex Martin  " });
    expect(result.name).toBe("Alex Martin");
    expect(result.phone).toBeUndefined();
    expect(result.budget).toBeUndefined();
    expect(result.guestCount).toBe(150);
    expect(result.eventDate).toBe("2026-12-05");
  });

  it("treats empty date and guest count as not given", () => {
    const result = eventEnquirySchema.parse({ ...valid, eventDate: "", guestCount: "" });
    expect(result.eventDate).toBeUndefined();
    expect(result.guestCount).toBeUndefined();
  });

  it("requires at least one service", () => {
    expect(errorsFor({ ...valid, services: [] })).toEqual({ services: "chooseService" });
    expect(errorsFor({ ...valid, services: ["fireworks"] })).toHaveProperty("services");
  });

  it("rejects a past event date but allows today", () => {
    expect(errorsFor({ ...valid, eventDate: "2026-10-31" })).toEqual({ eventDate: "pastDate" });
    expect(eventEnquirySchema.safeParse({ ...valid, eventDate: "2026-11-01" }).success).toBe(true);
    expect(errorsFor({ ...valid, eventDate: "next June" })).toEqual({ eventDate: "invalidDate" });
  });

  it("checks the guest count range", () => {
    expect(errorsFor({ ...valid, guestCount: "0" })).toEqual({ guestCount: "invalidGuests" });
    expect(errorsFor({ ...valid, guestCount: "5001" })).toEqual({ guestCount: "invalidGuests" });
    expect(errorsFor({ ...valid, guestCount: "12.5" })).toEqual({ guestCount: "invalidGuests" });
  });

  it("returns translation keys for required fields", () => {
    expect(errorsFor({ ...valid, name: " " })).toEqual({ name: "required" });
    expect(errorsFor({ ...valid, email: "nope" })).toEqual({ email: "invalidEmail" });
    expect(errorsFor({ ...valid, eventType: "" })).toEqual({ eventType: "required" });
    expect(errorsFor({ ...valid, city: "" })).toEqual({ city: "required" });
    expect(errorsFor({ ...valid, message: "Hi" })).toEqual({ message: "messageTooShort" });
    expect(errorsFor({ ...valid, phone: "call me" })).toEqual({ phone: "invalidPhone" });
    expect(errorsFor({ ...valid, budget: "a lot" })).toHaveProperty("budget");
  });

  it("rejects submissions that filled the honeypot", () => {
    expect(errorsFor({ ...valid, website: "http://spam.example" })).toEqual({ website: "spam" });
  });
});
