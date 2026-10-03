import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { QuoteFilters } from "@/lib/admin/quotes";
import { db } from "@/lib/db";

const LIST_LIMIT = 200;

/** Quotes for the admin list, newest first (AGENTS.md §6.10). */
export async function listQuotesForAdmin(filters: QuoteFilters, now: Date = new Date()) {
  const views: Record<QuoteFilters["view"], Prisma.QuoteWhereInput> = {
    OPEN: { status: "SENT", expiresAt: { gt: now } },
    ACCEPTED: { status: "ACCEPTED" },
    EXPIRED: { OR: [{ status: "EXPIRED" }, { status: "SENT", expiresAt: { lte: now } }] },
    CANCELLED: { status: "CANCELLED" },
    ALL: {},
  };
  const quotes = await db.quote.findMany({
    where: {
      ...views[filters.view],
      ...(filters.q && {
        AND: {
          OR: [
            { reference: { contains: filters.q, mode: "insensitive" } },
            { customer: { name: { contains: filters.q, mode: "insensitive" } } },
            { customer: { email: { contains: filters.q, mode: "insensitive" } } },
          ],
        },
      }),
    },
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT + 1,
    select: {
      id: true,
      reference: true,
      category: true,
      eventDate: true,
      totalCents: true,
      status: true,
      expiresAt: true,
      createdAt: true,
      customer: { select: { name: true, email: true } },
      booking: { select: { reference: true } },
    },
  });
  return { quotes: quotes.slice(0, LIST_LIMIT), truncated: quotes.length > LIST_LIMIT };
}

export const getQuoteForAdmin = (reference: string) =>
  db.quote.findUnique({
    where: { reference },
    include: {
      customer: true,
      package: { select: { name: true, nameFr: true } },
      booking: { select: { reference: true, status: true } },
    },
  });
