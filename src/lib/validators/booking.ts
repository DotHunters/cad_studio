import * as z from "zod";

import { categorySlugs } from "@/lib/categories";

import { provinceCodes } from "./quote";

/**
 * Booking form schemas (AGENTS.md §6.6), shared by the /book wizard and createBooking.
 * Error messages are translation keys under `Book.errors`.
 */

/** 30-minute steps keep durations compatible with the quote engine's half hours. */
const HALF_HOUR_TIME = /^([01]\d|2[0-3]):(00|30)$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isRealDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** Hours between two same-day "HH:MM" times, or null if the end isn't after the start. */
export function durationFromTimes(start: string, end: string): number | null {
  const minutes = toMinutes(end) - toMinutes(start);
  return minutes > 0 ? minutes / 60 : null;
}

/** "14:00" + 8 h → "22:00"; null if the result would pass midnight. */
export function addHoursToTime(time: string, hours: number): string | null {
  const total = toMinutes(time) + Math.round(hours * 60);
  if (total >= 24 * 60) return null;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number("invalidNumber").optional(),
);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .optional()
    .transform((value) => (value ? value : undefined));

export const bookingDetailsSchema = z
  .object({
    category: z.enum(categorySlugs, "required"),
    packageSlug: z.string().trim().max(120).optional(),
    eventDate: z.string().refine(isRealDate, "invalidDate"),
    startTime: z.string().regex(HALF_HOUR_TIME, "invalidTime"),
    endTime: z.string().regex(HALF_HOUR_TIME, "invalidTime"),
    photographers: z.coerce
      .number("invalidNumber")
      .int("invalidNumber")
      .min(1, "invalidNumber")
      .max(10, "invalidNumber"),
    guestCount: optionalNumber.refine(
      (count) => count === undefined || (Number.isInteger(count) && count >= 0 && count <= 5000),
      "invalidNumber",
    ),
    venue: optionalText(200),
    city: optionalText(120),
    province: z.enum(provinceCodes, "required"),
    distanceKm: optionalNumber.refine(
      (km) => km === undefined || (km >= 0 && km <= 20000),
      "invalidNumber",
    ),
    isInternational: z.coerce.boolean().default(false),
    notes: optionalText(2000),
    addOns: z
      .array(
        z.object({
          code: z.string().trim().min(1).max(40),
          qty: z.coerce.number().int().min(0).max(100),
        }),
      )
      .max(20)
      .default([])
      .transform((items) => items.filter((item) => item.qty > 0)),
  })
  .superRefine((details, ctx) => {
    const validTimes =
      HALF_HOUR_TIME.test(details.startTime) && HALF_HOUR_TIME.test(details.endTime);
    if (validTimes && durationFromTimes(details.startTime, details.endTime) === null) {
      ctx.addIssue({ code: "custom", path: ["endTime"], message: "endBeforeStart" });
    }
  })
  .transform((details) => ({
    ...details,
    durationHours: durationFromTimes(details.startTime, details.endTime) ?? 0,
    ...(details.isInternational && { province: "INTL" as const, distanceKm: undefined }),
  }));

export const paymentMethods = ["BANK_TRANSFER", "CASH"] as const;

export const bookingContactSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(254, "tooLong").pipe(z.email("invalidEmail")),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine(
      (value) => value === undefined || /^[+\d][\d\s().-]{6,19}$/.test(value),
      "invalidPhone",
    ),
  paymentMethod: z.enum(paymentMethods, "required"),
  consentTerms: z.literal(true, "consentRequired"),
  consentPrivacy: z.literal(true, "consentRequired"),
  // CASL: opt-in, never pre-checked.
  marketingOptIn: z.coerce.boolean().default(false),
  website: z.string().max(0, "spam").optional(),
});

export const bookingRequestSchema = z
  .intersection(
    bookingDetailsSchema,
    bookingContactSchema.extend({
      quoteReference: z.string().trim().max(40).optional(),
      quoteToken: z.string().trim().max(64).optional(),
    }),
  )
  .transform((value) => value);

export type BookingDetailsInput = z.input<typeof bookingDetailsSchema>;
export type BookingDetails = z.output<typeof bookingDetailsSchema>;
export type BookingRequestInput = z.input<typeof bookingRequestSchema>;
export type BookingRequest = z.output<typeof bookingRequestSchema>;
