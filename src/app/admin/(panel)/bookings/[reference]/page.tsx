import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import { BookingStatusPanel } from "@/components/admin/booking-status-panel";
import { PaymentPanel } from "@/components/admin/payment-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { Button } from "@/components/ui/button";
import { formatTaxRate, parseStoredBreakdown } from "@/lib/admin/bookings";
import { availableStatusIntents } from "@/lib/admin/booking-status";
import { canTakePayment } from "@/lib/admin/payments";
import { needsPaymentRequest } from "@/lib/booking/holds";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz, studioDateKey } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { lineItemLabel, type Translate } from "@/lib/pricing/line-labels";
import { requireAdminPage } from "@/server/auth/guards";
import { resolveChangeRequest } from "@/server/actions/admin/booking-status";
import { getBookingForAdmin } from "@/server/queries/admin-bookings";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).reference };
}

const money = (cents: number) => formatCAD(cents, "en", { suffix: false });
const when = (date: Date) => formatInStudioTz(date, "EEE MMM d, yyyy · h:mm a");

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = `section-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="bg-card rounded-xl border p-5">
      <h2 id={id} className="mb-3 text-lg font-medium">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: Array<[string, ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
      {rows.map(([term, value]) => (
        <div key={term} className="contents">
          <dt className="text-muted-foreground">{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default async function AdminBookingPage({ params }: Props) {
  await requireAdminPage();
  const { reference } = await params;
  const booking = await getBookingForAdmin(reference);
  if (!booking) notFound();

  const breakdown = parseStoredBreakdown(booking.breakdown);
  const addOnCodes = (breakdown?.lineItems ?? []).flatMap((item) =>
    item.kind === "addOn" ? [item.code] : [],
  );
  const [tQuote, tCategories, addOns] = await Promise.all([
    getTranslations({ locale: "en", namespace: "Quote" }),
    getTranslations({ locale: "en", namespace: "Categories" }),
    db.addOn.findMany({ where: { code: { in: addOnCodes } }, select: { code: true, name: true } }),
  ]);
  const names = {
    packageName: booking.package?.name ?? "Base",
    addOnNames: Object.fromEntries(addOns.map((addOn) => [addOn.code, addOn.name])),
  };
  const { customer } = booking;
  const statusIntents = availableStatusIntents(booking, new Date());

  return (
    <>
      <Link href="/admin/bookings" className="text-gold-text text-sm underline underline-offset-4">
        ← All bookings
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-heading font-mono text-3xl">{booking.reference}</h1>
        <StatusBadge status={booking.status} />
        <a
          href={`/admin/bookings/${booking.reference}/ics`}
          className="text-gold-text text-sm underline underline-offset-4"
        >
          Add to calendar (.ics)
        </a>
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        Requested {when(booking.createdAt)}
        {booking.quote && ` · from quote ${booking.quote.reference}`}
      </p>

      {needsPaymentRequest(booking, new Date()) && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          No payment request has been sent for over 24 hours.
        </p>
      )}

      {canTakePayment(booking) && (
        <div className="mt-8">
          <PaymentPanel
            reference={booking.reference}
            depositAmount={
              booking.depositCents === null ? "" : (booking.depositCents / 100).toFixed(2)
            }
            paymentLinkUrl={booking.paymentLinkUrl ?? ""}
            alreadyRequested={booking.paymentRequestedAt !== null}
            today={studioDateKey(new Date())}
          />
        </div>
      )}

      {statusIntents.length > 0 && (
        <div className="mt-6">
          <BookingStatusPanel reference={booking.reference} intents={statusIntents} />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Event">
          <Facts
            rows={[
              ["Service", tCategories(`${slugFromCategory(booking.category)}.name`)],
              ["Package", booking.package?.name ?? "—"],
              ["Starts", when(booking.startAt)],
              ["Ends", when(booking.endAt)],
              ["Photographers", booking.photographers],
              ["Guests", booking.guestCount ?? "—"],
              ["Venue", booking.venue ?? "—"],
              [
                "Notes",
                booking.notes ? <span className="whitespace-pre-line">{booking.notes}</span> : "—",
              ],
            ]}
          />
        </Section>

        <Section title="Client">
          <Facts
            rows={[
              ["Name", customer.name],
              [
                "Email",
                <a
                  key="email"
                  href={`mailto:${customer.email}`}
                  className="text-gold-text underline"
                >
                  {customer.email}
                </a>,
              ],
              ["Phone", customer.phone ?? "—"],
              ["Language", customer.locale === "fr" ? "French" : "English"],
              ["Marketing", customer.marketingOptIn ? "Opted in" : "Not opted in"],
            ]}
          />
        </Section>

        <Section title="Price">
          {breakdown ? (
            <table className="w-full text-sm">
              <tbody>
                {breakdown.lineItems.map((item, index) => (
                  <tr key={index}>
                    <td className="py-1">
                      {lineItemLabel(item, tQuote as unknown as Translate, names)}
                    </td>
                    <td className="py-1 text-right tabular-nums">{money(item.amountCents)}</td>
                  </tr>
                ))}
                <tr className="border-t">
                  <td className="py-1 font-medium">Subtotal</td>
                  <td className="py-1 text-right tabular-nums">
                    {money(booking.subtotalCents ?? 0)}
                  </td>
                </tr>
                {breakdown.taxLines.map((line) => (
                  <tr key={line.code}>
                    <td className="py-1">
                      {line.code} ({formatTaxRate(line.rate)})
                    </td>
                    <td className="py-1 text-right tabular-nums">{money(line.amountCents)}</td>
                  </tr>
                ))}
                <tr className="border-t font-medium">
                  <td className="py-1">Total</td>
                  <td className="py-1 text-right tabular-nums">{money(booking.totalCents ?? 0)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <p className="text-muted-foreground text-sm">
              {booking.totalCents === null
                ? "No price stored for this booking."
                : `Total ${money(booking.totalCents)} (no itemized breakdown stored).`}
            </p>
          )}
        </Section>

        <Section title="Payment">
          <Facts
            rows={[
              ["Deposit", booking.depositCents === null ? "—" : money(booking.depositCents)],
              [
                "Method",
                booking.paymentMethod === "CASH"
                  ? "Cash"
                  : booking.paymentMethod === "BANK_TRANSFER"
                    ? "Bank transfer"
                    : booking.paymentMethod === "PAYMENT_LINK"
                      ? "Payment link"
                      : (booking.paymentMethod ?? "—"),
              ],
              [
                "Request sent",
                booking.paymentRequestedAt ? when(booking.paymentRequestedAt) : "Not yet",
              ],
              ["Payment link", booking.paymentLinkUrl ?? "—"],
              ["Deposit paid", booking.depositPaidAt ? when(booking.depositPaidAt) : "Not yet"],
            ]}
          />
        </Section>
      </div>

      {booking.changeRequests.length > 0 && (
        <div className="mt-6">
          <Section title="Change requests">
            <ul className="divide-y text-sm">
              {booking.changeRequests.map((request) => (
                <li key={request.id} className="py-2">
                  <span className="font-medium">
                    {request.type === "RESCHEDULE" ? "Reschedule" : "Cancellation"}
                  </span>{" "}
                  · {request.status === "OPEN" ? "Open" : "Resolved"} · {when(request.createdAt)}
                  {request.preferredDate && ` · preferred date ${request.preferredDate}`}
                  {request.status === "OPEN" && (
                    <form action={resolveChangeRequest.bind(null, request.id)} className="mt-2">
                      <Button type="submit" size="sm" variant="outline">
                        Mark as handled
                      </Button>
                    </form>
                  )}
                  {request.message && (
                    <p className="text-muted-foreground mt-1 whitespace-pre-line">
                      {request.message}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </>
  );
}
