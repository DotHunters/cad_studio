import { parseBookingFilters } from "@/lib/admin/bookings";
import { centsToDecimal, toCsv } from "@/lib/admin/csv";
import { formatInStudioTz, studioDateKey } from "@/lib/dates";
import { forbiddenUnlessRole } from "@/server/auth/guards";
import { listBookingsForAdmin } from "@/server/queries/admin-bookings";
import { getServiceNames } from "@/server/queries/services";

export const dynamic = "force-dynamic";

const HEADER = [
  "Reference",
  "Status",
  "Event date",
  "Start",
  "Service",
  "Photographers",
  "Client",
  "Email",
  "Total (CAD)",
  "Payment requested",
  "Deposit paid",
];

/** CSV of the bookings matching the list filters (AGENTS.md §6.10). STAFF+. */
export async function GET(request: Request) {
  const forbidden = await forbiddenUnlessRole("STAFF");
  if (forbidden) return forbidden;

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const [{ bookings }, serviceName] = await Promise.all([
    listBookingsForAdmin(parseBookingFilters(params)),
    getServiceNames("en"),
  ]);
  const csv = toCsv(
    HEADER,
    bookings.map((booking) => [
      booking.reference,
      booking.status,
      studioDateKey(booking.startAt),
      formatInStudioTz(booking.startAt, "HH:mm"),
      serviceName(booking.category),
      booking.photographers,
      booking.customer.name,
      booking.customer.email,
      centsToDecimal(booking.totalCents),
      booking.paymentRequestedAt ? studioDateKey(booking.paymentRequestedAt) : "",
      booking.depositPaidAt ? studioDateKey(booking.depositPaidAt) : "",
    ]),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cad-studio-bookings-${studioDateKey(new Date())}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
