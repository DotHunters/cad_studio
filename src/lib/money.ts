/**
 * Money helpers (AGENTS.md §9, §12). All money is integer CAD cents — never floats.
 */
import type { Locale } from "@/config/site";

const formatters: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }),
  fr: new Intl.NumberFormat("fr-CA", { style: "currency", currency: "CAD" }),
};

/** Formats integer cents, e.g. 125000 → "$1,250.00 CAD" (en) or "1 250,00 $ CAD" (fr). */
export function formatCAD(
  cents: number,
  locale: Locale = "en",
  { suffix = true }: { suffix?: boolean } = {},
): string {
  if (!Number.isInteger(cents)) {
    throw new TypeError(`formatCAD expects integer cents, got ${cents}`);
  }
  const formatted = formatters[locale].format(cents / 100);
  return suffix ? `${formatted} CAD` : formatted;
}

const DOLLAR_STRING = /^(-)?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Converts dollars to integer cents.
 * - Numbers are rounded half away from zero to the nearest cent using their decimal
 *   representation, so 1.005 → 101 (not 100 as naive float math gives).
 * - Strings accept "$", thousands separators and surrounding spaces, with at most 2 decimals.
 */
export function toCents(dollars: number | string): number {
  if (typeof dollars === "number") {
    if (!Number.isFinite(dollars)) {
      throw new RangeError(`toCents expects a finite number, got ${dollars}`);
    }
    return roundDecimalStringToCents(String(dollars)) ?? Math.round(dollars * 100);
  }

  const cleaned = dollars.trim().replace(/[$,\s]/g, "");
  const match = DOLLAR_STRING.exec(cleaned);
  if (!match) {
    throw new RangeError(`Invalid dollar amount: "${dollars}"`);
  }
  const [, sign, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return sign ? -cents : cents;
}

/** Rounds a plain decimal string ("1.005") to cents; returns null for exponent notation. */
function roundDecimalStringToCents(value: string): number | null {
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return null;
  const [, sign, whole, fraction = ""] = match;
  const padded = fraction.padEnd(3, "0");
  let cents = Number(whole) * 100 + Number(padded.slice(0, 2));
  if (Number(padded[2]) >= 5) cents += 1;
  return sign ? -cents : cents;
}
