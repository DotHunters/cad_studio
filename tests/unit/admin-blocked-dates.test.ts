import { describe, expect, it } from "vitest";

import { blockDatesSchema, dateRange } from "@/lib/admin/blocked-dates";
import { fieldErrorsOf } from "@/lib/validators/admin/fields";

describe("dateRange", () => {
  it("is inclusive and crosses months and years", () => {
    expect(dateRange("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect(dateRange("2027-02-28", "2027-02-28")).toEqual(["2027-02-28"]);
  });
});

describe("blockDatesSchema", () => {
  const schema = blockDatesSchema("2026-10-02");
  const errors = (input: Record<string, unknown>) => {
    const result = schema.safeParse(input);
    return result.success ? {} : fieldErrorsOf(result.error);
  };

  it("blocks a single day or a range", () => {
    expect(schema.parse({ from: "2026-12-24", reason: "Holidays" })).toEqual({
      days: ["2026-12-24"],
      reason: "Holidays",
    });
    expect(schema.parse({ from: "2026-12-24", to: "2026-12-26", reason: "" }).days).toEqual([
      "2026-12-24",
      "2026-12-25",
      "2026-12-26",
    ]);
  });

  it("rejects past, invalid, reversed and very long ranges", () => {
    expect(errors({ from: "2026-10-01" })).toEqual({ from: "Choose today or a later date." });
    expect(errors({ from: "2026-02-30" })).toEqual({ from: "Choose a date." });
    expect(errors({ from: "2026-12-24", to: "2026-12-20" })).toEqual({
      to: "Must be on or after the start.",
    });
    expect(errors({ from: "2026-12-24", to: "2028-12-24" })).toEqual({
      to: "Block at most a year at a time.",
    });
  });
});
