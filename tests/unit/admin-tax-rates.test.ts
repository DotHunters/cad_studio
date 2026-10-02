import { describe, expect, it } from "vitest";

import { fractionToPercent, percentToFraction, taxRateErrors } from "@/lib/admin/tax-rates";

describe("percentToFraction", () => {
  it.each([
    ["13", "0.13"],
    ["5", "0.05"],
    ["9.975", "0.09975"],
    ["14.5", "0.145"],
    ["0", "0"],
    ["15.000", "0.15"],
  ])("%s%% → %s", (percent, fraction) => {
    expect(percentToFraction(percent)).toBe(fraction);
  });

  it("rejects more precision than the column stores", () => {
    expect(() => percentToFraction("9.9755")).toThrow(RangeError);
  });
});

describe("fractionToPercent", () => {
  it.each([
    ["0.13000", "13"],
    ["0.05", "5"],
    ["0.09975", "9.975"],
    ["0", "0"],
    ["0.00000", "0"],
  ])("%s → %s%%", (fraction, percent) => {
    expect(fractionToPercent(fraction)).toBe(percent);
  });

  it("round-trips", () => {
    for (const percent of ["13", "9.975", "0.5", "14.25"]) {
      expect(fractionToPercent(percentToFraction(percent))).toBe(percent);
    }
  });
});

describe("taxRateErrors", () => {
  const on = { province: "ON", gst: "0", pst: "0", hst: "13", label: "HST" };

  it("is null for valid rows", () => {
    expect(taxRateErrors([on])).toBeNull();
  });

  it("keys errors by province and field", () => {
    expect(
      taxRateErrors([on, { province: "QC", gst: "5", pst: "nine", hst: "45", label: "" }]),
    ).toEqual({
      "QC.pst": "Use a percentage like 5, 13 or 9.975.",
      "QC.hst": "Must be at most 30%.",
      "QC.label": "Required.",
    });
  });
});
