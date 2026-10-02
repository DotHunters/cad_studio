import "server-only";

import { fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";
import {
  type AvailabilityContext,
  monthBounds,
  parseBookingRules,
} from "@/lib/booking/availability";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";

/**
 * Data for availability checks over a date-key range [start, end). Not cached: bookings
 * change constantly and the booking flow must see fresh capacity.
 */
export async function getAvailabilityContext(
  start: string,
  end: string,
): Promise<AvailabilityContext> {
  // Booking times are stored in UTC; the range is studio-local days.
  const from = fromZonedTime(`${start}T00:00:00`, siteConfig.timezone);
  const to = fromZonedTime(`${end}T00:00:00`, siteConfig.timezone);

  const [ruleRows, blocked, bookings] = await Promise.all([
    db.pricingRule.findMany({
      where: { key: { in: ["MAX_PHOTOGRAPHERS_PER_DAY", "MIN_LEAD_DAYS", "PENDING_HOLD_HOURS"] } },
    }),
    db.blockedDate.findMany({
      // @db.Date columns are compared as calendar dates.
      where: { date: { gte: new Date(`${start}T00:00:00Z`), lt: new Date(`${end}T00:00:00Z`) } },
      select: { date: true },
    }),
    db.booking.findMany({
      where: { startAt: { gte: from, lt: to }, status: { in: ["PENDING", "CONFIRMED"] } },
      select: { startAt: true, photographers: true, status: true },
    }),
  ]);

  return {
    today: studioDateKey(new Date()),
    rules: parseBookingRules(ruleRows),
    blockedDates: new Set(blocked.map((row) => row.date.toISOString().slice(0, 10))),
    bookings: bookings.map((booking) => ({
      dateKey: studioDateKey(booking.startAt),
      photographers: booking.photographers,
      status: booking.status,
    })),
  };
}

export async function getMonthAvailabilityContext(year: number, month: number) {
  const { start, end } = monthBounds(year, month);
  return getAvailabilityContext(start, end);
}
