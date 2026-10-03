"use server";

import { siteConfig } from "@/config/site";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { parseReference } from "@/lib/references";
import { verifySignedValue } from "@/lib/signing";
import {
  canRequestChange,
  type ChangeRequestInput,
  changeRequestSchema,
} from "@/lib/validators/change-request";
import { linkSecret } from "@/server/link-secret";
import { isRateLimited } from "@/server/rate-limit";

export type ChangeRequestResult =
  | { ok: true }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; error: "forbidden" | "closed" | "rateLimited" | "server" };

/**
 * Records a reschedule/cancel request from the signed booking link and notifies the studio
 * (AGENTS.md §6.6, §11). Nothing changes automatically: the studio replies and updates the
 * booking in admin, following its cancellation policy.
 */
export async function requestBookingChange(
  input: ChangeRequestInput,
): Promise<ChangeRequestResult> {
  const parsed = changeRequestSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return { ok: false, error: "validation", fieldErrors };
  }
  if (await isRateLimited("changeRequest")) return { ok: false, error: "rateLimited" };
  const request = parsed.data;
  if (
    parseReference(request.reference)?.type !== "B" ||
    !verifySignedValue(`booking:${request.reference}`, request.token, linkSecret())
  ) {
    return { ok: false, error: "forbidden" };
  }

  try {
    const booking = await db.booking.findUnique({
      where: { reference: request.reference },
      include: {
        customer: { select: { name: true, email: true } },
        _count: { select: { changeRequests: { where: { status: "OPEN" } } } },
      },
    });
    if (!booking) return { ok: false, error: "forbidden" };
    const now = new Date();
    if (
      !canRequestChange({
        status: booking.status,
        startAt: booking.startAt,
        openRequests: booking._count.changeRequests,
        now,
      })
    ) {
      return { ok: false, error: "closed" };
    }

    await db.bookingChangeRequest.create({
      data: {
        bookingId: booking.id,
        type: request.type,
        preferredDate: request.preferredDate,
        message: request.message,
      },
    });

    try {
      await sendEmail({
        to: adminNotifyAddress(),
        replyTo: booking.customer.email,
        subject: `[${siteConfig.name}] ${request.type === "CANCEL" ? "Cancellation" : "Reschedule"} request for ${booking.reference}`,
        text: [
          `${booking.customer.name} <${booking.customer.email}> asked to ${request.type === "CANCEL" ? "CANCEL" : "RESCHEDULE"} booking ${booking.reference}.`,
          `Current date: ${formatInStudioTz(booking.startAt, "PPPP p", "en")} (status ${booking.status})`,
          request.preferredDate ? `Preferred new date: ${request.preferredDate}` : "",
          request.message ? `Message: ${request.message}` : "",
          "",
          "Reply to the client and update the booking in admin according to your cancellation policy.",
        ]
          .filter((line) => line !== "")
          .join("\n"),
      });
    } catch (error) {
      console.error(`[change-request] ${booking.reference} saved but email failed`, error);
    }
    return { ok: true };
  } catch (error) {
    console.error("[change-request] failed", error);
    return { ok: false, error: "server" };
  }
}
