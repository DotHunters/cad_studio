/**
 * Unpaid booking holds (AGENTS.md §6.6, §8.3). A PENDING booking with no recorded deposit is
 * released PENDING_HOLD_HOURS after the studio sent its payment request. Bookings that never
 * got a payment request are not auto-expired — the admin dashboard flags them instead.
 */
export type HoldCandidate = {
  id: string;
  status: string;
  depositPaidAt: Date | null;
  paymentRequestedAt: Date | null;
};

const HOUR_MS = 60 * 60 * 1000;

export function isHoldExpired(booking: HoldCandidate, holdHours: number, now: Date): boolean {
  return (
    booking.status === "PENDING" &&
    booking.depositPaidAt === null &&
    booking.paymentRequestedAt !== null &&
    booking.paymentRequestedAt.getTime() + holdHours * HOUR_MS <= now.getTime()
  );
}

/** Latest payment-request time that is now overdue (for the database query). */
export function overdueCutoff(holdHours: number, now: Date): Date {
  return new Date(now.getTime() - holdHours * HOUR_MS);
}

/** Pending bookings with no payment request for longer than `hours` (admin warning, 7.6). */
export function needsPaymentRequest(
  booking: HoldCandidate & { createdAt: Date },
  now: Date,
  hours = 24,
): boolean {
  return (
    booking.status === "PENDING" &&
    booking.paymentRequestedAt === null &&
    booking.createdAt.getTime() + hours * HOUR_MS <= now.getTime()
  );
}
