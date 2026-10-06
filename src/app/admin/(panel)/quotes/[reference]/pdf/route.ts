import { getTranslations } from "next-intl/server";

import { siteConfig } from "@/config/site";
import { storedQuoteResult } from "@/lib/admin/quotes";
import { formatInStudioTz } from "@/lib/dates";
import { db } from "@/lib/db";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { renderQuotePdf } from "@/lib/pdf/quote-pdf";
import { lineItemLabel, type Translate } from "@/lib/pricing/line-labels";
import { savedOptionName } from "@/lib/pricing/options";
import { forbiddenUnlessRole } from "@/server/auth/guards";
import { getServiceNames } from "@/server/queries/services";

export const dynamic = "force-dynamic";

/**
 * A quote as a PDF to download or send to the client (AGENTS.md §6.5, §6.10). STAFF+.
 * Printed in the client's language, with the same lines and labels as the quote page.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const forbidden = await forbiddenUnlessRole("STAFF");
  if (forbidden) return forbidden;

  const { reference } = await params;
  const quote = await db.quote.findUnique({
    where: { reference },
    include: {
      customer: { select: { name: true, email: true, phone: true, locale: true } },
      package: { select: { name: true, nameFr: true } },
    },
  });
  const result = quote && storedQuoteResult(quote);
  if (!quote || !result) return new Response("Not found", { status: 404 });

  const locale = quote.customer.locale === "fr" ? "fr" : "en";
  const addOnCodes = result.lineItems.flatMap((item) => (item.kind === "addOn" ? [item.code] : []));
  const [t, tQuote, addOns, depositRule, serviceName] = await Promise.all([
    getTranslations({ locale }),
    getTranslations({ locale, namespace: "Quote" }),
    db.addOn.findMany({
      where: { code: { in: addOnCodes } },
      select: { code: true, name: true, nameFr: true },
    }),
    db.pricingRule.findUnique({ where: { key: "DEPOSIT_PCT" } }),
    getServiceNames(locale),
  ]);
  const money = (cents: number) => formatCAD(cents, locale);
  const names = {
    packageName: savedOptionName(quote.breakdown, quote.package, locale) ?? "—",
    addOnNames: Object.fromEntries(
      addOns.map((addOn) => [addOn.code, localize(addOn.name, addOn.nameFr, locale)]),
    ),
  };
  const location = quote.isInternational
    ? t("Provinces.INTL")
    : [quote.city, t(`Provinces.${quote.province as "ON"}`)].filter(Boolean).join(", ");
  const cancelled = quote.status === "CANCELLED";

  const pdf = await renderQuotePdf({
    locale,
    title: t("QuoteResult.eyebrow", { reference: quote.reference }),
    studioName: siteConfig.name,
    studioLines: [
      siteConfig.contact.email,
      ...siteConfig.contact.phones.map((phone) => phone.display),
    ],
    issuedLine: [
      formatInStudioTz(quote.createdAt, "PPP", locale),
      cancelled
        ? t("QuoteResult.cancelled")
        : t("QuoteResult.validUntil", { date: formatInStudioTz(quote.expiresAt, "PPP", locale) }),
    ].join(" · "),
    clientLines: [quote.customer.name, quote.customer.email, quote.customer.phone ?? ""].filter(
      Boolean,
    ),
    facts: [
      {
        label: t("QuoteResult.event"),
        value: serviceName(quote.category),
      },
      { label: t("QuoteResult.package"), value: names.packageName },
      {
        label: t("QuoteResult.date"),
        value: formatInStudioTz(quote.eventDate, "PPP · p", locale),
      },
      {
        label: t("QuoteResult.coverage"),
        value: t("QuoteResult.hours", { count: Number(quote.durationHours) }),
      },
      { label: t("QuoteResult.photographers"), value: String(quote.photographers) },
      { label: t("QuoteResult.location"), value: location || "—" },
    ],
    rows: result.lineItems.map((item) => ({
      label: lineItemLabel(item, tQuote as unknown as Translate, names),
      amount: money(item.amountCents),
    })),
    subtotal: { label: tQuote("subtotal"), amount: money(result.subtotalCents) },
    taxRows: result.taxLines.map((line) => ({
      label: `${line.code} (${line.rate})`,
      amount: money(line.amountCents),
    })),
    total: { label: tQuote("total"), amount: money(result.totalCents) },
    deposit:
      typeof depositRule?.value === "number"
        ? {
            label: tQuote("deposit", { percent: depositRule.value }),
            amount: money(result.depositCents),
          }
        : null,
    notes: [
      result.flags.customTravelQuote ? tQuote("customTravel") : "",
      tQuote("disclaimer"),
    ].filter(Boolean),
  });

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${quote.reference}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
