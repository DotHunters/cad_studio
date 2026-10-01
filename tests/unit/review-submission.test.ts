import { describe, expect, it } from "vitest";

import {
  flagForModeration,
  reviewFieldErrors,
  reviewSubmissionSchema,
} from "@/lib/validators/review";

const base = {
  authorName: "Alex Martin",
  rating: "5",
  category: "wedding",
  body: "Calm, organized and the photos are stunning. Highly recommend!",
  consentToPublish: true,
  website: "",
};

const errors = (input: unknown) => {
  const result = reviewSubmissionSchema.safeParse(input);
  return result.success
    ? {}
    : Object.fromEntries(result.error.issues.map((issue) => [issue.path.join("."), issue.message]));
};

describe("reviewSubmissionSchema", () => {
  it("accepts a customer review and coerces the rating", () => {
    expect(reviewSubmissionSchema.parse(base)).toMatchObject({
      type: "CUSTOMER",
      rating: 5,
      category: "wedding",
    });
  });

  it("requires a 1–5 rating for customer reviews", () => {
    expect(errors({ ...base, rating: "" })).toEqual({ rating: "ratingRequired" });
    expect(errors({ ...base, rating: "6" })).toEqual({ rating: "ratingRequired" });
  });

  it("requires a company for recommendations, but no rating", () => {
    expect(errors({ ...base, type: "RECOMMENDATION", rating: "" })).toEqual({
      company: "required",
    });
    expect(
      reviewSubmissionSchema.safeParse({
        ...base,
        type: "RECOMMENDATION",
        rating: "",
        company: "Northwind",
        authorTitle: "Events Director",
      }).success,
    ).toBe(true);
  });

  it("requires consent to publish and a meaningful review", () => {
    expect(errors({ ...base, consentToPublish: false })).toEqual({
      consentToPublish: "consentRequired",
    });
    expect(errors({ ...base, body: "Great!" })).toEqual({ body: "bodyTooShort" });
  });

  it("treats an empty category as none", () => {
    expect(reviewSubmissionSchema.parse({ ...base, category: "" }).category).toBeUndefined();
  });

  it("rejects honeypot submissions", () => {
    expect(errors({ ...base, website: "spam" })).toEqual({ website: "spam" });
  });
});

describe("flagForModeration", () => {
  it("passes normal reviews in English and French", () => {
    expect(flagForModeration(base.body)).toBe(false);
    expect(flagForModeration("Une équipe calme et organisée, des photos magnifiques.")).toBe(false);
  });

  it.each([
    ["links", "Great service, check out https://spam.example for deals"],
    ["www links", "Visit www.example.com now"],
    ["shouting", "THIS WAS THE WORST EXPERIENCE OF MY LIFE"],
    ["repeated characters", "Amazing!!!!!!!!!!! so good"],
    ["English profanity", "The photos were shit honestly"],
    ["French profanity", "Quel service de merde vraiment"],
  ])("flags %s", (_, text) => {
    expect(flagForModeration(text)).toBe(true);
  });

  it("doesn't flag words that merely contain a blocked word", () => {
    expect(flagForModeration("We met at the Scunthorpe hotel, lovely shoot")).toBe(false);
  });
});

describe("reviewFieldErrors", () => {
  it("reports the rating together with other errors in one pass", () => {
    expect(
      reviewFieldErrors({ ...base, rating: "", body: "short", consentToPublish: false }),
    ).toEqual({
      rating: "ratingRequired",
      body: "bodyTooShort",
      consentToPublish: "consentRequired",
    });
  });

  it("reports a missing company for recommendations alongside other errors", () => {
    expect(
      reviewFieldErrors({ ...base, type: "RECOMMENDATION", rating: "", body: "short" }),
    ).toMatchObject({ company: "required", body: "bodyTooShort" });
  });

  it("is null for valid input", () => {
    expect(reviewFieldErrors(base)).toBeNull();
  });
});
