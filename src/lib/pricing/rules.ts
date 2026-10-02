import type { PricingRules } from "./calculate-quote";

const REQUIRED = [
  "EXTRA_HOUR_RATE",
  "EXTRA_SHOOTER_HOURLY",
  "FREE_TRAVEL_KM",
  "TRAVEL_PER_KM",
  "MAX_AUTO_TRAVEL_KM",
  "WEEKEND_SURCHARGE_PCT",
  "STAT_HOLIDAY_SURCHARGE_PCT",
  "DEPOSIT_PCT",
  "GUESTS_PER_PHOTOGRAPHER_HINT",
] as const;

export type PricingRuleRecord = { key: string; value: unknown };

/** Builds engine rules from PricingRule rows; a missing or non-numeric required rule throws. */
export function parsePricingRules(records: readonly PricingRuleRecord[]): PricingRules {
  const byKey = new Map(records.map((record) => [record.key, record.value]));
  const rules = {} as PricingRules;
  for (const key of REQUIRED) {
    const value = byKey.get(key);
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Pricing rule ${key} is missing or not a number`);
    }
    rules[key] = value;
  }
  const discount = byKey.get("OFF_SEASON_DISCOUNT_PCT");
  const months = byKey.get("OFF_SEASON_MONTHS");
  if (typeof discount === "number") rules.OFF_SEASON_DISCOUNT_PCT = discount;
  if (Array.isArray(months) && months.every((month) => Number.isInteger(month))) {
    rules.OFF_SEASON_MONTHS = months as number[];
  }
  return rules;
}

/**
 * The package a quote is priced from: the chosen one if it belongs to the category,
 * otherwise the category's cheapest active package (AGENTS.md §8.1 "category minimum").
 */
export function resolvePackage<
  T extends { slug: string; category: string; basePriceCents: number },
>(packages: readonly T[], category: string, slug: string | undefined): T | null {
  const inCategory = packages.filter((pkg) => pkg.category === category);
  const chosen = slug ? inCategory.find((pkg) => pkg.slug === slug) : undefined;
  if (chosen) return chosen;
  return inCategory.reduce<T | null>(
    (cheapest, pkg) => (!cheapest || pkg.basePriceCents < cheapest.basePriceCents ? pkg : cheapest),
    null,
  );
}
