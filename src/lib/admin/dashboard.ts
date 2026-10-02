/**
 * Admin dashboard figures (AGENTS.md §6.10). Pure so they're unit tested.
 */
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";

/** The studio-local calendar month containing `now`, as UTC instants [start, end). */
export function studioMonthRange(
  now: Date,
  timeZone: string = siteConfig.timezone,
): { start: Date; end: Date } {
  const [year, month] = formatInTimeZone(now, timeZone, "yyyy-MM").split("-").map(Number);
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    start: fromZonedTime(`${year}-${pad(month)}-01T00:00:00`, timeZone),
    end: fromZonedTime(`${next.year}-${pad(next.month)}-01T00:00:00`, timeZone),
  };
}

type RevenueBooking = { status: string; subtotalCents: number | null };

/**
 * Revenue estimate for bookings in a period, before tax: confirmed (CONFIRMED + COMPLETED)
 * and pending separately. Cancelled bookings don't count; bookings with no stored price
 * are counted, not guessed.
 */
export function revenueEstimate(bookings: ReadonlyArray<RevenueBooking>) {
  let confirmedCents = 0;
  let pendingCents = 0;
  let unpricedCount = 0;
  for (const booking of bookings) {
    if (booking.status === "CANCELLED") continue;
    if (booking.subtotalCents === null) {
      unpricedCount += 1;
    } else if (booking.status === "PENDING") {
      pendingCents += booking.subtotalCents;
    } else {
      confirmedCents += booking.subtotalCents;
    }
  }
  return { confirmedCents, pendingCents, unpricedCount };
}
