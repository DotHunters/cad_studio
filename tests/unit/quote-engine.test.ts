import { describe, expect, it } from "vitest";

import {
  calculateQuote,
  type AddOnDefinition,
  type PricingRules,
  type QuoteInput,
} from "@/lib/pricing/calculate-quote";
import type { TaxRateInput } from "@/lib/tax";

// Values mirror prisma/seed-data.ts (AGENTS.md §8.1 starting values).
const rules: PricingRules = {
  EXTRA_HOUR_RATE: 20000,
  EXTRA_SHOOTER_HOURLY: 12000,
  FREE_TRAVEL_KM: 40,
  TRAVEL_PER_KM: 70,
  MAX_AUTO_TRAVEL_KM: 300,
  WEEKEND_SURCHARGE_PCT: 10,
  STAT_HOLIDAY_SURCHARGE_PCT: 25,
  DEPOSIT_PCT: 30,
  GUESTS_PER_PHOTOGRAPHER_HINT: 100,
};

const addOns: AddOnDefinition[] = [
  { code: "VIDEO", priceCents: 15000, unit: "PER_HOUR", categories: ["CORPORATE", "WEDDING"] },
  { code: "DRONE", priceCents: 30000, unit: "FLAT", categories: ["CORPORATE", "WEDDING"] },
  {
    code: "RUSH",
    priceCents: 25000,
    unit: "FLAT",
    categories: ["CORPORATE", "WEDDING", "PRODUCT"],
  },
  { code: "EXTRA_PRODUCT", priceCents: 2500, unit: "PER_ITEM", categories: ["PRODUCT"] },
];

const taxRates: TaxRateInput[] = [
  { province: "ON", gst: "0", pst: "0", hst: "0.13", label: "HST" },
  { province: "QC", gst: "0.05", pst: "0.09975", hst: "0", label: "GST + QST" },
  { province: "AB", gst: "0.05", pst: "0", hst: "0", label: "GST" },
  { province: "INTL", gst: "0", pst: "0", hst: "0", label: "No Canadian tax" },
];

const corporate = { basePriceCents: 120000, includedHours: 4, includedShooters: 1 };

// 2026-06-10 is a Wednesday and not a holiday.
const base: QuoteInput = {
  category: "CORPORATE",
  pkg: corporate,
  eventDate: "2026-06-10",
  durationHours: 4,
  photographers: 1,
  province: "ON",
  distanceKm: 10,
  isInternational: false,
  addOns: [],
};

const quote = (overrides: Partial<QuoteInput> = {}) =>
  calculateQuote({ ...base, ...overrides }, { rules, addOns, taxRates });

const amount = (result: ReturnType<typeof quote>, kind: string) =>
  result.lineItems
    .filter((item) => item.kind === kind)
    .reduce((sum, item) => sum + item.amountCents, 0);

describe("calculateQuote — base", () => {
  it("prices the package alone with HST and a 30% deposit", () => {
    const result = quote();
    expect(result.lineItems).toEqual([{ kind: "base", amountCents: 120000 }]);
    expect(result.subtotalCents).toBe(120000);
    expect(result.taxCents).toBe(15600);
    expect(result.totalCents).toBe(135600);
    expect(result.depositCents).toBe(40680);
    expect(result.flags).toEqual({ customTravelQuote: false, suggestedPhotographers: null });
  });

  it("line items always add up to the subtotal", () => {
    const result = quote({
      durationHours: 6.5,
      photographers: 2,
      eventDate: "2026-06-13",
      distanceKm: 75,
      addOns: [
        { code: "VIDEO", qty: 1 },
        { code: "DRONE", qty: 1 },
      ],
    });
    const sum = result.lineItems.reduce((total, item) => total + item.amountCents, 0);
    expect(sum).toBe(result.subtotalCents);
    expect(result.totalCents).toBe(result.subtotalCents + result.taxCents);
  });
});

describe("calculateQuote — extra hours and shooters", () => {
  it("charges extra hours beyond those included", () => {
    expect(amount(quote({ durationHours: 6 }), "extraHours")).toBe(40000);
  });

  it("charges half hours proportionally", () => {
    expect(amount(quote({ durationHours: 5.5 }), "extraHours")).toBe(30000);
  });

  it("never charges negative extra hours", () => {
    expect(quote({ durationHours: 2 }).lineItems.some((item) => item.kind === "extraHours")).toBe(
      false,
    );
  });

  it("charges each extra photographer for the full duration", () => {
    // (3 − 1) × 6 h × $120
    expect(amount(quote({ durationHours: 6, photographers: 3 }), "extraShooters")).toBe(144000);
  });
});

describe("calculateQuote — add-ons", () => {
  it("prices flat add-ons by quantity", () => {
    expect(amount(quote({ addOns: [{ code: "DRONE", qty: 1 }] }), "addOn")).toBe(30000);
  });

  it("prices per-hour add-ons by duration", () => {
    expect(amount(quote({ durationHours: 5, addOns: [{ code: "VIDEO", qty: 1 }] }), "addOn")).toBe(
      75000,
    );
  });

  it("prices per-item add-ons by quantity", () => {
    const result = calculateQuote(
      { ...base, category: "PRODUCT", addOns: [{ code: "EXTRA_PRODUCT", qty: 12 }] },
      { rules, addOns, taxRates },
    );
    expect(result.lineItems).toContainEqual({
      kind: "addOn",
      code: "EXTRA_PRODUCT",
      quantity: 12,
      amountCents: 30000,
    });
  });

  it("ignores zero quantities", () => {
    expect(quote({ addOns: [{ code: "DRONE", qty: 0 }] }).subtotalCents).toBe(120000);
  });

  it("rejects unknown add-ons and add-ons not offered for the category", () => {
    expect(() => quote({ addOns: [{ code: "NOPE", qty: 1 }] })).toThrow(/NOPE/);
    expect(() => quote({ addOns: [{ code: "EXTRA_PRODUCT", qty: 1 }] })).toThrow(/EXTRA_PRODUCT/);
  });
});

