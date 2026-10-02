import type { Metadata } from "next";

import { adminFieldClass } from "@/components/admin/form-field";
import { Button } from "@/components/ui/button";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/server/auth/guards";

export const metadata: Metadata = { title: "Audit log" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const LIMIT = 200;
const AREAS: Record<string, string> = {
  Booking: "Bookings",
  BookingChangeRequest: "Change requests",
  Quote: "Quotes",
  Review: "Reviews",
  Package: "Packages",
  AddOn: "Add-ons",
  PricingRule: "Pricing rules",
  TaxRate: "Tax rates",
  SiteSetting: "Settings",
  PortfolioProject: "Portfolio",
  Image: "Images",
  BlockedDate: "Availability",
  User: "Team",
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Who changed what in admin (AGENTS.md §6.10). ADMIN only; read-only. */
export default async function AuditLogPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const query = await searchParams;
  const area = first(query.area);
  const entityType = area && area in AREAS ? area : undefined;
  const search = (first(query.q) ?? "").trim().slice(0, 100);

  const entries = await db.auditLog.findMany({
    where: {
      ...(entityType && { entityType }),
      ...(search && {
        OR: [
          { summary: { contains: search, mode: "insensitive" } },
          { userEmail: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  return (
    <>
      <h1 className="font-heading text-4xl">Audit log</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        Every change made in this admin, newest first.
      </p>

      <form
        method="get"
        role="search"
        aria-label="Filter the audit log"
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="text-sm font-medium">
          Area
          <select name="area" defaultValue={entityType ?? ""} className={adminFieldClass}>
            <option value="">Everything</option>
            {Object.entries(AREAS).map(([value, label]) => (
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
            defaultValue={search}
            placeholder="Reference, name or email"
            className={adminFieldClass}
          />
        </label>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      {entries.length === 0 ? (
        <p className="text-muted-foreground mt-8">Nothing recorded yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  When
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Who
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  What
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatInStudioTz(entry.createdAt, "MMM d, yyyy h:mm a")}
                  </td>
                  <td className="px-4 py-3 [overflow-wrap:anywhere]">{entry.userEmail}</td>
                  <td className="px-4 py-3">
                    <span className="text-muted-foreground block font-mono text-xs">
                      {entry.action}
                    </span>
                    <span className="[overflow-wrap:anywhere]">{entry.summary}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {entries.length === LIMIT && (
        <p className="text-muted-foreground mt-3 text-sm">
          Showing the newest {LIMIT} — filter to see older changes.
        </p>
      )}
    </>
  );
}
