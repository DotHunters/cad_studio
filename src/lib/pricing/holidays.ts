/**
 * Ontario statutory holidays (the studio is in Scarborough, ON — AGENTS.md §8.3), used for
 * the stat-holiday surcharge. Dates are plain "YYYY-MM-DD" strings in the studio's calendar.
 */

const pad = (value: number) => String(value).padStart(2, "0");
const iso = (year: number, month: number, day: number) => `${year}-${pad(month)}-${pad(day)}`;

/** Day of week (0 = Sunday) for a calendar date, independent of the machine time zone. */
export function dayOfWeek(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** nth (1-based) given weekday of a month. */
function nthWeekday(year: number, month: number, weekday: number, n: number): string {
  const first = dayOfWeek(year, month, 1);
  const day = 1 + ((weekday - first + 7) % 7) + (n - 1) * 7;
  return iso(year, month, day);
}

/** Easter Sunday (Gregorian, anonymous algorithm). */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return iso(year, month, day);
}

function shiftDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return iso(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1, shifted.getUTCDate());
}

export function ontarioStatHolidays(year: number): Set<string> {
  // Victoria Day: the Monday on or before May 24.
  const may24 = dayOfWeek(year, 5, 24);
  const victoriaDay = iso(year, 5, 24 - ((may24 + 6) % 7));
  return new Set([
    iso(year, 1, 1),
    nthWeekday(year, 2, 1, 3),
    shiftDays(easterSunday(year), -2),
    victoriaDay,
    iso(year, 7, 1),
    nthWeekday(year, 9, 1, 1),
    nthWeekday(year, 10, 1, 2),
    iso(year, 12, 25),
    iso(year, 12, 26),
  ]);
}

export function isOntarioStatHoliday(date: string): boolean {
  return ontarioStatHolidays(Number(date.slice(0, 4))).has(date);
}
