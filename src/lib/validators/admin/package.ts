import { z } from "zod";

import { categorySlugs } from "@/lib/categories";
import { toCents } from "@/lib/money";

/**
 * Admin package form (AGENTS.md §6.2, §6.10, §7). The admin area is English-only, so error
 * messages are plain English. French fields are optional and fall back to English.
 */
const text = (max: number) =>
  z.string("Required.").trim().min(1, "Required.").max(max, `Keep it under ${max} characters.`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : null));

/** One item per line; blank lines are ignored. */
const lines = z
  .string()
  .optional()
  .transform((value) =>
    (value ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  )
  .pipe(
    z.array(z.string().max(300, "Keep each line under 300 characters.")).max(30, "Up to 30 lines."),
  );

const integer = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z
      .number("Required.")
      .int("Use a whole number.")
      .min(min, `Must be at least ${min}.`)
      .max(max, `Must be at most ${max}.`),
  );

const optionalInteger = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
    z
      .number()
      .int("Use a whole number.")
      .min(min, `Must be at least ${min}.`)
      .max(max, `Must be at most ${max}.`)
      .nullable(),
  );

/** Dollars as typed by the admin ("1200", "$1,200.50") → integer cents. */
export const dollarsToCents = z
  .string("Required.")
  .trim()
  .min(1, "Required.")
  .transform((value, ctx) => {
    try {
      const cents = toCents(value);
      if (cents >= 0 && cents <= 100_000_000) return cents;
    } catch {
      // Reported below.
    }
    ctx.addIssue({ code: "custom", message: "Enter an amount like 1200 or 1,200.50." });
    return z.NEVER;
  });

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
  isActive: z.preprocess((value) => value === true || value === "on", z.boolean()),
  sortOrder: integer(0, 1000),
});

export type PackageFormInput = z.input<typeof packageFormSchema>;
export type PackageFormValues = z.output<typeof packageFormSchema>;

/** First error per field, keyed by field name (nested FAQ errors are reported on `faqs`). */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) errors[String(issue.path[0] ?? "form")] ??= issue.message;
  return errors;
}
