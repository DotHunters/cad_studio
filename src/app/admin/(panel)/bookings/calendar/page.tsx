import { fromZonedTime } from "date-fns-tz";
import type { Metadata } from "next";
import Link from "next/link";

import { siteConfig } from "@/config/site";
import { groupByDate, monthGrid, parseMonth, shiftMonth } from "@/lib/admin/calendar";
import { formatInStudioTz, studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Bookings calendar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-emerald-600",
  COMPLETED: "bg-sky-600",
};

export default async function BookingsCalendarPage({ searchParams }: Props) {
  await requireAdminPage();
  const requested = (await searchParams).month;
  const month =
    parseMonth(Array.isArray(requested) ? requested[0] : requested) ??
    studioDateKey(new Date()).slice(0, 7);
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
  const byDay = groupByDate(bookings, (booking) => studioDateKey(booking.startAt));
  const blockedDays = new Map(
    blocked.map((day) => [day.date.toISOString().slice(0, 10), day.reason]),
  );
  const today = studioDateKey(new Date());
  const title = formatInStudioTz(
    fromZonedTime(`${month}-15T12:00:00`, siteConfig.timezone),
    "MMMM yyyy",
  );

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/admin/bookings"
            className="text-gold-text text-sm underline underline-offset-4"
          >
            ← Booking list
          </Link>
          <h1 className="font-heading mt-2 text-4xl">{title}</h1>
        </div>
        <nav aria-label="Month" className="flex gap-2 text-sm">
          <Link
            href={`/admin/bookings/calendar?month=${shiftMonth(month, -1)}`}
            className="rounded-full border px-4 py-1.5"
          >
            ← Previous
          </Link>
          <Link href="/admin/bookings/calendar" className="rounded-full border px-4 py-1.5">
            This month
          </Link>
          <Link
            href={`/admin/bookings/calendar?month=${shiftMonth(month, 1)}`}
            className="rounded-full border px-4 py-1.5"
          >
            Next →
          </Link>
        </nav>
      </div>

      {/* Scrolls sideways on small screens; focusable so keyboard users can scroll it. */}
      <div
        className="mt-6 overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label={`Calendar for ${title}`}
      >
        <table className="w-full min-w-[56rem] table-fixed border-collapse text-sm">
          <caption className="sr-only">Bookings in {title}</caption>
          <thead>
            <tr>
              {WEEKDAYS.map((day) => (
                <th key={day} scope="col" className="text-muted-foreground py-2 text-xs uppercase">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthGrid(month).map((week) => (
              <tr key={week[0].date}>
                {week.map((day) => {
                  const items = byDay.get(day.date) ?? [];
                  const blockedReason = blockedDays.get(day.date);
                  return (
                    <td
                      key={day.date}
                      data-date={day.date}
                      className={cn(
                        "h-28 border p-1.5 align-top",
                        !day.inMonth && "bg-muted/40 text-muted-foreground",
                        blockedDays.has(day.date) && "bg-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs",
                          day.date === today &&
                            "bg-ink text-paper dark:bg-paper dark:text-ink rounded-full px-1.5",
                        )}
                      >
                        {Number(day.date.slice(8))}
                      </span>
                      {blockedDays.has(day.date) && (
                        <span className="text-muted-foreground block text-xs">
                          Blocked{blockedReason ? ` · ${blockedReason}` : ""}
                        </span>
                      )}
                      <ul className="mt-1 space-y-1">
                        {items.map((booking) => (
                          <li key={booking.id}>
                            <Link
                              href={`/admin/bookings/${booking.reference}`}
                              className="hover:bg-muted flex items-start gap-1.5 rounded px-1 text-xs"
                            >
                              <span
                                aria-hidden
                                className={cn(
                                  "mt-1 size-2 shrink-0 rounded-full",
                                  DOT[booking.status],
                                )}
                              />
                              <span>
                                {formatInStudioTz(booking.startAt, "h:mm a")}{" "}
                                {booking.customer.name}
                                <span className="sr-only">
                                  {" "}
                                  ({booking.status.toLowerCase()}, {booking.photographers}{" "}
                                  photographers)
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground mt-3 flex flex-wrap gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-amber-500" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-emerald-600" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2 rounded-full bg-sky-600" /> Completed
        </span>
      </p>
    </>
  );
}
