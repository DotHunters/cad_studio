import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HMAC-signed values for private links (AGENTS.md §11), e.g. /quote/CAD-Q-2026-0001?t=…
 * References are sequential and guessable, so links must carry a signature. Prefix values
 * with their purpose ("quote:", "booking:") so a signature can't be reused across link types.
 */
const SIGNATURE_LENGTH = 32;

export function signValue(value: string, secret: string): string {
  if (secret.length < 32) throw new Error("Signing secret must be at least 32 characters");
  return createHmac("sha256", secret).update(value).digest("base64url").slice(0, SIGNATURE_LENGTH);
}

export function verifySignedValue(
  value: string,
  signature: string | undefined,
  secret: string,
): boolean {
  if (!signature || signature.length !== SIGNATURE_LENGTH) return false;
  const expected = Buffer.from(signValue(value, secret));
  const actual = Buffer.from(signature);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/**
 * Expiring signed links (AGENTS.md §11): the signature covers the value and the expiry
 * (Unix seconds), so neither can be changed and old links stop working.
 */
export function signExpiring(value: string, expiresAt: Date, secret: string) {
  const exp = Math.floor(expiresAt.getTime() / 1000);
  return { exp, signature: signValue(`${value}|${exp}`, secret) };
}

export function verifyExpiring(
  value: string,
  exp: number | string | undefined,
  signature: string | undefined,
  secret: string,
  now: Date = new Date(),
): boolean {
  const expiry = Number(exp);
  if (!Number.isInteger(expiry) || expiry * 1000 <= now.getTime()) return false;
  return verifySignedValue(`${value}|${expiry}`, signature, secret);
}
