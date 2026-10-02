/**
 * Booking status changes made by the studio (AGENTS.md §6.10):
 * PENDING → CONFIRMED (by recording the deposit, see payments.ts) → COMPLETED, and
 * PENDING/CONFIRMED → CANCELLED. Cancelled bookings free their capacity automatically
 * (availability only counts PENDING + CONFIRMED).
 */
export const STATUS_INTENTS = ["complete", "cancel"] as const;
export type StatusIntent = (typeof STATUS_INTENTS)[number];

type BookingState = { status: string; startAt: Date };

export function statusChange(
  intent: StatusIntent,
  booking: BookingState,
  now: Date,
): { ok: true; status: "COMPLETED" | "CANCELLED" } | { ok: false; reason: string } {
  if (intent === "complete") {
    if (booking.status !== "CONFIRMED") {
      return { ok: false, reason: "Only confirmed bookings can be completed." };
    }
    if (booking.startAt > now) {
      return { ok: false, reason: "The event hasn't happened yet." };
    }
    return { ok: true, status: "COMPLETED" };
  }
  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return { ok: false, reason: "This booking can't be cancelled any more." };
  }
  return { ok: true, status: "CANCELLED" };
}

/** Which actions to offer on the booking page. */
export function availableStatusIntents(booking: BookingState, now: Date): StatusIntent[] {
  return STATUS_INTENTS.filter((intent) => statusChange(intent, booking, now).ok);
}
