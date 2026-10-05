import type { Metadata } from "next";
import Link from "next/link";

import { StoredImage } from "@/components/site/stored-image";
import { requireAdminPage } from "@/server/auth/guards";
import { adminCategoryOptions } from "@/server/queries/admin-packages";
import { getServiceTilesForAdmin } from "@/server/queries/service-tiles";

export const metadata: Metadata = { title: "Service tiles" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminServiceTilesPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const [{ saved }, tiles, categories] = await Promise.all([
    searchParams,
    getServiceTilesForAdmin(),
    adminCategoryOptions(),
  ]);
  const nameOf = (slug: string) =>
    categories.find((category) => category.value === slug)?.label ?? slug;

  return (
    <>
      <h1 className="font-heading text-4xl">Service tiles</h1>
      <p className="text-muted-foreground mt-1 text-sm">
        The six photos under “Services, tailored to you” on the home page. Choose any photo with
        client consent from Images, including ones you uploaded to a portfolio project.
      </p>

      {typeof saved === "string" && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          {nameOf(saved)} tile saved. The home page shows it now.
        </p>
      )}

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ slug, image, chosen }) => (
          <li key={slug} className="bg-card overflow-hidden rounded-xl border">
            <div className="bg-muted relative aspect-[4/3]">
              {image ? (
                <StoredImage
                  image={image}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 25vw, (min-width: 640px) 45vw, 100vw"
                  className="object-cover"
                />
              ) : (
                <p className="text-muted-foreground absolute inset-0 grid place-items-center p-4 text-center text-sm">
                  No photo yet: the tile shows a dark background.
                </p>
              )}
            </div>
            <div className="flex items-center justify-between gap-3 p-4">
              <div>
                <h2 className="font-medium">{nameOf(slug)}</h2>
                <p className="text-muted-foreground text-xs">
                  {chosen ? "Chosen photo" : "Default: first launch photo"}
                </p>
              </div>
              <Link
                href={`/admin/service-tiles/${slug}`}
                className="text-gold-text text-sm font-medium underline-offset-4 hover:underline"
                aria-label={`Change photo: ${nameOf(slug)}`}
              >
                Change photo
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
