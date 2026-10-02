import { describe, expect, it } from "vitest";

import { moderationUpdate } from "@/lib/admin/moderation";

const pending = { status: "PENDING", type: "CUSTOMER", featured: false };
const approved = { status: "APPROVED", type: "CUSTOMER", featured: true };

describe("moderationUpdate", () => {
  it("approves, rejects and returns to pending", () => {
    expect(moderationUpdate("approve", pending)).toEqual({
      ok: true,
      data: { status: "APPROVED" },
    });
    expect(moderationUpdate("reject", approved)).toEqual({
      ok: true,
      data: { status: "REJECTED", featured: false },
    });
    expect(moderationUpdate("pending", approved)).toEqual({
      ok: true,
      data: { status: "PENDING", featured: false },
    });
  });

  it("only features approved reviews", () => {
    expect(moderationUpdate("feature", pending)).toEqual({
      ok: false,
      reason: "Approve the review before featuring it.",
    });
    expect(moderationUpdate("feature", approved)).toEqual({ ok: true, data: { featured: true } });
    expect(moderationUpdate("unfeature", approved)).toEqual({
      ok: true,
      data: { featured: false },
    });
  });

  it("allows logos only on recommendations", () => {
    expect(moderationUpdate("allow-logo", pending)).toMatchObject({ ok: false });
    expect(moderationUpdate("allow-logo", { ...pending, type: "RECOMMENDATION" })).toEqual({
      ok: true,
      data: { logoPermission: true },
    });
    expect(moderationUpdate("revoke-logo", pending)).toEqual({
      ok: true,
      data: { logoPermission: false },
    });
  });
});
