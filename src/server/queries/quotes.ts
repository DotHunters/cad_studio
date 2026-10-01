import "server-only";

import { db } from "@/lib/db";
import type { LineItem } from "@/lib/pricing/calculate-quote";
import type { TaxLine } from "@/lib/tax";

/** Stored price breakdown (written by createQuote). */
export type StoredBreakdown = {
  lineItems: LineItem[];
  taxLines: TaxLine[];
  depositCents: number;
  flags: { customTravelQuote: boolean; suggestedPhotographers: number | null };
  packageSlug: string;
  startTime: string;
};

/** A quote by reference for its private page. Not cached: personal data, always fresh. */
export async function getQuoteByReference(reference: string) {
  const quote = await db.quote.findUnique({
    where: { reference },
    include: {
      package: { select: { name: true, nameFr: true, slug: true } },
      customer: { select: { name: true } },
    },
  });
  if (!quote) return null;
  return { ...quote, breakdown: quote.breakdown as unknown as StoredBreakdown };
}
