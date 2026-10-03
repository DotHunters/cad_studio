import "server-only";

import { fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";
import { groupByDate, shiftMonth } from "@/lib/admin/calendar";
import { formatInStudioTz, studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";

/** Bookings (not cancelled) and blocked days in one studio-time month (`yyyy-MM`). */
export async function getMonthCalendar(month: string) {
  const start = fromZonedTime(`${month}-01T00:00:00`, siteConfig.timezone);
  const end = fromZonedTime(`${shiftMonth(month, 1)}-01T00:00:00`, siteConfig.timezone);
  const [bookings, blocked] = await Promise.all([
    db.booking.findMany({
      // Cancelled bookings don't occupy the day.
      where: { startAt: { gte: start, lt: end }, status: { not: "CANCELLED" } },
      orderBy: { startAt: "asc" },
      select: {
        id: true,
        reference: true,
        startAt: true,
        status: true,
        photographers: true,
        customer: { select: { name: true } },
      },
    }),
    db.blockedDate.findMany({
      where: { date: { gte: new Date(`${month}-01`), lt: new Date(`${shiftMonth(month, 1)}-01`) } },
    }),
  ]);
  return {
    month,
    title: formatInStudioTz(
      fromZonedTime(`${month}-15T12:00:00`, siteConfig.timezone),
      "MMMM yyyy",
    ),
    byDay: groupByDate(bookings, (booking) => studioDateKey(booking.startAt)),
    blockedDays: new Map(blocked.map((day) => [day.date.toISOString().slice(0, 10), day.reason])),
  };
}

export type MonthCalendar = Awaited<ReturnType<typeof getMonthCalendar>>;
