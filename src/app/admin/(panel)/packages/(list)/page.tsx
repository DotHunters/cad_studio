import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { slugFromCategory } from "@/lib/categories";
import { formatCAD } from "@/lib/money";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions, listPackagesForAdmin } from "@/server/queries/admin-packages";

export const metadata: Metadata = { title: "Packages" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPackagesPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ saved }, packages, categories] = await Promise.all([
    searchParams,
    listPackagesForAdmin(),
    adminCategoryOptions(),
  ]);
  const categoryLabel = new Map(categories.map((option) => [option.value, option.label]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Packages</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Prices and details shown on the site and used by the quote calculator.
          </p>
        </div>
        <Link href="/admin/packages/new" className={buttonVariants()}>
          New package
        </Link>
      </div>

      {typeof saved === "string" && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          Saved “{saved}”. The website updates right away.
        </p>
      )}

      {packages.length === 0 ? (
        <p className="text-muted-foreground mt-8">No packages yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  From
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Hours
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
              {packages.map((pkg) => (
                <tr key={pkg.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/packages/${pkg.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {pkg.name}
                    </Link>
                    <span className="text-muted-foreground block font-mono text-xs">
                      {pkg.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3">{categoryLabel.get(slugFromCategory(pkg.category))}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {formatCAD(pkg.basePriceCents, "en", { suffix: false })}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{pkg.includedHours}</td>
                  <td className="px-4 py-3">{pkg.isActive ? "Active" : "Hidden"}</td>
                  <td className="px-4 py-3 tabular-nums">{pkg.sortOrder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
