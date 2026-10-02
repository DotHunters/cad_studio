/**
 * Admin bookings helpers (AGENTS.md §6.6, §6.10). Pure, so they're unit tested.
 */
import type { LineItem } from "@/lib/pricing/calculate-quote";
import type { TaxLine } from "@/lib/tax";

export const BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
export type BookingStatusValue = (typeof BOOKING_STATUSES)[number];

export type BookingFilters = {
  status: BookingStatusValue | "ALL";
  when: "upcoming" | "past" | "all";
  q: string;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Query string → filters; anything unknown falls back to the default view (upcoming, all). */
export function parseBookingFilters(
  params: Record<string, string | string[] | undefined>,
): BookingFilters {
  const status = first(params.status)?.toUpperCase();
  const when = first(params.when);
  return {
    status: (BOOKING_STATUSES as readonly string[]).includes(status ?? "")
      ? (status as BookingStatusValue)
      : "ALL",
    when: when === "past" || when === "all" ? when : "upcoming",
    q: (first(params.q) ?? "").trim().slice(0, 100),
  };
}

export type StoredBreakdown = { lineItems: LineItem[]; taxLines: TaxLine[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * The price breakdown saved on a booking (JSON). Returns null when it's missing or not in
 * the expected shape, so the page can fall back to the stored totals.
 */
export function parseStoredBreakdown(value: unknown): StoredBreakdown | null {
  if (!isRecord(value) || !Array.isArray(value.lineItems) || !Array.isArray(value.taxLines)) {
    return null;
  }
  const lineItems = value.lineItems.filter(
    (item): item is LineItem =>
      isRecord(item) && typeof item.kind === "string" && Number.isInteger(item.amountCents),
  );
  const taxLines = value.taxLines.filter(
    (line): line is TaxLine =>
      isRecord(line) && typeof line.code === "string" && Number.isInteger(line.amountCents),
  );
  if (lineItems.length !== value.lineItems.length || taxLines.length !== value.taxLines.length) {
    return null;
  }
  return { lineItems, taxLines };
}

/** "0.13" → "13%", "0.09975" → "9.975%". */
export function formatTaxRate(rate: string): string {
  const percent = Math.round(Number(rate) * 100_000) / 1000;
  return `${percent}%`;
}
