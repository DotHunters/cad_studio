import "server-only";

import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { createElement } from "react";

import { type Locale, siteConfig } from "@/config/site";
import { slugFromCategory } from "@/lib/categories";
import { formatInStudioTz } from "@/lib/dates";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { BookingRequestEmail } from "@/lib/email/templates/booking-request";
import { buildIcs } from "@/lib/ics";
import { localize } from "@/lib/localize";
import { formatCAD } from "@/lib/money";
import { signValue } from "@/lib/signing";
import type { BookingRequest } from "@/lib/validators/booking";
import type { PlaceBookingResult } from "@/server/booking/place-booking";
import { linkSecret } from "@/server/link-secret";

export type BookingEmailData = {
  reference: string;
  token: string;
  locale: Locale;
  customer: { name: string; email: string; phone?: string };
  category: string;
  packageName: string;
  startAt: Date;
  endAt: Date;
  venue?: string;
  photographers: number;
  guestCount?: number;
  notes?: string;
  totalCents: number;
  depositCents: number;
  paymentMethod: "BANK_TRANSFER" | "CASH";
  fromQuote: string | null;
};

/** Client confirmation (their locale) + studio notification, both with an .ics invite. */
export async function sendBookingEmails(data: BookingEmailData) {
  const { locale } = data;
  const [t, tConfirmed, tBook, tCategories] = await Promise.all([
    getTranslations({ locale, namespace: "Email" }),
    getTranslations({ locale, namespace: "BookingConfirmed" }),
    getTranslations({ locale, namespace: "Book" }),
    getTranslations({ locale, namespace: "Categories" }),
  ]);
  const category = tCategories(`${slugFromCategory(data.category as never)}.name`);
  const bookingUrl = new URL(
    `/${locale}/book/${data.reference}?t=${data.token}`,
    siteConfig.url,
  ).toString();
  const date = formatInStudioTz(data.startAt, "PPPP", locale);
  const when = `${date} · ${formatInStudioTz(data.startAt, "p", locale)}–${formatInStudioTz(data.endAt, "p", locale)}`;
  const payment = data.paymentMethod === "CASH" ? tBook("payCash") : tBook("payBank");

  const ics = buildIcs({
    uid: `${data.reference}@${new URL(siteConfig.url).hostname}`,
    start: data.startAt,
    end: data.endAt,
    summary: t("icsSummary", { category }),
    description: t("icsDescription", { reference: data.reference, url: bookingUrl }),
    location: data.venue,
    url: bookingUrl,
    organizerName: siteConfig.name,
    organizerEmail: siteConfig.contact.bookingsEmail,
    now: new Date(),
  });
  const attachment = {
    filename: `${data.reference}.ics`,
    content: Buffer.from(ics, "utf8").toString("base64"),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };

  const element = createElement(BookingRequestEmail, {
    lang: locale === "fr" ? "fr-CA" : "en-CA",
    logoUrl: new URL("/brand/logo-gold.png", siteConfig.url).toString(),
    preview: t("bookingPreview", { date }),
    heading: t("bookingHeading"),
    greeting: t("greeting", { name: data.customer.name }),
    intro: t("bookingIntro"),
    referenceLabel: t("reference"),
    reference: data.reference,
    facts: [
      { label: tConfirmed("status"), value: t("bookingStatus") },
      { label: tConfirmed("when"), value: when },
      { label: tConfirmed("package"), value: data.packageName },
      { label: tConfirmed("total"), value: formatCAD(data.totalCents, locale) },
      { label: tConfirmed("deposit"), value: formatCAD(data.depositCents, locale) },
      { label: tConfirmed("payment"), value: payment },
    ],
    nextTitle: tConfirmed("nextTitle"),
    nextSteps: [
      data.paymentMethod === "CASH" ? tConfirmed("nextCash") : tConfirmed("nextBank"),
      tConfirmed("nextConfirm"),
    ],
    icsNote: `${t("icsNote")} ${t("changeLink")}`,
    cta: { label: t("bookingCta"), url: bookingUrl },
    footer: t("bookingFooter"),
  });
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);

  await sendEmail({
    to: data.customer.email,
    subject: t("bookingSubject", { reference: data.reference }),
    html,
    text,
    attachments: [attachment],
  });

  // Studio notification (English, plain text). Next step for the studio: send the payment
  // request from the admin dashboard (task 7.6).
  await sendEmail({
    to: adminNotifyAddress(),
    replyTo: data.customer.email,
    subject: `[${siteConfig.name}] New booking request ${data.reference} — ${formatInStudioTz(data.startAt, "PPP", "en")}`,
    text: [
      `Reference: ${data.reference} (PENDING — deposit not yet received)`,
      `Client: ${data.customer.name} <${data.customer.email}>${data.customer.phone ? ` · ${data.customer.phone}` : ""}`,
      `When: ${formatInStudioTz(data.startAt, "PPPP p", "en")} – ${formatInStudioTz(data.endAt, "p", "en")}`,
      `Event: ${data.category} · ${data.packageName} · ${data.photographers} photographer(s)${data.guestCount ? ` · ${data.guestCount} guests` : ""}`,
      `Venue: ${data.venue ?? "—"}`,
      `Total: ${formatCAD(data.totalCents, "en")} · Deposit: ${formatCAD(data.depositCents, "en")} by ${data.paymentMethod === "CASH" ? "cash" : "bank transfer"}`,
      data.fromQuote ? `Booked from quote ${data.fromQuote} at the quoted price.` : "",
      data.notes ? `Notes: ${data.notes}` : "",
      "",
      "Next: send the client a payment request with your bank details or payment link.",
      `Client view: ${bookingUrl}`,
    ]
      .filter((lineText) => lineText !== "")
      .join("\n"),
    attachments: [attachment],
  });
}

/**
 * After a booking is placed (public form or admin conversion): sends the client and studio
 * emails (best-effort — the booking is saved either way) and returns the client link token.
 */
export async function notifyBookingPlaced(
  request: BookingRequest,
  result: Extract<PlaceBookingResult, { ok: true }>,
  locale: Locale,
): Promise<string> {
  const token = signValue(`booking:${result.reference}`, linkSecret());
  try {
    await sendBookingEmails({
      reference: result.reference,
      token,
      locale,
      customer: { name: request.name, email: request.email, phone: request.phone },
      category: request.category.toUpperCase(),
      packageName: localize(result.packageName, result.packageNameFr, locale),
      startAt: result.startAt,
      endAt: result.endAt,
      venue: [request.venue, request.city].filter(Boolean).join(", ") || undefined,
      photographers: request.photographers,
      guestCount: request.guestCount,
      notes: request.notes,
      totalCents: result.price.totalCents,
      depositCents: result.price.depositCents,
      paymentMethod: request.paymentMethod,
      fromQuote: result.quoteReference,
    });
  } catch (error) {
    console.error(`[booking] ${result.reference} saved but emails failed`, error);
  }
  return token;
}
