import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import {
  QuoteSummaryEmail,
  type QuoteSummaryEmailProps,
} from "@/lib/email/templates/quote-summary";

const props: QuoteSummaryEmailProps = {
  lang: "en-CA",
  logoUrl: "https://cadstudio.example/brand/logo-gold.png",
  preview: "Your estimate",
  heading: "Your quote is ready",
  greeting: "Hi Alex,",
  intro: "Thank you.",
  referenceLabel: "Reference",
  reference: "CAD-Q-2026-0001",
  eventLine: "Weddings · June 12, 2027 at 2:00 PM · 8 h",
  rows: [{ label: "Wedding package", amount: "$2,800.00 CAD" }],
  subtotal: { label: "Subtotal", amount: "$2,800.00 CAD" },
  taxRows: [{ label: "HST (13%)", amount: "$364.00 CAD" }],
  total: { label: "Estimated total", amount: "$3,164.00 CAD" },
  depositLine: "Deposit to confirm (30%): $949.20 CAD",
  expiresLine: "This quote is valid until October 15, 2026.",
  disclaimer: "Estimate only. Final price confirmed by CAD Studio Photography.",
  cta: { label: "Book this date", url: "https://cadstudio.example/en/quote/CAD-Q-2026-0001" },
  footer: "CAD Studio Photography · Toronto",
};

describe("QuoteSummaryEmail", () => {
  it("renders the reference, breakdown, total and booking link", async () => {
    const html = await render(createElement(QuoteSummaryEmail, props));
    expect(html).toContain('lang="en-CA"');
    expect(html).toContain("CAD-Q-2026-0001");
    expect(html).toContain("HST (13%)");
    expect(html).toContain("$3,164.00 CAD");
    expect(html).toContain('href="https://cadstudio.example/en/quote/CAD-Q-2026-0001"');
    expect(html).toContain("Estimate only. Final price confirmed by CAD Studio Photography.");
  });

  it("has a plain-text version", async () => {
    const text = await render(createElement(QuoteSummaryEmail, props), { plainText: true });
    expect(text).toContain("CAD-Q-2026-0001");
    expect(text).toContain("$3,164.00 CAD");
  });

  it("shows the custom travel note only when present", async () => {
    const without = await render(createElement(QuoteSummaryEmail, props));
    const withNote = await render(
      createElement(QuoteSummaryEmail, { ...props, customTravel: "Travel quoted separately." }),
    );
    expect(without).not.toContain("Travel quoted separately.");
    expect(withNote).toContain("Travel quoted separately.");
  });
});
