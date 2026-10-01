/**
 * Quote engine (AGENTS.md §8.1). Pure, deterministic and side-effect free: the same function
 * runs in the browser (live preview) and on the server (source of truth). All money is
 * integer CAD cents; every percentage line is rounded half-up to the cent.
 *
 * Decisions beyond the spec's formula:
 * - Weekend and stat-holiday surcharges don't stack; the higher one applies.
 * - Surcharges and discounts apply to the service (base + extra hours + extra shooters),
 *   not to add-ons or travel.
 * - Travel and international events beyond the automatic range get a custom-travel flag
 *   instead of a price.
 * - Tax is charged on the whole subtotal, travel included.
 */
import { calculateTax, findTaxRate, type TaxLine, type TaxRateInput } from "@/lib/tax";

import { dayOfWeek, isOntarioStatHoliday } from "./holidays";

export type AddOnUnit = "FLAT" | "PER_HOUR" | "PER_ITEM";

export type AddOnDefinition = {
  code: string;
  priceCents: number;
  unit: AddOnUnit;
  categories: readonly string[];
};

/** Admin-editable knobs (PricingRule table). Money in cents, percentages as whole numbers. */
export type PricingRules = {
  EXTRA_HOUR_RATE: number;
  EXTRA_SHOOTER_HOURLY: number;
  FREE_TRAVEL_KM: number;
  TRAVEL_PER_KM: number;
  MAX_AUTO_TRAVEL_KM: number;
  WEEKEND_SURCHARGE_PCT: number;
  STAT_HOLIDAY_SURCHARGE_PCT: number;
  DEPOSIT_PCT: number;
  GUESTS_PER_PHOTOGRAPHER_HINT: number;
  OFF_SEASON_DISCOUNT_PCT?: number;
  /** 1–12 */
  OFF_SEASON_MONTHS?: readonly number[];
};

export type QuotePackage = {
  basePriceCents: number;
  includedHours: number;
  includedShooters: number;
};

export type QuoteInput = {
  category: string;
  /** The chosen package, or the category's default package when none was chosen. */
  pkg: QuotePackage;
  /** Studio-local calendar date, "YYYY-MM-DD". */
  eventDate: string;
  /** Hours, in half-hour steps. */
  durationHours: number;
  photographers: number;
  guestCount?: number | null;
  province: string;
  distanceKm: number | null;
  isInternational: boolean;
  addOns: ReadonlyArray<{ code: string; qty: number }>;
};

export type LineItem =
  | { kind: "base"; amountCents: number }
  | { kind: "extraHours"; hours: number; amountCents: number }
  | { kind: "extraShooters"; shooters: number; hours: number; amountCents: number }
  | { kind: "addOn"; code: string; quantity: number; amountCents: number }
  | { kind: "travel"; km: number; amountCents: number }
  | { kind: "surcharge"; code: "WEEKEND" | "STAT_HOLIDAY"; amountCents: number }
  | { kind: "discount"; code: "OFF_SEASON"; amountCents: number };

export type QuoteResult = {
  lineItems: LineItem[];
  subtotalCents: number;
  taxLines: TaxLine[];
  taxCents: number;
  totalCents: number;
  depositCents: number;
  flags: { customTravelQuote: boolean; suggestedPhotographers: number | null };
};

type Context = {
  rules: PricingRules;
  addOns: readonly AddOnDefinition[];
  taxRates: readonly TaxRateInput[];
};

/** Half-up rounding of a non-negative amount × pct / 100. */
const percentOf = (cents: number, pct: number) => Math.floor((cents * pct + 50) / 100);

/** Half-up rounding of cents × hours where hours is a multiple of 0.5. */
const timesHours = (cents: number, hours: number) => Math.floor((cents * hours * 2 + 1) / 2);

