"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { adjustmentSchema, applyQuoteAdjustment } from "@/lib/admin/quote-adjustment";
import { storedQuoteResult } from "@/lib/admin/quotes";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { bookingRequestSchema, paymentMethods } from "@/lib/validators/booking";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { localize } from "@/lib/localize";
import { signValue } from "@/lib/signing";
import { requireRole } from "@/server/auth/guards";
import { placeBooking } from "@/server/booking/place-booking";
import { notifyBookingPlaced } from "@/server/emails/booking-emails";
import { sendQuoteEmails } from "@/server/emails/quote-emails";
import { getBookableQuote } from "@/server/queries/quotes";
import { linkSecret } from "@/server/link-secret";

export type ResendResult = { ok: true; expiresAt: string } | { ok: false; error: string };

const inputSchema = z.object({
  extend: z.preprocess((value) => value === true || value === "on", z.boolean()),
});

/**
 * Emails the client their quote again (AGENTS.md §6.10 "re-send"), at the saved price.
 * Optionally restarts its validity (QUOTE_VALID_DAYS from today) — e.g. for an expired quote
 * the studio is happy to honour. STAFF+.
 */
export async function resendQuote(reference: string, input: unknown): Promise<ResendResult> {
  await requireRole("STAFF");
  const { extend } = inputSchema.parse(input ?? {});
  const quote = await db.quote.findUnique({
    where: { reference: String(reference) },
    include: { customer: true, package: { select: { name: true, nameFr: true } } },
  });
  if (!quote) return { ok: false, error: "This quote no longer exists." };
  if (quote.status === "ACCEPTED") {
    return { ok: false, error: "This quote was already booked." };
  }
  const result = storedQuoteResult(quote);
  if (!result) return { ok: false, error: "This quote's price details couldn't be read." };

  const locale = quote.customer.locale;
  let expiresAt = quote.expiresAt;
  if (extend) {
    const rule = await db.pricingRule.findUnique({ where: { key: "QUOTE_VALID_DAYS" } });
    const days = typeof rule?.value === "number" ? rule.value : 14;
    expiresAt = addDays(new Date(), days);
  }
  const addOnCodes = result.lineItems.flatMap((item) => (item.kind === "addOn" ? [item.code] : []));
  const addOns = await db.addOn.findMany({
    where: { code: { in: addOnCodes } },
    select: { code: true, name: true, nameFr: true },
  });

  try {
    await sendQuoteEmails({
      reference: quote.reference,
      token: signValue(`quote:${quote.reference}`, linkSecret()),
      locale,
      customer: {
        name: quote.customer.name,
        email: quote.customer.email,
        phone: quote.customer.phone ?? undefined,
      },
      category: quote.category,
      eventStart: quote.eventDate,
      durationHours: Number(quote.durationHours),
      city: quote.city ?? undefined,
      province: quote.province,
      packageName: quote.package ? localize(quote.package.name, quote.package.nameFr, locale) : "",
      addOnNames: Object.fromEntries(
        addOns.map((addOn) => [addOn.code, localize(addOn.name, addOn.nameFr, locale)]),
      ),
      quote: result,
      depositPct: Math.round((result.depositCents / Math.max(result.totalCents, 1)) * 100),
      expiresAt,
      notifyStudio: false,
    });
  } catch (error) {
    console.error("[admin] resend quote failed", error);
    return { ok: false, error: "The email couldn't be sent. Nothing was changed — try again." };
  }

  await db.quote.update({
    where: { id: quote.id },
    data: { expiresAt, ...(extend && { status: "SENT" }) },
  });
  revalidatePath("/admin", "layout");
  return { ok: true, expiresAt: expiresAt.toISOString() };
}

export type AdjustResult =
  { ok: true } | { ok: false; fieldErrors: Record<string, string> } | { ok: false; error: string };

/**
 * Adds, replaces or removes the studio's price adjustment on a quote (AGENTS.md §6.10). Tax
 * and deposit are recalculated; booking from the quote then uses this price. The client isn't
 * emailed until the quote is re-sent. STAFF+.
 */
