import * as z from "zod";

import { SERVICE_SLUG_PATTERN } from "@/lib/services";
import {
  checkbox,
  dollarsToCents,
  integer,
  lines,
  optionalInteger,
  optionalText,
  text,
} from "./fields";

const faqSchema = z.object({
  q: text(300),
  a: text(2000),
  qFr: optionalText(300).transform((value) => value ?? undefined),
  aFr: optionalText(2000).transform((value) => value ?? undefined),
});

const faqs = z
  .string()
  .optional()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value || "[]") as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "FAQs couldn't be read." });
      return z.NEVER;
    }
  })
  .pipe(z.array(faqSchema, "FAQs couldn't be read.").max(20, "Up to 20 FAQs."));

const tierSchema = z.object({
  /** Set for existing tiers; new ones get a key from their name when saved. */
  key: z.string().trim().max(60).optional(),
  name: text(60),
  nameFr: optionalText(60),
  basePrice: dollarsToCents,
  includedHours: integer(1, 24),
  includedShooters: integer(1, 10),
  editedImages: optionalInteger(0, 10_000),
  turnaroundDays: optionalInteger(0, 365),
  inclusions: lines,
  inclusionsFr: lines,
});

/** Options such as Silver / Gold / Platinum, sent by the form as JSON. */
const tiers = z
  .string()
  .optional()
  .transform((value, ctx) => {
    try {
      return JSON.parse(value || "[]") as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "Options couldn't be read." });
      return z.NEVER;
    }
  })
  .pipe(
    z
      .array(tierSchema, "Options couldn't be read.")
      .max(6, "Up to 6 options.")
      .refine(
        (list) => new Set(list.map((tier) => tier.name.toLowerCase())).size === list.length,
        "Give each option a different name.",
      ),
  );

export type TierFormValues = z.output<typeof tierSchema>;

/**
 * Admin package form (AGENTS.md §6.2, §6.10, §7). The admin area is English-only, so error
 * messages are plain English. French fields are optional and fall back to English.
 */
export const packageFormSchema = z.object({
  slug: z
    .string("Required.")
    .trim()
    .toLowerCase()
    .min(1, "Required.")
    .max(60, "Keep it under 60 characters.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes."),
  category: z.string("Choose a service.").regex(SERVICE_SLUG_PATTERN, "Choose a service."),
  name: text(120),
  nameFr: optionalText(120),
  summary: text(300),
  summaryFr: optionalText(300),
  description: text(10_000),
  descriptionFr: optionalText(10_000),
  basePrice: dollarsToCents,
  includedHours: integer(1, 24),
  includedShooters: integer(1, 10),
  editedImages: optionalInteger(0, 10_000),
  turnaroundDays: optionalInteger(0, 365),
  inclusions: lines,
  inclusionsFr: lines,
  exclusions: lines,
  exclusionsFr: lines,
  faqs,
  tiers,
  isActive: checkbox,
  sortOrder: integer(0, 1000),
});

export type PackageFormInput = z.input<typeof packageFormSchema>;
export type PackageFormValues = z.output<typeof packageFormSchema>;

export { fieldErrorsOf } from "./fields";
