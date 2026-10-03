/**
 * Site-wide constants (AGENTS.md §4, §8.3). Anything not confirmed by the owner is
 * marked TODO(owner) — see docs/loop/OPEN_QUESTIONS.md.
 */

const DEFAULT_TIMEZONE = "America/Toronto";

function resolveTimezone(value: string | undefined): string {
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

export const siteConfig = {
  name: "CAD Studio Photography",
  tagline: "Collection Art Design",
  // Owner-supplied About copy (2026-10): established in Sri Lanka in 2014.
  foundedYear: 2014,
  // TODO(owner): real domain (Q6). `.example` is reserved and non-routable.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://cadstudio.example",
  owner: {
    name: "I. Rukshan",
    role: "Founder & Lead Photographer",
  },
  location: {
    // No public street address (Q1) — service area only, no map.
    city: "Toronto",
    region: "Toronto",
    province: "ON",
    country: "CA",
    serviceArea: "Based in Toronto — serving the GTA, Canada-wide, Sri Lanka and worldwide",
  },
  timezone: resolveTimezone(process.env.STUDIO_TIMEZONE),
  contact: {
    // Owner-supplied (2026-10). Sending addresses stay on the dummy domain until a real one is
    // verified in Resend (Q6); replies and admin notifications go to `email`.
    email: "cadstudio01@gmail.com",
    bookingsEmail: "bookings@cadstudio.example",
    phones: [
      { country: "CA", display: "+1 437-223-6197", tel: "+14372236197" },
      { country: "LK", display: "+94 77 184 4347", tel: "+94771844347" },
    ],
  },
  socials: {
    instagram: "https://www.instagram.com/cadstudio/" as string | null,
    facebook: "https://www.facebook.com/cad.photos.54" as string | null,
    tiktok: null as string | null,
  },
  // Trust-strip stats. Only owner-confirmed numbers; null hides the stat (AGENTS.md §13).
  stats: {
    yearsExperience: 10 as number | null,
    eventsPhotographed: 2000 as number | null,
    // Canada and Sri Lanka.
    countries: 2 as number | null,
  },
  // TODO(owner): business hours.
  businessHours: null as string | null,
  locales: ["en", "fr"] as const,
  defaultLocale: "en" as const,
} as const;

export type Locale = (typeof siteConfig.locales)[number];

export { resolveTimezone };
