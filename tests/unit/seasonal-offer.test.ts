import { describe, expect, it } from "vitest";

import {
  filterLive,
  isOfferLive,
  offerEndDateKey,
  offerEndFromDateKey,
  SEASONAL_SERVICE_SLUG,
} from "@/lib/seasonal/offer";

describe("offerEndFromDateKey", () => {
  it("is the last millisecond of that day in Toronto (winter, UTC-5)", () => {
    expect(offerEndFromDateKey("2026-12-25").toISOString()).toBe("2026-12-26T04:59:59.999Z");
  });

  it("follows daylight saving time (summer, UTC-4)", () => {
    expect(offerEndFromDateKey("2026-07-01").toISOString()).toBe("2026-07-02T03:59:59.999Z");
  });

  it("round-trips through offerEndDateKey", () => {
    expect(offerEndDateKey(offerEndFromDateKey("2026-12-25"))).toBe("2026-12-25");
    expect(offerEndDateKey(offerEndFromDateKey("2026-12-25").toISOString())).toBe("2026-12-25");
  });
});

describe("isOfferLive", () => {
  const endsAt = offerEndFromDateKey("2026-12-25");

  it("is live without an end date", () => {
    expect(isOfferLive(null)).toBe(true);
    expect(isOfferLive(undefined)).toBe(true);
  });

  it("is live all through the last day (studio time)", () => {
    expect(isOfferLive(endsAt, new Date("2026-12-25T05:00:00Z"))).toBe(true); // 00:00 Toronto
    expect(isOfferLive(endsAt, new Date("2026-12-26T04:59:59.999Z"))).toBe(true); // 23:59:59.999
  });

  it("ends at midnight studio time", () => {
    expect(isOfferLive(endsAt, new Date("2026-12-26T05:00:00.000Z"))).toBe(false);
    expect(isOfferLive(endsAt, new Date("2027-01-10T12:00:00Z"))).toBe(false);
  });

  it("accepts ISO strings, which is what cached queries return", () => {
    expect(isOfferLive(endsAt.toISOString(), new Date("2026-12-20T12:00:00Z"))).toBe(true);
    expect(isOfferLive(endsAt.toISOString(), new Date("2026-12-27T12:00:00Z"))).toBe(false);
  });
});

describe("filterLive", () => {
  it("keeps open-ended and unexpired items and drops expired ones", () => {
    const now = new Date("2026-12-26T12:00:00Z");
    const items = [
      { slug: "open", offerEndsAt: null },
      { slug: "future", offerEndsAt: offerEndFromDateKey("2027-01-05") },
      { slug: "expired", offerEndsAt: offerEndFromDateKey("2026-12-25").toISOString() },
    ];
    expect(filterLive(items, now).map((item) => item.slug)).toEqual(["open", "future"]);
  });
});

describe("SEASONAL_SERVICE_SLUG", () => {
  it("is the service slug admins create for seasonal offers", () => {
    expect(SEASONAL_SERVICE_SLUG).toBe("seasonal");
  });
});
