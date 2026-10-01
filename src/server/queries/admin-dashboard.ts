import "server-only";

import { revenueEstimate, studioMonthRange } from "@/lib/admin/dashboard";
import { needsPaymentRequest } from "@/lib/booking/holds";
import { db } from "@/lib/db";

const DAY_MS = 24 * 60 * 60 * 1000;
const NEW_QUOTE_DAYS = 7;
const UPCOMING_LIST = 8;
const RECENT_QUOTES = 5;

/** Everything the dashboard shows (AGENTS.md §6.10). Not cached: admins need live numbers. */
export async function getDashboardData(now: Date = new Date()) {
  const month = studioMonthRange(now);
  const active = { in: ["PENDING", "CONFIRMED"] as ("PENDING" | "CONFIRMED")[] };

  const [
    upcomingCount,
    upcoming,
    newQuotes,
    recentQuotes,
    pendingReviews,
    flaggedReviews,
    monthBookings,
    unrequested,
    openChangeRequests,
  ] = await Promise.all([
    db.booking.count({ where: { status: active, startAt: { gte: now } } }),
    db.booking.findMany({
      where: { status: active, startAt: { gte: now } },
      orderBy: { startAt: "asc" },
      take: UPCOMING_LIST,
      select: {
        id: true,
        reference: true,
        category: true,
        startAt: true,
        photographers: true,
        status: true,
        totalCents: true,
        customer: { select: { name: true } },
      },
    }),
    db.quote.count({
      where: { createdAt: { gte: new Date(now.getTime() - NEW_QUOTE_DAYS * DAY_MS) } },
    }),
    db.quote.findMany({
      orderBy: { createdAt: "desc" },
      take: RECENT_QUOTES,
      select: {
        id: true,
        reference: true,
        category: true,
        eventDate: true,
        totalCents: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.review.count({ where: { status: "PENDING" } }),
    db.review.count({ where: { status: "PENDING", flagged: true } }),
    db.booking.findMany({
      where: { startAt: { gte: month.start, lt: month.end } },
      select: { status: true, subtotalCents: true },
    }),
    db.booking.findMany({
      where: { status: "PENDING", paymentRequestedAt: null },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        reference: true,
        status: true,
        createdAt: true,
        paymentRequestedAt: true,
        depositPaidAt: true,
        customer: { select: { name: true } },
      },
    }),
    db.bookingChangeRequest.count({ where: { status: "OPEN" } }),
  ]);

  return {
    upcomingCount,
    upcoming,
    newQuotes,
    newQuoteDays: NEW_QUOTE_DAYS,
    recentQuotes,
    pendingReviews,
    flaggedReviews,
    revenue: revenueEstimate(monthBookings),
    month: month.start,
    // Bookings never auto-expire before a payment request is sent (AGENTS.md §8.3).
    awaitingPaymentRequest: unrequested.filter((booking) => needsPaymentRequest(booking, now)),
    openChangeRequests,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
