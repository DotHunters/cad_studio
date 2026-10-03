/**
 * Admin quotes helpers (AGENTS.md §6.5, §6.10). Pure, unit tested.
 */
import type { QuoteResult } from "@/lib/pricing/calculate-quote";

import { parseStoredBreakdown } from "./bookings";

export const QUOTE_VIEWS = ["OPEN", "ACCEPTED", "EXPIRED", "CANCELLED", "ALL"] as const;
export type QuoteView = (typeof QUOTE_VIEWS)[number];

export type QuoteFilters = { view: QuoteView; q: string };

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export function parseQuoteFilters(
  params: Record<string, string | string[] | undefined>,
): QuoteFilters {
  const view = first(params.view)?.toUpperCase();
  return {
    view: (QUOTE_VIEWS as readonly string[]).includes(view ?? "") ? (view as QuoteView) : "OPEN",
    q: (first(params.q) ?? "").trim().slice(0, 100),
  };
}

/** What the admin sees: a SENT quote past its expiry date counts as expired. */
export function quoteState(
  quote: { status: string; expiresAt: Date },
  now: Date,
): "OPEN" | "ACCEPTED" | "EXPIRED" | "DRAFT" | "CANCELLED" {
  if (quote.status === "ACCEPTED") return "ACCEPTED";
  if (quote.status === "CANCELLED") return "CANCELLED";
  if (quote.status === "DRAFT") return "DRAFT";
  if (quote.status === "EXPIRED" || quote.expiresAt <= now) return "EXPIRED";
  return "OPEN";
}

/** Rebuilds the engine result saved with a quote, or null if the stored data is unusable. */
export function storedQuoteResult(quote: {
  breakdown: unknown;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
}): QuoteResult | null {
  const lines = parseStoredBreakdown(quote.breakdown);
  if (!lines) return null;
  const extra = quote.breakdown as { depositCents?: unknown; flags?: Record<string, unknown> };
  if (!Number.isInteger(extra.depositCents)) return null;
  return {
    ...lines,
    subtotalCents: quote.subtotalCents,
    taxCents: quote.taxCents,
    totalCents: quote.totalCents,
    depositCents: extra.depositCents as number,
    flags: {
      customTravelQuote: extra.flags?.customTravelQuote === true,
      suggestedPhotographers:
        typeof extra.flags?.suggestedPhotographers === "number"
          ? extra.flags.suggestedPhotographers
          : null,
    },
  };
}
