/**
 * schema.org JSON-LD builders (AGENTS.md §10). Pure functions so they're unit tested;
 * rendered by <JsonLd>. Only owner-confirmed facts go in here.
 */
import { type Locale, siteConfig } from "@/config/site";
import { customerDisplayName } from "@/lib/review-display";
import { averageRating } from "@/lib/reviews";

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
    areaServed: ["Greater Toronto Area", "Canada", "Sri Lanka", "Worldwide"],
    foundingDate: String(siteConfig.foundedYear),
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

const MAX_GALLERY_IMAGES = 30;

type GalleryImageInput = { url: string; caption: string; width: number; height: number };

/** ImageGallery for the gallery page and case studies (AGENTS.md §10). */
export function imageGalleryJsonLd({
  baseUrl,
  locale,
  path,
  name,
  description,
  images,
}: Base & { path: string; name: string; description: string; images: GalleryImageInput[] }) {
  const owner = businessRef(baseUrl);
  return {
    "@type": "ImageGallery",
    name,
    description,
    url: absolute(baseUrl, `/${locale}${path}`),
    publisher: owner,
    image: images.slice(0, MAX_GALLERY_IMAGES).map((image) => ({
      "@type": "ImageObject",
      contentUrl: image.url,
      caption: image.caption,
      width: image.width,
      height: image.height,
      creditText: siteConfig.name,
      copyrightHolder: owner,
    })),
  } satisfies JsonLdObject;
}

const MAX_REVIEWS = 20;

type ReviewInput = {
  type: "CUSTOMER" | "RECOMMENDATION";
  authorName: string;
  rating: number | null;
  body: string;
  isSample: boolean;
  createdAt: Date;
};

/**
 * AggregateRating + Review for the reviews page (AGENTS.md §6.7, §10). Callers pass approved
 * reviews only; sample reviews are always left out so search engines never see invented
 * ratings. Null when there are no real rated reviews yet.
 */
export function reviewsJsonLd({
  baseUrl,
  locale,
  reviews,
}: Base & { reviews: ReadonlyArray<ReviewInput> }) {
  const rated = reviews.filter(
    (review): review is ReviewInput & { rating: number } =>
      !review.isSample && review.type === "CUSTOMER" && review.rating !== null,
  );
  const average = averageRating(rated.map((review) => review.rating));
  if (average === null) return null;
  return {
    ...businessRef(baseUrl),
    url: absolute(baseUrl, `/${locale}/reviews`),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: average,
      reviewCount: rated.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: [...rated]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, MAX_REVIEWS)
      .map((review) => ({
        "@type": "Review",
        author: { "@type": "Person", name: customerDisplayName(review.authorName) },
        datePublished: review.createdAt.toISOString().slice(0, 10),
        reviewBody: review.body,
        reviewRating: { "@type": "Rating", ratingValue: review.rating, bestRating: 5 },
      })),
  } satisfies JsonLdObject;
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so it can't end the tag. */
export function serializeJsonLd(data: JsonLdObject): string {
  return JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c");
}
