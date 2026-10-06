import "server-only";

import { unstable_cache } from "next/cache";

import { parseLocalizedText } from "@/lib/content";
import { db } from "@/lib/db";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

/** Active packages in display order, with prices from the DB (never hardcoded — AGENTS.md §6.2). */
export const getActivePackages = unstable_cache(
  async () =>
    db.package.findMany({
      where: { isActive: true, service: { archivedAt: null } },
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
        tiers: {
          orderBy: [{ sortOrder: "asc" }, { basePriceCents: "asc" }],
          select: { key: true, name: true, nameFr: true, basePriceCents: true },
        },
      },
    }),
  ["packages:active"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

export type PackageSummary = Awaited<ReturnType<typeof getActivePackages>>[number];

/** One active package with its add-ons and images, or null (inactive/unknown → 404). */
export const getPackageBySlug = unstable_cache(
  async (slug: string) =>
    db.package.findFirst({
      where: { slug, isActive: true, service: { archivedAt: null } },
      include: {
        addOns: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
        images: { orderBy: { sortOrder: "asc" } },
        tiers: { orderBy: [{ sortOrder: "asc" }, { basePriceCents: "asc" }] },
      },
    }),
  ["packages:by-slug"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

export type PackageDetail = NonNullable<Awaited<ReturnType<typeof getPackageBySlug>>>;

/** Booking terms shown on package pages: deposit % and the localized cancellation policy. */
export const getBookingTerms = unstable_cache(
  async () => {
    const [deposit, policy] = await Promise.all([
      db.pricingRule.findUnique({ where: { key: "DEPOSIT_PCT" } }),
      db.siteSetting.findUnique({ where: { key: "CANCELLATION_POLICY" } }),
    ]);
    return {
      depositPct: typeof deposit?.value === "number" ? deposit.value : null,
      cancellationPolicy: parseLocalizedText(policy?.value),
    };
  },
  ["packages:booking-terms"],
  { tags: [CACHE_TAGS.packages, CACHE_TAGS.settings], revalidate: CONTENT_REVALIDATE_SECONDS },
);
