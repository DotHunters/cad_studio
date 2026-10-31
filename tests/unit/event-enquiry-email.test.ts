import { render } from "@react-email/render";
import { createElement } from "react";
import { describe, expect, it } from "vitest";

import { EventEnquiryReceivedEmail } from "@/lib/email/templates/event-enquiry-received";

const props = {
  lang: "en-CA",
  logoUrl: "https://cadstudio.example/brand/logo-gold.png",
  preview: "Thanks for telling us about your event",
  heading: "Your enquiry is in",
  greeting: "Hi Alex,",
  intro: "Thank you for contacting Events by CAD.",
  facts: [
    { label: "Event", value: "Corporate event" },
    { label: "Services", value: "Event management, Lights & sound" },
  ],
  message: "Annual gala\nfor 150 guests.",
  footer: "CAD Studio Photography · Toronto",
};

describe("EventEnquiryReceivedEmail", () => {
  it("renders the greeting, facts and the client's message", async () => {
    const html = await render(createElement(EventEnquiryReceivedEmail, props));
    expect(html).toContain("Hi Alex,");
    expect(html).toContain("Corporate event");
    expect(html).toContain("Lights &amp; sound");
    expect(html).toContain("Annual gala");
    expect(html).toContain('lang="en-CA"');
  });

  it("has a plain-text version", async () => {
    const text = await render(createElement(EventEnquiryReceivedEmail, props), {
      plainText: true,
    });
    expect(text).toContain("Event management, Lights & sound");
    expect(text).toContain("for 150 guests.");
  });
});
