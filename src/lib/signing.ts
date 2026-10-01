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
