/**
 * Admin sales-tax editor (AGENTS.md §8.2). Admins type percentages ("13", "9.975"); the
 * `TaxRate` table stores fractions with 5 decimals ("0.13", "0.09975"). String/integer
 * conversion only, so no floating-point drift.
 */
import * as z from "zod";

const PERCENT = /^(\d{1,2})(?:\.(\d{1,3}))?$/;

/** "9.975" → "0.09975" (percent with up to 3 decimals → fraction with 5). */
export function percentToFraction(percent: string): string {
  const match = PERCENT.exec(percent.trim());
  if (!match) throw new RangeError(`Invalid percentage: "${percent}"`);
  const thousandths = Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
  const digits = String(thousandths).padStart(6, "0");
  return `${digits.slice(0, -5)}.${digits.slice(-5)}`.replace(/\.?0+$/, "") || "0";
}

/** "0.09975" → "9.975"; "0.13000" → "13". */
export function fractionToPercent(fraction: string): string {
  const [whole, decimals = ""] = fraction.trim().split(".");
  const padded = decimals.padEnd(5, "0").slice(0, 5);
  const thousandths = Number(whole) * 100_000 + Number(padded);
  const percent = `${Math.floor(thousandths / 1000)}.${String(thousandths % 1000).padStart(3, "0")}`;
  return percent.replace(/\.?0+$/, "");
}

const percentField = z
  .string("Required.")
  .trim()
  .min(1, "Required.")
  .regex(PERCENT, "Use a percentage like 5, 13 or 9.975.")
  .refine((value) => Number(value) <= 30, "Must be at most 30%.");

export const taxRateRowSchema = z.object({
  province: z.string().regex(/^([A-Z]{2}|INTL)$/),
  gst: percentField,
  pst: percentField,
  hst: percentField,
  label: z.string("Required.").trim().min(1, "Required.").max(40, "Keep it under 40 characters."),
});

export const taxRatesFormSchema = z.array(taxRateRowSchema).min(1).max(20);

export type TaxRateRow = z.input<typeof taxRateRowSchema>;

/** Field errors keyed "ON.gst", "QC.label", … */
export function taxRateErrors(input: unknown): Record<string, string> | null {
  const result = taxRatesFormSchema.safeParse(input);
  if (result.success) return null;
  const rows = Array.isArray(input) ? (input as Array<{ province?: unknown }>) : [];
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const [index, field] = issue.path;
    const province = typeof index === "number" ? String(rows[index]?.province ?? index) : "form";
    errors[field === undefined ? province : `${province}.${String(field)}`] ??= issue.message;
  }
  return errors;
}
