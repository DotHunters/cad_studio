import { describe, expect, it } from "vitest";

import { formatTaxRate, parseBookingFilters, parseStoredBreakdown } from "@/lib/admin/bookings";

describe("parseBookingFilters", () => {
  it("defaults to all upcoming bookings", () => {
    expect(parseBookingFilters({})).toEqual({ status: "ALL", when: "upcoming", q: "" });
  });

  it("reads status, period and search", () => {
    expect(parseBookingFilters({ status: "confirmed", when: "past", q: "  CAD-B-2026 " })).toEqual({
      status: "CONFIRMED",
      when: "past",
      q: "CAD-B-2026",
    });
  });

  it("ignores unknown values", () => {
    expect(parseBookingFilters({ status: "DELETED", when: "yesterday", q: ["a", "b"] })).toEqual({
      status: "ALL",
      when: "upcoming",
      q: "a",
    });
  });
});

describe("parseStoredBreakdown", () => {
  const stored = {
    lineItems: [
      { kind: "base", amountCents: 280_000 },
      { kind: "addOn", code: "DRONE", quantity: 1, amountCents: 30_000 },
    ],
    taxLines: [{ code: "HST", rate: "0.13", amountCents: 40_300 }],
    flags: { customTravelQuote: false },
  };

  it("returns the line items and tax lines", () => {
    expect(parseStoredBreakdown(stored)).toEqual({
      lineItems: stored.lineItems,
      taxLines: stored.taxLines,
    });
  });

  it("is null for missing or malformed data", () => {
    expect(parseStoredBreakdown(null)).toBeNull();
    expect(parseStoredBreakdown({ lineItems: [] })).toBeNull();
    expect(
      parseStoredBreakdown({ ...stored, lineItems: [{ kind: "base", amountCents: 1.5 }] }),
    ).toBeNull();
  });
});

describe("formatTaxRate", () => {
  it.each([
    ["0.13", "13%"],
    ["0.09975", "9.975%"],
    ["0.05", "5%"],
  ])("%s → %s", (rate, label) => {
    expect(formatTaxRate(rate)).toBe(label);
  });
});
