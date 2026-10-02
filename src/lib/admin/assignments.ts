/**
 * Who covers a booking (AGENTS.md §6.10 "assign photographers"). Pure, unit tested.
 * Assignments never block a save — the studio may knowingly double up — they only warn.
 */

/** "1 more photographer needed", "1 more than the 2 booked", or null when it matches. */
export function staffingNote(assigned: number, booked: number): string | null {
  if (assigned < booked) {
    const missing = booked - assigned;
    return `${missing} more ${missing === 1 ? "photographer" : "photographers"} needed`;
  }
  if (assigned > booked) return `${assigned - booked} more than the ${booked} booked`;
  return null;
}

type SameDayBooking = { reference: string; assigneeIds: readonly string[] };

/** References of other bookings that day this person is already assigned to. */
export function sameDayClashes(memberId: string, sameDay: readonly SameDayBooking[]): string[] {
  return sameDay
    .filter((booking) => booking.assigneeIds.includes(memberId))
    .map((booking) => booking.reference);
}
