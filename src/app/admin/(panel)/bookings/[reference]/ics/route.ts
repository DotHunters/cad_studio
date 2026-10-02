import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { buildIcs } from "@/lib/ics";
import { forbiddenUnlessRole } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

const ICS_STATUS = {
  PENDING: "TENTATIVE",
  CONFIRMED: "CONFIRMED",
  COMPLETED: "CONFIRMED",
  CANCELLED: "CANCELLED",
} as const;

/** One booking as a calendar file for the studio's own calendar (AGENTS.md §6.10). STAFF+. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const forbidden = await forbiddenUnlessRole("STAFF");
  if (forbidden) return forbidden;

  const { reference } = await params;
  const booking = await db.booking.findUnique({
    where: { reference },
    include: { customer: { select: { name: true, email: true, phone: true } } },
  });
  if (!booking) return new Response("Not found", { status: 404 });

  const adminUrl = new URL(`/admin/bookings/${booking.reference}`, siteConfig.url).toString();
  const ics = buildIcs({
    // Same UID as the client's invitation, so calendars treat them as one event.
    uid: `${booking.reference}@${new URL(siteConfig.url).hostname}`,
    start: booking.startAt,
    end: booking.endAt,
    summary: `${booking.customer.name} — ${booking.category.toLowerCase()} (${booking.reference})`,
    description: [
      `Client: ${booking.customer.name} <${booking.customer.email}>${booking.customer.phone ? ` · ${booking.customer.phone}` : ""}`,
      `Photographers: ${booking.photographers}`,
      booking.notes ? `Notes: ${booking.notes}` : "",
      `Admin: ${adminUrl}`,
    ]
      .filter(Boolean)
      .join("\n"),
    location: booking.venue ?? undefined,
    url: adminUrl,
    organizerName: siteConfig.name,
    organizerEmail: siteConfig.contact.bookingsEmail,
    now: new Date(),
    status: ICS_STATUS[booking.status],
  });
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${booking.reference}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
