/**
 * Canadian sales tax (AGENTS.md §8.2). Pure and deterministic; rates come from the
 * admin-editable TaxRate table — never hardcode them in components.
 *
 * Each tax line is computed on the pre-tax subtotal and rounded half-up to the cent
 * (Québec's QST is not charged on GST).
 */

/** Rates are stored as Decimal(6,5); work in integer parts per 100,000 to avoid float error. */
const SCALE = 100_000;

export type TaxCode = "GST" | "PST" | "QST" | "HST";

export type TaxRateInput = {
  province: string;
  gst: string | { toString(): string };
  pst: string | { toString(): string };
  hst: string | { toString(): string };
  label: string;
};

export type TaxLine = { code: TaxCode; rate: string; amountCents: number };
export type TaxResult = { lines: TaxLine[]; taxCents: number };

/** "0.09975" → 9975 (parts per 100,000). Rejects >5 decimals, negatives and rates ≥ 100%. */
export function parseRate(value: string | { toString(): string }): number {
  const text = value.toString().trim();
  const match = /^0(?:\.(\d{1,5}))?$|^0?\.(\d{1,5})$/.exec(text);
  if (!match) throw new RangeError(`Invalid tax rate: "${text}"`);
  const digits = (match[1] ?? match[2] ?? "").padEnd(5, "0");
  return Number(digits);
}

/** 9975 → "9.975%"; 13000 → "13%". */
function formatRate(partsPer100k: number): string {
  return `${Number((partsPer100k / 1000).toFixed(3))}%`;
}

/** Half-up rounding of subtotal × rate for non-negative integers. */
function applyRate(subtotalCents: number, partsPer100k: number): number {
  return Math.floor((subtotalCents * partsPer100k + SCALE / 2) / SCALE);
}

export function calculateTax(subtotalCents: number, rate: TaxRateInput): TaxResult {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError(`Subtotal must be non-negative integer cents, got ${subtotalCents}`);
  }
  const components: Array<[TaxCode, number]> = [
    ["GST", parseRate(rate.gst)],
    // Québec's provincial tax is the QST.
    [rate.province.toUpperCase() === "QC" ? "QST" : "PST", parseRate(rate.pst)],
    ["HST", parseRate(rate.hst)],
  ];

  const lines = components
    .filter(([, partsPer100k]) => partsPer100k > 0)
    .map(([code, partsPer100k]) => ({
      code,
      rate: formatRate(partsPer100k),
      amountCents: applyRate(subtotalCents, partsPer100k),
    }));

  return { lines, taxCents: lines.reduce((sum, line) => sum + line.amountCents, 0) };
}

export function findTaxRate<T extends { province: string }>(rates: readonly T[], province: string): T {
  const code = province.trim().toUpperCase();
  const rate = rates.find((candidate) => candidate.province.toUpperCase() === code);
  if (!rate) throw new RangeError(`No tax rate configured for region "${province}"`);
  return rate;
}
