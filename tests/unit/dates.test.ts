import { describe, expect, it } from "vitest";

import { formatInStudioTz, studioDateKey } from "@/lib/dates";

describe("formatInStudioTz", () => {
  // 2026-07-01T00:30Z is still June 30 in Toronto (EDT, UTC-4).
  const lateEvening = new Date("2026-07-01T00:30:00Z");

  it("formats a UTC instant in the studio time zone", () => {
    expect(formatInStudioTz(lateEvening, "yyyy-MM-dd HH:mm")).toBe("2026-06-30 20:30");
  });

  it("handles standard time (EST, UTC-5)", () => {
    expect(formatInStudioTz(new Date("2026-01-15T17:00:00Z"), "HH:mm zzz")).toBe("12:00 EST");
  });

  it("uses French month names for fr", () => {
    expect(formatInStudioTz(lateEvening, "d MMMM yyyy", "fr")).toBe("30 juin 2026");
  });

  it("uses English month names by default", () => {
    expect(formatInStudioTz(lateEvening, "MMMM d, yyyy")).toBe("June 30, 2026");
  });

  it("accepts ISO strings", () => {
    expect(formatInStudioTz("2026-07-01T00:30:00Z", "yyyy-MM-dd")).toBe("2026-06-30");
  });

  it("can format in another time zone", () => {
    expect(formatInStudioTz(lateEvening, "HH:mm", "en", "America/Vancouver")).toBe("17:30");
  });
});

describe("studioDateKey", () => {
  it("returns the studio-local calendar date for availability lookups", () => {
    expect(studioDateKey(new Date("2026-07-01T00:30:00Z"))).toBe("2026-06-30");
    expect(studioDateKey(new Date("2026-07-01T12:00:00Z"))).toBe("2026-07-01");
  });
});
