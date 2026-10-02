import type { Metadata } from "next";
import Link from "next/link";

import { BlockDatesForm } from "@/components/admin/block-dates-form";
import { Button } from "@/components/ui/button";
import { groupByDate } from "@/lib/admin/calendar";
import { hasRole } from "@/lib/auth/roles";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { unblockDate } from "@/server/actions/admin/availability";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Availability" };

const formatDay = (key: string) =>
  new Intl.DateTimeFormat("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${key}T00:00:00Z`));

export default async function AdminAvailabilityPage() {
  const user = await requireAdminPage();
  const today = studioDateKey(new Date());
  const [blocked, capacity] = await Promise.all([
    db.blockedDate.findMany({
      where: { date: { gte: new Date(`${today}T00:00:00Z`) } },
      orderBy: { date: "asc" },
    }),
    db.pricingRule.findUnique({ where: { key: "MAX_PHOTOGRAPHERS_PER_DAY" } }),
  ]);
  const keys = blocked.map((day) => day.date.toISOString().slice(0, 10));
  // Bookings already on blocked days (they're kept — the studio decides what to do).
  const bookings = keys.length
    ? await db.booking.findMany({
        where: {
          status: { in: ["PENDING", "CONFIRMED"] },
          startAt: {
            gte: new Date(`${keys[0]}T00:00:00Z`),
            lt: new Date(new Date(`${keys.at(-1)}T00:00:00Z`).getTime() + 2 * 86_400_000),
          },
        },
        select: { reference: true, startAt: true },
      })
    : [];
  const bookingsByDay = groupByDate(bookings, (booking) => studioDateKey(booking.startAt));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-heading text-4xl">Availability</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Blocked days can&apos;t be booked online. Daily capacity is{" "}
          {typeof capacity?.value === "number" ? capacity.value : "—"} photographers
          {hasRole(user.role, "ADMIN") ? (
            <>
              {" "}
              (change it on the{" "}
              <Link href="/admin/pricing" className="text-gold-text underline underline-offset-4">
                Pricing
              </Link>{" "}
              page).
            </>
          ) : (
            "."
          )}
        </p>
      </div>

      <section aria-labelledby="block-title" className="bg-card rounded-xl border p-5">
        <h2 id="block-title" className="mb-4 text-lg font-medium">
          Block dates
        </h2>
        <BlockDatesForm today={today} />
      </section>

      <section aria-labelledby="blocked-title">
        <h2 id="blocked-title" className="font-heading mb-4 text-2xl">
          Upcoming blocked days
        </h2>
        {blocked.length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming blocked days.</p>
        ) : (
          <ul className="divide-y rounded-xl border">
            {blocked.map((day, index) => {
              const key = keys[index];
              const clashes = bookingsByDay.get(key) ?? [];
              return (
                <li
                  key={day.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <span>
                    <span className="font-medium">{formatDay(key)}</span>
                    {day.reason && <span className="text-muted-foreground"> · {day.reason}</span>}
                    {clashes.length > 0 && (
                      <span className="block text-xs text-amber-800 dark:text-amber-300">
                        Still has {clashes.length === 1 ? "a booking" : "bookings"}:{" "}
                        {clashes.map((booking, i) => (
                          <span key={booking.reference}>
                            {i > 0 && ", "}
                            <Link
                              href={`/admin/bookings/${booking.reference}`}
                              className="underline underline-offset-4"
                            >
                              {booking.reference}
                            </Link>
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  <form action={unblockDate}>
                    <input type="hidden" name="id" value={day.id} />
                    <Button type="submit" size="sm" variant="outline">
                      Unblock <span className="sr-only">{formatDay(key)}</span>
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
