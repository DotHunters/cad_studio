import { describe, expect, it } from "vitest";

import { easterSunday, isOntarioStatHoliday, ontarioStatHolidays } from "@/lib/pricing/holidays";

describe("easterSunday", () => {
  it.each([
    [2024, "2024-03-31"],
    [2025, "2025-04-20"],
    [2026, "2026-04-05"],
    [2027, "2027-03-28"],
  ])("%i → %s", (year, date) => {
    expect(easterSunday(year)).toBe(date);
  });
});

describe("ontarioStatHolidays", () => {
  it("lists Ontario's nine statutory holidays for 2026", () => {
    expect([...ontarioStatHolidays(2026)].sort()).toEqual([
      "2026-01-01", // New Year's Day
      "2026-02-16", // Family Day (3rd Monday of February)
      "2026-04-03", // Good Friday
      "2026-05-18", // Victoria Day (Monday before May 25)
      "2026-07-01", // Canada Day
      "2026-09-07", // Labour Day (1st Monday of September)
      "2026-10-12", // Thanksgiving (2nd Monday of October)
      "2026-12-25", // Christmas Day
      "2026-12-26", // Boxing Day
    ]);
  });

  it("puts Victoria Day on May 24 when that is a Monday", () => {
    expect(ontarioStatHolidays(2027).has("2027-05-24")).toBe(true);
  });
});

describe("isOntarioStatHoliday", () => {
  it("checks a YYYY-MM-DD date", () => {
    expect(isOntarioStatHoliday("2026-07-01")).toBe(true);
    expect(isOntarioStatHoliday("2026-07-02")).toBe(false);
  });
});
