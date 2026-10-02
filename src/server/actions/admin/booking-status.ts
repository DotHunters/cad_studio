"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { STATUS_INTENTS, statusChange } from "@/lib/admin/booking-status";
import { db } from "@/lib/db";
import { audit } from "@/server/audit";
import { requireRole } from "@/server/auth/guards";
import {
  sendBookingCancelledEmail,
  sendBookingCompletedEmail,
} from "@/server/emails/admin-booking-emails";

export type StatusResult = { ok: true; emailed: boolean } | { ok: false; error: string };

const inputSchema = z.object({
  intent: z.enum(STATUS_INTENTS),
  notify: z.preprocess((value) => value === true || value === "on", z.boolean()),
});

/**
 * Completes or cancels a booking (AGENTS.md §6.10). Completing can email the client a thank
 * you with their verified-review link; cancelling can email a polite notice.
 */
export async function changeBookingStatus(
  reference: string,
  input: unknown,
): Promise<StatusResult> {
  const actor = await requireRole("STAFF");
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That action wasn't recognized." };
  const { intent, notify } = parsed.data;

  const booking = await db.booking.findUnique({
    where: { reference: String(reference) },
    select: {
      id: true,
      reference: true,
      status: true,
      startAt: true,
      endAt: true,
      depositCents: true,
      customer: { select: { name: true, email: true, locale: true } },
    },
  });
  if (!booking) return { ok: false, error: "This booking no longer exists." };
  const change = statusChange(intent, booking, new Date());
  if (!change.ok) return { ok: false, error: change.reason };

  // Conditional: if someone else changed it meanwhile, nothing happens.
  const { count } = await db.booking.updateMany({
    where: { id: booking.id, status: booking.status },
    data: { status: change.status },
  });
  if (count === 0) return { ok: false, error: "This booking was just changed. Reload the page." };

  await audit(actor, {
    action: `booking.${intent}`,
    entityType: "Booking",
    entityId: booking.reference,
    summary: `${booking.reference}: ${booking.status} → ${change.status}${notify ? " (client notified)" : ""}`,
  });
  let emailed = false;
  if (notify) {
    const data = { ...booking, depositCents: booking.depositCents ?? 0 };
    try {
      await (intent === "complete"
        ? sendBookingCompletedEmail(data)
        : sendBookingCancelledEmail(data));
      emailed = true;
    } catch (error) {
      console.error(`[admin] ${intent} email failed`, error);
    }
  }
  revalidatePath("/admin", "layout");
  return { ok: true, emailed };
}

/** Marks a client's reschedule/cancel request as handled. */
export async function resolveChangeRequest(id: string): Promise<void> {
  const actor = await requireRole("STAFF");
  const { count } = await db.bookingChangeRequest.updateMany({
    where: { id: String(id), status: "OPEN" },
    data: { status: "RESOLVED" },
  });
  if (count > 0) {
    await audit(actor, {
      action: "booking.change-request.resolve",
      entityType: "BookingChangeRequest",
      entityId: String(id),
      summary: "Marked a change request as handled",
    });
  }
  revalidatePath("/admin", "layout");
}
