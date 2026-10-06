import "server-only";

import { unstable_cache } from "next/cache";

import type { Locale } from "@/config/site";
import { db } from "@/lib/db";
import { serviceNameMap, serviceOptions, type ServiceRow, type ServiceUsage } from "@/lib/services";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

const usageSelect = {
  packages: true,
  addOns: true,
  quotes: true,
  bookings: true,
  projects: true,
  images: true,
  reviews: true,
} as const satisfies Record<keyof ServiceUsage, true>;

/** Every service (archived too) in display order. Cached as plain JSON — no Dates. */
export const getServices = unstable_cache(
  async (): Promise<ServiceRow[]> => {
    const rows = await db.service.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      nameFr: row.nameFr,
      description: row.description,
      descriptionFr: row.descriptionFr,
      sortOrder: row.sortOrder,
      tileImageId: row.tileImageId,
      active: row.archivedAt === null,
    }));
  },
  ["services:all"],
  { tags: [CACHE_TAGS.services], revalidate: CONTENT_REVALIDATE_SECONDS },
);

/** Active services as `{ slug, name }` in the viewer's language — for public forms and filters. */
export const getActiveServiceOptions = async (locale: Locale) =>
  serviceOptions(await getServices(), locale);

/** Slug → localized name for every service, so old quotes and bookings keep their label. */
export async function getServiceNames(locale: Locale) {
  const names = serviceNameMap(await getServices(), locale);
  return (slug: string | null | undefined) => (slug ? (names.get(slug) ?? slug) : "");
}

/** Server-side check for new quotes, bookings, reviews and enquiries. */
export async function isActiveServiceSlug(slug: string) {
  return (await getServices()).some((service) => service.slug === slug && service.active);
}

/** Admin list: services with usage counts. Uncached. */
export async function listServicesForAdmin() {
  const rows = await db.service.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      tileImage: { select: { publicId: true, width: true, height: true, blurDataUrl: true } },
      _count: { select: usageSelect },
    },
  });
  return rows.map(({ _count, ...service }) => ({ ...service, usage: _count }));
}

export async function getServiceUsage(slug: string): Promise<ServiceUsage | null> {
  const service = await db.service.findUnique({
    where: { slug },
    select: { _count: { select: usageSelect } },
  });
  return service?._count ?? null;
}
