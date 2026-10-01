"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { studioDateKey } from "@/lib/dates";
import { signValue } from "@/lib/signing";
import { verifyTurnstile } from "@/lib/turnstile";
import { type BookingRequestInput, bookingRequestSchema } from "@/lib/validators/booking";
import { localize } from "@/lib/localize";
import { placeBooking } from "@/server/booking/place-booking";
import { sendBookingEmails } from "@/server/emails/booking-emails";
import { linkSecret } from "@/server/link-secret";

export type CreateBookingResult =
  | { ok: true; reference: string; token: string }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; error: "unavailable" | "captcha" | "server" };

/** Booking request (AGENTS.md §6.6). Always re-validated and re-priced on the server. */
export async function createBooking(
  input: BookingRequestInput,
  turnstileToken?: string,
): Promise<CreateBookingResult> {
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) {
      return { ok: true, reference: "CAD-B-0000-0000", token: "" };
    }
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "validation", fieldErrors };
  }
  const now = new Date();
  if (parsed.data.eventDate < studioDateKey(now)) {
    return { ok: false, error: "validation", fieldErrors: { eventDate: "invalidDate" } };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) return { ok: false, error: "captcha" };

  try {
    const locale = (await getLocale()) === "fr" ? "fr" : "en";
    const result = await placeBooking(parsed.data, { locale, now });
    if (!result.ok) {
      return result.error === "unavailable"
        ? { ok: false, error: "unavailable" }
        : { ok: false, error: "validation", fieldErrors: { category: "required" } };
    }
    const request = parsed.data;
    const token = signValue(`booking:${result.reference}`, linkSecret());
    // Emails are best-effort: the booking is saved and the client sees its page.
    try {
      await sendBookingEmails({
        reference: result.reference,
        token,
        locale,
        customer: { name: request.name, email: request.email, phone: request.phone },
        category: request.category.toUpperCase(),
        packageName: localize(result.packageName, result.packageNameFr, locale),
        startAt: result.startAt,
        endAt: result.endAt,
        venue: [request.venue, request.city].filter(Boolean).join(", ") || undefined,
        photographers: request.photographers,
        guestCount: request.guestCount,
        notes: request.notes,
        totalCents: result.price.totalCents,
        depositCents: result.price.depositCents,
        paymentMethod: request.paymentMethod,
        fromQuote: result.quoteReference,
      });
    } catch (error) {
      console.error(`[booking] ${result.reference} saved but emails failed`, error);
    }
    return { ok: true, reference: result.reference, token };
  } catch (error) {
    console.error("[booking] failed to create booking", error);
    return { ok: false, error: "server" };
  }
}
