import { AlertTriangle } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { formatCAD } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/guards";
import { getDashboardData } from "@/server/queries/admin-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  COMPLETED: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  CANCELLED: "bg-muted text-muted-foreground",
  SENT: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  ACCEPTED: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  EXPIRED: "bg-muted text-muted-foreground",
  DRAFT: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted",
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

function StatCard({ label, value, detail }: { label: string; value: ReactNode; detail?: string }) {
  return (
    <div className="bg-card rounded-xl border p-5">
      <dt className="text-muted-foreground text-xs tracking-[0.15em] uppercase">{label}</dt>
      <dd className="font-heading mt-2 text-3xl">{value}</dd>
      {detail && <dd className="text-muted-foreground mt-1 text-sm">{detail}</dd>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  const id = `panel-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="bg-card rounded-xl border">
      <h2 id={id} className="border-b px-5 py-3 text-lg font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  const user = await requireAdminPage();
  const [{ error }, data, t] = await Promise.all([
    searchParams,
    getDashboardData(),
    getTranslations({ locale: "en", namespace: "Categories" }),
  ]);
  const category = (value: Parameters<typeof slugFromCategory>[0]) =>
    t(`${slugFromCategory(value)}.name`);
  const { revenue } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-4xl">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back{user.name ? `, ${user.name}` : ""}.
        </p>
      </div>

      {error === "forbidden" && (
        <p role="alert" className="text-destructive text-sm">
          You don&apos;t have permission to open that page.
        </p>
      )}

      {(data.awaitingPaymentRequest.length > 0 || data.openChangeRequests > 0) && (
        <section
          aria-labelledby="attention-title"
          className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <h2 id="attention-title" className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" aria-hidden />
            Needs attention
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.awaitingPaymentRequest.map((booking) => (
              <li key={booking.id}>
                <span className="font-mono">{booking.reference}</span> ({booking.customer.name}) —
                no payment request sent since {formatInStudioTz(booking.createdAt, "MMM d, h:mm a")}
              </li>
            ))}
            {data.openChangeRequests > 0 && (
              <li>
                {data.openChangeRequests} open reschedule/cancellation{" "}
                {data.openChangeRequests === 1 ? "request" : "requests"}
              </li>
            )}
          </ul>
        </section>
      )}

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Upcoming bookings"
          value={data.upcomingCount}
          detail="Pending + confirmed"
        />
        <StatCard
          label="New quotes"
          value={data.newQuotes}
          detail={`Last ${data.newQuoteDays} days`}
        />
        <StatCard
          label="Pending reviews"
          value={data.pendingReviews}
          detail={
            data.flaggedReviews > 0 ? `${data.flaggedReviews} flagged` : "Awaiting moderation"
          }
        />
        <StatCard
          label={`Revenue · ${formatInStudioTz(data.month, "MMMM")}`}
          value={formatCAD(revenue.confirmedCents, "en", { suffix: false })}
          detail={[
            `+ ${formatCAD(revenue.pendingCents, "en", { suffix: false })} pending`,
            "before tax",
            revenue.unpricedCount > 0 ? `${revenue.unpricedCount} unpriced` : "",
          ]
            .filter(Boolean)
            .join(" · ")}
        />
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Upcoming bookings">
          {data.upcoming.length === 0 ? (
            <p className="text-muted-foreground px-5 py-6 text-sm">No upcoming bookings.</p>
          ) : (
            <ul className="divide-y">
              {data.upcoming.map((booking) => (
                <li
                  key={booking.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
                >
                  <span className="w-36 text-sm font-medium">
                    {formatInStudioTz(booking.startAt, "EEE MMM d, h:mm a")}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    {booking.customer.name}
                    <span className="text-muted-foreground block text-xs">
                      <span className="font-mono">{booking.reference}</span> ·{" "}
                      {category(booking.category)} · {booking.photographers} ph.
                    </span>
                  </span>
                  <StatusBadge status={booking.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent quotes">
          {data.recentQuotes.length === 0 ? (
            <p className="text-muted-foreground px-5 py-6 text-sm">No quotes yet.</p>
          ) : (
            <ul className="divide-y">
              {data.recentQuotes.map((quote) => (
                <li
                  key={quote.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3"
                >
                  <span className="min-w-0 flex-1 text-sm">
                    {quote.customer.name}
                    <span className="text-muted-foreground block text-xs">
                      <span className="font-mono">{quote.reference}</span> ·{" "}
                      {category(quote.category)} · event{" "}
                      {formatInStudioTz(quote.eventDate, "MMM d, yyyy")}
                    </span>
                  </span>
                  <span className="text-sm tabular-nums">
                    {formatCAD(quote.totalCents, "en", { suffix: false })}
                  </span>
                  <StatusBadge status={quote.status} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
