import "server-only";

import { type Locale, siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { parseReference } from "@/lib/references";
import { signExpiring, verifyExpiring } from "@/lib/signing";
import { linkSecret } from "@/server/link-secret";

/** How long a "review your booking" link stays valid. */
export const REVIEW_LINK_DAYS = 90;

const purpose = (reference: string) => `review:${reference}`;

/**
 * Verified-review invite (AGENTS.md §6.7, §11): signed, expiring link sent after a booking is
 * COMPLETED (emailed from admin, task 7.6).
 */
export function reviewInviteUrl(reference: string, locale: Locale, now: Date = new Date()): string {
  const expiresAt = new Date(now.getTime() + REVIEW_LINK_DAYS * 86_400_000);
  const { exp, signature } = signExpiring(purpose(reference), expiresAt, linkSecret());
  const url = new URL(`/${locale}/reviews`, siteConfig.url);
  url.search = new URLSearchParams({
    booking: reference,
    exp: String(exp),
    t: signature,
  }).toString();
  url.hash = "share";
  return url.toString();
}

export type VerifiedBooking = { bookingId: string; reference: string; categorySlug: string };

/**
 * The booking behind a review link, if the link is valid, unexpired, the booking is COMPLETED
 * and it hasn't been reviewed (verified) yet. Otherwise null — the review is then unverified.
 */
export async function getVerifiedBooking(
  reference: string | undefined,
  exp: string | number | undefined,
  token: string | undefined,
): Promise<VerifiedBooking | null> {
  if (!reference || parseReference(reference)?.type !== "B") return null;
  if (!verifyExpiring(purpose(reference), exp, token, linkSecret())) return null;
  const booking = await db.booking.findUnique({
    where: { reference },
    select: {
      id: true,
      status: true,
      category: true,
      reviews: { where: { verified: true }, select: { id: true } },
    },
  });
  if (!booking || booking.status !== "COMPLETED" || booking.reviews.length > 0) return null;
  return { bookingId: booking.id, reference, categorySlug: booking.category };
}
