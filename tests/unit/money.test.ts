import { describe, expect, it } from "vitest";

import { formatCAD, toCents } from "@/lib/money";

// Intl uses non-breaking / narrow non-breaking spaces in fr-CA; normalize for readable asserts.
const plain = (s: string) => s.replace(/[  ]/g, " ");

describe("formatCAD", () => {
  it("formats cents as Canadian dollars with a CAD suffix", () => {
    expect(formatCAD(125000)).toBe("$1,250.00 CAD");
  });

  it("formats zero and small amounts", () => {
    expect(formatCAD(0)).toBe("$0.00 CAD");
    expect(formatCAD(5)).toBe("$0.05 CAD");
  });

  it("formats negative amounts (discounts)", () => {
    expect(formatCAD(-2500)).toBe("-$25.00 CAD");
  });

  it("uses French Canadian conventions for fr", () => {
    expect(plain(formatCAD(125000, "fr"))).toBe("1 250,00 $ CAD");
  });

  it("can omit the CAD suffix", () => {
    expect(formatCAD(35000, "en", { suffix: false })).toBe("$350.00");
  });

  it("rejects non-integer cents", () => {
    expect(() => formatCAD(10.5)).toThrow(/integer/);
  });
});

describe("toCents", () => {
  it("converts whole and decimal dollar numbers", () => {
    expect(toCents(12)).toBe(1200);
    expect(toCents(0.7)).toBe(70);
    expect(toCents(19.99)).toBe(1999);
  });

  it("avoids floating-point drift", () => {
    expect(toCents(1.005)).toBe(101);
    expect(toCents(0.1 + 0.2)).toBe(30);
  });

  it("parses user-entered strings", () => {
    expect(toCents("1,250.50")).toBe(125050);
    expect(toCents("$350")).toBe(35000);
    expect(toCents(" 25.5 ")).toBe(2550);
    expect(toCents("-10.00")).toBe(-1000);
  });

  it("rejects invalid input", () => {
    expect(() => toCents("abc")).toThrow();
    expect(() => toCents("12.345")).toThrow();
    expect(() => toCents("")).toThrow();
    expect(() => toCents(Number.NaN)).toThrow();
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow();
  });
});
