import { describe, expect, it } from "vitest";

import {
  shouldShowLegalDraftNotice,
  shouldShowPricingBanner,
  shouldShowSampleContent,
} from "@/lib/flags";

describe("shouldShowPricingBanner", () => {
  it("shows while pricing is unconfirmed", () => {
    expect(shouldShowPricingBanner({})).toBe(true);
    expect(shouldShowPricingBanner({ PRICING_CONFIRMED: "false" })).toBe(true);
  });

  it("hides once the owner confirms pricing", () => {
    expect(shouldShowPricingBanner({ PRICING_CONFIRMED: "true" })).toBe(false);
  });

  it("never shows in Vercel production", () => {
    expect(shouldShowPricingBanner({ VERCEL_ENV: "production" })).toBe(false);
  });

  it("still shows on Vercel previews", () => {
    expect(shouldShowPricingBanner({ VERCEL_ENV: "preview" })).toBe(true);
  });
});

describe("shouldShowSampleContent", () => {
  it("is off unless explicitly enabled", () => {
    expect(shouldShowSampleContent({})).toBe(false);
    expect(shouldShowSampleContent({ SHOW_SAMPLE_CONTENT: "false" })).toBe(false);
  });

  it("is on when enabled outside production", () => {
    expect(shouldShowSampleContent({ SHOW_SAMPLE_CONTENT: "true" })).toBe(true);
  });

  it("is always off in Vercel production, even if enabled", () => {
    expect(shouldShowSampleContent({ SHOW_SAMPLE_CONTENT: "true", VERCEL_ENV: "production" })).toBe(
      false,
    );
  });
});

describe("shouldShowLegalDraftNotice", () => {
  it("shows until legal review is confirmed", () => {
    expect(shouldShowLegalDraftNotice({})).toBe(true);
    expect(shouldShowLegalDraftNotice({ LEGAL_REVIEWED: "true" })).toBe(false);
  });
});
