import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";

export const PACKAGES_TAG = "packages";

/** Active packages in display order, with prices from the DB (never hardcoded — AGENTS.md §6.2). */
export const getActivePackages = unstable_cache(
  async () =>
    db.package.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        category: true,
        name: true,
        nameFr: true,
        summary: true,
        summaryFr: true,
        basePriceCents: true,
        includedHours: true,
        includedShooters: true,
        editedImages: true,
        inclusions: true,
        inclusionsFr: true,
      },
    }),
  ["packages:active"],
  { tags: [PACKAGES_TAG], revalidate: 3600 },
);

export type PackageSummary = Awaited<ReturnType<typeof getActivePackages>>[number];
