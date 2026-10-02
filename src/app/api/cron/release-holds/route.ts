import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { overdueCutoff } from "@/lib/booking/holds";
import { parseBookingRules } from "@/lib/booking/availability";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Releases unpaid holds (AGENTS.md §8.3): PENDING bookings with no deposit,
 * PENDING_HOLD_HOURS after the payment request. Called by Vercel Cron with
 * `Authorization: Bearer $CRON_SECRET`; anything else gets 401.
 */
export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const rules = parseBookingRules(await db.pricingRule.findMany());
  const overdue = {
    status: "PENDING" as const,
    depositPaidAt: null,
    paymentRequestedAt: { not: null, lte: overdueCutoff(rules.PENDING_HOLD_HOURS, now) },
  };
  const expired = await db.booking.findMany({
    where: overdue,
    include: { customer: { select: { name: true, email: true, locale: true } } },
  });

  const released: string[] = [];
  for (const booking of expired) {
    // Re-check in the update itself, so a deposit recorded a moment ago wins.
    const { count } = await db.booking.updateMany({
      where: { id: booking.id, ...overdue },
      data: { status: "CANCELLED" },
    });
    if (count === 0) continue;
    released.push(booking.reference);

    const locale = booking.customer.locale === "fr" ? "fr" : "en";
    const t = await getTranslations({ locale, namespace: "Email" });
    const date = formatInStudioTz(booking.startAt, "PPPP", locale);
    try {
      await sendEmail({
        to: booking.customer.email,
        subject: t("holdReleasedSubject", { date, reference: booking.reference }),
        text: t("holdReleasedBody", {
          name: booking.customer.name.split(/\s+/)[0],
          date,
          reference: booking.reference,
        }),
      });
    } catch (error) {
      console.error(`[cron] released ${booking.reference} but the email failed`, error);
    }
  }

  return NextResponse.json({ released });
}
