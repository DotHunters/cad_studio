import { describe, expect, it } from "vitest";

import { groupByDate, monthGrid, parseMonth, shiftMonth } from "@/lib/admin/calendar";
import { centsToDecimal, csvCell, toCsv } from "@/lib/admin/csv";

describe("csvCell", () => {
  it.each([
    ["plain", "plain"],
    ["has, comma", '"has, comma"'],
    ['say "hi"', '"say ""hi"""'],
    ["two\nlines", '"two\nlines"'],
    [42, "42"],
    [null, ""],
    [undefined, ""],
  ])("%j → %s", (value, expected) => {
    expect(csvCell(value)).toBe(expected);
  });

  it.each(["=HYPERLINK(1)", "+1", "-2+3", "@SUM(A1)"])("neutralizes formula %s", (value) => {
    expect(csvCell(value)).toBe(`'${value}`);
  });

  it("leaves negative numbers alone", () => {
    expect(csvCell(-5)).toBe("-5");
  });
});

describe("toCsv", () => {
  it("adds a BOM and CRLF line endings", () => {
    expect(toCsv(["a", "b"], [["x", 1]])).toBe("\uFEFFa,b\r\nx,1\r\n");
  });

  it("formats cents", () => {
    expect(centsToDecimal(123_450)).toBe("1234.50");
    expect(centsToDecimal(null)).toBe("");
  });
});

describe("calendar", () => {
  it("parses and shifts months", () => {
    expect(parseMonth("2026-10")).toBe("2026-10");
    expect(parseMonth("2026-13")).toBeNull();
    expect(parseMonth("oct")).toBeNull();
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("builds whole Sunday-first weeks", () => {
    // October 2026 starts on a Thursday and has 31 days → 5 weeks.
    const weeks = monthGrid("2026-10");
    expect(weeks).toHaveLength(5);
    expect(weeks[0][0]).toEqual({ date: "2026-09-27", inMonth: false });
    expect(weeks[0][4]).toEqual({ date: "2026-10-01", inMonth: true });
    expect(weeks[4][6]).toEqual({ date: "2026-10-31", inMonth: true });
  });

  it("groups by date", () => {
    const groups = groupByDate(
      [
        { id: 1, d: "2026-10-01" },
        { id: 2, d: "2026-10-01" },
        { id: 3, d: "2026-10-02" },
      ],
      (item) => item.d,
    );
    expect(groups.get("2026-10-01")?.map((item) => item.id)).toEqual([1, 2]);
    expect(groups.get("2026-10-03")).toBeUndefined();
  });
});
