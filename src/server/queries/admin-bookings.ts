import "server-only";

import { fromZonedTime } from "date-fns-tz";

import { siteConfig } from "@/config/site";
import type { Prisma } from "@/generated/prisma/client";
import type { BookingFilters } from "@/lib/admin/bookings";
import { db } from "@/lib/db";
import { studioDateKey } from "@/lib/dates";

const LIST_LIMIT = 200;

/** Bookings for the admin list (AGENTS.md §6.10). Upcoming soonest first; past newest first. */
export async function listBookingsForAdmin(filters: BookingFilters, now: Date = new Date()) {
  const where: Prisma.BookingWhereInput = {
    ...(filters.status !== "ALL" && { status: filters.status }),
    ...(filters.when === "upcoming" && { startAt: { gte: now } }),
    ...(filters.when === "past" && { startAt: { lt: now } }),
    ...(filters.q && {
      OR: [
        { reference: { contains: filters.q, mode: "insensitive" } },
        { customer: { name: { contains: filters.q, mode: "insensitive" } } },
        { customer: { email: { contains: filters.q, mode: "insensitive" } } },
      ],
    }),
  };
  const bookings = await db.booking.findMany({
    where,
    orderBy: { startAt: filters.when === "upcoming" ? "asc" : "desc" },
    take: LIST_LIMIT + 1,
    select: {
      id: true,
      reference: true,
      category: true,
      startAt: true,
      photographers: true,
      status: true,
      totalCents: true,
      depositPaidAt: true,
      paymentRequestedAt: true,
      createdAt: true,
      customer: { select: { name: true, email: true } },
      _count: { select: { changeRequests: { where: { status: "OPEN" } } } },
      assignees: { select: { name: true, email: true } },
    },
  });
  return { bookings: bookings.slice(0, LIST_LIMIT), truncated: bookings.length > LIST_LIMIT };
}

/** Everything the booking detail page shows. */
export const getBookingForAdmin = (reference: string) =>
  db.booking.findUnique({
    where: { reference },
    include: {
      customer: true,
      package: { select: { name: true } },
      quote: { select: { reference: true } },
      changeRequests: { orderBy: { createdAt: "desc" } },
      reviews: { select: { id: true, status: true, rating: true } },
      assignees: { select: { id: true } },
    },
  });

export type AdminBooking = NonNullable<Awaited<ReturnType<typeof getBookingForAdmin>>>;

/**
 * Who could cover this booking: active team members, plus other bookings on the same
 * studio-local day with their assignees (for clash warnings).
 */
export async function getStaffingContext(bookingId: string, startAt: Date) {
  const day = studioDateKey(startAt);
  const dayStart = fromZonedTime(`${day}T00:00:00`, siteConfig.timezone);
  const dayEnd = new Date(dayStart.getTime() + 36 * 3_600_000); // covers DST; filtered below
  const [team, nearby] = await Promise.all([
    db.user.findMany({
      where: { isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: { id: true, name: true, email: true, role: true },
    }),
    db.booking.findMany({
      where: {
        id: { not: bookingId },
        status: { not: "CANCELLED" },
        startAt: { gte: dayStart, lt: dayEnd },
      },
      select: { reference: true, startAt: true, assignees: { select: { id: true } } },
    }),
  ]);
  const sameDay = nearby
    .filter((booking) => studioDateKey(booking.startAt) === day)
    .map((booking) => ({
      reference: booking.reference,
      assigneeIds: booking.assignees.map((assignee) => assignee.id),
    }));
  return { team, sameDay };
}
