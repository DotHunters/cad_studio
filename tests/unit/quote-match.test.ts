import { describe, expect, it } from "vitest";

import { matchesQuote, type PriceFingerprint } from "@/lib/booking/quote-match";

const quote: PriceFingerprint = {
  category: "WEDDING",
  packageSlug: "wedding",
  eventDate: "2027-06-12",
  startTime: "14:00",
  durationHours: 8,
  photographers: 2,
  province: "ON",
  distanceKm: 25,
  isInternational: false,
  addOns: [
    { code: "DRONE", qty: 1 },
    { code: "ALBUM", qty: 1 },
  ],
};

describe("matchesQuote", () => {
  it("matches identical details regardless of add-on order or category case", () => {
    expect(
      matchesQuote(
        {
          ...quote,
          category: "wedding",
          addOns: [
            { code: "ALBUM", qty: 1 },
            { code: "DRONE", qty: 1 },
          ],
        },
        quote,
      ),
    ).toBe(true);
  });

  it("ignores zero-quantity add-ons and sub-kilometre rounding", () => {
    expect(
      matchesQuote(
        { ...quote, distanceKm: 25.2, addOns: [...quote.addOns, { code: "VIDEO", qty: 0 }] },
        quote,
      ),
    ).toBe(true);
  });

  it.each([
    ["date", { eventDate: "2027-06-13" }],
    ["start time", { startTime: "15:00" }],
    ["duration", { durationHours: 9 }],
    ["photographers", { photographers: 3 }],
    ["province", { province: "QC" }],
    ["distance", { distanceKm: 120 }],
    ["international", { isInternational: true }],
    ["package", { packageSlug: "wedding-mini" }],
    ["add-ons", { addOns: [{ code: "DRONE", qty: 1 }] }],
  ])("doesn't match when the %s changes", (_, change) => {
    expect(matchesQuote({ ...quote, ...change }, quote)).toBe(false);
  });
});
