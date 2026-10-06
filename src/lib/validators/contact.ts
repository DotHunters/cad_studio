import * as z from "zod";

import { SERVICE_SLUG_PATTERN } from "@/lib/services";

/**
 * Contact form schema, shared by the client form and the server action (AGENTS.md §6.9).
 * Error messages are keys under `Contact.errors` in the message files.
 */
/** Non-service enquiry types; the rest are active service slugs (checked by the server action). */
export const otherEnquiryTypes = ["other", "privacy"] as const;

export type EnquiryType = string;

const PHONE = /^[+\d][\d\s().-]{6,19}$/;

export const contactSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  email: z.string().trim().min(1, "required").max(254, "tooLong").pipe(z.email("invalidEmail")),
  phone: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value : undefined))
    .refine((value) => value === undefined || PHONE.test(value), "invalidPhone"),
  enquiryType: z
    .string("required")
    .refine(
      (value) =>
        (otherEnquiryTypes as readonly string[]).includes(value) ||
        SERVICE_SLUG_PATTERN.test(value),
      "required",
    ),
  message: z.string().trim().min(10, "messageTooShort").max(5000, "tooLong"),
  // Honeypot: hidden from people, filled by bots. Must stay empty.
  website: z.string().max(0, "spam").optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
