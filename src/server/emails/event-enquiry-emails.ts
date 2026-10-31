import "server-only";

import { render } from "@react-email/render";
import { getTranslations } from "next-intl/server";
import { createElement } from "react";

import { type Locale, siteConfig } from "@/config/site";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { EventEnquiryReceivedEmail } from "@/lib/email/templates/event-enquiry-received";
import type { EventEnquiryData } from "@/lib/validators/event-enquiry";

/**
 * "Events by CAD" enquiry emails. The studio notification must go out (throws otherwise);
 * the client's copy is best effort so a bad client address doesn't fail the enquiry.
 */
export async function sendEventEnquiryEmails(data: EventEnquiryData, locale: Locale) {
  // Studio-facing: English labels, raw option keys (the studio reads English).
  await sendEmail({
    to: adminNotifyAddress(),
    replyTo: data.email,
    subject: `[${siteConfig.name}] New event enquiry from ${data.name.replace(/[\r\n\t\u0000-\u001f]+/g, " ")}`,
    text: [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Phone: ${data.phone ?? "—"}`,
      `Event type: ${data.eventType}`,
      `Date: ${data.eventDate ?? "—"}`,
      `Guests: ${data.guestCount ?? "—"}`,
      `City: ${data.city}`,
      `Services: ${data.services.join(", ")}`,
      `Budget: ${data.budget ?? "—"}`,
      `Language: ${locale}`,
      "",
      data.message,
    ].join("\n"),
  });

  try {
    const [t, tForm] = await Promise.all([
      getTranslations({ locale, namespace: "Events.email" }),
      getTranslations({ locale, namespace: "Events.form" }),
    ]);
    const element = createElement(EventEnquiryReceivedEmail, {
      lang: locale === "fr" ? "fr-CA" : "en-CA",
      logoUrl: new URL("/brand/logo-gold.png", siteConfig.url).toString(),
      preview: t("preview"),
      heading: t("heading"),
      greeting: t("greeting", { name: data.name }),
      intro: t("intro"),
      facts: [
        { label: t("eventTypeLabel"), value: tForm(`eventTypes.${data.eventType}`) },
        { label: t("dateLabel"), value: data.eventDate ?? t("dateNotSet") },
        { label: t("cityLabel"), value: data.city },
        {
          label: t("servicesLabel"),
          value: data.services.map((service) => tForm(`serviceOptions.${service}`)).join(", "),
        },
      ],
      message: data.message,
      footer: t("footer"),
    });
    await sendEmail({
      to: data.email,
      replyTo: siteConfig.contact.email,
      subject: t("subject"),
      html: await render(element),
      text: await render(element, { plainText: true }),
    });
  } catch (error) {
    console.error("[events] failed to send client confirmation", error);
  }
}
