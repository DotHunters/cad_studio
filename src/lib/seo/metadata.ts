import type { Metadata } from "next";

import { type Locale, siteConfig } from "@/config/site";

const OG_IMAGE = { url: "/brand/og-default.jpg", width: 1200, height: 630 };
const OG_LOCALE: Record<Locale, string> = { en: "en_CA", fr: "fr_CA" };

type Options = {
  locale: Locale;
  /** Path without the locale prefix, e.g. "/packages" or "" for home. */
  path: string;
  /** Page title (the layout template adds "| CAD Studio Photography"); omit to use the default. */
  title?: string;
  description: string;
  /** Absolute social title; defaults to the page title. */
  socialTitle?: string;
};

/**
 * Per-page metadata (AGENTS.md §10): canonical + hreflang alternates, Open Graph and
 * Twitter cards. Next.js doesn't derive og:title from a page title, so pages set both here.
 */
export function pageMetadata({ locale, path, title, description, socialTitle }: Options): Metadata {
  const ogTitle = socialTitle ?? (title ? `${title} | ${siteConfig.name}` : siteConfig.name);
  const url = `/${locale}${path}`;

  return {
    ...(title && { title }),
    description,
    alternates: {
      canonical: url,
      languages: {
        "en-CA": `/en${path}`,
        "fr-CA": `/fr${path}`,
        "x-default": `/en${path}`,
      },
    },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      locale: OG_LOCALE[locale],
      alternateLocale: Object.values(OG_LOCALE).filter((value) => value !== OG_LOCALE[locale]),
      url,
      title: ogTitle,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
