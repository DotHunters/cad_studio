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
  name: "Cad Studio",
  tagline: "Collection Art Design",
  // TODO(owner): real domain (Q6). `.example` is reserved and non-routable.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://cadstudio.example",
  owner: {
    name: "I. Rukshan",
    role: "Founder & Lead Photographer",
  },
  location: {
    // No public street address (Q1) — service area only, no map.
    city: "Scarborough",
    region: "Toronto",
    province: "ON",
    country: "CA",
    serviceArea: "Based in Scarborough, Toronto — serving the GTA, Canada-wide and worldwide",
  },
  timezone: resolveTimezone(process.env.STUDIO_TIMEZONE),
  contact: {
    // TODO(owner): real business email and phone (Q6).
    email: "hello@cadstudio.example",
    bookingsEmail: "bookings@cadstudio.example",
    phone: null as string | null,
  },
  // TODO(owner): social profile URLs.
  socials: {
    instagram: null as string | null,
    facebook: null as string | null,
    tiktok: null as string | null,
  },
  // TODO(owner): business hours.
  businessHours: null as string | null,
  locales: ["en", "fr"] as const,
  defaultLocale: "en" as const,
} as const;

export type Locale = (typeof siteConfig.locales)[number];

export { resolveTimezone };
