import type { Metadata } from "next";
import Link from "next/link";

import {
  BookingsMonthCalendar,
  CalendarMonthNav,
} from "@/components/admin/bookings-month-calendar";
import { parseMonth } from "@/lib/admin/calendar";
import { studioDateKey } from "@/lib/dates";
import { requireAdminPage } from "@/server/auth/guards";
import { getMonthCalendar } from "@/server/queries/admin-calendar";

export const metadata: Metadata = { title: "Bookings calendar" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BookingsCalendarPage({ searchParams }: Props) {
  await requireAdminPage();
  const requested = (await searchParams).month;
  const month =
    parseMonth(Array.isArray(requested) ? requested[0] : requested) ??
    studioDateKey(new Date()).slice(0, 7);
  const calendar = await getMonthCalendar(month);

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
          <h1 className="font-heading mt-2 text-4xl">{calendar.title}</h1>
        </div>
        <CalendarMonthNav month={month} basePath="/admin/bookings/calendar" />
      </div>
      <BookingsMonthCalendar calendar={calendar} />
    </>
  );
}
