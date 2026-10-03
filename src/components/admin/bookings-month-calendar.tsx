import Link from "next/link";

import { monthGrid, shiftMonth } from "@/lib/admin/calendar";
import { formatInStudioTz, studioDateKey } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { MonthCalendar } from "@/server/queries/admin-calendar";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOT: Record<string, string> = {
  PENDING: "bg-amber-500",
  CONFIRMED: "bg-emerald-600",
  COMPLETED: "bg-sky-600",
};

/** Month navigation; `basePath` is the page the links stay on (it reads `?month=`). */
export function CalendarMonthNav({ month, basePath }: { month: string; basePath: string }) {
  return (
    <nav aria-label="Month" className="flex gap-2 text-sm">
      <Link
        href={`${basePath}?month=${shiftMonth(month, -1)}`}
        className="rounded-full border px-4 py-1.5"
      >
        ← Previous
      </Link>
      <Link href={basePath} className="rounded-full border px-4 py-1.5">
        This month
      </Link>
      <Link
        href={`${basePath}?month=${shiftMonth(month, 1)}`}
        className="rounded-full border px-4 py-1.5"
      >
        Next →
      </Link>
    </nav>
  );
}

/** Month grid of bookings and blocked days (admin calendar and dashboard). */
export function BookingsMonthCalendar({ calendar }: { calendar: MonthCalendar }) {
  const { month, title, byDay, blockedDays } = calendar;
  const today = studioDateKey(new Date());
  return (
    <>
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
