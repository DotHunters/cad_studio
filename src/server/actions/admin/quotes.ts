"use server";

import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { storedQuoteResult } from "@/lib/admin/quotes";
import { db } from "@/lib/db";
import { localize } from "@/lib/localize";
import { signValue } from "@/lib/signing";
import { requireRole } from "@/server/auth/guards";
import { sendQuoteEmails } from "@/server/emails/quote-emails";
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
