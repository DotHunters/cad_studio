import { z } from "zod";

import { categorySlugs } from "@/lib/categories";

/**
 * Public review submission (AGENTS.md §6.7, §8.4). Every submission is stored as PENDING
 * for moderation; `flagForModeration` only marks likely spam for closer review.
 */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, "tooLong")
    .optional()
    .transform((value) => (value ? value : undefined));

export const reviewSubmissionSchema = z
  .object({
    type: z.enum(["CUSTOMER", "RECOMMENDATION"]).default("CUSTOMER"),
    authorName: z.string().trim().min(1, "required").max(80, "tooLong"),
    authorTitle: optionalText(80),
    company: optionalText(120),
    rating: z.preprocess(
      (value) =>
        value === "" || value === null || value === undefined ? undefined : Number(value),
      z.number().int().min(1, "ratingRequired").max(5, "ratingRequired").optional(),
    ),
    category: z
      .enum(categorySlugs)
      .optional()
      .or(z.literal("").transform(() => undefined)),
    body: z.string().trim().min(20, "bodyTooShort").max(2000, "tooLong"),
    consentToPublish: z.literal(true, "consentRequired"),
    // Optional signed booking link (6.3) marks the review as verified.
    bookingReference: optionalText(40),
    bookingToken: optionalText(64),
    website: z.string().max(0, "spam").optional(),
  })
  .superRefine((review, ctx) => {
    if (review.type === "CUSTOMER" && review.rating === undefined) {
      ctx.addIssue({ code: "custom", path: ["rating"], message: "ratingRequired" });
    }
    if (review.type === "RECOMMENDATION" && !review.company) {
      ctx.addIssue({ code: "custom", path: ["company"], message: "required" });
    }
  });

/**
 * All field errors at once. Zod skips `superRefine` when base fields already fail, so the
 * type-dependent checks (rating for reviews, company for recommendations) are re-applied
 * here — otherwise people would only learn about them on a second submit.
 */
export function reviewFieldErrors(input: unknown): Record<string, string> | null {
  const result = reviewSubmissionSchema.safeParse(input);
  if (result.success) return null;
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) errors[issue.path.join(".")] ??= issue.message;
  const raw = (input ?? {}) as Record<string, unknown>;
  const isRecommendation = raw.type === "RECOMMENDATION";
  const rating = Number(raw.rating);
  if (!isRecommendation && !(Number.isInteger(rating) && rating >= 1 && rating <= 5)) {
    errors.rating ??= "ratingRequired";
  }
  if (isRecommendation && !String(raw.company ?? "").trim()) errors.company ??= "required";
  return errors;
}

export type ReviewSubmissionInput = z.input<typeof reviewSubmissionSchema>;
export type ReviewSubmission = z.output<typeof reviewSubmissionSchema>;

// Small EN/FR list; the admin still reads every review before publishing.
const BLOCKED_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "cunt",
  "merde",
  "putain",
  "salope",
  "connard",
  "enculé",
];

/** Heuristic spam/profanity flag (AGENTS.md §8.4). Flagged reviews stay PENDING. */
export function flagForModeration(text: string): boolean {
  const lower = text.toLocaleLowerCase();
  const links = (lower.match(/https?:\/\/|www\./g) ?? []).length;
  const letters = text.replace(/[^\p{L}]/gu, "");
  const shouting = letters.length >= 20 && letters === letters.toLocaleUpperCase();
  const repeated = /(.)\1{6,}/u.test(text);
  const profane = BLOCKED_WORDS.some((word) =>
    new RegExp(`(^|[^\\p{L}])${word}([^\\p{L}]|$)`, "u").test(lower),
  );
  return links > 0 || shouting || repeated || profane;
}
