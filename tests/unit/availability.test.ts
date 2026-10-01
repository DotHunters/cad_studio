import { describe, expect, it } from "vitest";

import {
  addDaysToKey,
  canBook,
  dayAvailability,
  monthAvailability,
  publicStatus,
  type AvailabilityContext,
} from "@/lib/booking/availability";

const context = (overrides: Partial<AvailabilityContext> = {}): AvailabilityContext => ({
  today: "2027-03-10",
  rules: { MAX_PHOTOGRAPHERS_PER_DAY: 3, MIN_LEAD_DAYS: 3 },
  blockedDates: new Set(["2027-03-20"]),
  bookings: [
    { dateKey: "2027-03-15", photographers: 1, status: "CONFIRMED" },
    { dateKey: "2027-03-16", photographers: 2, status: "PENDING" },
    { dateKey: "2027-03-16", photographers: 1, status: "CONFIRMED" },
    { dateKey: "2027-03-17", photographers: 3, status: "CANCELLED" },
    { dateKey: "2027-03-18", photographers: 2, status: "COMPLETED" },
  ],
  ...overrides,
});

describe("addDaysToKey", () => {
  it("adds days across month and year boundaries", () => {
    expect(addDaysToKey("2027-03-30", 3)).toBe("2027-04-02");
    expect(addDaysToKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToKey("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("dayAvailability", () => {
  it("is past for earlier dates and too soon within the lead time", () => {
    expect(dayAvailability("2027-03-09", context()).reason).toBe("past");
    expect(dayAvailability("2027-03-10", context()).reason).toBe("too-soon");
    expect(dayAvailability("2027-03-12", context()).reason).toBe("too-soon");
    expect(dayAvailability("2027-03-13", context()).reason).toBe("open");
  });

  it("is blocked on admin-blocked dates", () => {
    expect(dayAvailability("2027-03-20", context())).toEqual({
      date: "2027-03-20",
      reason: "blocked",
      remaining: 0,
      capacity: 3,
    });
  });

  it("counts only pending and confirmed bookings against capacity", () => {
    expect(dayAvailability("2027-03-14", context()).remaining).toBe(3);
    expect(dayAvailability("2027-03-15", context()).remaining).toBe(2);
    expect(dayAvailability("2027-03-16", context())).toMatchObject({
      reason: "full",
      remaining: 0,
    });
    // Cancelled and completed bookings free the day.
    expect(dayAvailability("2027-03-17", context()).remaining).toBe(3);
    expect(dayAvailability("2027-03-18", context()).remaining).toBe(3);
  });

  it("never reports negative remaining capacity", () => {
    const ctx = context({
      bookings: [{ dateKey: "2027-03-15", photographers: 5, status: "CONFIRMED" }],
    });
    expect(dayAvailability("2027-03-15", ctx).remaining).toBe(0);
  });
});

describe("publicStatus", () => {
  it("only exposes available, limited or full", () => {
    expect(publicStatus(dayAvailability("2027-03-14", context()))).toBe("available");
    expect(publicStatus(dayAvailability("2027-03-15", context()))).toBe("limited");
    expect(publicStatus(dayAvailability("2027-03-16", context()))).toBe("full");
    // Blocked, past and too-soon days look "full" publicly — no reason is leaked.
    expect(publicStatus(dayAvailability("2027-03-20", context()))).toBe("full");
    expect(publicStatus(dayAvailability("2027-03-01", context()))).toBe("full");
    expect(publicStatus(dayAvailability("2027-03-11", context()))).toBe("full");
  });
});

describe("canBook", () => {
  it("needs enough remaining photographers on an open day", () => {
    expect(canBook("2027-03-15", 2, context())).toBe(true);
    expect(canBook("2027-03-15", 3, context())).toBe(false);
    expect(canBook("2027-03-16", 1, context())).toBe(false);
    expect(canBook("2027-03-20", 1, context())).toBe(false);
    expect(canBook("2027-03-11", 1, context())).toBe(false);
  });
});

describe("monthAvailability", () => {
  it("returns every day of the month in public form", () => {
    const days = monthAvailability(2027, 3, context());
    expect(days).toHaveLength(31);
    expect(days[0]).toEqual({ date: "2027-03-01", status: "full" });
    expect(days.find((day) => day.date === "2027-03-15")).toEqual({
      date: "2027-03-15",
      status: "limited",
    });
  });

  it("handles February in leap years", () => {
    expect(monthAvailability(2028, 2, context())).toHaveLength(29);
    expect(monthAvailability(2027, 2, context())).toHaveLength(28);
  });
});

describe("capacity comes from the rules", () => {
  it("follows MAX_PHOTOGRAPHERS_PER_DAY", () => {
    const ctx = context({ rules: { MAX_PHOTOGRAPHERS_PER_DAY: 5, MIN_LEAD_DAYS: 3 } });
    expect(dayAvailability("2027-03-16", ctx)).toMatchObject({ remaining: 2, capacity: 5 });
    expect(publicStatus(dayAvailability("2027-03-14", ctx))).toBe("available");
    expect(publicStatus(dayAvailability("2027-03-16", ctx))).toBe("limited");
  });
});
