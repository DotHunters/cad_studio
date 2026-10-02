import { describe, expect, it } from "vitest";

import {
  adjustmentSchema,
  applyQuoteAdjustment,
  ratePartsFromLabel,
} from "@/lib/admin/quote-adjustment";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";
import { calculateTax } from "@/lib/tax";
import type { QuoteResult } from "@/lib/pricing/calculate-quote";

const wedding: QuoteResult = {
  lineItems: [{ kind: "base", amountCents: 280_000 }],
  subtotalCents: 280_000,
  taxLines: [{ code: "HST", rate: "13%", amountCents: 36_400 }],
  taxCents: 36_400,
  totalCents: 316_400,
  depositCents: 94_920,
  flags: { customTravelQuote: false, suggestedPhotographers: null },
};

describe("ratePartsFromLabel", () => {
  it.each([
    ["13%", 13_000],
    ["9.975%", 9_975],
    ["5%", 5_000],
  ])("%s → %i", (label, parts) => {
    expect(ratePartsFromLabel(label)).toBe(parts);
  });

  it("matches the labels tax.ts writes", () => {
    const { lines } = calculateTax(10_000, {
      province: "QC",
      gst: "0.05",
      pst: "0.09975",
      hst: "0",
      label: "GST + QST",
    });
    expect(lines.map((line) => ratePartsFromLabel(line.rate))).toEqual([5_000, 9_975]);
  });
});

describe("applyQuoteAdjustment", () => {
  it("adds a discount line and recalculates tax, total and deposit", () => {
    const adjusted = applyQuoteAdjustment(
      wedding,
      { label: "Returning client", amountCents: -20_000 },
      30,
    );
    expect(adjusted.lineItems.at(-1)).toEqual({
      kind: "adjustment",
      label: "Returning client",
      amountCents: -20_000,
    });
    expect(adjusted).toMatchObject({
      subtotalCents: 260_000,
      taxLines: [{ code: "HST", rate: "13%", amountCents: 33_800 }],
      taxCents: 33_800,
      totalCents: 293_800,
      depositCents: 88_140,
    });
  });

  it("replaces an earlier adjustment and can remove it", () => {
    const once = applyQuoteAdjustment(wedding, { label: "A", amountCents: 5_000 }, 30);
    const twice = applyQuoteAdjustment(once, { label: "B", amountCents: 10_000 }, 30);
    expect(twice.lineItems.filter((item) => item.kind === "adjustment")).toHaveLength(1);
    expect(twice.subtotalCents).toBe(290_000);
    expect(applyQuoteAdjustment(twice, null, 30)).toEqual(wedding);
  });

  it("refuses a negative subtotal", () => {
    expect(() =>
      applyQuoteAdjustment(wedding, { label: "Too much", amountCents: -300_000 }, 30),
    ).toThrow(RangeError);
  });
});

describe("adjustmentSchema", () => {
  it("validates the form", () => {
    expect(
      adjustmentSchema.parse({ direction: "discount", label: "Loyalty", amount: "200" }),
    ).toEqual({ direction: "discount", label: "Loyalty", amount: 20_000 });
    const result = adjustmentSchema.safeParse({ direction: "", label: "", amount: "0" });
    expect(fieldErrorsOf(result.error!)).toEqual({
      direction: "Choose discount or extra charge.",
      label: "Required.",
      amount: "Enter an amount above zero.",
    });
  });
});
