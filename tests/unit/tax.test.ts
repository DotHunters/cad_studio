import { describe, expect, it } from "vitest";

import { calculateTax, findTaxRate, parseRate, type TaxRateInput } from "@/lib/tax";

// Mirrors prisma/seed-data.ts (rates as stored: Decimal strings).
const rates: TaxRateInput[] = [
  { province: "ON", gst: "0", pst: "0", hst: "0.13", label: "HST" },
  { province: "QC", gst: "0.05", pst: "0.09975", hst: "0", label: "GST + QST" },
  { province: "AB", gst: "0.05", pst: "0", hst: "0", label: "GST" },
  { province: "BC", gst: "0.05", pst: "0", hst: "0", label: "GST" },
  { province: "NS", gst: "0", pst: "0", hst: "0.14", label: "HST" },
  { province: "NB", gst: "0", pst: "0", hst: "0.15", label: "HST" },
  { province: "INTL", gst: "0", pst: "0", hst: "0", label: "No Canadian tax" },
];
const rate = (province: string) => findTaxRate(rates, province);

describe("parseRate", () => {
  it("converts decimal strings to parts per 100,000 without float error", () => {
    expect(parseRate("0.13")).toBe(13000);
    expect(parseRate("0.09975")).toBe(9975);
    expect(parseRate("0")).toBe(0);
    expect(parseRate("0.05000")).toBe(5000);
  });

  it("accepts Prisma Decimal-like objects", () => {
    expect(parseRate({ toString: () => "0.15" })).toBe(15000);
  });

  it("rejects malformed, negative or out-of-range rates", () => {
    expect(() => parseRate("0.123456")).toThrow();
    expect(() => parseRate("-0.05")).toThrow();
    expect(() => parseRate("1.5")).toThrow();
    expect(() => parseRate("abc")).toThrow();
  });
});

describe("calculateTax", () => {
  it("Ontario: single 13% HST line", () => {
    expect(calculateTax(120000, rate("ON"))).toEqual({
      lines: [{ code: "HST", rate: "13%", amountCents: 15600 }],
      taxCents: 15600,
    });
  });

  it("Québec: GST and QST each on the pre-tax subtotal (QST is not charged on GST)", () => {
    expect(calculateTax(100000, rate("QC"))).toEqual({
      lines: [
        { code: "GST", rate: "5%", amountCents: 5000 },
        { code: "QST", rate: "9.975%", amountCents: 9975 },
      ],
      taxCents: 14975,
    });
  });

  it("GST-only provinces", () => {
    expect(calculateTax(60000, rate("AB")).taxCents).toBe(3000);
    expect(calculateTax(60000, rate("BC")).lines).toEqual([
      { code: "GST", rate: "5%", amountCents: 3000 },
    ]);
  });

  it("Atlantic HST rates", () => {
    expect(calculateTax(100000, rate("NS")).taxCents).toBe(14000);
    expect(calculateTax(100000, rate("NB")).taxCents).toBe(15000);
  });

  it("outside Canada: no lines, no tax", () => {
    expect(calculateTax(250000, rate("INTL"))).toEqual({ lines: [], taxCents: 0 });
  });

  it("rounds each line half-up to the cent", () => {
    // 3,333 × 13% = 433.29 → 433; 3,350 × 13% = 435.5 → 436
    expect(calculateTax(3333, rate("ON")).taxCents).toBe(433);
    expect(calculateTax(3350, rate("ON")).taxCents).toBe(436);
    // QC: 1,001 × 5% = 50.05 → 50; × 9.975% = 99.84975 → 100
    expect(calculateTax(1001, rate("QC")).lines.map((line) => line.amountCents)).toEqual([50, 100]);
  });

  it("is zero for a zero subtotal and rejects invalid amounts", () => {
    expect(calculateTax(0, rate("ON")).taxCents).toBe(0);
    expect(() => calculateTax(-100, rate("ON"))).toThrow();
    expect(() => calculateTax(10.5, rate("ON"))).toThrow();
  });
});

describe("findTaxRate", () => {
  it("finds a province case-insensitively", () => {
    expect(findTaxRate(rates, "on").province).toBe("ON");
  });

  it("throws for an unknown region", () => {
    expect(() => findTaxRate(rates, "XX")).toThrow(/XX/);
  });
});
