import { NextResponse } from "next/server";

import { monthAvailability, parseMonthParam } from "@/lib/booking/availability";
import { studioDateKey } from "@/lib/dates";
import { getMonthAvailabilityContext } from "@/server/queries/availability";

export const dynamic = "force-dynamic";

/**
 * Public availability (AGENTS.md §8.3): GET /api/availability?month=YYYY-MM →
 * { month, days: [{ date, status: "available" | "limited" | "full" }] }. Never returns
 * other clients' details or why a day is unavailable.
 */
export async function GET(request: Request) {
  const monthParam = new URL(request.url).searchParams.get("month");
  const parsed = parseMonthParam(monthParam, studioDateKey(new Date()));
  if (!parsed) {
    return NextResponse.json({ error: "Invalid or out-of-range month" }, { status: 400 });
  }

  try {
    const context = await getMonthAvailabilityContext(parsed.year, parsed.month);
    return NextResponse.json(
      { month: monthParam, days: monthAvailability(parsed.year, parsed.month, context) },
      // Short shared caching keeps load low while staying close to real time.
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("[availability] failed", error);
    return NextResponse.json({ error: "Availability is temporarily unavailable" }, { status: 503 });
  }
}
