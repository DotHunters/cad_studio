"use server";

import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";

import { siteConfig } from "@/config/site";
import { isPlaceholderText } from "@/lib/admin/site-settings";
import { canTakePayment, depositSchema, paymentRequestSchema } from "@/lib/admin/payments";
import { parseBookingRules } from "@/lib/booking/availability";
import { parseLocalizedText } from "@/lib/content";
import { studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { requireRole } from "@/server/auth/guards";
import {
  sendBookingConfirmedEmail,
  sendPaymentRequestEmail,
} from "@/server/emails/admin-booking-emails";

import type { SettingsResult } from "./pricing";

export type PaymentActionResult = SettingsResult | { ok: false; error: string };

const loadBooking = (reference: string) =>
  db.booking.findUnique({
    where: { reference },
    select: {
      id: true,
      reference: true,
      status: true,
      startAt: true,
      endAt: true,
      depositCents: true,
      depositPaidAt: true,
      customer: { select: { name: true, email: true, locale: true } },
    },
  });

/**
 * Emails the client the deposit request — PAYMENT_INSTRUCTIONS in their language plus an
 * optional payment link — and starts the unpaid hold (AGENTS.md §6.6, §8.3). Sending again
 * restarts the hold.
 */
export async function sendPaymentRequest(
  reference: string,
  input: unknown,
): Promise<PaymentActionResult> {
  await requireRole("STAFF");
  const parsed = paymentRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };

  const booking = await loadBooking(String(reference));
  if (!booking || !canTakePayment(booking)) {
    return { ok: false, error: "This booking is no longer waiting for a deposit." };
  }
  if (booking.depositCents === null) {
    return { ok: false, error: "This booking has no deposit amount." };
  }
  const [setting, rules] = await Promise.all([
    db.siteSetting.findUnique({ where: { key: "PAYMENT_INSTRUCTIONS" } }),
    db.pricingRule.findMany({ select: { key: true, value: true } }),
  ]);
  const instructions = parseLocalizedText(setting?.value)?.[booking.customer.locale];
  if (!instructions || isPlaceholderText(instructions)) {
    return {
      ok: false,
      error: "Add your payment instructions (English and French) in Settings first.",
    };
  }

  try {
    await sendPaymentRequestEmail(
      { ...booking, depositCents: booking.depositCents },
      {
        instructions,
        paymentLinkUrl: parsed.data.paymentLinkUrl,
        holdHours: parseBookingRules(rules).PENDING_HOLD_HOURS,
      },
    );
  } catch (error) {
    console.error("[admin] payment request email failed", error);
    return { ok: false, error: "The email couldn't be sent. Nothing was changed — try again." };
  }
  await db.booking.update({
    where: { id: booking.id },
    data: { paymentRequestedAt: new Date(), paymentLinkUrl: parsed.data.paymentLinkUrl },
  });
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Records the deposit received and confirms the booking (AGENTS.md §6.6). */
export async function recordDeposit(
  reference: string,
  input: unknown,
): Promise<PaymentActionResult> {
  await requireRole("STAFF");
  const parsed = depositSchema(studioDateKey(new Date())).safeParse(input);
  if (!parsed.success) return { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
  const { method, amount, paidOn } = parsed.data;

  const booking = await loadBooking(String(reference));
  if (!booking) return { ok: false, error: "This booking no longer exists." };
  // Conditional update: two people recording at once can't both confirm.
  const { count } = await db.booking.updateMany({
    where: { id: booking.id, status: "PENDING", depositPaidAt: null },
    data: {
      status: "CONFIRMED",
      paymentMethod: method,
      depositCents: amount,
      // The day it was paid, at noon studio time.
      depositPaidAt: fromZonedTime(`${paidOn}T12:00:00`, siteConfig.timezone),
    },
  });
  if (count === 0) return { ok: false, error: "This booking is no longer waiting for a deposit." };

  try {
    await sendBookingConfirmedEmail({ ...booking, depositCents: amount }, amount);
  } catch (error) {
    // The booking is confirmed either way; the studio can tell the client directly.
    console.error("[admin] confirmation email failed", error);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
