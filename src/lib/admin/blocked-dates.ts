/**
 * Blocking days off (AGENTS.md §6.10, §8.3): blocked days are unavailable to book online.
 * Existing bookings on a blocked day are kept — the admin page warns about them. Pure.
 */
import * as z from "zod";

import { optionalText } from "@/lib/validators/admin/fields";

const MAX_DAYS = 366;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isRealDate = (value: string) => {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
};

/** Inclusive list of "yyyy-MM-dd" keys from `from` to `to`. */
export function dateRange(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor <= end && days.length <= MAX_DAYS) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** `today` is the studio-local date key; past days can't be blocked. */
export const blockDatesSchema = (today: string) =>
  z
    .object({
      from: z
        .string("Required.")
        .regex(DATE, "Choose a date.")
        .refine(isRealDate, "Choose a date."),
      to: z
        .string()
        .optional()
        .transform((value) => (value ? value : undefined)),
      reason: optionalText(120),
    })
    .superRefine((value, ctx) => {
      if (value.from < today) {
        ctx.addIssue({ code: "custom", path: ["from"], message: "Choose today or a later date." });
      }
      if (value.to === undefined) return;
      if (!DATE.test(value.to) || !isRealDate(value.to)) {
        ctx.addIssue({ code: "custom", path: ["to"], message: "Choose a date." });
      } else if (value.to < value.from) {
        ctx.addIssue({ code: "custom", path: ["to"], message: "Must be on or after the start." });
      } else if (dateRange(value.from, value.to).length > MAX_DAYS) {
        ctx.addIssue({ code: "custom", path: ["to"], message: "Block at most a year at a time." });
      }
    })
    .transform((value) => ({
      days: dateRange(value.from, value.to ?? value.from),
      reason: value.reason,
    }));
