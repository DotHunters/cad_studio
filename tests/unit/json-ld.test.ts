import { describe, expect, it } from "vitest";

import { businessJsonLd, personJsonLd, serializeJsonLd, serviceJsonLd } from "@/lib/seo/json-ld";

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
