/**
 * Environment-driven content flags (AGENTS.md §13). Pure so they can be unit tested.
 */
type Env = Partial<Record<string, string>>;

/** Placeholder pricing banner: until the owner confirms prices, everywhere except Vercel production. */
export function shouldShowPricingBanner(env: Env = process.env): boolean {
  return env.PRICING_CONFIRMED !== "true" && env.VERCEL_ENV !== "production";
}

/** Fictional sample clients/reviews render only when explicitly enabled (never in production). */
export function shouldShowSampleContent(env: Env = process.env): boolean {
  return env.SHOW_SAMPLE_CONTENT === "true" && env.VERCEL_ENV !== "production";
}

/** Privacy/Terms are drafts until a lawyer signs off; then set LEGAL_REVIEWED=true. */
export function shouldShowLegalDraftNotice(env: Env = process.env): boolean {
  return env.LEGAL_REVIEWED !== "true";
}
