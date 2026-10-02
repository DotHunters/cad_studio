import { describe, expect, it } from "vitest";

import { signExpiring, signValue, verifyExpiring, verifySignedValue } from "@/lib/signing";

const secret = "test-secret-at-least-32-characters-long";

describe("signed links", () => {
  it("produces a stable, URL-safe signature", () => {
    const signature = signValue("quote:CAD-Q-2026-0001", secret);
    expect(signature).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(signValue("quote:CAD-Q-2026-0001", secret)).toBe(signature);
  });

  it("verifies the right value and rejects anything else", () => {
    const signature = signValue("quote:CAD-Q-2026-0001", secret);
    expect(verifySignedValue("quote:CAD-Q-2026-0001", signature, secret)).toBe(true);
    expect(verifySignedValue("quote:CAD-Q-2026-0002", signature, secret)).toBe(false);
    expect(
      verifySignedValue("quote:CAD-Q-2026-0001", signature, "another-secret-of-enough-length-xx"),
    ).toBe(false);
  });

  it("rejects missing, malformed or wrong-length signatures without throwing", () => {
    expect(verifySignedValue("quote:x", undefined, secret)).toBe(false);
    expect(verifySignedValue("quote:x", "", secret)).toBe(false);
    expect(verifySignedValue("quote:x", "short", secret)).toBe(false);
    expect(verifySignedValue("quote:x", "!".repeat(32), secret)).toBe(false);
  });

  it("refuses weak secrets", () => {
    expect(() => signValue("x", "short")).toThrow(/secret/);
  });
});

describe("expiring signed links", () => {
  const now = new Date("2026-10-02T12:00:00Z");
  const later = new Date("2026-12-31T00:00:00Z");

  it("verifies before the expiry and not after", () => {
    const { exp, signature } = signExpiring("review:CAD-B-2026-0001", later, secret);
    expect(verifyExpiring("review:CAD-B-2026-0001", exp, signature, secret, now)).toBe(true);
    expect(verifyExpiring("review:CAD-B-2026-0001", String(exp), signature, secret, now)).toBe(
      true,
    );
    expect(
      verifyExpiring(
        "review:CAD-B-2026-0001",
        exp,
        signature,
        secret,
        new Date("2027-01-01T00:00:00Z"),
      ),
    ).toBe(false);
  });

  it("rejects a changed expiry, value or malformed expiry", () => {
    const { exp, signature } = signExpiring("review:CAD-B-2026-0001", later, secret);
    expect(verifyExpiring("review:CAD-B-2026-0001", exp + 86400, signature, secret, now)).toBe(
      false,
    );
    expect(verifyExpiring("review:CAD-B-2026-0002", exp, signature, secret, now)).toBe(false);
    expect(verifyExpiring("review:CAD-B-2026-0001", "soon", signature, secret, now)).toBe(false);
    expect(verifyExpiring("review:CAD-B-2026-0001", undefined, signature, secret, now)).toBe(false);
  });
});
