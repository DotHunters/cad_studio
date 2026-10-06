import type { Metadata } from "next";
import Link from "next/link";

import { StatusBadge } from "@/components/admin/status-badge";
import { adminFieldClass } from "@/components/admin/form-field";
import { Button, buttonVariants } from "@/components/ui/button";
import { BOOKING_STATUSES, parseBookingFilters } from "@/lib/admin/bookings";
import { needsPaymentRequest } from "@/lib/booking/holds";
import { formatInStudioTz } from "@/lib/dates";
import { formatCAD } from "@/lib/money";
import { requireAdminPage } from "@/server/auth/guards";
import { listBookingsForAdmin } from "@/server/queries/admin-bookings";
import { adminCategoryOptions } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Bookings" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const label = (status: string) => status.charAt(0) + status.slice(1).toLowerCase();

export default async function AdminBookingsPage({ searchParams }: Props) {
  await requireAdminPage();
  const filters = parseBookingFilters(await searchParams);
  const now = new Date();
  const [{ bookings, truncated }, categories] = await Promise.all([
    listBookingsForAdmin(filters, now),
    adminCategoryOptions(),
  ]);
  const categoryLabel = new Map(categories.map((option) => [option.value, option.label]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-heading text-4xl">Bookings</h1>
        <div className="flex gap-2">
          <Link href="/admin/bookings/calendar" className={buttonVariants({ variant: "outline" })}>
            Calendar
          </Link>
          <a
            href={`/admin/bookings/export?${new URLSearchParams({ status: filters.status, when: filters.when, q: filters.q })}`}
            className={buttonVariants({ variant: "outline" })}
          >
            Export CSV
          </a>
        </div>
      </div>

      <form
        method="get"
        role="search"
        aria-label="Filter bookings"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="text-sm font-medium">
          Status
          <select name="status" defaultValue={filters.status} className={adminFieldClass}>
            <option value="ALL">All</option>
            {BOOKING_STATUSES.map((status) => (
              <option key={status} value={status}>
                {label(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          When
          <select name="when" defaultValue={filters.when} className={adminFieldClass}>
            <option value="upcoming">Upcoming</option>
            <option value="past">Past</option>
            <option value="all">All dates</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Search
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="Reference, name or email"
            className={adminFieldClass}
          />
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      {bookings.length === 0 ? (
        <p className="text-muted-foreground mt-8">No bookings match these filters.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Event
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Service
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Total
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/bookings/${booking.reference}`}
                      className="font-mono font-medium underline-offset-4 hover:underline"
                    >
                      {booking.reference}
                    </Link>
                    <span className="text-muted-foreground block text-xs">
                      {formatInStudioTz(booking.startAt, "EEE MMM d, yyyy · h:mm a")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {booking.customer.name}
                    <span className="text-muted-foreground block text-xs">
                      {booking.customer.email}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {categoryLabel.get(booking.category)}
                    <span className="text-muted-foreground block text-xs">
                      {booking.photographers}{" "}
                      {booking.photographers === 1 ? "photographer" : "photographers"}
                      {booking.assignees.length > 0 &&
                        ` · ${booking.assignees.map((person) => person.name ?? person.email).join(", ")}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {booking.totalCents === null
                      ? "—"
                      : formatCAD(booking.totalCents, "en", { suffix: false })}
                    <span className="text-muted-foreground block text-xs">
                      {booking.depositPaidAt
                        ? "Deposit paid"
                        : booking.paymentRequestedAt
                          ? "Payment requested"
                          : "No payment request"}
                    </span>
                  </td>
                  <td className="space-y-1 px-4 py-3">
                    <StatusBadge status={booking.status} />
                    {needsPaymentRequest(booking, now) && (
                      <span className="block text-xs text-amber-800 dark:text-amber-300">
                        Send payment request
                      </span>
                    )}
                    {booking._count.changeRequests > 0 && (
                      <span className="block text-xs text-amber-800 dark:text-amber-300">
                        Change requested
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {truncated && (
        <p className="text-muted-foreground mt-3 text-sm">
          Showing the first 200 — narrow the filters to see more.
        </p>
      )}
    </>
  );
}
