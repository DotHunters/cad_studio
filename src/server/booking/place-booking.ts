import "server-only";

import { fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";
import { Prisma } from "@/generated/prisma/client";
import { addDaysToKey, canBook, parseBookingRules } from "@/lib/booking/availability";
import { matchesQuote, type PriceFingerprint } from "@/lib/booking/quote-match";
import { categoryFromSlug } from "@/lib/categories";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { calculateQuote, type QuoteResult } from "@/lib/pricing/calculate-quote";
import { toEngineInput } from "@/lib/pricing/engine-input";
import { resolvePackage } from "@/lib/pricing/rules";
import { counterKey, formatReference } from "@/lib/references";
import type { BookingRequest } from "@/lib/validators/booking";
import { getPricingContext } from "@/server/queries/pricing";
import { getBookableQuote } from "@/server/queries/quotes";
import { isSerializationFailure } from "@/server/serialization";

export type PlaceBookingResult =
  | {
      ok: true;
      reference: string;
      bookingId: string;
      startAt: Date;
      endAt: Date;
      price: QuoteResult;
      quoteReference: string | null;
      packageName: string;
      packageNameFr: string | null;
    }
  | { ok: false; error: "unavailable" | "invalid" };

class SlotUnavailableError extends Error {}

const MAX_ATTEMPTS = 3;

/**
 * Creates a PENDING booking (AGENTS.md §6.6, §8.3). Capacity is re-checked inside a
 * SERIALIZABLE transaction, so two requests for the last slot can't both succeed; the
 * loser retries, sees the first booking, and gets "unavailable".
 */
export async function placeBooking(
  request: BookingRequest,
  { locale, now = new Date() }: { locale: "en" | "fr"; now?: Date },
): Promise<PlaceBookingResult> {
  const context = await getPricingContext();
  const category = categoryFromSlug(request.category);
  const pkg = category ? resolvePackage(context.packages, category, request.packageSlug) : null;
  if (!category || !pkg) return { ok: false, error: "invalid" };

  let price: QuoteResult;
  try {
    price = calculateQuote(toEngineInput(request, pkg), context);
  } catch {
    return { ok: false, error: "invalid" };
  }

  // Quoted price applies only if the signed quote is still valid and nothing changed.
  const quote = await getBookableQuote(request.quoteReference, request.quoteToken);
  const fingerprint: PriceFingerprint = {
    category: pkg.category,
    packageSlug: pkg.slug,
    eventDate: request.eventDate,
    startTime: request.startTime,
    durationHours: request.durationHours,
    photographers: request.photographers,
    province: request.province,
    distanceKm: request.distanceKm ?? null,
    isInternational: request.isInternational,
    addOns: request.addOns,
  };
  const useQuote = quote !== null && matchesQuote(fingerprint, quote.fingerprint);
  if (useQuote) {
    price = { ...price, totalCents: quote.totalCents, depositCents: quote.depositCents };
  }

  const startAt = fromZonedTime(
    `${request.eventDate}T${request.startTime}:00`,
    siteConfig.timezone,
  );
  const endAt = fromZonedTime(`${request.eventDate}T${request.endTime}:00`, siteConfig.timezone);
  const dayStart = fromZonedTime(`${request.eventDate}T00:00:00`, siteConfig.timezone);
  const dayEnd = fromZonedTime(
    `${addDaysToKey(request.eventDate, 1)}T00:00:00`,
    siteConfig.timezone,
  );
  const year = Number(studioDateKey(now).slice(0, 4));
  const email = request.email.toLowerCase();

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const created = await db.$transaction(
        async (tx) => {
          const [ruleRows, blocked, sameDay] = await Promise.all([
            tx.pricingRule.findMany({
              where: {
                key: { in: ["MAX_PHOTOGRAPHERS_PER_DAY", "MIN_LEAD_DAYS", "PENDING_HOLD_HOURS"] },
              },
            }),
            tx.blockedDate.findUnique({
              where: { date: new Date(`${request.eventDate}T00:00:00Z`) },
            }),
            tx.booking.findMany({
              where: {
                startAt: { gte: dayStart, lt: dayEnd },
                status: { in: ["PENDING", "CONFIRMED"] },
              },
              select: { photographers: true, status: true },
            }),
          ]);
          const available = canBook(request.eventDate, request.photographers, {
            today: studioDateKey(now),
            rules: parseBookingRules(ruleRows),
            blockedDates: new Set(blocked ? [request.eventDate] : []),
            bookings: sameDay.map((booking) => ({ ...booking, dateKey: request.eventDate })),
          });
          if (!available) throw new SlotUnavailableError();

          const counter = await tx.referenceCounter.upsert({
            where: { key: counterKey("B", year) },
            create: { key: counterKey("B", year), value: 1 },
            update: { value: { increment: 1 } },
          });
          const reference = formatReference("B", year, counter.value);

          const customer = await tx.customer.upsert({
            where: { email },
            create: {
              email,
              name: request.name,
              phone: request.phone,
              locale,
              consentAt: now,
              marketingOptIn: request.marketingOptIn,
              marketingConsentAt: request.marketingOptIn ? now : null,
            },
            update: {
              name: request.name,
              phone: request.phone,
              locale,
              consentAt: now,
              // CASL: record new consent, never silently withdraw an existing one.
              ...(request.marketingOptIn && { marketingOptIn: true, marketingConsentAt: now }),
            },
          });

          const packageRow = await tx.package.findUnique({
            where: { slug: pkg.slug },
            select: { id: true },
          });
          const quoteRow =
            useQuote && quote
              ? await tx.quote.findUnique({
                  where: { reference: quote.reference },
                  select: { id: true, booking: true },
                })
              : null;
          // A quote can only back one booking.
          const quoteId = quoteRow && !quoteRow.booking ? quoteRow.id : null;

          const booking = await tx.booking.create({
            data: {
              reference,
              category,
              packageId: packageRow?.id,
              quoteId,
              startAt,
              endAt,
              photographers: request.photographers,
              guestCount: request.guestCount,
              venue: [request.venue, request.city].filter(Boolean).join(", ") || null,
              notes: request.notes ?? null,
              status: "PENDING",
              subtotalCents: price.subtotalCents,
              taxCents: price.taxCents,
              totalCents: price.totalCents,
              breakdown: {
                lineItems: price.lineItems,
                taxLines: price.taxLines,
                flags: price.flags,
                packageSlug: pkg.slug,
                fromQuote: useQuote,
              },
              depositCents: price.depositCents,
              paymentMethod: request.paymentMethod,
              customerId: customer.id,
            },
          });
          if (quoteId)
            await tx.quote.update({ where: { id: quoteId }, data: { status: "ACCEPTED" } });
          return { reference, bookingId: booking.id };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      return {
        ok: true,
        ...created,
        startAt,
        endAt,
        price,
        quoteReference: useQuote && quote ? quote.reference : null,
        packageName: pkg.name,
        packageNameFr: pkg.nameFr,
      };
    } catch (error) {
      if (error instanceof SlotUnavailableError) return { ok: false, error: "unavailable" };
      if (isSerializationFailure(error) && attempt < MAX_ATTEMPTS) continue;
      if (isSerializationFailure(error)) return { ok: false, error: "unavailable" };
      throw error;
    }
  }
  return { ok: false, error: "unavailable" };
}