export async function adjustQuote(reference: string, input: unknown): Promise<AdjustResult> {
  await requireRole("STAFF");
  const remove = (input as { intent?: unknown } | null)?.intent === "remove";
  const parsed = remove ? null : adjustmentSchema.safeParse(input);
  if (parsed && !parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const quote = await db.quote.findUnique({ where: { reference: String(reference) } });
  if (!quote) return { ok: false, error: "This quote no longer exists." };
  if (quote.status === "ACCEPTED") return { ok: false, error: "This quote was already booked." };
  const current = storedQuoteResult(quote);
  if (!current) return { ok: false, error: "This quote's price details couldn't be read." };

  const rule = await db.pricingRule.findUnique({ where: { key: "DEPOSIT_PCT" } });
  const depositPct = typeof rule?.value === "number" ? rule.value : 30;
  let adjusted;
  try {
    adjusted = applyQuoteAdjustment(
      current,
      parsed?.success
        ? {
            label: parsed.data.label,
            amountCents:
              parsed.data.direction === "discount" ? -parsed.data.amount : parsed.data.amount,
          }
        : null,
      depositPct,
    );
  } catch {
    return { ok: false, fieldErrors: { amount: "The discount can't be more than the subtotal." } };
  }

  await db.quote.update({
    where: { id: quote.id },
    data: {
      breakdown: {
        ...(quote.breakdown as Record<string, unknown>),
        lineItems: adjusted.lineItems,
        taxLines: adjusted.taxLines,
        depositCents: adjusted.depositCents,
      } as Prisma.InputJsonValue,
      subtotalCents: adjusted.subtotalCents,
      taxCents: adjusted.taxCents,
      totalCents: adjusted.totalCents,
    },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

const conversionSchema = z.object({
  venue: z.string().trim().max(200, "Keep it under 200 characters.").optional(),
  notes: z.string().trim().max(2000, "Keep it under 2000 characters.").optional(),
  paymentMethod: z.enum(paymentMethods, "Choose how the client will pay."),
  confirmed: z.literal("on", "Confirm the client asked to book and accepted the terms."),
});

export type ConvertResult =
  | { ok: true; reference: string }
  | { ok: false; fieldErrors: Record<string, string> }
  | { ok: false; error: string };

/**
 * Books a valid quote for the client (AGENTS.md §6.10 "convert to booking"), e.g. after they
 * confirm by phone. Same path as the website: capacity is re-checked and the quote's saved
 * price applies; the client and studio get the usual booking emails. STAFF+.
 */
export async function convertQuoteToBooking(
  reference: string,
  input: unknown,
): Promise<ConvertResult> {
  await requireRole("STAFF");
  const parsed = conversionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const quote = await db.quote.findUnique({
    where: { reference: String(reference) },
    include: { customer: true },
  });
  if (!quote) return { ok: false, error: "This quote no longer exists." };
  const token = signValue(`quote:${quote.reference}`, linkSecret());
  const prefill = await getBookableQuote(quote.reference, token);
  if (!prefill) {
    return {
      ok: false,
      error: "Only open quotes can be booked. Renew an expired quote with Re-send first.",
    };
  }

  const request = bookingRequestSchema.safeParse({
    ...prefill.values,
    venue: parsed.data.venue,
    notes: parsed.data.notes,
    name: quote.customer.name,
    email: quote.customer.email,
    phone: quote.customer.phone ?? undefined,
    paymentMethod: parsed.data.paymentMethod,
    // Given by the client to the studio; recorded with the booking like on the website.
    consentTerms: true,
    consentPrivacy: true,
    quoteReference: quote.reference,
    quoteToken: token,
  });
  if (!request.success) {
    console.error("[admin] quote → booking request invalid", request.error.issues);
    return { ok: false, error: "This quote can't be booked as it is (check its date and time)." };
  }

  const locale = quote.customer.locale;
  const result = await placeBooking(request.data, { locale });
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.error === "unavailable"
          ? "That date is no longer available (fully booked, blocked or too soon)."
          : "This quote can't be booked as it is.",
    };
  }
  await notifyBookingPlaced(request.data, result, locale);
  revalidatePath("/admin", "layout");
  return { ok: true, reference: result.reference };
}
