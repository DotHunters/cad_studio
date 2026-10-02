import "server-only";

import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { createElement } from "react";

import { type Locale, siteConfig } from "@/config/site";
import { formatInStudioTz } from "@/lib/dates";
import { sendEmail } from "@/lib/email/send";
import { BookingRequestEmail } from "@/lib/email/templates/booking-request";
import { formatCAD } from "@/lib/money";
import { signValue } from "@/lib/signing";
import { linkSecret } from "@/server/link-secret";
import { reviewInviteUrl } from "@/server/review-links";

type BookingForEmail = {
  reference: string;
  startAt: Date;
  endAt: Date;
  depositCents: number;
  customer: { name: string; email: string; locale: Locale };
};

const bookingUrl = (reference: string, locale: Locale) =>
  new URL(
    `/${locale}/book/${reference}?t=${signValue(`booking:${reference}`, linkSecret())}`,
    siteConfig.url,
  ).toString();

async function renderAndSend(
  to: string,
  subject: string,
  props: Parameters<typeof BookingRequestEmail>[0],
) {
  const element = createElement(BookingRequestEmail, props);
  const [html, text] = await Promise.all([render(element), render(element, { plainText: true })]);
  return sendEmail({ to, subject, html, text });
}

async function common(booking: BookingForEmail) {
  const locale = booking.customer.locale;
  const [t, tConfirmed] = await Promise.all([
    getTranslations({ locale, namespace: "Email" }),
    getTranslations({ locale, namespace: "BookingConfirmed" }),
  ]);
  const date = formatInStudioTz(booking.startAt, "PPPP", locale);
  const when = `${date} · ${formatInStudioTz(booking.startAt, "p", locale)}–${formatInStudioTz(booking.endAt, "p", locale)}`;
  return {
    locale,
    t,
    tConfirmed,
    date,
    when,
    deposit: formatCAD(booking.depositCents, locale),
    base: {
      lang: locale === "fr" ? "fr-CA" : "en-CA",
      logoUrl: new URL("/brand/logo-gold.png", siteConfig.url).toString(),
      greeting: t("greeting", { name: booking.customer.name }),
      referenceLabel: t("reference"),
      reference: booking.reference,
      footer: t("bookingFooter"),
    },
  };
}

/**
 * Payment request in the client's language (AGENTS.md §6.6): deposit amount, the studio's
 * payment instructions (admin-edited text) and an optional payment link.
 */
export async function sendPaymentRequestEmail(
  booking: BookingForEmail,
  {
    instructions,
    paymentLinkUrl,
    holdHours,
  }: {
    instructions: string;
    paymentLinkUrl: string | null;
    holdHours: number;
  },
) {
  const { t, tConfirmed, date, when, deposit, base, locale } = await common(booking);
  return renderAndSend(
    booking.customer.email,
    t("paymentSubject", { reference: booking.reference }),
    {
      ...base,
      preview: t("paymentPreview", { amount: deposit, date }),
      heading: t("paymentHeading"),
      intro: t("paymentIntro", { hours: holdHours }),
      facts: [
        { label: tConfirmed("when"), value: when },
        { label: tConfirmed("deposit"), value: deposit },
      ],
      details: { title: t("paymentDetailsTitle"), text: instructions },
      cta: paymentLinkUrl
        ? { label: t("paymentLinkCta"), url: paymentLinkUrl }
        : { label: t("bookingCta"), url: bookingUrl(booking.reference, locale) },
    },
  );
}

/** "Your booking is confirmed" once the studio records the deposit. */
export async function sendBookingConfirmedEmail(booking: BookingForEmail, paidCents: number) {
  const { t, tConfirmed, date, when, base, locale } = await common(booking);
  return renderAndSend(
    booking.customer.email,
    t("confirmedSubject", { reference: booking.reference }),
    {
      ...base,
      preview: t("confirmedPreview", { date }),
      heading: t("confirmedHeading"),
      intro: t("confirmedIntro", { amount: formatCAD(paidCents, locale) }),
      facts: [
        { label: tConfirmed("status"), value: t("confirmedStatus") },
        { label: tConfirmed("when"), value: when },
      ],
      cta: { label: t("bookingCta"), url: bookingUrl(booking.reference, locale) },
    },
  );
}

/** Thank-you after the event, with the signed review invitation (AGENTS.md §6.7, 6.3). */
export async function sendBookingCompletedEmail(booking: BookingForEmail) {
  const { t, tConfirmed, when, base, locale } = await common(booking);
  return renderAndSend(
    booking.customer.email,
    t("completedSubject", { reference: booking.reference }),
    {
      ...base,
      preview: t("completedPreview"),
      heading: t("completedHeading"),
      intro: t("completedIntro"),
      facts: [
        { label: tConfirmed("status"), value: t("completedStatus") },
        { label: tConfirmed("when"), value: when },
      ],
      icsNote: t("completedNote"),
      cta: { label: t("completedCta"), url: reviewInviteUrl(booking.reference, locale) },
    },
  );
}

/** Polite notice when the studio cancels a booking. */
export async function sendBookingCancelledEmail(booking: BookingForEmail) {
  const { t, tConfirmed, date, when, base, locale } = await common(booking);
  return renderAndSend(
    booking.customer.email,
    t("cancelledSubject", { reference: booking.reference }),
    {
      ...base,
      preview: t("cancelledPreview", { date }),
      heading: t("cancelledHeading"),
      intro: t("cancelledIntro", { date }),
      facts: [
        { label: tConfirmed("status"), value: t("cancelledStatus") },
        { label: tConfirmed("when"), value: when },
      ],
      cta: {
        label: t("cancelledCta"),
        url: new URL(`/${locale}/book`, siteConfig.url).toString(),
      },
    },
  );
}
