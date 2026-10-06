import "server-only";

import type { BookingFormValues, QuotePrefill } from "@/components/booking/booking-wizard";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { parseReference } from "@/lib/references";
import { verifySignedValue } from "@/lib/signing";
import { addHoursToTime } from "@/lib/validators/booking";
import { linkSecret } from "@/server/link-secret";
import { isActiveServiceSlug } from "@/server/queries/services";
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

/**
 * A quote the client can book from: valid signature, not expired, still SENT. Returns the
 * prefill for the booking wizard, or null (the wizard then prices the booking fresh).
 */
export async function getBookableQuote(
  reference: string | undefined,
  token: string | undefined,
): Promise<QuotePrefill | null> {
  if (!reference || !parseReference(reference)) return null;
  if (!verifySignedValue(`quote:${reference}`, token, linkSecret())) return null;
  const quote = await getQuoteByReference(reference);
  if (!quote || quote.status !== "SENT" || quote.expiresAt < new Date()) return null;
  // A quote on an archived service can't be booked any more.
  if (!(await isActiveServiceSlug(quote.category))) return null;

  const { breakdown } = quote;
  const durationHours = Number(quote.durationHours);
  const eventDate = studioDateKey(quote.eventDate);
  const addOns = Array.isArray(quote.addOns)
    ? (quote.addOns as Array<{ code: string; qty: number }>)
    : [];
  const values: Partial<BookingFormValues> = {
    category: quote.category,
    packageSlug: breakdown.packageSlug,
    eventDate,
    startTime: breakdown.startTime,
    // A quote running past midnight can't be a same-day booking; the client adjusts the end.
    endTime: addHoursToTime(breakdown.startTime, durationHours) ?? "23:30",
    photographers: String(quote.photographers),
    guestCount: quote.guestCount === null ? "" : String(quote.guestCount),
    city: quote.city ?? "",
    province: quote.province === "INTL" ? "ON" : quote.province,
    distanceKm: quote.distanceKm === null ? "" : String(quote.distanceKm),
    isInternational: quote.isInternational,
    addOns,
  };

  return {
    reference,
    token: token!,
    values,
    fingerprint: {
      category: quote.category,
      packageSlug: breakdown.packageSlug,
      eventDate,
      startTime: breakdown.startTime,
      durationHours,
      photographers: quote.photographers,
      province: quote.province,
      distanceKm: quote.distanceKm,
      isInternational: quote.isInternational,
      addOns,
    },
    totalCents: quote.totalCents,
    depositCents: breakdown.depositCents,
  };
}

/** A booking by reference for its private page. Not cached (personal data). */
export async function getBookingByReference(reference: string) {
  return db.booking.findUnique({
    where: { reference },
    include: {
      package: { select: { name: true, nameFr: true } },
      customer: { select: { name: true } },
      quote: { select: { totalCents: true, reference: true } },
    },
  });
}
