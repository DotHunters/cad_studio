import "server-only";

// Development-only fallback so local quotes work without configuration.
const DEV_SECRET = "cad-studio-local-development-link-secret";

/** LINK_TOKEN_SECRET, required outside local development. */
export function linkSecret(): string {
  const secret = process.env.LINK_TOKEN_SECRET;
  if (secret) return secret;
  if (process.env.VERCEL_ENV) throw new Error("LINK_TOKEN_SECRET is not set");
  return DEV_SECRET;
}
