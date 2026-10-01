import { describe, expect, it } from "vitest";

import {
  canRequestChange,
  changeRequestSchema,
  MAX_OPEN_CHANGE_REQUESTS,
} from "@/lib/validators/change-request";

const base = { reference: "CAD-B-2026-0001", token: "x".repeat(32) };

describe("changeRequestSchema", () => {
  it("accepts a cancellation with an optional message", () => {
    expect(changeRequestSchema.parse({ ...base, type: "CANCEL", message: "" })).toEqual({
      ...base,
      type: "CANCEL",
      preferredDate: undefined,
      message: undefined,
    });
  });

  it("needs a preferred date or a note to reschedule", () => {
    expect(changeRequestSchema.safeParse({ ...base, type: "RESCHEDULE" }).success).toBe(false);
    expect(
      changeRequestSchema.safeParse({ ...base, type: "RESCHEDULE", preferredDate: "2027-07-01" })
        .success,
    ).toBe(true);
    expect(
      changeRequestSchema.safeParse({
        ...base,
        type: "RESCHEDULE",
        message: "Any Saturday in July",
      }).success,
    ).toBe(true);
  });

  it("rejects malformed dates and long messages", () => {
    expect(
      changeRequestSchema.safeParse({ ...base, type: "RESCHEDULE", preferredDate: "July 1" })
        .success,
    ).toBe(false);
    expect(
      changeRequestSchema.safeParse({ ...base, type: "CANCEL", message: "x".repeat(2001) }).success,
    ).toBe(false);
  });
});

describe("canRequestChange", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const future = new Date("2027-06-12T18:00:00Z");

  it("allows pending and confirmed upcoming bookings", () => {
    expect(canRequestChange({ status: "PENDING", startAt: future, openRequests: 0, now })).toBe(
      true,
    );
    expect(canRequestChange({ status: "CONFIRMED", startAt: future, openRequests: 2, now })).toBe(
      true,
    );
  });

  it("refuses past, cancelled or completed bookings and too many open requests", () => {
    expect(
      canRequestChange({
        status: "PENDING",
        startAt: new Date("2026-09-01"),
        openRequests: 0,
        now,
      }),
    ).toBe(false);
    expect(canRequestChange({ status: "CANCELLED", startAt: future, openRequests: 0, now })).toBe(
      false,
    );
    expect(canRequestChange({ status: "COMPLETED", startAt: future, openRequests: 0, now })).toBe(
      false,
    );
    expect(
      canRequestChange({
        status: "PENDING",
        startAt: future,
        openRequests: MAX_OPEN_CHANGE_REQUESTS,
        now,
      }),
    ).toBe(false);
  });
});
