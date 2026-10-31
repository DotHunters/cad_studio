import * as z from "zod";

import { studioDateKey } from "@/lib/dates";

/**
 * "Events by CAD" enquiry schema, shared by the client form and the server action.
 * Error messages are keys under `Events.form.errors` in the message files.
 */
export const EVENT_TYPES = ["wedding", "corporate", "birthday", "cultural", "other"] as const;
export const EVENT_ENQUIRY_SERVICES = [
  "management",
  "decor",
  "catering",
  "av",
  "photo",
  "video",
] as const;
export const EVENT_BUDGETS = ["under5k", "5to10k", "10to25k", "over25k"] as const;

const PHONE = /^[+\d][\d\s().-]{6,19}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const emptyToUndefined = (value: string | undefined) => (value ? value : undefined);

export const eventEnquirySchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(254, "tooLong").pipe(z.email("invalidEmail")),
  phone: z
    .string()
    .trim()
    .optional()
    .transform(emptyToUndefined)
    .refine((value) => value === undefined || PHONE.test(value), "invalidPhone"),
  eventType: z.enum(EVENT_TYPES, "required"),
  eventDate: z
    .string()
    .trim()
    .optional()
    .transform(emptyToUndefined)
    .refine((value) => value === undefined || ISO_DATE.test(value), "invalidDate")
    // Same-day enquiries are allowed; compared as studio-local calendar dates.
    .refine(
      (value) => value === undefined || !ISO_DATE.test(value) || value >= studioDateKey(new Date()),
      "pastDate",
    ),
  guestCount: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine(
      (value) => value === undefined || (Number.isInteger(value) && value >= 1 && value <= 5000),
      "invalidGuests",
    ),
  city: z.string().trim().min(1, "required").max(100, "tooLong"),
  services: z.array(z.enum(EVENT_ENQUIRY_SERVICES)).min(1, "chooseService"),
  budget: z
    .union([z.literal(""), z.enum(EVENT_BUDGETS)])
    .optional()
    .transform((value) => (value ? value : undefined)),
  message: z.string().trim().min(10, "messageTooShort").max(5000, "tooLong"),
  // Honeypot: hidden from people, filled by bots. Must stay empty.
  website: z.string().max(0, "spam").optional(),
});

export type EventEnquiryInput = z.input<typeof eventEnquirySchema>;
export type EventEnquiryData = z.output<typeof eventEnquirySchema>;
