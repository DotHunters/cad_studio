import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { BookingFilters } from "@/lib/admin/bookings";
import { db } from "@/lib/db";

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
    },
  });

export type AdminBooking = NonNullable<Awaited<ReturnType<typeof getBookingForAdmin>>>;
