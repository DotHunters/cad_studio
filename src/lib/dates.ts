/**
 * Date helpers (AGENTS.md §8.3). Store UTC; display in the studio time zone.
 */
import { enCA, frCA } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";

import { type Locale, siteConfig } from "@/config/site";

const dateFnsLocales = { en: enCA, fr: frCA } as const;

/** Formats a UTC instant in the studio time zone using a date-fns pattern. */
export function formatInStudioTz(
  date: Date | string | number,
  pattern: string,
  locale: Locale = "en",
  timeZone: string = siteConfig.timezone,
): string {
  return formatInTimeZone(date, timeZone, pattern, { locale: dateFnsLocales[locale] });
}

/** The studio-local calendar date ("yyyy-MM-dd") of an instant — the key for availability. */
export function studioDateKey(date: Date | string | number): string {
  return formatInStudioTz(date, "yyyy-MM-dd");
}
