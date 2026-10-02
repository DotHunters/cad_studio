import { describe, expect, it } from "vitest";

import { signValue, verifySignedValue } from "@/lib/signing";

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
