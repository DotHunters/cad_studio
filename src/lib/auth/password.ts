/**
 * Admin passwords (AGENTS.md §11). scrypt from Node's crypto, so no extra dependency; the
 * stored format carries its parameters so they can be raised later without breaking logins.
 */
import {
  createHash,
  randomBytes,
  randomInt,
  scrypt,
  type ScryptOptions,
  timingSafeEqual,
} from "node:crypto";

const PARAMS = { N: 2 ** 15, r: 8, p: 1 };
const KEY_LENGTH = 32;

function derive(password: string, salt: Buffer, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // maxmem must exceed 128 × N × r bytes (32 MiB for the defaults).
    scrypt(password, salt, KEY_LENGTH, { ...options, maxmem: 64 * 1024 * 1024 }, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

/** `scrypt$N$r$p$salt$hash`, salt and hash base64url. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

/** False for a wrong password and for a missing or malformed hash. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const parts = stored?.split("$") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((value) => Number.isInteger(value) && value > 0)) return false;
  const expected = Buffer.from(parts[5], "base64url");
  if (expected.length !== KEY_LENGTH) return false;
  const key = await derive(password, Buffer.from(parts[4], "base64url"), { N, r, p });
  return timingSafeEqual(key, expected);
}

/** Constant-time string comparison (for the super admin password from .env). */
export function safeEqual(a: string, b: string): boolean {
  // Hashing first gives equal-length inputs, so the time reveals neither content nor length.
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(a), digest(b));
}

// No look-alike characters (0/O, 1/l/I), so it can be read out or typed from a screenshot.
const TEMP_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random 16-character temporary password (~92 bits), in groups of four for readability. */
export function temporaryPassword(): string {
  const chars = Array.from({ length: 16 }, () => TEMP_ALPHABET[randomInt(TEMP_ALPHABET.length)]);
  return [0, 4, 8, 12].map((start) => chars.slice(start, start + 4).join("")).join("-");
}
