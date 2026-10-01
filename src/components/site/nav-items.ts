import type { Messages } from "next-intl";

type NavKey = keyof Messages["Nav"];

export type NavItem = { key: NavKey; href: string };

export const mainNav: NavItem[] = [
  { key: "packages", href: "/packages" },
  { key: "portfolio", href: "/portfolio" },
  { key: "gallery", href: "/gallery" },
  { key: "reviews", href: "/reviews" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

export const legalNav: NavItem[] = [
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
];

export const ctaNav = {
  quote: { key: "getQuote", href: "/quote" },
  book: { key: "bookDate", href: "/book" },
} satisfies Record<string, NavItem>;
