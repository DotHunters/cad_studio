import { describe, expect, it } from "vitest";

import { availableStatusIntents, statusChange } from "@/lib/admin/booking-status";

const now = new Date("2026-10-02T16:00:00Z");
const past = new Date("2026-09-20T18:00:00Z");
const future = new Date("2026-11-20T18:00:00Z");

describe("statusChange", () => {
  it("completes confirmed bookings once the event has started", () => {
    expect(statusChange("complete", { status: "CONFIRMED", startAt: past }, now)).toEqual({
      ok: true,
      status: "COMPLETED",
    });
    expect(statusChange("complete", { status: "CONFIRMED", startAt: future }, now)).toEqual({
      ok: false,
      reason: "The event hasn't happened yet.",
    });
    expect(statusChange("complete", { status: "PENDING", startAt: past }, now)).toMatchObject({
      ok: false,
    });
  });

  it("cancels pending and confirmed bookings only", () => {
    for (const status of ["PENDING", "CONFIRMED"]) {
      expect(statusChange("cancel", { status, startAt: future }, now)).toEqual({
        ok: true,
        status: "CANCELLED",
      });
    }
    for (const status of ["COMPLETED", "CANCELLED"]) {
      expect(statusChange("cancel", { status, startAt: past }, now)).toMatchObject({ ok: false });
    }
  });
});

describe("availableStatusIntents", () => {
  it("offers what's allowed", () => {
    expect(availableStatusIntents({ status: "CONFIRMED", startAt: past }, now)).toEqual([
      "complete",
      "cancel",
    ]);
    expect(availableStatusIntents({ status: "CONFIRMED", startAt: future }, now)).toEqual([
      "cancel",
    ]);
    expect(availableStatusIntents({ status: "COMPLETED", startAt: past }, now)).toEqual([]);
  });
});
