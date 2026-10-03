"use server";

import { fromZonedTime } from "date-fns-tz";
import { addDays } from "date-fns";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { siteConfig } from "@/config/site";
import { categoryFromSlug } from "@/lib/categories";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { calculateQuote } from "@/lib/pricing/calculate-quote";
import { toEngineInput } from "@/lib/pricing/engine-input";
import { resolvePackage } from "@/lib/pricing/rules";
import { counterKey, formatReference } from "@/lib/references";
import { signValue } from "@/lib/signing";
import { verifyTurnstile } from "@/lib/turnstile";
import { type QuoteRequestInput, quoteRequestSchema } from "@/lib/validators/quote";
import { localize } from "@/lib/localize";
import { sendQuoteEmails } from "@/server/emails/quote-emails";
import { linkSecret } from "@/server/link-secret";
import { getPricingContext } from "@/server/queries/pricing";
import { isRateLimited } from "@/server/rate-limit";

export type CreateQuoteResult =
  | { ok: true; reference: string; token: string; totalCents: number }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; error: "captcha" | "rateLimited" | "unavailable" | "server" };

/**
 * Saves a quote (AGENTS.md §6.5). The price is always recomputed here from DB data —
 * the browser's total is never trusted (it isn't even sent).
 */
export async function createQuote(
  input: QuoteRequestInput,
  turnstileToken?: string,
): Promise<CreateQuoteResult> {
  const parsed = quoteRequestSchema.safeParse(input);
  if (!parsed.success) {
    // Honeypot hit: pretend success so bots learn nothing; nothing is saved.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return { ok: true, reference: "CAD-Q-0000-0000", token: "", totalCents: 0 };
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "validation", fieldErrors };
  }
  const request = parsed.data;

  // Dates are compared in the studio's calendar, not the server's.
  const now = new Date();
  if (request.eventDate < studioDateKey(now)) {
    return { ok: false, error: "validation", fieldErrors: { eventDate: "pastDate" } };
  }

  if (await isRateLimited("quote")) return { ok: false, error: "rateLimited" };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) return { ok: false, error: "captcha" };

  try {
    const context = await getPricingContext();
    const category = categoryFromSlug(request.category)!;
    const pkg = resolvePackage(context.packages, category, request.packageSlug);
    if (!pkg) return { ok: false, error: "unavailable" };

    let quote;
    try {
      quote = calculateQuote(toEngineInput(request, pkg), context);
    } catch {
      // e.g. an add-on not offered for this category — treat as invalid input.
      return { ok: false, error: "validation", fieldErrors: { addOns: "required" } };
    }

    const locale = (await getLocale()) === "fr" ? "fr" : "en";
    // References are numbered by the year the quote is created (studio time).
    const year = Number(studioDateKey(now).slice(0, 4));
    const eventStart = fromZonedTime(
      `${request.eventDate}T${request.startTime}:00`,
      siteConfig.timezone,
    );

    const expiresAt = addDays(now, context.quoteValidDays);
    const reference = await db.$transaction(async (tx) => {
      // Native upsert (INSERT … ON CONFLICT) increments atomically, so concurrent quotes
      // never share a number.
      const counter = await tx.referenceCounter.upsert({
        where: { key: counterKey("Q", year) },
        create: { key: counterKey("Q", year), value: 1 },
        update: { value: { increment: 1 } },
      });
      const ref = formatReference("Q", year, counter.value);

      const customer = await tx.customer.upsert({
        where: { email: request.email.toLowerCase() },
        create: {
          email: request.email.toLowerCase(),
          name: request.name,
          phone: request.phone,
          locale,
          marketingOptIn: request.marketingOptIn,
          marketingConsentAt: request.marketingOptIn ? now : null,
        },
        update: {
          name: request.name,
          phone: request.phone,
          locale,
          // CASL: record new consent, but never silently withdraw an existing one.
          ...(request.marketingOptIn && { marketingOptIn: true, marketingConsentAt: now }),
        },
      });

      const packageRow = await tx.package.findUnique({
        where: { slug: pkg.packageSlug },
        select: { id: true },
      });

      await tx.quote.create({
        data: {
          reference: ref,
          category,
          packageId: packageRow?.id,
          eventDate: eventStart,
          durationHours: request.durationHours,
          photographers: request.photographers,
          guestCount: request.guestCount,
          province: request.province,
          city: request.city || null,
          distanceKm: request.distanceKm === undefined ? null : Math.round(request.distanceKm),
          isInternational: request.isInternational,
          addOns: request.addOns,
          breakdown: {
            lineItems: quote.lineItems,
            taxLines: quote.taxLines,
            depositCents: quote.depositCents,
            flags: quote.flags,
            packageSlug: pkg.slug,
            // Kept so the quote still says "Wedding — Gold" if the option is renamed later.
            packageName: pkg.name,
            packageNameFr: pkg.nameFr,
            startTime: request.startTime,
          },
          subtotalCents: quote.subtotalCents,
          taxCents: quote.taxCents,
          totalCents: quote.totalCents,
          status: "SENT",
          expiresAt,
          customerId: customer.id,
        },
      });
      return ref;
    });

    const token = signValue(`quote:${reference}`, linkSecret());

    // Emails are best-effort: the quote is already saved and the client sees its reference.
    try {
      await sendQuoteEmails({
        reference,
        token,
        locale,
        customer: { name: request.name, email: request.email, phone: request.phone },
        category,
        eventStart,
        durationHours: request.durationHours,
        city: request.city,
        province: request.province,
        packageName: localize(pkg.name, pkg.nameFr, locale),
        addOnNames: Object.fromEntries(
          context.addOns.map((addOn) => [addOn.code, localize(addOn.name, addOn.nameFr, locale)]),
        ),
        quote,
        depositPct: context.rules.DEPOSIT_PCT,
        expiresAt,
      });
    } catch (error) {
      console.error(`[quote] ${reference} saved but emails failed`, error);
    }

    return { ok: true, reference, token, totalCents: quote.totalCents };
  } catch (error) {
    console.error("[quote] failed to create quote", error);
    return { ok: false, error: "server" };
  }
}
