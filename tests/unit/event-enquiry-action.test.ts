import { beforeEach, describe, expect, it, vi } from "vitest";

const isRateLimited = vi.fn();
const verifyTurnstile = vi.fn();
const sendEventEnquiryEmails = vi.fn();

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }),
}));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr" }));
vi.mock("@/server/rate-limit", () => ({ isRateLimited: (...a: unknown[]) => isRateLimited(...a) }));
vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: (...a: unknown[]) => verifyTurnstile(...a),
}));
vi.mock("@/server/emails/event-enquiry-emails", () => ({
  sendEventEnquiryEmails: (...a: unknown[]) => sendEventEnquiryEmails(...a),
}));

const { submitEventEnquiry } = await import("@/server/actions/event-enquiry");

const valid = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: "",
  eventType: "corporate" as const,
  eventDate: "",
  guestCount: "",
  city: "Toronto",
  services: ["management" as const],
  budget: "" as const,
  message: "Annual gala for our team.",
  website: "",
};

describe("submitEventEnquiry", () => {
  beforeEach(() => {
    isRateLimited.mockReset().mockResolvedValue(false);
    verifyTurnstile.mockReset().mockResolvedValue(true);
    sendEventEnquiryEmails.mockReset().mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("sends the emails in the visitor's locale", async () => {
    expect(await submitEventEnquiry(valid, "token")).toEqual({ ok: true });
    expect(verifyTurnstile).toHaveBeenCalledWith("token", "203.0.113.7");
    expect(isRateLimited).toHaveBeenCalledWith("eventEnquiry");
    const [data, locale] = sendEventEnquiryEmails.mock.calls[0];
    expect(locale).toBe("fr");
    expect(data).toMatchObject({ name: "Alex Martin", services: ["management"] });
  });

  it("fakes success for bots that fill the honeypot", async () => {
    expect(await submitEventEnquiry({ ...valid, website: "http://spam" })).toEqual({ ok: true });
    expect(sendEventEnquiryEmails).not.toHaveBeenCalled();
  });

  it("returns field errors as translation keys", async () => {
    expect(await submitEventEnquiry({ ...valid, services: [], city: "" })).toEqual({
      ok: false,
      error: "validation",
      fieldErrors: { services: "chooseService", city: "required" },
    });
  });

  it("refuses when rate limited", async () => {
    isRateLimited.mockResolvedValue(true);
    expect(await submitEventEnquiry(valid)).toEqual({ ok: false, error: "rateLimited" });
    expect(sendEventEnquiryEmails).not.toHaveBeenCalled();
  });

  it("refuses when Turnstile fails", async () => {
    verifyTurnstile.mockResolvedValue(false);
    expect(await submitEventEnquiry(valid)).toEqual({ ok: false, error: "captcha" });
  });

  it("returns a server error when the studio email fails", async () => {
    sendEventEnquiryEmails.mockRejectedValue(new Error("Resend down"));
    expect(await submitEventEnquiry(valid)).toEqual({ ok: false, error: "server" });
  });
});
