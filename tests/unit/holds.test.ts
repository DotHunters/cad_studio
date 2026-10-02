import { describe, expect, it } from "vitest";

import { isHoldExpired, needsPaymentRequest, overdueCutoff } from "@/lib/booking/holds";

const now = new Date("2026-10-05T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600_000);
const pending = {
  id: "b1",
  status: "PENDING",
  depositPaidAt: null,
  paymentRequestedAt: hoursAgo(49),
};

describe("isHoldExpired", () => {
  it("expires 48 h after the payment request when no deposit is recorded", () => {
    expect(isHoldExpired(pending, 48, now)).toBe(true);
    expect(isHoldExpired({ ...pending, paymentRequestedAt: hoursAgo(48) }, 48, now)).toBe(true);
    expect(isHoldExpired({ ...pending, paymentRequestedAt: hoursAgo(47) }, 48, now)).toBe(false);
  });

  it("never expires bookings without a payment request", () => {
    expect(isHoldExpired({ ...pending, paymentRequestedAt: null }, 48, now)).toBe(false);
  });

  it("keeps bookings whose deposit was received", () => {
    expect(isHoldExpired({ ...pending, depositPaidAt: hoursAgo(1) }, 48, now)).toBe(false);
  });

  it("only touches pending bookings", () => {
    expect(isHoldExpired({ ...pending, status: "CONFIRMED" }, 48, now)).toBe(false);
    expect(isHoldExpired({ ...pending, status: "CANCELLED" }, 48, now)).toBe(false);
  });
});

describe("overdueCutoff", () => {
  it("is now minus the hold period", () => {
    expect(overdueCutoff(48, now)).toEqual(hoursAgo(48));
  });
});

describe("needsPaymentRequest", () => {
  it("flags pending bookings with no payment request after 24 h", () => {
    const booking = { ...pending, paymentRequestedAt: null, createdAt: hoursAgo(25) };
    expect(needsPaymentRequest(booking, now)).toBe(true);
    expect(needsPaymentRequest({ ...booking, createdAt: hoursAgo(2) }, now)).toBe(false);
    expect(needsPaymentRequest({ ...booking, paymentRequestedAt: hoursAgo(1) }, now)).toBe(false);
  });
});
