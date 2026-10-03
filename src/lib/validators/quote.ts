import * as z from "zod";

import { categorySlugs } from "@/lib/categories";

/**
 * Quote form schemas, shared by the browser (live estimate) and the server action
 * (AGENTS.md §6.5). Error messages are translation keys under `Quote.errors`.
 */
export const provinceCodes = [
  "ON",
  "QC",
  "BC",
  "AB",
  "MB",
  "SK",
  "NS",
  "NB",
  "NL",
  "PE",
  "NT",
  "NU",
  "YT",
  "INTL",
] as const;

export type ProvinceCode = (typeof provinceCodes)[number];

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

function isRealDate(value: string): boolean {
  const match = DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Form inputs arrive as strings; empty means "not provided". */
const optionalNumber = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
  z.number("invalidNumber").optional(),
);

export const quoteDetailsSchema = z
  .object({
    category: z.enum(categorySlugs, "required"),
    packageSlug: z.string().trim().max(120).optional(),
    eventDate: z.string().refine(isRealDate, "invalidDate"),
    startTime: z.string().regex(TIME, "invalidTime"),
    durationHours: z.coerce
      .number("invalidDuration")
      .refine(
        (hours) => hours > 0 && hours <= 24 && Number.isInteger(hours * 2),
        "invalidDuration",
      ),
    photographers: z.coerce
      .number("invalidNumber")
      .int("invalidNumber")
      .min(1, "invalidNumber")
      .max(10, "invalidNumber"),
    guestCount: optionalNumber.refine(
      (count) => count === undefined || (Number.isInteger(count) && count >= 0 && count <= 5000),
      "invalidNumber",
    ),
    province: z.enum(provinceCodes, "required"),
    city: z.string().trim().max(120).optional(),
    distanceKm: optionalNumber.refine(
      (km) => km === undefined || (km >= 0 && km <= 20000),
      "invalidNumber",
    ),
    isInternational: z.coerce.boolean().default(false),
    addOns: z
      .array(
        z.object({
          code: z.string().trim().min(1).max(40),
          qty: z.coerce
            .number("invalidNumber")
            .int("invalidNumber")
            .min(0, "invalidNumber")
            .max(100, "invalidNumber"),
        }),
      )
      .max(20)
      .default([])
      .transform((items) => items.filter((item) => item.qty > 0)),
  })
  .transform((details) =>
    // Outside Canada: no Canadian tax region and no automatic travel distance.
    details.isInternational
      ? { ...details, province: "INTL" as const, distanceKm: undefined }
      : details,
  );

export const quoteContactSchema = z.object({
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
  // CASL: marketing consent is opt-in and never pre-checked.
  marketingOptIn: z.coerce.boolean().default(false),
  // Honeypot — must stay empty.
  website: z.string().max(0, "spam").optional(),
});

export const quoteRequestSchema = z
  .intersection(quoteDetailsSchema, quoteContactSchema)
  .transform((value) => value);

export type QuoteDetailsInput = z.input<typeof quoteDetailsSchema>;
export type QuoteDetails = z.output<typeof quoteDetailsSchema>;
export type QuoteRequestInput = z.input<typeof quoteRequestSchema>;
export type QuoteRequest = z.output<typeof quoteRequestSchema>;