function validate(input: QuoteInput): { year: number; month: number; day: number } {
  const { durationHours, photographers, distanceKm, eventDate } = input;
  if (!(durationHours > 0 && durationHours <= 24)) {
    throw new RangeError(`Duration must be between 0 and 24 hours, got ${durationHours}`);
  }
  if (!Number.isInteger(durationHours * 2)) {
    throw new RangeError(`Duration must be in half-hour steps, got ${durationHours}`);
  }
  if (!Number.isInteger(photographers) || photographers < 1 || photographers > 10) {
    throw new RangeError(`Photographers must be 1–10, got ${photographers}`);
  }
  if (distanceKm !== null && !(distanceKm >= 0)) {
    throw new RangeError(`Distance must be non-negative, got ${distanceKm}`);
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(eventDate);
  const [year, month, day] = match ? match.slice(1).map(Number) : [];
  const check = match ? new Date(Date.UTC(year, month - 1, day)) : null;
  if (!check || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new RangeError(`Invalid event date: "${eventDate}"`);
  }
  return { year, month, day };
}

export function calculateQuote(
  input: QuoteInput,
  { rules, addOns, taxRates }: Context,
): QuoteResult {
  const { year, month, day } = validate(input);
  const taxRate = findTaxRate(taxRates, input.isInternational ? "INTL" : input.province);
  const { pkg, durationHours: hours, photographers } = input;
  const lineItems: LineItem[] = [{ kind: "base", amountCents: pkg.basePriceCents }];

  // Extra hours and photographers beyond the package.
  const extraHours = Math.max(0, hours - pkg.includedHours);
  const extraHoursCents = timesHours(rules.EXTRA_HOUR_RATE, extraHours);
  if (extraHoursCents > 0)
    lineItems.push({ kind: "extraHours", hours: extraHours, amountCents: extraHoursCents });

  const extraShooters = Math.max(0, photographers - pkg.includedShooters);
  const extraShootersCents = extraShooters * timesHours(rules.EXTRA_SHOOTER_HOURLY, hours);
  if (extraShootersCents > 0) {
    lineItems.push({
      kind: "extraShooters",
      shooters: extraShooters,
      hours,
      amountCents: extraShootersCents,
    });
  }

  const serviceCents = pkg.basePriceCents + extraHoursCents + extraShootersCents;

  // Surcharges: the higher of weekend / stat holiday.
  const isWeekend = [0, 6].includes(dayOfWeek(year, month, day));
  const isHoliday = isOntarioStatHoliday(input.eventDate);
  const surcharges = [
    isHoliday && { code: "STAT_HOLIDAY" as const, pct: rules.STAT_HOLIDAY_SURCHARGE_PCT },
    isWeekend && { code: "WEEKEND" as const, pct: rules.WEEKEND_SURCHARGE_PCT },
  ].filter((value): value is { code: "WEEKEND" | "STAT_HOLIDAY"; pct: number } => Boolean(value));
  const surcharge = surcharges.sort((a, b) => b.pct - a.pct)[0];
  if (surcharge && surcharge.pct > 0) {
    lineItems.push({
      kind: "surcharge",
      code: surcharge.code,
      amountCents: percentOf(serviceCents, surcharge.pct),
    });
  }

  // Off-season discount (only if configured).
  if (rules.OFF_SEASON_DISCOUNT_PCT && rules.OFF_SEASON_MONTHS?.includes(month)) {
    lineItems.push({
      kind: "discount",
      code: "OFF_SEASON",
      amountCents: -percentOf(serviceCents, rules.OFF_SEASON_DISCOUNT_PCT),
    });
  }

  // Add-ons.
  for (const { code, qty } of input.addOns) {
    if (!(qty > 0)) continue;
    const definition = addOns.find((candidate) => candidate.code === code);
    if (!definition || !definition.categories.includes(input.category)) {
      throw new RangeError(`Add-on "${code}" is not available for ${input.category}`);
    }
    if (!Number.isInteger(qty)) throw new RangeError(`Add-on quantity must be whole, got ${qty}`);
    const unitCents =
      definition.unit === "PER_HOUR"
        ? timesHours(definition.priceCents, hours)
        : definition.priceCents;
    lineItems.push({ kind: "addOn", code, quantity: qty, amountCents: unitCents * qty });
  }

  // Travel: round trip beyond the free radius; custom quote beyond the automatic range.
  const km = input.distanceKm ?? 0;
  const customTravelQuote = input.isInternational || km > rules.MAX_AUTO_TRAVEL_KM;
  if (!customTravelQuote && km > rules.FREE_TRAVEL_KM) {
    const billableKm = km - rules.FREE_TRAVEL_KM;
    lineItems.push({
      kind: "travel",
      km: billableKm,
      amountCents: Math.round(billableKm * 2 * rules.TRAVEL_PER_KM),
    });
  }

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  const { lines: taxLines, taxCents } = calculateTax(subtotalCents, taxRate);
  const totalCents = subtotalCents + taxCents;

  const neededShooters = input.guestCount
    ? Math.ceil(input.guestCount / rules.GUESTS_PER_PHOTOGRAPHER_HINT)
    : 0;

  return {
    lineItems,
    subtotalCents,
    taxLines,
    taxCents,
    totalCents,
    depositCents: percentOf(totalCents, rules.DEPOSIT_PCT),
    flags: {
      customTravelQuote,
      suggestedPhotographers: neededShooters > photographers ? neededShooters : null,
    },
  };
}
