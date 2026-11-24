import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { pricedOptions } from "@/lib/pricing/options";
import { parsePricingRules } from "@/lib/pricing/rules";
import { filterLive } from "@/lib/seasonal/offer";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

const readPricingData = unstable_cache(
  async () => {
    const [packages, addOns, ruleRows, taxRates] = await Promise.all([
      db.package.findMany({
        where: { isActive: true, service: { archivedAt: null } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          category: true,
          name: true,
          nameFr: true,
          basePriceCents: true,
          offerEndsAt: true,
          includedHours: true,
          includedShooters: true,
          tiers: {
            orderBy: [{ sortOrder: "asc" }, { basePriceCents: "asc" }],
            select: {
              key: true,
              name: true,
              nameFr: true,
              basePriceCents: true,
              includedHours: true,
              includedShooters: true,
            },
          },
        },
      }),
      db.addOn.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          code: true,
          name: true,
          nameFr: true,
          priceCents: true,
          unit: true,
          services: { where: { archivedAt: null }, select: { slug: true } },
        },
      }),
      db.pricingRule.findMany({ select: { key: true, value: true } }),
      db.taxRate.findMany(),
    ]);

    return {
      packages,
      addOns: addOns.map(({ services, ...addOn }) => ({
        ...addOn,
        categories: services.map((service) => service.slug),
      })),
      rules: parsePricingRules(ruleRows),
      quoteValidDays: Number(ruleRows.find((row) => row.key === "QUOTE_VALID_DAYS")?.value ?? 14),
      // Decimal → string so it can be passed to the client.
      taxRates: taxRates.map((rate) => ({
        province: rate.province,
        gst: rate.gst.toString(),
        pst: rate.pst.toString(),
        hst: rate.hst.toString(),
        label: rate.label,
      })),
    };
  },
  ["pricing:data"],
  {
    tags: [CACHE_TAGS.packages, CACHE_TAGS.settings, CACHE_TAGS.services],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

/**
 * Everything the quote engine needs, serializable for the browser's live estimate and reused
 * by the server action as the source of truth (AGENTS.md §6.5, §8.1). Offers that have ended
 * are dropped here, after the cache, so they cannot be priced or booked once they are over.
 */
export async function getPricingContext(now: Date = new Date()) {
  const data = await readPricingData();
  return {
    ...data,
    // One option per package, or per tier for packages with tiers (lib/pricing/options.ts).
    packages: pricedOptions(filterLive(data.packages, now)),
  };
}

export type PricingContext = Awaited<ReturnType<typeof getPricingContext>>;
