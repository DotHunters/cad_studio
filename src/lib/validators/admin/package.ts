import * as z from "zod";

import { categorySlugs } from "@/lib/categories";
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
  category: z.enum(categorySlugs, "Choose a category."),
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
  isActive: checkbox,
  sortOrder: integer(0, 1000),
});

export type PackageFormInput = z.input<typeof packageFormSchema>;
export type PackageFormValues = z.output<typeof packageFormSchema>;

export { fieldErrorsOf } from "./fields";
