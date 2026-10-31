"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import type { Locale } from "@/config/site";
import { verifyTurnstile } from "@/lib/turnstile";
import { type EventEnquiryInput, eventEnquirySchema } from "@/lib/validators/event-enquiry";
import { sendEventEnquiryEmails } from "@/server/emails/event-enquiry-emails";
import { isRateLimited } from "@/server/rate-limit";

export type EventEnquiryResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation";
      fieldErrors: Partial<Record<keyof EventEnquiryInput, string>>;
    }
  | { ok: false; error: "captcha" | "rateLimited" | "server" };

/** "Events by CAD" enquiry. Always re-validated on the server; nothing is stored. */
export async function submitEventEnquiry(
  input: EventEnquiryInput,
  turnstileToken?: string,
): Promise<EventEnquiryResult> {
  const parsed = eventEnquirySchema.safeParse(input);
  if (!parsed.success) {
    // Bots that fill the honeypot get a fake success so they learn nothing.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) return { ok: true };
    const fieldErrors: Partial<Record<keyof EventEnquiryInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof EventEnquiryInput;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  if (await isRateLimited("eventEnquiry")) return { ok: false, error: "rateLimited" };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return { ok: false, error: "captcha" };
  }

  try {
    const locale: Locale = (await getLocale()) === "fr" ? "fr" : "en";
    await sendEventEnquiryEmails(parsed.data, locale);
    return { ok: true };
  } catch (error) {
    console.error("[events] failed to send enquiry", error);
    return { ok: false, error: "server" };
  }
}