describe("calculateQuote — travel", () => {
  it("is free within the free radius", () => {
    expect(amount(quote({ distanceKm: 40 }), "travel")).toBe(0);
  });

  it("charges the round trip beyond the free radius", () => {
    // (100 − 40) km × 2 × $0.70
    expect(amount(quote({ distanceKm: 100 }), "travel")).toBe(8400);
  });

  it("flags a custom travel quote beyond the automatic range", () => {
    const result = quote({ distanceKm: 450 });
    expect(amount(result, "travel")).toBe(0);
    expect(result.flags.customTravelQuote).toBe(true);
  });

  it("flags international events and applies no Canadian tax", () => {
    const result = quote({ isInternational: true, province: "INTL", distanceKm: null });
    expect(result.flags.customTravelQuote).toBe(true);
    expect(result.taxCents).toBe(0);
  });
});

describe("calculateQuote — surcharges and discounts", () => {
  it("adds the weekend surcharge on the service amount", () => {
    // Saturday: 10% of (base + extra hours)
    expect(amount(quote({ eventDate: "2026-06-13", durationHours: 5 }), "surcharge")).toBe(14000);
  });

  it("adds the stat holiday surcharge", () => {
    // Canada Day 2026 is a Wednesday: 25% of $1,200
    const result = quote({ eventDate: "2026-07-01" });
    expect(result.lineItems).toContainEqual({
      kind: "surcharge",
      code: "STAT_HOLIDAY",
      amountCents: 30000,
    });
  });

  it("applies only the higher surcharge when a holiday falls on a weekend", () => {
    // Christmas 2027 is a Saturday.
    const result = quote({ eventDate: "2027-12-25" });
    expect(result.lineItems.filter((item) => item.kind === "surcharge")).toEqual([
      { kind: "surcharge", code: "STAT_HOLIDAY", amountCents: 30000 },
    ]);
  });

  it("does not surcharge travel or add-ons", () => {
    const result = quote({
      eventDate: "2026-06-13",
      distanceKm: 100,
      addOns: [{ code: "DRONE", qty: 1 }],
    });
    expect(amount(result, "surcharge")).toBe(12000);
  });

  it("applies a configured off-season discount", () => {
    const result = calculateQuote(
      { ...base, eventDate: "2026-02-04" },
      {
        rules: { ...rules, OFF_SEASON_DISCOUNT_PCT: 10, OFF_SEASON_MONTHS: [1, 2, 3] },
        addOns,
        taxRates,
      },
    );
    expect(result.lineItems).toContainEqual({
      kind: "discount",
      code: "OFF_SEASON",
      amountCents: -12000,
    });
    expect(result.subtotalCents).toBe(108000);
  });
});

describe("calculateQuote — tax regimes", () => {
  it("Québec: GST + QST", () => {
    const result = quote({ province: "QC" });
    expect(result.taxLines.map((line) => line.code)).toEqual(["GST", "QST"]);
    expect(result.taxCents).toBe(17970);
  });

  it("Alberta: GST only", () => {
    expect(quote({ province: "AB" }).taxCents).toBe(6000);
  });

  it("taxes travel along with the service", () => {
    expect(quote({ distanceKm: 100 }).taxCents).toBe(Math.round((120000 + 8400) * 0.13));
  });
});

describe("calculateQuote — rounding", () => {
  it("rounds percentage lines half-up to whole cents", () => {
    const result = calculateQuote(
      { ...base, pkg: { ...corporate, basePriceCents: 12345 }, eventDate: "2026-06-13" },
      { rules, addOns, taxRates },
    );
    // 10% of $123.45 = 1234.5 → 1235
    expect(amount(result, "surcharge")).toBe(1235);
    // deposit: 30% of total, rounded half-up
    expect(result.depositCents).toBe(Math.floor((result.totalCents * 30 + 50) / 100));
  });

  it("returns integer cents everywhere", () => {
    const result = quote({
      durationHours: 4.5,
      photographers: 2,
      distanceKm: 57,
      eventDate: "2026-06-13",
    });
    for (const value of [
      result.subtotalCents,
      result.taxCents,
      result.totalCents,
      result.depositCents,
    ]) {
      expect(Number.isInteger(value)).toBe(true);
    }
    for (const item of result.lineItems) expect(Number.isInteger(item.amountCents)).toBe(true);
  });
});

describe("calculateQuote — hints and validation", () => {
  it("suggests more photographers for large guest counts", () => {
    expect(quote({ guestCount: 250 }).flags.suggestedPhotographers).toBe(3);
    expect(quote({ guestCount: 80 }).flags.suggestedPhotographers).toBeNull();
    expect(quote({ guestCount: 250, photographers: 3 }).flags.suggestedPhotographers).toBeNull();
  });

  it("rejects invalid inputs", () => {
    expect(() => quote({ durationHours: 0 })).toThrow();
    expect(() => quote({ durationHours: 4.25 })).toThrow(/half/);
    expect(() => quote({ photographers: 0 })).toThrow();
    expect(() => quote({ distanceKm: -5 })).toThrow();
    expect(() => quote({ eventDate: "2026-13-40" })).toThrow();
    expect(() => quote({ province: "XX" })).toThrow();
  });
});
