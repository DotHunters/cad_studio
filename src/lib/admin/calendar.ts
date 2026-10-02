/**
 * Month grid for the admin bookings calendar (AGENTS.md §6.10). Pure date-key math
 * ("yyyy-MM-dd" in the studio time zone), weeks starting on Sunday like Canadian calendars.
 */
const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-10" → valid month string, or null. */
export function parseMonth(value: string | undefined | null): string | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const month = Number(value.slice(5));
  return month >= 1 && month <= 12 ? value : null;
}

export function shiftMonth(month: string, delta: number): string {
  const [year, monthIndex] = [Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + delta];
  const date = new Date(Date.UTC(year, monthIndex, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export type CalendarDay = { date: string; inMonth: boolean };

/** Whole weeks (Sunday–Saturday) covering the month. */
export function monthGrid(month: string): CalendarDay[][] {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5)) - 1;
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const cells = Math.ceil((first.getUTCDay() + daysInMonth) / 7) * 7;

  const weeks: CalendarDay[][] = [];
  for (let i = 0; i < cells; i++) {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + i);
    const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push({ date, inMonth: day.getUTCMonth() === monthIndex });
  }
  return weeks;
}

/** Groups items by their date key. */
export function groupByDate<T>(items: readonly T[], dateOf: (item: T) => string) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = dateOf(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return groups;
}
