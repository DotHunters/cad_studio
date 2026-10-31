import { describe, expect, it } from "vitest";

import { eventServicesJsonLd } from "@/lib/seo/json-ld";

describe("eventServicesJsonLd", () => {
  it("describes the event services without prices", () => {
    const data = eventServicesJsonLd({
      baseUrl: "https://cadstudio.example",
      locale: "fr",
      name: "Événements par CAD",
      description: "Gestion d’événements",
      services: ["Gestion d’événements", "Décoration"],
    });
    expect(data).toMatchObject({
      "@type": "Service",
      name: "Événements par CAD",
      serviceType: "Event management",
      url: "https://cadstudio.example/fr/events",
      provider: { "@type": "ProfessionalService", name: "CAD Studio Photography" },
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        itemListElement: [
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Gestion d’événements" } },
          { "@type": "Offer", itemOffered: { "@type": "Service", name: "Décoration" } },
        ],
      },
    });
    expect(JSON.stringify(data)).not.toContain("price");
  });
});
