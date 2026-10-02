import { z } from "zod";

/** Max open change requests per booking (keeps a leaked link from spamming the studio). */
export const MAX_OPEN_CHANGE_REQUESTS = 3;

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Reschedule/cancel request from the signed booking link (AGENTS.md §6.6). */
export const changeRequestSchema = z
  .object({
    reference: z.string().trim().min(1).max(40),
    token: z.string().trim().min(1).max(64),
    type: z.enum(["RESCHEDULE", "CANCEL"], "required"),
    preferredDate: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? value : undefined))
      .refine((value) => value === undefined || DATE.test(value), "invalidDate"),
    message: z
      .string()
      .trim()
      .max(2000, "tooLong")
      .optional()
      .transform((value) => (value ? value : undefined)),
  })
  .superRefine((request, ctx) => {
    if (request.type === "RESCHEDULE" && !request.preferredDate && !request.message) {
      // A reschedule needs at least a preferred date or a note about what works.
      ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "required" });
    }
  });

export type ChangeRequestInput = z.input<typeof changeRequestSchema>;

/**
 * Whether a booking can still receive change requests: active, upcoming and under the
 * open-request limit.
 */
export function canRequestChange(booking: {
  status: string;
  startAt: Date;
  openRequests: number;
  now: Date;
}): boolean {
  return (
    (booking.status === "PENDING" || booking.status === "CONFIRMED") &&
    booking.startAt > booking.now &&
    booking.openRequests < MAX_OPEN_CHANGE_REQUESTS
  );
}
