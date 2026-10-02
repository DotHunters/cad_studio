import { describe, expect, it } from "vitest";

import { canTakePayment, depositSchema, paymentRequestSchema } from "@/lib/admin/payments";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";

describe("canTakePayment", () => {
  it("only for pending bookings without a deposit", () => {
    expect(canTakePayment({ status: "PENDING", depositPaidAt: null })).toBe(true);
    expect(canTakePayment({ status: "PENDING", depositPaidAt: new Date() })).toBe(false);
    expect(canTakePayment({ status: "CONFIRMED", depositPaidAt: null })).toBe(false);
    expect(canTakePayment({ status: "CANCELLED", depositPaidAt: null })).toBe(false);
  });
});

describe("paymentRequestSchema", () => {
  it("accepts no link or an https link", () => {
    expect(paymentRequestSchema.parse({ paymentLinkUrl: "" })).toEqual({ paymentLinkUrl: null });
    expect(paymentRequestSchema.parse({ paymentLinkUrl: " https://pay.example/abc " })).toEqual({
      paymentLinkUrl: "https://pay.example/abc",
    });
  });

  it.each(["http://pay.example", "javascript:alert(1)", "pay.example/abc"])("rejects %s", (url) => {
    const result = paymentRequestSchema.safeParse({ paymentLinkUrl: url });
    expect(fieldErrorsOf(result.error!)).toEqual({ paymentLinkUrl: "Use a full https:// link." });
  });
});

describe("depositSchema", () => {
  const schema = depositSchema("2026-10-02");

  it("parses method, amount in cents and date", () => {
    expect(schema.parse({ method: "CASH", amount: "305.10", paidOn: "2026-10-01" })).toEqual({
      method: "CASH",
      amount: 30_510,
      paidOn: "2026-10-01",
    });
  });

  it("rejects missing method, zero amounts and future dates", () => {
    const result = schema.safeParse({ method: "", amount: "0", paidOn: "2026-10-03" });
    expect(fieldErrorsOf(result.error!)).toEqual({
      method: "Choose how it was paid.",
      amount: "Enter the amount received.",
      paidOn: "The date can't be in the future.",
    });
  });
});
