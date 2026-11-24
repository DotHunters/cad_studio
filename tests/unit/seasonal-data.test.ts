import { describe, expect, it } from "vitest";

import { SEASONAL_SERVICE_SLUG } from "@/lib/seasonal/offer";

import { seasonalAddOns, seasonalPackages, seasonalService } from "../../prisma/seasonal-data";

describe("seasonal flyer data", () => {
  it("uses the flyer's offer and regular prices in whole cents", () => {
    const prices = Object.fromEntries(
      seasonalPackages.map((pkg) => [pkg.slug, [pkg.basePriceCents, pkg.regularPriceCents]]),
    );
    expect(prices).toEqual({
      "seasonal-mini-session": [25_000, 35_000],
      "seasonal-classic-session": [40_000, 55_000],
      "seasonal-premium-session": [65_000, 85_000],
      "seasonal-event-coverage": [75_000, null],
    });
  });

  it("prices every offer below its regular price", () => {
    for (const pkg of seasonalPackages) {
      if (pkg.regularPriceCents !== null) {
        expect(pkg.regularPriceCents, pkg.slug).toBeGreaterThan(pkg.basePriceCents);
      }
    }
  });

  it("stores the hour ranges as their upper end rounded up", () => {
    const hours = Object.fromEntries(seasonalPackages.map((pkg) => [pkg.slug, pkg.includedHours]));
    expect(hours).toEqual({
      "seasonal-mini-session": 2,
      "seasonal-classic-session": 3,
      "seasonal-premium-session": 5,
      "seasonal-event-coverage": 8,
    });
  });

  it("belongs to the seasonal service", () => {
    expect(seasonalService.slug).toBe(SEASONAL_SERVICE_SLUG);
    for (const pkg of seasonalPackages) expect(pkg.category).toBe(SEASONAL_SERVICE_SLUG);
    for (const addOn of seasonalAddOns) expect(addOn.categories).toEqual([SEASONAL_SERVICE_SLUG]);
  });

  it("has the flyer's three add-ons", () => {
    expect(
      Object.fromEntries(
        seasonalAddOns.map((addOn) => [addOn.code, [addOn.priceCents, addOn.unit]]),
      ),
    ).toEqual({
      SEASONAL_FRAME: [8_500, "PER_ITEM"],
      SEASONAL_REELS: [35_000, "FLAT"],
      SEASONAL_RETOUCH: [2_000, "PER_ITEM"],
    });
  });

  it("has French text and unique slugs and codes", () => {
    expect(seasonalService.nameFr && seasonalService.descriptionFr).toBeTruthy();
    for (const pkg of seasonalPackages) {
      expect(pkg.nameFr && pkg.summaryFr && pkg.descriptionFr, pkg.slug).toBeTruthy();
      expect(pkg.inclusionsFr).toHaveLength(pkg.inclusions.length);
    }
    for (const addOn of seasonalAddOns) expect(addOn.nameFr.trim(), addOn.code).toBeTruthy();
    expect(new Set(seasonalPackages.map((pkg) => pkg.slug)).size).toBe(seasonalPackages.length);
    expect(new Set(seasonalAddOns.map((addOn) => addOn.code)).size).toBe(seasonalAddOns.length);
  });
});
