"use server";

import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { adminNotifyAddress, sendEmail } from "@/lib/email/send";
import { verifyTurnstile } from "@/lib/turnstile";
import {
  flagForModeration,
  reviewFieldErrors,
  reviewSubmissionSchema,
} from "@/lib/validators/review";
import { getVerifiedBooking } from "@/server/review-links";

export type SubmitReviewResult =
  | { ok: true }
  | { ok: false; error: "validation"; fieldErrors: Record<string, string> }
  | { ok: false; error: "captcha" | "server" };

/**
 * Public review submission (AGENTS.md §6.7, §8.4): always stored as PENDING — never
 * auto-published. Likely spam/profanity is flagged for the moderator.
 */
export async function submitReview(
  /** Untrusted form data; validated below. */
  input: unknown,
  turnstileToken?: string,
): Promise<SubmitReviewResult> {
  const parsed = reviewSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    if (parsed.error.issues.some((issue) => issue.path[0] === "website")) return { ok: true };
    return { ok: false, error: "validation", fieldErrors: reviewFieldErrors(input) ?? {} };
  }
  const review = parsed.data;

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!(await verifyTurnstile(turnstileToken, ip))) return { ok: false, error: "captcha" };

  try {
    // A valid link from a completed booking makes this a verified review.
    const verifiedBooking = await getVerifiedBooking(
      review.bookingReference,
      review.bookingExp,
      review.bookingToken,
    );
    const flagged = flagForModeration(
      [review.authorName, review.authorTitle, review.company, review.body]
        .filter(Boolean)
        .join(" "),
    );
    await db.review.create({
      data: {
        type: review.type,
        authorName: review.authorName,
        authorTitle: review.type === "RECOMMENDATION" ? review.authorTitle : null,
        company: review.type === "RECOMMENDATION" ? review.company : null,
        rating: review.type === "CUSTOMER" ? review.rating : null,
        category: (verifiedBooking?.categorySlug ?? review.category)?.toUpperCase() as never,
        body: review.body,
        locale: (await getLocale()) === "fr" ? "fr" : "en",
        status: "PENDING",
        verified: verifiedBooking !== null,
        bookingId: verifiedBooking?.bookingId ?? null,
        flagged,
        consentToPublish: true,
      },
    });
    try {
      await sendEmail({
        to: adminNotifyAddress(),
        subject: `[${siteConfig.name}] New ${review.type === "CUSTOMER" ? `${review.rating}★ review` : "recommendation"} to moderate${flagged ? " (flagged)" : ""}`,
        text: [
          `From: ${review.authorName}${review.company ? ` · ${review.authorTitle ?? ""} ${review.company}` : ""}`,
          review.category ? `Service: ${review.category}` : "",
          verifiedBooking ? `Verified client — booking ${verifiedBooking.reference}` : "",
          flagged ? "Flagged by the automatic spam/profanity check — please read carefully." : "",
          "",
          review.body,
          "",
          "It stays hidden until you approve it in admin.",
        ]
          .filter((line) => line !== "")
          .join("\n"),
      });
    } catch (error) {
      console.error("[review] saved but notification failed", error);
    }
    return { ok: true };
  } catch (error) {
    console.error("[review] failed", error);
    return { ok: false, error: "server" };
  }
}
