import * as z from "zod";

/**
 * Contact form schema, shared by the client form and the server action (AGENTS.md §6.9).
 * Error messages are keys under `Contact.errors` in the message files.
 */
export const enquiryTypes = [
  "wedding",
  "corporate",
  "family",
  "gathering",
  "professional",
  "product",
  "other",
  "privacy",
] as const;

export type EnquiryType = (typeof enquiryTypes)[number];

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
  enquiryType: z.enum(enquiryTypes, "required"),
  message: z.string().trim().min(10, "messageTooShort").max(5000, "tooLong"),
  // Honeypot: hidden from people, filled by bots. Must stay empty.
  website: z.string().max(0, "spam").optional(),
});

export type ContactInput = z.input<typeof contactSchema>;
export type ContactData = z.output<typeof contactSchema>;
