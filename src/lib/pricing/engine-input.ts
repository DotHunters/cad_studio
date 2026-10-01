import type { QuoteDetails } from "@/lib/validators/quote";

import type { QuoteInput, QuotePackage } from "./calculate-quote";

/** Validated form details + resolved package → engine input. Shared by browser and server. */
export function toEngineInput(
  details: Pick<
    QuoteDetails,
    | "eventDate"
    | "durationHours"
    | "photographers"
    | "guestCount"
    | "province"
    | "distanceKm"
    | "isInternational"
    | "addOns"
  > & { category?: string; startTime?: string; city?: string },
  pkg: QuotePackage & { category: string },
): QuoteInput {
  return {
    category: pkg.category,
    pkg,
    eventDate: details.eventDate,
    durationHours: details.durationHours,
    photographers: details.photographers,
    guestCount: details.guestCount,
    province: details.province,
    distanceKm: details.distanceKm ?? null,
    isInternational: details.isInternational,
    addOns: details.addOns,
  };
}
