/**
 * Booking availability (AGENTS.md §8.3). Pure functions over studio-local date keys
 * ("YYYY-MM-DD"), so results don't depend on the server's time zone.
 *
 * A date is unavailable if it's blocked, in the past, within MIN_LEAD_DAYS of today, or the
 * photographers on PENDING + CONFIRMED bookings already reach MAX_PHOTOGRAPHERS_PER_DAY.
 */

export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";

export type AvailabilityContext = {
  /** Today in the studio's time zone. */
  today: string;
  rules: { MAX_PHOTOGRAPHERS_PER_DAY: number; MIN_LEAD_DAYS: number };
  blockedDates: ReadonlySet<string>;
  bookings: ReadonlyArray<{ dateKey: string; photographers: number; status: BookingStatus }>;
};

export type DayReason = "open" | "full" | "blocked" | "past" | "too-soon";

export type DayAvailability = {
  date: string;
  reason: DayReason;
  remaining: number;
  /** Daily capacity (MAX_PHOTOGRAPHERS_PER_DAY) at the time of the check. */
  capacity: number;
};

export type PublicStatus = "available" | "limited" | "full";

/** Statuses that hold capacity. */
const HOLDS_CAPACITY: ReadonlySet<BookingStatus> = new Set(["PENDING", "CONFIRMED"]);

export function addDaysToKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function dayAvailability(date: string, ctx: AvailabilityContext): DayAvailability {
  const capacity = ctx.rules.MAX_PHOTOGRAPHERS_PER_DAY;
  if (date < ctx.today) return { date, reason: "past", remaining: 0, capacity };
  if (date < addDaysToKey(ctx.today, ctx.rules.MIN_LEAD_DAYS)) {
    return { date, reason: "too-soon", remaining: 0, capacity };
  }
  if (ctx.blockedDates.has(date)) return { date, reason: "blocked", remaining: 0, capacity };

  const booked = ctx.bookings
    .filter((booking) => booking.dateKey === date && HOLDS_CAPACITY.has(booking.status))
    .reduce((sum, booking) => sum + booking.photographers, 0);
  const remaining = Math.max(0, capacity - booked);
  return { date, reason: remaining > 0 ? "open" : "full", remaining, capacity };
}

/**
 * What the public endpoint shows (AGENTS.md §8.3): never other clients' details, and
 * blocked/past/too-soon days look "full" without saying why.
 */
export function publicStatus(day: DayAvailability): PublicStatus {
  if (day.reason !== "open") return "full";
  return day.remaining >= day.capacity ? "available" : "limited";
}

export function canBook(date: string, photographers: number, ctx: AvailabilityContext): boolean {
  const day = dayAvailability(date, ctx);
  return day.reason === "open" && day.remaining >= photographers;
}

/** Public availability for every day of a month (month is 1–12). */
export function monthAvailability(year: number, month: number, ctx: AvailabilityContext) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(index + 1).padStart(2, "0")}`;
    return {
      date,
      status: publicStatus(dayAvailability(date, ctx)),
    };
  });
}

/** How far ahead clients can browse and book. */
export const MAX_MONTHS_AHEAD = 18;

/** "YYYY-MM" from the current month up to MAX_MONTHS_AHEAD; anything else is null. */
export function parseMonthParam(value: string | null | undefined, today: string) {
  const match = value ? /^(\d{4})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const [currentYear, currentMonth] = today.split("-").map(Number);
  const offset = (year - currentYear) * 12 + (month - currentMonth);
  return offset >= 0 && offset <= MAX_MONTHS_AHEAD ? { year, month } : null;
}

/** First day of the month and of the following month, as date keys. */
export function monthBounds(year: number, month: number) {
  const pad = (value: number) => String(value).padStart(2, "0");
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  return { start: `${year}-${pad(month)}-01`, end: `${next.year}-${pad(next.month)}-01` };
}

export type BookingRules = {
  MAX_PHOTOGRAPHERS_PER_DAY: number;
  MIN_LEAD_DAYS: number;
  PENDING_HOLD_HOURS: number;
};

/** Booking rules from PricingRule rows; a missing or non-numeric rule throws. */
export function parseBookingRules(
  rows: ReadonlyArray<{ key: string; value: unknown }>,
): BookingRules {
  const keys = ["MAX_PHOTOGRAPHERS_PER_DAY", "MIN_LEAD_DAYS", "PENDING_HOLD_HOURS"] as const;
  const rules = {} as BookingRules;
  for (const key of keys) {
    const value = rows.find((row) => row.key === key)?.value;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(`Booking rule ${key} is missing or not a number`);
    }
    rules[key] = value;
  }
  return rules;
}
