import { describe, expect, it } from "vitest";

import { parseQuoteFilters, quoteState, storedQuoteResult } from "@/lib/admin/quotes";

const now = new Date("2026-10-02T12:00:00Z");

describe("parseQuoteFilters", () => {
  it("defaults to open quotes", () => {
    expect(parseQuoteFilters({})).toEqual({ view: "OPEN", q: "" });
    expect(parseQuoteFilters({ view: "expired", q: " CAD-Q " })).toEqual({
      view: "EXPIRED",
      q: "CAD-Q",
    });
    expect(parseQuoteFilters({ view: "nope" }).view).toBe("OPEN");
  });
});

describe("quoteState", () => {
  it("keeps cancelled quotes cancelled, whatever their expiry", () => {
    expect(quoteState({ status: "CANCELLED", expiresAt: new Date("2026-10-10") }, now)).toBe(
      "CANCELLED",
    );
    expect(parseQuoteFilters({ view: "cancelled" }).view).toBe("CANCELLED");
  });

  it("treats sent quotes past their expiry as expired", () => {
    expect(quoteState({ status: "SENT", expiresAt: new Date("2026-10-10") }, now)).toBe("OPEN");
    expect(quoteState({ status: "SENT", expiresAt: new Date("2026-09-30") }, now)).toBe("EXPIRED");
    expect(quoteState({ status: "ACCEPTED", expiresAt: new Date("2026-09-30") }, now)).toBe(
      "ACCEPTED",
    );
    expect(quoteState({ status: "EXPIRED", expiresAt: new Date("2026-12-30") }, now)).toBe(
      "EXPIRED",
    );
  });
});

describe("storedQuoteResult", () => {
  const stored = {
    breakdown: {
      lineItems: [{ kind: "base", amountCents: 280_000 }],
      taxLines: [{ code: "HST", rate: "13%", amountCents: 36_400 }],
      depositCents: 94_920,
      flags: { customTravelQuote: false, suggestedPhotographers: 3 },
      packageSlug: "wedding",
    },
    subtotalCents: 280_000,
    taxCents: 36_400,
    totalCents: 316_400,
  };

  it("rebuilds the engine result", () => {
    expect(storedQuoteResult(stored)).toEqual({
      lineItems: [{ kind: "base", amountCents: 280_000 }],
      taxLines: [{ code: "HST", rate: "13%", amountCents: 36_400 }],
      subtotalCents: 280_000,
      taxCents: 36_400,
      totalCents: 316_400,
      depositCents: 94_920,
      flags: { customTravelQuote: false, suggestedPhotographers: 3 },
    });
  });

  it("is null without a usable breakdown or deposit", () => {
    expect(storedQuoteResult({ ...stored, breakdown: null })).toBeNull();
    expect(
      storedQuoteResult({ ...stored, breakdown: { ...stored.breakdown, depositCents: "x" } }),
    ).toBeNull();
  });
});
