import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { BookingRequestEmail } from "@/lib/email/templates/booking-request";

const props = {
  lang: "en-CA",
  logoUrl: "https://cadstudio.example/brand/logo-gold.png",
  preview: "Your date is held",
  heading: "Your booking request is in",
  greeting: "Hi Alex,",
  intro: "Thank you for choosing CAD Studio Photography.",
  referenceLabel: "Reference",
  reference: "CAD-B-2026-0001",
  facts: [
    { label: "Status", value: "Pending — awaiting deposit" },
    { label: "Deposit", value: "$949.20 CAD" },
  ],
  nextTitle: "What happens next",
  nextSteps: ["We'll email you the bank transfer details.", "We'll confirm once received."],
  icsNote: "A calendar invitation is attached.",
  cta: { label: "View your booking", url: "https://cadstudio.example/en/book/CAD-B-2026-0001?t=x" },
  footer: "CAD Studio Photography · Toronto",
};

describe("BookingRequestEmail", () => {
  it("renders the reference, status, deposit, next steps and booking link", async () => {
    const html = await render(createElement(BookingRequestEmail, props));
    expect(html).toContain("CAD-B-2026-0001");
    expect(html).toContain("Pending — awaiting deposit");
    expect(html).toContain("$949.20 CAD");
    expect(html).toContain("bank transfer details");
    expect(html).toContain('href="https://cadstudio.example/en/book/CAD-B-2026-0001?t=x"');
  });

  it("has a plain-text version", async () => {
    const text = await render(createElement(BookingRequestEmail, props), { plainText: true });
    expect(text).toContain("CAD-B-2026-0001");
    expect(text).toContain("A calendar invitation is attached.");
  });
});
