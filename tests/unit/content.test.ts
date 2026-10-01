import { describe, expect, it } from "vitest";

import { parseFaqs, parseLocalizedText, publishableText } from "@/lib/content";

describe("parseLocalizedText", () => {
  it("reads { en, fr }", () => {
    expect(parseLocalizedText({ en: "Hi", fr: "Salut" })).toEqual({ en: "Hi", fr: "Salut" });
  });

  it("returns null for missing or malformed values", () => {
    expect(parseLocalizedText(null)).toBeNull();
    expect(parseLocalizedText("text")).toBeNull();
    expect(parseLocalizedText({ en: "Hi" })).toBeNull();
    expect(parseLocalizedText({ en: 1, fr: 2 })).toBeNull();
  });
});

describe("parseFaqs", () => {
  it("keeps valid entries with optional French", () => {
    const faqs = [
      { q: "Do you travel?", a: "Yes.", qFr: "Vous déplacez-vous?", aFr: "Oui." },
      { q: "Q2", a: "A2" },
    ];
    expect(parseFaqs(faqs)).toEqual(faqs);
  });

  it("skips invalid entries and non-arrays", () => {
    expect(parseFaqs([{ q: "No answer" }, null, "x", { q: "Q", a: "A" }])).toEqual([
      { q: "Q", a: "A" },
    ]);
    expect(parseFaqs({})).toEqual([]);
    expect(parseFaqs(undefined)).toEqual([]);
  });
});

describe("publishableText", () => {
  it("passes real text through, trimmed", () => {
    expect(publishableText("  Full refund up to 30 days before.  ")).toBe(
      "Full refund up to 30 days before.",
    );
  });

  it("hides empty values and owner placeholders", () => {
    expect(publishableText("TODO(owner): cancellation policy.")).toBeNull();
    expect(publishableText("   ")).toBeNull();
    expect(publishableText(null)).toBeNull();
    expect(publishableText(undefined)).toBeNull();
  });
});
