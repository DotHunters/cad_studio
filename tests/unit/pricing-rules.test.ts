import { describe, expect, it } from "vitest";

import { parsePricingRules, resolvePackage } from "@/lib/pricing/rules";

const records = [
  { key: "EXTRA_HOUR_RATE", value: 20000 },
  { key: "EXTRA_SHOOTER_HOURLY", value: 12000 },
  { key: "FREE_TRAVEL_KM", value: 40 },
  { key: "TRAVEL_PER_KM", value: 70 },
  { key: "MAX_AUTO_TRAVEL_KM", value: 300 },
  { key: "WEEKEND_SURCHARGE_PCT", value: 10 },
  { key: "STAT_HOLIDAY_SURCHARGE_PCT", value: 25 },
  { key: "DEPOSIT_PCT", value: 30 },
  { key: "GUESTS_PER_PHOTOGRAPHER_HINT", value: 100 },
  { key: "QUOTE_VALID_DAYS", value: 14 },
];

describe("parsePricingRules", () => {
  it("reads the required numeric rules", () => {
    expect(parsePricingRules(records)).toMatchObject({ EXTRA_HOUR_RATE: 20000, DEPOSIT_PCT: 30 });
  });

  it("reads optional off-season rules when configured", () => {
    const rules = parsePricingRules([
      ...records,
      { key: "OFF_SEASON_DISCOUNT_PCT", value: 10 },
      { key: "OFF_SEASON_MONTHS", value: [1, 2, 3] },
    ]);
    expect(rules.OFF_SEASON_DISCOUNT_PCT).toBe(10);
    expect(rules.OFF_SEASON_MONTHS).toEqual([1, 2, 3]);
  });

  it("throws a clear error when a required rule is missing or invalid", () => {
    expect(() => parsePricingRules(records.filter((r) => r.key !== "DEPOSIT_PCT"))).toThrow(
      /DEPOSIT_PCT/,
    );
    expect(() =>
      parsePricingRules(records.map((r) => (r.key === "DEPOSIT_PCT" ? { ...r, value: "30" } : r))),
    ).toThrow(/DEPOSIT_PCT/);
  });
});

describe("resolvePackage", () => {
  const packages = [
    { slug: "wedding", category: "WEDDING", basePriceCents: 280000 },
    { slug: "wedding-mini", category: "WEDDING", basePriceCents: 150000 },
    { slug: "corporate-event", category: "CORPORATE", basePriceCents: 120000 },
  ];

  it("uses the chosen package when it belongs to the category", () => {
    expect(resolvePackage(packages, "WEDDING", "wedding")?.slug).toBe("wedding");
  });

  it("falls back to the cheapest package in the category", () => {
    expect(resolvePackage(packages, "WEDDING", undefined)?.slug).toBe("wedding-mini");
    expect(resolvePackage(packages, "WEDDING", "corporate-event")?.slug).toBe("wedding-mini");
  });

  it("returns null when the category has no packages", () => {
    expect(resolvePackage(packages, "PRODUCT", undefined)).toBeNull();
  });
  describe("with tiers", () => {
    const options = [
      {
        slug: "wedding:silver",
        packageSlug: "wedding",
        category: "WEDDING",
        basePriceCents: 200000,
      },
      { slug: "wedding:gold", packageSlug: "wedding", category: "WEDDING", basePriceCents: 300000 },
      { slug: "elopement", packageSlug: "elopement", category: "WEDDING", basePriceCents: 90000 },
    ];

    it("uses the chosen tier", () => {
      expect(resolvePackage(options, "WEDDING", "wedding:gold")?.slug).toBe("wedding:gold");
    });

    it("uses the package's cheapest tier for a plain package link or a removed tier", () => {
      expect(resolvePackage(options, "WEDDING", "wedding")?.slug).toBe("wedding:silver");
      expect(resolvePackage(options, "WEDDING", "wedding:platinum")?.slug).toBe("wedding:silver");
    });

    it("falls back to the category's cheapest option otherwise", () => {
      expect(resolvePackage(options, "WEDDING", "nope")?.slug).toBe("elopement");
    });
  });
});
