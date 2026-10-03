import * as z from "zod";

import { toCents } from "@/lib/money";

/**
 * Shared field parsers for admin forms (AGENTS.md §6.10). The admin area is English-only,
 * so messages are plain English. Inputs arrive as FormData strings.
 */
export const text = (max: number) =>
  z.string("Required.").trim().min(1, "Required.").max(max, `Keep it under ${max} characters.`);

export const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters.`)
    .optional()
    .transform((value) => (value ? value : null));

/** One item per line; blank lines are ignored. */
export const lines = z
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

export const integer = (min: number, max: number) =>
  z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : Number(value)),
    z
      .number("Required.")
      .int("Use a whole number.")
      .min(min, `Must be at least ${min}.`)
      .max(max, `Must be at most ${max}.`),
  );

export const optionalInteger = (min: number, max: number) =>
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

/** HTML checkbox: "on" when ticked, missing when not. */
export const checkbox = z.preprocess((value) => value === true || value === "on", z.boolean());

/**
 * First error per field, keyed by top-level field name. Errors inside lists (e.g. package
 * tiers) are also keyed by their full path ("tiers.1.basePrice") so the editor can mark them.
 */
export function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    errors[String(issue.path[0] ?? "form")] ??= issue.message;
    if (issue.path.length > 1) errors[issue.path.join(".")] ??= issue.message;
  }
  return errors;
}
