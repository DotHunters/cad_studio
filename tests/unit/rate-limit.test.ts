import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { clientIp, RATE_LIMITS } from "@/lib/rate-limit";

const headersOf = (values: Record<string, string>) => ({
  get: (name: string) => values[name] ?? null,
});

describe("clientIp", () => {
  it("uses the first forwarded address", () => {
    expect(clientIp(headersOf({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then a shared bucket", () => {
    expect(clientIp(headersOf({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientIp(headersOf({}))).toBe("unknown");
  });
});

describe("RATE_LIMITS", () => {
  it("covers every public form", () => {
    expect(Object.keys(RATE_LIMITS).sort()).toEqual(
      ["booking", "changeRequest", "contact", "quote", "review", "signIn"].sort(),
    );
  });
});

// The Upstash client is mocked: these tests check the wiring, not Redis.
const { limit } = vi.hoisted(() => ({ limit: vi.fn() }));
vi.mock("@upstash/ratelimit", () => ({
  Ratelimit: class {
    static slidingWindow = () => "sliding";
    limit = limit;
  },
}));
vi.mock("@upstash/redis", () => ({ Redis: class {} }));
vi.mock("next/headers", () => ({
  headers: async () => headersOf({ "x-forwarded-for": "203.0.113.7" }),
}));

describe("isRateLimited", () => {
  beforeEach(() => {
    vi.resetModules();
    limit.mockReset();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("allows everything when Upstash isn't configured", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    const { isRateLimited } = await import("@/server/rate-limit");
    expect(await isRateLimited("contact")).toBe(false);
    expect(limit).not.toHaveBeenCalled();
  });

  it("limits by client IP, or by a given key", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const { isRateLimited } = await import("@/server/rate-limit");
    limit.mockResolvedValueOnce({ success: true }).mockResolvedValueOnce({ success: false });
    expect(await isRateLimited("quote")).toBe(false);
    expect(await isRateLimited("signIn", "email:a@example.com")).toBe(true);
    expect(limit.mock.calls).toEqual([["203.0.113.7"], ["email:a@example.com"]]);
  });

  it("fails open when Upstash errors", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
    const { isRateLimited } = await import("@/server/rate-limit");
    limit.mockRejectedValueOnce(new Error("network"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await isRateLimited("review")).toBe(false);
  });
});
