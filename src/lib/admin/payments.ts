/**
 * Offline deposit flow (AGENTS.md §6.6): the studio emails a payment request (bank details from
 * PAYMENT_INSTRUCTIONS, optional payment link), then records the deposit → CONFIRMED.
 * Pure rules and form parsing, unit tested.
 */
import { z } from "zod";

import { dollarsToCents } from "@/lib/validators/admin/fields";

type BookingState = { status: string; depositPaidAt: Date | null };

/** Only pending bookings without a recorded deposit can be asked to pay or confirmed. */
export const canTakePayment = (booking: BookingState) =>
  booking.status === "PENDING" && booking.depositPaidAt === null;

export const paymentRequestSchema = z.object({
  paymentLinkUrl: z
    .string()
    .trim()
    .max(500, "Keep the link under 500 characters.")
    .optional()
    .transform((value) => (value ? value : null))
    .refine(
      (value) => {
        if (value === null) return true;
        try {
          return new URL(value).protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: "Use a full https:// link." },
    ),
});

export const DEPOSIT_METHODS = ["BANK_TRANSFER", "CASH", "PAYMENT_LINK"] as const;

/** `today` is the studio-local date ("yyyy-MM-dd"), so a deposit can't be dated in the future. */
export const depositSchema = (today: string) =>
  z.object({
    method: z.enum(DEPOSIT_METHODS, "Choose how it was paid."),
    amount: dollarsToCents.refine((cents) => cents > 0, "Enter the amount received."),
    paidOn: z
      .string("Required.")
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date.")
      .refine((date) => date <= today, "The date can't be in the future."),
  });
