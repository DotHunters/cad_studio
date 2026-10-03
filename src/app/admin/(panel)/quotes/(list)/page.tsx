import type { Metadata } from "next";
import Link from "next/link";

import { adminFieldClass } from "@/components/admin/form-field";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { parseQuoteFilters, quoteState } from "@/lib/admin/quotes";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { formatCAD } from "@/lib/money";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";
import { listQuotesForAdmin } from "@/server/queries/admin-quotes";

export const metadata: Metadata = { title: "Quotes" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const VIEW_LABELS = { OPEN: "Open", ACCEPTED: "Booked", EXPIRED: "Expired", ALL: "All" } as const;

export default async function AdminQuotesPage({ searchParams }: Props) {
  await requireAdminPage();
  const filters = parseQuoteFilters(await searchParams);
  const now = new Date();
  const [{ quotes, truncated }, categories] = await Promise.all([
    listQuotesForAdmin(filters, now),
    adminCategoryOptions(),
  ]);
  const categoryLabel = new Map(categories.map((option) => [option.value, option.label]));

  return (
    <>
      <h1 className="font-heading text-4xl">Quotes</h1>
      <form
        method="get"
        role="search"
        aria-label="Filter quotes"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="text-sm font-medium">
          Show
          <select name="view" defaultValue={filters.view} className={adminFieldClass}>
            {Object.entries(VIEW_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
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

      {quotes.length === 0 ? (
        <p className="text-muted-foreground mt-8">No quotes match these filters.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Quote
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Event
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
              {quotes.map((quote) => {
                const state = quoteState(quote, now);
                return (
                  <tr key={quote.id}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quotes/${quote.reference}`}
                        className="font-mono font-medium underline-offset-4 hover:underline"
                      >
                        {quote.reference}
                      </Link>
                      <span className="text-muted-foreground block text-xs">
                        Created {formatInStudioTz(quote.createdAt, "MMM d, yyyy")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {quote.customer.name}
                      <span className="text-muted-foreground block text-xs">
                        {quote.customer.email}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {categoryLabel.get(slugFromCategory(quote.category))}
                      <span className="text-muted-foreground block text-xs">
                        {formatInStudioTz(quote.eventDate, "EEE MMM d, yyyy")}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatCAD(quote.totalCents, "en", { suffix: false })}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={state === "OPEN" ? "SENT" : state} />
                      <span className="text-muted-foreground block text-xs">
                        {quote.booking
                          ? `Booked as ${quote.booking.reference}`
                          : `Valid until ${formatInStudioTz(quote.expiresAt, "MMM d")}`}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {truncated && (
        <p className="text-muted-foreground mt-3 text-sm">
          Showing the newest 200 — narrow the filters to see more.
        </p>
      )}
    </>
  );
}
