"use server";

import { headers } from "next/headers";

import { siteConfig } from "@/config/site";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { verifyTurnstile } from "@/lib/turnstile";
import { contactSchema, otherEnquiryTypes, type ContactInput } from "@/lib/validators/contact";
import { isRateLimited } from "@/server/rate-limit";
import { getServiceNames, isActiveServiceSlug } from "@/server/queries/services";

export type ContactResult =
  | { ok: true }
  | { ok: false; error: "validation"; fieldErrors: Partial<Record<keyof ContactInput, string>> }
  | { ok: false; error: "captcha" | "rateLimited" | "server" };

/** Contact form submission (AGENTS.md §6.9, §11). Always re-validated on the server. */
export async function submitContact(
  input: ContactInput,
  turnstileToken?: string,
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    // Bots that fill the honeypot get a fake success so they learn nothing.
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) return { ok: true };
    const fieldErrors: Partial<Record<keyof ContactInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ContactInput;
      fieldErrors[field] ??= issue.message;
    }
    return { ok: false, error: "validation", fieldErrors };
  }

  if (await isRateLimited("contact")) return { ok: false, error: "rateLimited" };
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return { ok: false, error: "captcha" };
  }

  const data = parsed.data;
  const isOther = (otherEnquiryTypes as readonly string[]).includes(data.enquiryType);
  if (!isOther && !(await isActiveServiceSlug(data.enquiryType))) {
    return { ok: false, error: "validation", fieldErrors: { enquiryType: "required" } };
  }
  try {
    const enquiryType = isOther
      ? data.enquiryType
      : (await getServiceNames("en"))(data.enquiryType);
    await sendEmail({
      to: adminNotifyAddress(),
      replyTo: data.email,
      subject: `[${siteConfig.name}] New ${enquiryType} enquiry from ${data.name}`,
      text: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone ?? "—"}`,
        `Enquiry type: ${enquiryType}`,
        "",
        data.message,
      ].join("\n"),
    });
    return { ok: true };
  } catch (error) {
    console.error("[contact] failed to send enquiry", error);
    return { ok: false, error: "server" };
  }
}
