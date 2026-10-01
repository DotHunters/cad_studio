import "server-only";

import { Resend } from "resend";

import { siteConfig } from "@/config/site";

export type EmailMessage = {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
};

export type SendResult = { sent: true; id: string } | { sent: false; reason: "not-configured" };

/**
 * Sends an email through Resend (AGENTS.md §2). Without RESEND_API_KEY the message is
 * skipped in development and test (logged as a warning) but throws in production, so a
 * misconfigured deployment can't silently drop enquiries.
 */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error("RESEND_API_KEY is not set");
    }
    console.warn(`[email] RESEND_API_KEY not set — skipped "${message.subject}"`);
    return { sent: false, reason: "not-configured" };
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? `${siteConfig.name} <${siteConfig.contact.bookingsEmail}>`,
    to: message.to,
    subject: message.subject,
    text: message.text,
    replyTo: message.replyTo,
  });
  if (error || !data) {
    throw new Error(`Resend failed: ${error?.message ?? "no response"}`);
  }
  return { sent: true, id: data.id };
}

export function adminNotifyAddress(): string {
  return process.env.ADMIN_NOTIFY_EMAIL || siteConfig.contact.email;
}
