import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { slugFromCategory } from "@/lib/categories";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";
import { listProjectsForAdmin } from "@/server/queries/admin-projects";

export const metadata: Metadata = { title: "Portfolio" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminPortfolioPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ saved }, projects, categories] = await Promise.all([
    searchParams,
    listProjectsForAdmin(),
    adminCategoryOptions(),
  ]);
  const categoryLabel = new Map(categories.map((option) => [option.value, option.label]));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Portfolio</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Case studies. Sample projects only show outside production.
          </p>
        </div>
        <Link href="/admin/portfolio/new" className={buttonVariants()}>
          New project
        </Link>
      </div>

      {typeof saved === "string" && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          Saved “{saved}”.
        </p>
      )}

      {projects.length === 0 ? (
        <p className="text-muted-foreground mt-8">No projects yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs tracking-wider uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  Project
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Client
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Year
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Images
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {projects.map((project) => (
                <tr key={project.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/portfolio/${project.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {project.title}
                    </Link>
                    {project.isSample && (
                      <span className="bg-muted ml-2 rounded px-1.5 py-0.5 text-xs">Sample</span>
                    )}
                    <span className="text-muted-foreground block font-mono text-xs">
                      {project.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {project.clientName ?? "Private client"}
                    {project.clientName && !project.consentToPublish && (
                      <span className="text-muted-foreground block text-xs">
                        Not named publicly (no consent)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {categoryLabel.get(slugFromCategory(project.category))} ·{" "}
                    {project.reach === "LOCAL" ? "Local" : "Global"}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{project.year}</td>
                  <td className="px-4 py-3 tabular-nums">{project._count.images}</td>
                  <td className="px-4 py-3">
                    {project.publishedAt ? "Published" : "Draft"}
                    {project.featured && " · Featured"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
