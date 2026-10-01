/**
 * schema.org JSON-LD builders (AGENTS.md §10). Pure functions so they're unit tested;
 * rendered by <JsonLd>. Only owner-confirmed facts go in here.
 */
import { type Locale, siteConfig } from "@/config/site";

type JsonLdObject = { "@type": string } & Record<string, unknown>;
type Base = { baseUrl: string; locale: Locale };

const absolute = (baseUrl: string, path: string) => new URL(path, baseUrl).toString();

function businessRef(baseUrl: string) {
  return {
    "@type": "ProfessionalService",
    name: siteConfig.name,
    url: absolute(baseUrl, "/"),
  };
}

export function businessJsonLd({ baseUrl, locale }: Base) {
  return {
    "@type": "ProfessionalService",
    name: siteConfig.name,
    alternateName: siteConfig.tagline,
    url: absolute(baseUrl, `/${locale}`),
    logo: absolute(baseUrl, "/brand/logo-gold.png"),
    image: absolute(baseUrl, "/brand/og-default.png"),
    email: siteConfig.contact.email,
    // Service area only — no street address is published (owner decision).
    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.location.city,
      addressRegion: siteConfig.location.province,
      addressCountry: siteConfig.location.country,
    },
    areaServed: ["Greater Toronto Area", "Canada", "Worldwide"],
    founder: { "@type": "Person", name: siteConfig.owner.name },
    knowsLanguage: ["en", "fr"],
  } satisfies JsonLdObject;
}

type ServicePackage = {
  slug: string;
  name: string;
  description: string;
  category: string;
  basePriceCents: number;
};

export function serviceJsonLd({
  baseUrl,
  locale,
  pkg,
  pricingConfirmed,
}: Base & { pkg: ServicePackage; pricingConfirmed: boolean }) {
  const url = absolute(baseUrl, `/${locale}/packages/${pkg.slug}`);
  return {
    "@type": "Service",
    name: pkg.name,
    description: pkg.description,
    serviceType: pkg.category,
    url,
    provider: businessRef(baseUrl),
    areaServed: ["Greater Toronto Area", "Canada"],
    // Placeholder prices are never published to search engines.
    ...(pricingConfirmed && {
      offers: {
        "@type": "Offer",
        price: (pkg.basePriceCents / 100).toFixed(2),
        priceCurrency: "CAD",
        url,
      },
    }),
  } satisfies JsonLdObject;
}

export function personJsonLd({ baseUrl, locale, jobTitle }: Base & { jobTitle: string }) {
  return {
    "@type": "Person",
    name: siteConfig.owner.name,
    jobTitle,
    url: absolute(baseUrl, `/${locale}/about`),
    worksFor: businessRef(baseUrl),
  } satisfies JsonLdObject;
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so it can't end the tag. */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
}
