import "server-only";

import { unstable_cache } from "next/cache";

import { db } from "@/lib/db";
import { parsePricingRules } from "@/lib/pricing/rules";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

/**
 * Everything the quote engine needs, serializable for the browser's live estimate and reused
 * by the server action as the source of truth (AGENTS.md §6.5, §8.1).
 */
export const getPricingContext = unstable_cache(
  async () => {
    const [packages, addOns, ruleRows, taxRates] = await Promise.all([
      db.package.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          slug: true,
          category: true,
          name: true,
          nameFr: true,
          basePriceCents: true,
          includedHours: true,
          includedShooters: true,
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
          categories: true,
        },
      }),
      db.pricingRule.findMany({ select: { key: true, value: true } }),
      db.taxRate.findMany(),
    ]);

    return {
      packages,
      addOns,
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
  ["pricing:context"],
  {
    tags: [CACHE_TAGS.packages, CACHE_TAGS.settings],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

export type PricingContext = Awaited<ReturnType<typeof getPricingContext>>;
