/**
 * Admin-editable pricing and booking rules (AGENTS.md §8.1, §8.3). One definition per
 * `PricingRule` key drives the form, its validation and how values are stored:
 * money in CAD cents, percentages as numbers (30 = 30%), everything else as whole numbers.
 */
import { z } from "zod";

import { toCents } from "@/lib/money";

export type RuleKind = "money" | "percent" | "number";

export type RuleDefinition = {
  key: string;
  label: string;
  help: string;
  kind: RuleKind;
  /** Unit shown after the field, e.g. "km", "hours". */
  unit?: string;
  min: number;
  max: number;
  group: "Quote" | "Booking";
  /** Shown when the rule isn't stored yet (optional rules only). */
  fallback?: number;
};

export const RULE_DEFINITIONS: readonly RuleDefinition[] = [
  {
    key: "EXTRA_HOUR_RATE",
    label: "Extra hour rate",
    help: "Per hour beyond the package's hours.",
    kind: "money",
    min: 0,
    max: 10_000,
    group: "Quote",
  },
  {
    key: "EXTRA_SHOOTER_HOURLY",
    label: "Extra photographer, per hour",
    help: "Per extra photographer, per hour of the event.",
    kind: "money",
    min: 0,
    max: 10_000,
    group: "Quote",
  },
  {
    key: "FREE_TRAVEL_KM",
    label: "Free travel distance",
    help: "Measured from Scarborough. No travel fee within this distance.",
    kind: "number",
    unit: "km",
    min: 0,
    max: 1000,
    group: "Quote",
  },
  {
    key: "TRAVEL_PER_KM",
    label: "Travel rate",
    help: "Per km beyond the free distance, charged for the round trip.",
    kind: "money",
    unit: "per km",
    min: 0,
    max: 100,
    group: "Quote",
  },
  {
    key: "MAX_AUTO_TRAVEL_KM",
    label: "Custom travel quote beyond",
    help: "Farther than this (or outside Canada) shows “custom travel quote” instead of a price.",
    kind: "number",
    unit: "km",
    min: 0,
    max: 5000,
    group: "Quote",
  },
  {
    key: "WEEKEND_SURCHARGE_PCT",
    label: "Weekend surcharge",
    help: "On the service (package, extra hours, extra photographers).",
    kind: "percent",
    min: 0,
    max: 100,
    group: "Quote",
  },
  {
    key: "STAT_HOLIDAY_SURCHARGE_PCT",
    label: "Statutory holiday surcharge",
    help: "Ontario stat holidays. Doesn't stack with the weekend surcharge — the higher one applies.",
    kind: "percent",
    min: 0,
    max: 100,
    group: "Quote",
  },
  {
    key: "OFF_SEASON_DISCOUNT_PCT",
    fallback: 0,
    label: "Off-season discount",
    help: "0 turns it off. Applies to events in the off-season months below.",
    kind: "percent",
    min: 0,
    max: 100,
    group: "Quote",
  },
  {
    key: "DEPOSIT_PCT",
    label: "Deposit",
    help: "Share of the total asked to confirm a booking.",
    kind: "percent",
    min: 0,
    max: 100,
    group: "Quote",
  },
  {
    key: "QUOTE_VALID_DAYS",
    label: "Quotes valid for",
    help: "Days before a quote expires.",
    kind: "number",
    unit: "days",
    min: 1,
    max: 365,
    group: "Quote",
  },
  {
    key: "GUESTS_PER_PHOTOGRAPHER_HINT",
    label: "Guests per photographer (hint)",
    help: "The quote form suggests another photographer per this many guests.",
    kind: "number",
    unit: "guests",
    min: 10,
    max: 1000,
    group: "Quote",
  },
  {
    key: "MAX_PHOTOGRAPHERS_PER_DAY",
    label: "Photographers per day",
    help: "Daily capacity. A date is full when bookings reach this.",
    kind: "number",
    min: 1,
    max: 50,
    group: "Booking",
  },
  {
    key: "MIN_LEAD_DAYS",
    label: "Minimum notice",
    help: "Dates sooner than this can't be booked online.",
    kind: "number",
    unit: "days",
    min: 0,
    max: 365,
    group: "Booking",
  },
  {
    key: "PENDING_HOLD_HOURS",
    label: "Unpaid hold",
    help: "Hours after the payment request before an unpaid booking is released.",
    kind: "number",
    unit: "hours",
    min: 1,
    max: 720,
    group: "Booking",
  },
];

/** Months (1–12) for the off-season discount; stored as an array rule. */
export const OFF_SEASON_MONTHS_KEY = "OFF_SEASON_MONTHS";

const numberField = (definition: RuleDefinition) => {
  const message = `Enter a number from ${definition.min} to ${definition.max}.`;
  const base = z.string("Required.").trim().min(1, "Required.");
  if (definition.kind === "money") {
    return base.transform((value, ctx) => {
      try {
        const cents = toCents(value);
        if (cents >= definition.min * 100 && cents <= definition.max * 100) return cents;
      } catch {
        // Reported below.
      }
      ctx.addIssue({
        code: "custom",
        message: `Enter an amount from $${definition.min} to $${definition.max}.`,
      });
      return z.NEVER;
    });
  }
  // Whole numbers only — percentages too: the quote engine's integer-cent rounding
  // (calculate-quote.ts) assumes whole percentages.
  return base
    .regex(/^\d+$/, "Use a whole number.")
    .transform(Number)
    .pipe(z.number().min(definition.min, message).max(definition.max, message));
};

export const pricingRulesFormSchema = z.object({
  ...Object.fromEntries(
    RULE_DEFINITIONS.map((definition) => [definition.key, numberField(definition)]),
  ),
  [OFF_SEASON_MONTHS_KEY]: z.preprocess(
    (value) => (value === undefined ? [] : Array.isArray(value) ? value : [value]),
    z.array(z.coerce.number().int().min(1).max(12)),
  ),
}) as z.ZodType<Record<string, number | number[]>, unknown>;

/** Stored rule values → form strings (cents shown as dollars). */
export function ruleFormDefaults(records: ReadonlyArray<{ key: string; value: unknown }>) {
  const byKey = new Map(records.map((record) => [record.key, record.value]));
  const values: Record<string, string> = {};
  for (const definition of RULE_DEFINITIONS) {
    const value = byKey.get(definition.key);
    values[definition.key] =
      typeof value !== "number"
        ? definition.fallback === undefined
          ? ""
          : String(definition.fallback)
        : definition.kind === "money"
          ? (value / 100).toFixed(2)
          : String(value);
  }
  const months = byKey.get(OFF_SEASON_MONTHS_KEY);
  return {
    values,
    offSeasonMonths: Array.isArray(months) ? months.filter((month) => Number.isInteger(month)) : [],
  };
}
