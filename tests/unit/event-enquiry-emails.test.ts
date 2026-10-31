import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.fn();
vi.mock("@/lib/email/send", () => ({
  sendEmail: (...args: unknown[]) => sendEmail(...args),
  adminNotifyAddress: () => "studio@cadstudio.example",
}));
// Echo translation keys (with values) so assertions don't depend on copy.
vi.mock("next-intl/server", () => ({
  getTranslations:
    async ({ namespace }: { namespace: string }) =>
    (key: string, values?: Record<string, string>) =>
      `${namespace}.${key}${values ? JSON.stringify(values) : ""}`,
}));

const { sendEventEnquiryEmails } = await import("@/server/emails/event-enquiry-emails");

const data = {
  name: "Alex Martin",
  email: "alex@example.com",
  phone: undefined,
  eventType: "corporate" as const,
  eventDate: "2026-12-05",
  guestCount: 150,
  city: "Toronto",
  services: ["management" as const, "av" as const],
  budget: "10to25k" as const,
  message: "Annual gala for our team.",
  website: undefined,
};

describe("sendEventEnquiryEmails", () => {
  beforeEach(() => {
    sendEmail.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("notifies the studio with every field, replying to the client", async () => {
    sendEmail.mockResolvedValue({ sent: true, id: "x" });
    await sendEventEnquiryEmails(data, "en");
    const admin = sendEmail.mock.calls[0][0];
    expect(admin.to).toBe("studio@cadstudio.example");
    expect(admin.replyTo).toBe("alex@example.com");
    expect(admin.subject).toBe("[CAD Studio Photography] New event enquiry from Alex Martin");
    for (const part of [
      "Event type: corporate",
      "Date: 2026-12-05",
      "Guests: 150",
      "City: Toronto",
      "Services: management, av",
      "Budget: 10to25k",
      "Phone: —",
      "Annual gala for our team.",
    ]) {
      expect(admin.text).toContain(part);
    }
  });

  it("sends the client a confirmation in their locale", async () => {
    sendEmail.mockResolvedValue({ sent: true, id: "x" });
    await sendEventEnquiryEmails(data, "fr");
    const client = sendEmail.mock.calls[1][0];
    expect(client.to).toBe("alex@example.com");
    expect(client.subject).toBe("Events.email.subject");
    expect(client.html).toContain('lang="fr-CA"');
    expect(client.text).toContain("Events.form.serviceOptions.management");
  });

  it("throws when the studio notification fails", async () => {
    sendEmail.mockRejectedValueOnce(new Error("Resend down"));
    await expect(sendEventEnquiryEmails(data, "en")).rejects.toThrow("Resend down");
    expect(sendEmail).toHaveBeenCalledTimes(1);
  });

  it("still succeeds when only the client confirmation fails", async () => {
    sendEmail
      .mockResolvedValueOnce({ sent: true, id: "x" })
      .mockRejectedValueOnce(new Error("bad address"));
    await expect(sendEventEnquiryEmails(data, "en")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
