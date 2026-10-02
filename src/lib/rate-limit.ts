/**
 * Rate limits for public forms (AGENTS.md §11). Sliding windows per client IP; generous
 * enough for real people, tight enough to stop scripted spam.
 */
export const RATE_LIMITS = {
  contact: { limit: 5, window: "10 m" },
  quote: { limit: 10, window: "10 m" },
  booking: { limit: 5, window: "10 m" },
  review: { limit: 3, window: "10 m" },
  changeRequest: { limit: 5, window: "10 m" },
  /** Per IP and per email address. */
  signIn: { limit: 5, window: "15 m" },
} as const satisfies Record<string, { limit: number; window: `${number} ${"s" | "m" | "h"}` }>;

export type RateLimitBucket = keyof typeof RATE_LIMITS;

type HeaderReader = { get(name: string): string | null };

/**
 * The client's IP as seen by Vercel (first `x-forwarded-for` entry, else `x-real-ip`), or
 * "unknown" so requests without one share a bucket rather than skipping the limit.
 */
export function clientIp(headers: HeaderReader): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
