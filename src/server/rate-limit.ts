import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

import { clientIp, RATE_LIMITS, type RateLimitBucket } from "@/lib/rate-limit";

let limiters: Map<RateLimitBucket, Ratelimit> | null | undefined;
let warned = false;

function getLimiter(bucket: RateLimitBucket): Ratelimit | null {
  if (limiters === undefined) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    limiters =
      url && token
        ? new Map(
            (Object.keys(RATE_LIMITS) as RateLimitBucket[]).map((name) => [
              name,
              new Ratelimit({
                redis: new Redis({ url, token }),
                limiter: Ratelimit.slidingWindow(RATE_LIMITS[name].limit, RATE_LIMITS[name].window),
                prefix: `cad-studio:rl:${name}`,
              }),
            ]),
          )
        : null;
  }
  return limiters?.get(bucket) ?? null;
}

/**
 * True when this request should be refused (AGENTS.md §11). Without Upstash configured
 * (development, tests) nothing is limited; in production that's logged once. If Upstash is
 * unreachable the request is allowed — Turnstile and the honeypot still apply.
 */
export async function isRateLimited(bucket: RateLimitBucket, key?: string): Promise<boolean> {
  const limiter = getLimiter(bucket);
  if (!limiter) {
    if (process.env.VERCEL_ENV === "production" && !warned) {
      warned = true;
      console.error("[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — forms are not limited");
    }
    return false;
  }
  try {
    const identifier = key ?? clientIp(await headers());
    const { success } = await limiter.limit(identifier);
    return !success;
  } catch (error) {
    console.error("[rate-limit] check failed, allowing request", error);
    return false;
  }
}
