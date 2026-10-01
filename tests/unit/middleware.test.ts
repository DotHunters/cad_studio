import { describe, expect, it, vi } from "vitest";

// The middleware module creates the next-intl handler at import time; only `config` is under test.
vi.mock("next-intl/middleware", () => ({ default: () => () => undefined }));

const { config } = await import("@/middleware");

// Next compiles matchers with path-to-regexp; for this pattern a plain anchored RegExp behaves the same.
const matcher = new RegExp(`^${config.matcher[0]}$`);

describe("middleware matcher", () => {
  it.each(["/", "/en", "/fr", "/fr/packages", "/en/packages/wedding", "/fr/portfolio/some-slug"])(
    "localizes %s",
    (path) => {
      expect(matcher.test(path)).toBe(true);
    },
  );

  it.each([
    "/api/availability",
    "/admin",
    "/admin/bookings",
    "/_next/static/x.js",
    "/favicon.ico",
    "/brand/logo-gold.png",
    "/robots.txt",
  ])("skips %s", (path) => {
    expect(matcher.test(path)).toBe(false);
  });
});
