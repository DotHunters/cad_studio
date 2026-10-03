import "server-only";

import { db } from "@/lib/db";

/**
 * How many quotes and bookings mention an add-on (by code) in their saved price breakdown.
 * Used ones can't be deleted, only hidden, so old quotes and bookings keep their history.
 */
export async function addOnUsage(code: string): Promise<number> {
  const [row] = await db.$queryRaw<[{ count: bigint }]>`
    select (
      (select count(*) from "Quote"
        where "addOns" @> jsonb_build_array(jsonb_build_object('code', ${code}::text))
           or jsonb_path_exists(breakdown, '$.** ? (@.kind == "addOn" && @.code == $c)',
                                jsonb_build_object('c', ${code}::text)))
      + (select count(*) from "Booking"
        where breakdown is not null
          and jsonb_path_exists(breakdown, '$.** ? (@.kind == "addOn" && @.code == $c)',
                                jsonb_build_object('c', ${code}::text)))
    ) as count`;
  return Number(row.count);
}

/** Quotes and bookings that were made for a package. */
export async function packageUsage(id: string): Promise<number> {
  const [quotes, bookings] = await Promise.all([
    db.quote.count({ where: { packageId: id } }),
    db.booking.count({ where: { packageId: id } }),
  ]);
  return quotes + bookings;
}

/** "Used by 3 quotes or bookings — …" for a refused delete. */
export function inUseMessage(count: number, alternative: string): string {
  return `Used by ${count} quote${count === 1 ? "" : "s"} or booking${count === 1 ? "" : "s"}, so it can't be deleted. ${alternative}`;
}
