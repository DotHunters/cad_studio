import { describe, expect, it } from "vitest";

import {
  OFF_SEASON_MONTHS_KEY,
  pricingRulesFormSchema,
  RULE_DEFINITIONS,
  ruleFormDefaults,
} from "@/lib/admin/pricing-rules";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { parsePricingRules } from "@/lib/pricing/rules";
import { pricingRules as seededRules } from "../../prisma/seed-data";

const seededRecords = Object.entries(seededRules).map(([key, value]) => ({ key, value }));

const validForm = () => ruleFormDefaults(seededRecords).values;

describe("pricing rule definitions", () => {
  it("cover every rule the quote engine and booking need", () => {
    const keys = RULE_DEFINITIONS.map((definition) => definition.key);
    for (const key of Object.keys(seededRules)) expect(keys).toContain(key);
  });
});

describe("ruleFormDefaults", () => {
  it("shows money as dollars and other values as typed", () => {
    const { values, offSeasonMonths } = ruleFormDefaults([
      ...seededRecords,
      { key: OFF_SEASON_MONTHS_KEY, value: [1, 2] },
    ]);
    expect(values.EXTRA_HOUR_RATE).toBe("200.00");
    expect(values.TRAVEL_PER_KM).toBe("0.70");
    expect(values.DEPOSIT_PCT).toBe("30");
    // Optional and not seeded: shown as 0 (off) so the form can be saved.
    expect(values.OFF_SEASON_DISCOUNT_PCT).toBe("0");
    expect(offSeasonMonths).toEqual([1, 2]);
  });
});

describe("pricingRulesFormSchema", () => {
  it("stores money as cents and percentages/numbers as numbers", () => {
    const parsed = pricingRulesFormSchema.parse({
      ...validForm(),
      WEEKEND_SURCHARGE_PCT: "15",
      TRAVEL_PER_KM: "0.75",
      [OFF_SEASON_MONTHS_KEY]: ["1", "2"],
    });
    expect(parsed).toMatchObject({
      EXTRA_HOUR_RATE: 20_000,
      TRAVEL_PER_KM: 75,
      WEEKEND_SURCHARGE_PCT: 15,
      FREE_TRAVEL_KM: 40,
      [OFF_SEASON_MONTHS_KEY]: [1, 2],
    });
    // What the form saves is exactly what the quote engine reads.
    const records = Object.entries(parsed).map(([key, value]) => ({ key, value }));
    expect(() => parsePricingRules(records)).not.toThrow();
  });

  it("explains out-of-range and malformed values", () => {
    const result = pricingRulesFormSchema.safeParse({
      ...validForm(),
      DEPOSIT_PCT: "150",
      FREE_TRAVEL_KM: "12.5",
      EXTRA_HOUR_RATE: "lots",
      MAX_PHOTOGRAPHERS_PER_DAY: "",
      WEEKEND_SURCHARGE_PCT: "12.5",
    });
    expect(result.success).toBe(false);
    expect(fieldErrorsOf(result.error!)).toEqual({
      DEPOSIT_PCT: "Enter a number from 0 to 100.",
      FREE_TRAVEL_KM: "Use a whole number.",
      EXTRA_HOUR_RATE: "Enter an amount from $0 to $10000.",
      MAX_PHOTOGRAPHERS_PER_DAY: "Required.",
      WEEKEND_SURCHARGE_PCT: "Use a whole number.",
    });
  });
});
