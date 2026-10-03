import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { slugFromCategory } from "@/lib/categories";
import { formatCAD } from "@/lib/money";
import { requireAdminPage } from "@/server/auth/guards";
import { listAddOnsForAdmin } from "@/server/queries/admin-add-ons";
import { adminCategoryOptions } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Add-ons" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const UNIT_LABELS: Record<string, string> = {
  FLAT: "flat",
  PER_HOUR: "per hour",
  PER_ITEM: "per item",
};

export default async function AdminAddOnsPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ saved }, addOns, categories] = await Promise.all([
    searchParams,
    listAddOnsForAdmin(),
    adminCategoryOptions(),
  ]);
  const categoryLabel = new Map(categories.map((option) => [option.value, option.label]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Add-ons</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Extras clients can add in the quote calculator.
          </p>
        </div>
        <Link href="/admin/add-ons/new" className={buttonVariants()}>
          New add-on
        </Link>
      </div>

      {typeof saved === "string" && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          Saved “{saved}”. Quotes use the new values right away.
        </p>
      )}

      {addOns.length === 0 ? (
        <p className="text-muted-foreground mt-8">No add-ons yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Price
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Offered for
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Order
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {addOns.map((addOn) => (
                <tr key={addOn.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/add-ons/${addOn.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {addOn.name}
                    </Link>
                    <span className="text-muted-foreground block font-mono text-xs">
                      {addOn.code}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCAD(addOn.priceCents, "en", { suffix: false })}{" "}
                    <span className="text-muted-foreground">{UNIT_LABELS[addOn.unit]}</span>
                  </td>
                  <td className="px-4 py-3">
                    {addOn.categories
                      .map((category) => categoryLabel.get(slugFromCategory(category)))
                      .join(", ")}
                  </td>
                  <td className="px-4 py-3">{addOn.isActive ? "Active" : "Hidden"}</td>
                  <td className="px-4 py-3 tabular-nums">{addOn.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
