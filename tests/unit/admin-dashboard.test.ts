import { describe, expect, it } from "vitest";

import { revenueEstimate, studioMonthRange } from "@/lib/admin/dashboard";

describe("studioMonthRange", () => {
  it("returns the studio-local month as UTC instants (Toronto, EDT)", () => {
    const { start, end } = studioMonthRange(new Date("2026-10-02T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-01T04:00:00.000Z");
  });

  it("uses the studio month, not the UTC month, near midnight", () => {
    // 1 Nov 02:00 UTC is still 31 Oct in Toronto.
    const { start } = studioMonthRange(new Date("2026-11-01T02:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-01T04:00:00.000Z");
  });

  it("handles the daylight-saving change inside the month (EST end)", () => {
    const { start, end } = studioMonthRange(new Date("2026-11-15T12:00:00Z"));
    expect(start.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-01T05:00:00.000Z");
  });

  it("rolls over the year in December", () => {
    const { end } = studioMonthRange(new Date("2026-12-20T12:00:00Z"));
    expect(end.toISOString()).toBe("2027-01-01T05:00:00.000Z");
  });
});

describe("revenueEstimate", () => {
  it("splits confirmed/completed from pending and ignores cancelled", () => {
    expect(
      revenueEstimate([
        { status: "CONFIRMED", subtotalCents: 100_000 },
        { status: "COMPLETED", subtotalCents: 50_000 },
        { status: "PENDING", subtotalCents: 30_000 },
        { status: "CANCELLED", subtotalCents: 999_999 },
      ]),
    ).toEqual({ confirmedCents: 150_000, pendingCents: 30_000, unpricedCount: 0 });
  });

  it("counts bookings without a stored price instead of guessing", () => {
    expect(
      revenueEstimate([
        { status: "CONFIRMED", subtotalCents: null },
        { status: "PENDING", subtotalCents: null },
        { status: "CANCELLED", subtotalCents: null },
      ]),
    ).toEqual({ confirmedCents: 0, pendingCents: 0, unpricedCount: 2 });
  });

  it("is zero for an empty month", () => {
    expect(revenueEstimate([])).toEqual({ confirmedCents: 0, pendingCents: 0, unpricedCount: 0 });
  });
});
