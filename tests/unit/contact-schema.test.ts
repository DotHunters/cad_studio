import { describe, expect, it } from "vitest";

import { contactSchema, otherEnquiryTypes } from "@/lib/validators/contact";

const valid = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  enquiryType: "wedding",
  message: "We are planning a wedding next June and would love to chat.",
  website: "",
};

function errorsFor(input: unknown) {
  const result = contactSchema.safeParse(input);
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]));
}

describe("contactSchema", () => {
  it("accepts a valid enquiry and trims fields", () => {
    const result = contactSchema.parse({ ...valid, name: "  Alex Martin  " });
    expect(result.name).toBe("Alex Martin");
    expect(result.phone).toBeUndefined();
  });

  it("includes a privacy request type for PIPEDA deletion requests", () => {
    expect(otherEnquiryTypes).toContain("privacy");
  });

  it("returns translation keys as error messages", () => {
    expect(errorsFor({ ...valid, name: " " })).toEqual({ name: "required" });
    expect(errorsFor({ ...valid, email: "not-an-email" })).toEqual({ email: "invalidEmail" });
    expect(errorsFor({ ...valid, enquiryType: "Not A Slug" })).toEqual({
      enquiryType: "required",
    });
    expect(contactSchema.safeParse({ ...valid, enquiryType: "graduations" }).success).toBe(true);
    expect(errorsFor({ ...valid, message: "Hi" })).toEqual({ message: "messageTooShort" });
    expect(errorsFor({ ...valid, message: "x".repeat(5001) })).toEqual({ message: "tooLong" });
  });

  it("validates optional phone numbers loosely", () => {
    expect(contactSchema.safeParse({ ...valid, phone: "+1 (416) 555-0100" }).success).toBe(true);
    expect(errorsFor({ ...valid, phone: "call me" })).toEqual({ phone: "invalidPhone" });
  });

  it("rejects submissions that filled the honeypot", () => {
    expect(errorsFor({ ...valid, website: "http://spam.example" })).toEqual({ website: "spam" });
  });
});
