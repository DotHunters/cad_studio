import "server-only";

import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { createElement } from "react";

import { type Locale, siteConfig } from "@/config/site";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { QuoteSummaryEmail } from "@/lib/email/templates/quote-summary";
import { formatCAD } from "@/lib/money";
import type { QuoteResult } from "@/lib/pricing/calculate-quote";
import { lineItemLabel, type Translate } from "@/lib/pricing/line-labels";

export type QuoteEmailData = {
  reference: string;
  /** Signature for the private quote link. */
  token: string;
  locale: Locale;
  customer: { name: string; email: string; phone?: string };
  category: string;
  eventStart: Date;
  durationHours: number;
  city?: string;
  province: string;
  packageName: string;
  addOnNames: Record<string, string>;
  quote: QuoteResult;
  depositPct: number;
  expiresAt: Date;
  /** False when the studio re-sends a quote from admin (no "new quote" notification). */
  notifyStudio?: boolean;
};

/** Client summary (in their locale) + admin notification. Failures are logged by the caller. */
export async function sendQuoteEmails(data: QuoteEmailData) {
  const { locale, quote } = data;
  const [t, tQuote, tCategories, tQuoteEn] = await Promise.all([
    getTranslations({ locale, namespace: "Email" }),
    getTranslations({ locale, namespace: "Quote" }),
    getTranslations({ locale, namespace: "Categories" }),
    getTranslations({ locale: "en", namespace: "Quote" }),
  ]);
  const money = (cents: number) => formatCAD(cents, locale);
  const date = formatInStudioTz(data.eventStart, "PPP", locale);
  const time = formatInStudioTz(data.eventStart, "p", locale);
  const category = tCategories(`${slugFromCategory(data.category as never)}.name`);
  const quoteUrl = new URL(
    `/${locale}/quote/${data.reference}?t=${data.token}`,
    siteConfig.url,
  ).toString();
  const rows = quote.lineItems.map((item) => ({
    label: lineItemLabel(item, tQuote as unknown as Translate, {
      packageName: data.packageName,
      addOnNames: data.addOnNames,
    }),
    amount: money(item.amountCents),
  }));
  const taxRows = quote.taxLines.map((line) => ({
    label: `${line.code} (${line.rate})`,
    amount: money(line.amountCents),
  }));

  const props = {
    lang: locale === "fr" ? "fr-CA" : "en-CA",
    logoUrl: new URL("/brand/logo-gold.png", siteConfig.url).toString(),
    preview: t("quotePreview", { date, total: money(quote.totalCents) }),
    heading: t("quoteHeading"),
    greeting: t("greeting", { name: data.customer.name }),
    intro: t("quoteIntro"),
    referenceLabel: t("reference"),
    reference: data.reference,
    eventLine: t("eventLine", { category, date, time, hours: data.durationHours }),
    rows,
    subtotal: { label: tQuote("subtotal"), amount: money(quote.subtotalCents) },
    taxRows,
    total: { label: tQuote("total"), amount: money(quote.totalCents) },
    depositLine: `${tQuote("deposit", { percent: data.depositPct })}: ${money(quote.depositCents)}`,
    customTravel: quote.flags.customTravelQuote ? tQuote("customTravel") : undefined,
    expiresLine: t("expires", { date: formatInStudioTz(data.expiresAt, "PPP", locale) }),
    disclaimer: tQuote("disclaimer"),
    cta: { label: t("cta"), url: quoteUrl },
    footer: t("footer"),
  };

  const element = createElement(QuoteSummaryEmail, props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  await sendEmail({
    to: data.customer.email,
    subject: t("quoteSubject", { reference: data.reference }),
    html,
    text,
  });

  // Studio notification: plain text, always in English, reply goes to the client.
  if (data.notifyStudio === false) return;
  const location = [data.city, data.province].filter(Boolean).join(", ");
  await sendEmail({
    to: adminNotifyAddress(),
    replyTo: data.customer.email,
    subject: `[${siteConfig.name}] New quote ${data.reference} — ${formatCAD(quote.totalCents, "en")}`,
    text: [
      `Reference: ${data.reference}`,
      `Client: ${data.customer.name} <${data.customer.email}>${data.customer.phone ? ` · ${data.customer.phone}` : ""}`,
      `Event: ${data.category} · ${formatInStudioTz(data.eventStart, "PPP p", "en")} · ${data.durationHours} h`,
      `Location: ${location || "—"}`,
      `Package: ${data.packageName}`,
      "",
      ...quote.lineItems.map(
        (item) =>
          `${lineItemLabel(item, tQuoteEn as unknown as Translate, {
            packageName: data.packageName,
            addOnNames: data.addOnNames,
          })}: ${formatCAD(item.amountCents, "en")}`,
      ),
      `Subtotal: ${formatCAD(quote.subtotalCents, "en")}`,
      ...quote.taxLines.map(
        (line) => `${line.code} (${line.rate}): ${formatCAD(line.amountCents, "en")}`,
      ),
      `Total: ${formatCAD(quote.totalCents, "en")} · Deposit: ${formatCAD(quote.depositCents, "en")}`,
      quote.flags.customTravelQuote ? "⚠ Custom travel quote needed" : "",
      "",
      `Client view: ${quoteUrl}`,
    ]
      .filter((lineText) => lineText !== "")
      .join("\n"),
  });
}
