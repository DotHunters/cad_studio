/**
 * Whether a booking still matches the quote it started from. If anything that affects the
 * price changed, the quoted price no longer applies and the booking is priced fresh.
 * Shared by the /book review step and createBooking so both agree.
 */
export type PriceFingerprint = {
  category: string;
  packageSlug: string;
  eventDate: string;
  startTime: string;
  durationHours: number;
  photographers: number;
  province: string;
  distanceKm: number | null;
  isInternational: boolean;
  addOns: ReadonlyArray<{ code: string; qty: number }>;
};

function normalize(fingerprint: PriceFingerprint) {
  return {
    ...fingerprint,
    category: fingerprint.category.toUpperCase(),
    distanceKm: fingerprint.isInternational ? null : Math.round(fingerprint.distanceKm ?? 0),
    addOns: fingerprint.addOns
      .filter((addOn) => addOn.qty > 0)
      .map((addOn) => `${addOn.code}:${addOn.qty}`)
      .sort(),
  };
}

export function matchesQuote(booking: PriceFingerprint, quote: PriceFingerprint): boolean {
  return JSON.stringify(normalize(booking)) === JSON.stringify(normalize(quote));
}
