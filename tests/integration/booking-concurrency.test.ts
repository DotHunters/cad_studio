import { config } from "dotenv";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

config({ path: [".env.local", ".env"], quiet: true });

// Outside Next there is no incremental cache: run cached queries directly.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
  revalidateTag: () => undefined,
}));

const hasDatabase = Boolean(process.env.DATABASE_URL);

// AGENTS.md §15 scenario 3: two concurrent bookings for the last slot → exactly one succeeds.
describe.skipIf(!hasDatabase)("booking concurrency (real database)", () => {
  const DATE = "2027-11-17"; // a Wednesday reserved for this test
  const EMAIL_PREFIX = "e2e-concurrency-";

  const request = (n: number) => ({
    category: "corporate" as const,
    packageSlug: "corporate-event",
    eventDate: DATE,
    startTime: "10:00",
    endTime: "14:00",
    durationHours: 4,
    photographers: 1,
    guestCount: undefined,
    venue: undefined,
    city: undefined,
    province: "ON" as const,
    distanceKm: undefined,
    isInternational: false,
    notes: undefined,
    addOns: [],
    name: `Concurrency ${n}`,
    email: `${EMAIL_PREFIX}${n}@example.com`,
    phone: undefined,
    paymentMethod: "BANK_TRANSFER" as const,
    consentTerms: true as const,
    consentPrivacy: true as const,
    marketingOptIn: false,
    website: undefined,
    quoteReference: undefined,
    quoteToken: undefined,
  });

  async function cleanup() {
    const { db } = await import("@/lib/db");
    await db.booking.deleteMany({ where: { customer: { email: { startsWith: EMAIL_PREFIX } } } });
    await db.customer.deleteMany({ where: { email: { startsWith: EMAIL_PREFIX } } });
  }

  beforeAll(cleanup);
  afterAll(async () => {
    await cleanup();
    const { db } = await import("@/lib/db");
    await db.$disconnect();
  });

  it("lets exactly one of two simultaneous requests take the last photographer", async () => {
    const { placeBooking } = await import("@/server/booking/place-booking");
    const now = new Date("2027-10-01T12:00:00Z");

    // Fill 2 of the 3 photographer slots.
    for (const n of [1, 2]) {
      const result = await placeBooking(request(n), { locale: "en", now });
      expect(result.ok).toBe(true);
    }

    // Race two requests for the last slot.
    const results = await Promise.all([
      placeBooking(request(3), { locale: "en", now }),
      placeBooking(request(4), { locale: "en", now }),
    ]);
    const succeeded = results.filter((result) => result.ok);
    const rejected = results.filter((result) => !result.ok);
    expect(succeeded).toHaveLength(1);
    expect(rejected).toEqual([{ ok: false, error: "unavailable" }]);

    // And the day is now full.
    const fifth = await placeBooking(request(5), { locale: "en", now });
    expect(fifth).toEqual({ ok: false, error: "unavailable" });
  }, 30_000);

  it("stores the server's price, deposit and a CAD-B reference", async () => {
    const { db } = await import("@/lib/db");
    const booking = await db.booking.findFirst({
      where: { customer: { email: `${EMAIL_PREFIX}1@example.com` } },
    });
    expect(booking?.reference).toMatch(/^CAD-B-2027-\d{4,}$/);
    expect(booking).toMatchObject({
      status: "PENDING",
      // Corporate $1,200 + 13% HST, weekday, no travel; 30% deposit.
      totalCents: 135600,
      depositCents: 40680,
      paymentMethod: "BANK_TRANSFER",
    });
  });
});
