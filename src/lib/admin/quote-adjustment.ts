/**
 * Studio price adjustments on a saved quote (AGENTS.md §6.10 "adjust and re-send"). One
 * labelled adjustment line (a discount or an extra); tax is recalculated on the new subtotal
 * at the rates the quote was taxed at, and the deposit at the current deposit %. Pure.
 */
import { z } from "zod";

import type { QuoteResult } from "@/lib/pricing/calculate-quote";
import { dollarsToCents, text } from "@/lib/validators/admin/fields";

export const adjustmentSchema = z.object({
  direction: z.enum(["discount", "extra"], "Choose discount or extra charge."),
  label: text(80),
  amount: dollarsToCents.refine((cents) => cents > 0, "Enter an amount above zero."),
});

/** "13%" / "9.975%" (as stored on tax lines) → parts per 100,000. */
export function ratePartsFromLabel(label: string): number {
  const match = /^(\d{1,2})(?:\.(\d{1,3}))?%$/.exec(label.trim());
  if (!match) throw new RangeError(`Unexpected tax rate label: "${label}"`);
  return Number(match[1]) * 1000 + Number((match[2] ?? "").padEnd(3, "0"));
}

/** Same half-up rounding as the engine and tax.ts. */
const percentOf = (cents: number, pct: number) => Math.floor((cents * pct + 50) / 100);
const applyRate = (cents: number, parts: number) => Math.floor((cents * parts + 50_000) / 100_000);

/**
 * The quote price with `adjustment` (signed cents, or null to remove it) applied. Throws when
 * the result would be negative.
 */
export function applyQuoteAdjustment(
  result: QuoteResult,
  adjustment: { label: string; amountCents: number } | null,
  depositPct: number,
): QuoteResult {
  const lineItems = [
    ...result.lineItems.filter((item) => item.kind !== "adjustment"),
    ...(adjustment ? [{ kind: "adjustment" as const, ...adjustment }] : []),
  ];
  const subtotalCents = lineItems.reduce((sum, item) => sum + item.amountCents, 0);
  if (subtotalCents < 0) throw new RangeError("The adjusted subtotal can't be negative.");
  const taxLines = result.taxLines.map((line) => ({
    ...line,
    amountCents: applyRate(subtotalCents, ratePartsFromLabel(line.rate)),
  }));
  const taxCents = taxLines.reduce((sum, line) => sum + line.amountCents, 0);
  const totalCents = subtotalCents + taxCents;
  return {
    ...result,
    lineItems,
    subtotalCents,
    taxLines,
    taxCents,
    totalCents,
    depositCents: percentOf(totalCents, depositPct),
  };
}
