/**
 * Seasonal offers (docs/superpowers/specs/2026-11-23-seasonal-offers-design.md). Pure helpers.
 * An offer is live until the end of its last day in the studio time zone; `null` = no end date.
 */
import { fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";
import { studioDateKey } from "@/lib/dates";

/** Slug of the service whose packages are the seasonal offers (admins create it once). */
export const SEASONAL_SERVICE_SLUG = "seasonal";

/** A Date, or the ISO string it becomes after a trip through `unstable_cache`. */
type OfferEnd = Date | string | null | undefined;

/** "2026-12-25" (as picked in admin) → the last millisecond of that day in studio time. */
export function offerEndFromDateKey(dateKey: string): Date {
  return fromZonedTime(`${dateKey}T23:59:59.999`, siteConfig.timezone);
}

/** The studio-local day an offer ends on, as "yyyy-MM-dd" (for the admin form and list). */
export function offerEndDateKey(endsAt: Date | string): string {
  return studioDateKey(endsAt);
}

export function isOfferLive(endsAt: OfferEnd, now: Date = new Date()): boolean {
  if (endsAt === null || endsAt === undefined) return true;
  return now.getTime() <= new Date(endsAt).getTime();
}

/** Drops items whose offer has ended. Applied after cached reads so expiry is never late. */
export function filterLive<T extends { offerEndsAt: OfferEnd }>(
  items: readonly T[],
  now: Date = new Date(),
): T[] {
  return items.filter((item) => isOfferLive(item.offerEndsAt, now));
}
