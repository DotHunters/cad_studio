import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { Facts, PriceTable, Section } from "@/components/admin/detail-section";
import { ResendQuotePanel } from "@/components/admin/resend-quote-panel";
import { StatusBadge } from "@/components/admin/status-badge";
import { quoteState, storedQuoteResult } from "@/lib/admin/quotes";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { formatCAD } from "@/lib/money";
import { lineItemLabel, type Translate } from "@/lib/pricing/line-labels";
import { requireAdminPage } from "@/server/auth/guards";
import { getQuoteForAdmin } from "@/server/queries/admin-quotes";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).reference };
}

const STATE_LABEL = { OPEN: "SENT", ACCEPTED: "ACCEPTED", EXPIRED: "EXPIRED", DRAFT: "DRAFT" };

export default async function AdminQuotePage({ params }: Props) {
  await requireAdminPage();
  const { reference } = await params;
  const quote = await getQuoteForAdmin(reference);
  if (!quote) notFound();

  const result = storedQuoteResult(quote);
  const addOnCodes = (result?.lineItems ?? []).flatMap((item) =>
    item.kind === "addOn" ? [item.code] : [],
  );
  const [tQuote, tCategories, tProvinces, addOns, validDays] = await Promise.all([
    getTranslations({ locale: "en", namespace: "Quote" }),
    getTranslations({ locale: "en", namespace: "Categories" }),
    getTranslations({ locale: "en", namespace: "Provinces" }),
    db.addOn.findMany({ where: { code: { in: addOnCodes } }, select: { code: true, name: true } }),
    db.pricingRule.findUnique({ where: { key: "QUOTE_VALID_DAYS" } }),
  ]);
  const names = {
    packageName: quote.package?.name ?? "Base",
    addOnNames: Object.fromEntries(addOns.map((addOn) => [addOn.code, addOn.name])),
  };
  const state = quoteState(quote, new Date());
  const when = (date: Date) => formatInStudioTz(date, "EEE MMM d, yyyy · h:mm a");
  const province =
    quote.isInternational || quote.province === "INTL"
      ? "Outside Canada"
      : tProvinces(quote.province as never);

  return (
    <>
      <Link href="/admin/quotes" className="text-gold-text text-sm underline underline-offset-4">
        ← All quotes
      </Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-heading font-mono text-3xl">{quote.reference}</h1>
        <StatusBadge status={STATE_LABEL[state]} />
      </div>
      <p className="text-muted-foreground mt-1 text-sm">
        Created {when(quote.createdAt)} ·{" "}
        {quote.booking ? (
          <>
            booked as{" "}
            <Link
              href={`/admin/bookings/${quote.booking.reference}`}
              className="text-gold-text underline underline-offset-4"
            >
              {quote.booking.reference}
            </Link>
          </>
        ) : (
          `${state === "EXPIRED" ? "expired" : "valid until"} ${formatInStudioTz(quote.expiresAt, "MMM d, yyyy")}`
        )}
      </p>

      {!quote.booking && state !== "ACCEPTED" && (
        <div className="mt-8 max-w-xl">
          <ResendQuotePanel
            reference={quote.reference}
            expired={state === "EXPIRED"}
            validDays={typeof validDays?.value === "number" ? validDays.value : 14}
          />
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Section title="Event">
          <Facts
            rows={[
              ["Service", tCategories(`${slugFromCategory(quote.category)}.name`)],
              ["Package", quote.package?.name ?? "—"],
              ["Date", when(quote.eventDate)],
              ["Coverage", `${Number(quote.durationHours)} h`],
              ["Photographers", quote.photographers],
              ["Guests", quote.guestCount ?? "—"],
              [
                "Location",
                [quote.city, province].filter(Boolean).join(", ") +
                  (quote.distanceKm !== null ? ` · ${quote.distanceKm} km` : ""),
              ],
            ]}
          />
        </Section>
        <Section title="Client">
          <Facts
            rows={[
              ["Name", quote.customer.name],
              [
                "Email",
                <a
                  key="email"
                  href={`mailto:${quote.customer.email}`}
                  className="text-gold-text underline"
                >
                  {quote.customer.email}
                </a>,
              ],
              ["Phone", quote.customer.phone ?? "—"],
              ["Language", quote.customer.locale === "fr" ? "French" : "English"],
            ]}
          />
        </Section>
        <Section title="Price">
          {result ? (
            <>
              <PriceTable
                lineItems={result.lineItems}
                taxLines={result.taxLines}
                subtotalCents={result.subtotalCents}
                totalCents={result.totalCents}
                label={(item) => lineItemLabel(item, tQuote as unknown as Translate, names)}
              />
              <p className="text-muted-foreground mt-2 text-sm">
                Deposit {formatCAD(result.depositCents, "en", { suffix: false })}
                {result.flags.customTravelQuote && " · travel to be quoted separately"}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground text-sm">
              Total {formatCAD(quote.totalCents, "en", { suffix: false })} (no itemized breakdown
              stored).
            </p>
          )}
        </Section>
      </div>
    </>
  );
}
