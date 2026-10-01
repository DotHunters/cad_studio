import { describe, expect, it } from "vitest";

import {
  businessJsonLd,
  imageGalleryJsonLd,
  personJsonLd,
  reviewsJsonLd,
  serializeJsonLd,
  serviceJsonLd,
} from "@/lib/seo/json-ld";

const base = "https://cadstudio.example";

describe("businessJsonLd", () => {
  const ld = businessJsonLd({ baseUrl: base, locale: "en" });

  it("describes a ProfessionalService without a street address", () => {
    expect(ld["@type"]).toBe("ProfessionalService");
    expect(ld.name).toBe("Cad Studio");
    expect(ld.address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Scarborough",
      addressRegion: "ON",
      addressCountry: "CA",
    });
    expect(ld.address).not.toHaveProperty("streetAddress");
  });

  it("uses absolute URLs and names the founder", () => {
    expect(ld.url).toBe(`${base}/en`);
    expect(ld.logo).toBe(`${base}/brand/logo-gold.png`);
    expect(ld.founder).toMatchObject({ "@type": "Person", name: "I. Rukshan" });
  });
});

describe("serviceJsonLd", () => {
  const pkg = {
    slug: "wedding",
    name: "Wedding",
    description: "Two photographers…",
    category: "Weddings",
    basePriceCents: 280000,
  };

  it("omits offers while pricing is unconfirmed", () => {
    const ld = serviceJsonLd({ baseUrl: base, locale: "en", pkg, pricingConfirmed: false });
    expect(ld).not.toHaveProperty("offers");
    expect(ld.url).toBe(`${base}/en/packages/wedding`);
    expect(ld.provider).toMatchObject({ name: "Cad Studio" });
  });

  it("includes a CAD starting price once pricing is confirmed", () => {
    const ld = serviceJsonLd({ baseUrl: base, locale: "fr", pkg, pricingConfirmed: true });
    expect(ld.offers).toEqual({
      "@type": "Offer",
      price: "2800.00",
      priceCurrency: "CAD",
      url: `${base}/fr/packages/wedding`,
    });
  });
});

describe("personJsonLd", () => {
  it("describes the owner", () => {
    expect(personJsonLd({ baseUrl: base, locale: "en", jobTitle: "Founder" })).toMatchObject({
      "@type": "Person",
      name: "I. Rukshan",
      jobTitle: "Founder",
      worksFor: { "@type": "ProfessionalService", name: "Cad Studio" },
    });
  });
});

describe("serializeJsonLd", () => {
  it("adds @context and escapes characters that could close the script tag", () => {
    const json = serializeJsonLd({ "@type": "Thing", name: "</script><script>alert(1)" });
    expect(json).toContain('"@context":"https://schema.org"');
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).name).toBe("</script><script>alert(1)");
  });
});

describe("imageGalleryJsonLd", () => {
  const images = Array.from({ length: 40 }, (_, i) => ({
    url: `https://img.example/${i}.png`,
    caption: `Image ${i}`,
    width: 1600,
    height: 1067,
  }));

  it("describes the gallery with image objects", () => {
    const ld = imageGalleryJsonLd({
      baseUrl: base,
      locale: "en",
      path: "/gallery",
      name: "Gallery",
      description: "Browse",
      images: images.slice(0, 2),
    });
    expect(ld).toMatchObject({
      "@type": "ImageGallery",
      name: "Gallery",
      url: `${base}/en/gallery`,
      publisher: { name: "Cad Studio" },
    });
    expect(ld.image[0]).toEqual({
      "@type": "ImageObject",
      contentUrl: "https://img.example/0.png",
      caption: "Image 0",
      width: 1600,
      height: 1067,
      creditText: "Cad Studio",
      copyrightHolder: { "@type": "ProfessionalService", name: "Cad Studio", url: `${base}/` },
    });
  });

  it("caps the number of images to keep the page light", () => {
    const ld = imageGalleryJsonLd({
      baseUrl: base,
      locale: "en",
      path: "/gallery",
      name: "G",
      description: "",
      images,
    });
    expect(ld.image).toHaveLength(30);
  });
});

describe("reviewsJsonLd", () => {
  const review = (overrides: Partial<Parameters<typeof reviewsJsonLd>[0]["reviews"][number]>) => ({
    type: "CUSTOMER" as const,
    authorName: "Alex Martin",
    rating: 5,
    body: "Wonderful day.",
    isSample: false,
    createdAt: new Date("2026-06-01T12:00:00Z"),
    ...overrides,
  });

  it("emits the average and reviews with first name + last initial", () => {
    const ld = reviewsJsonLd({
      baseUrl: base,
      locale: "fr",
      reviews: [review({}), review({ rating: 4, createdAt: new Date("2026-07-01T12:00:00Z") })],
    });
    expect(ld).toMatchObject({
      "@type": "ProfessionalService",
      url: `${base}/fr/reviews`,
      aggregateRating: { ratingValue: 4.5, reviewCount: 2, bestRating: 5, worstRating: 1 },
    });
    expect(ld?.review[0]).toEqual({
      "@type": "Review",
      author: { "@type": "Person", name: "Alex M." },
      datePublished: "2026-07-01",
      reviewBody: "Wonderful day.",
      reviewRating: { "@type": "Rating", ratingValue: 4, bestRating: 5 },
    });
  });

  it("never includes sample reviews or unrated recommendations", () => {
    const ld = reviewsJsonLd({
      baseUrl: base,
      locale: "en",
      reviews: [
        review({}),
        review({ isSample: true, rating: 1 }),
        review({ type: "RECOMMENDATION", rating: null }),
      ],
    });
    expect(ld?.aggregateRating).toMatchObject({ ratingValue: 5, reviewCount: 1 });
    expect(ld?.review).toHaveLength(1);
  });

  it("is null without real rated reviews", () => {
    expect(reviewsJsonLd({ baseUrl: base, locale: "en", reviews: [] })).toBeNull();
    expect(
      reviewsJsonLd({ baseUrl: base, locale: "en", reviews: [review({ isSample: true })] }),
    ).toBeNull();
  });
});
