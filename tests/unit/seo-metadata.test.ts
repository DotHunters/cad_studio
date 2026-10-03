import { describe, expect, it } from "vitest";

import { pageMetadata } from "@/lib/seo/metadata";

describe("pageMetadata", () => {
  const meta = pageMetadata({
    locale: "fr",
    path: "/packages",
    title: "Forfaits",
    description: "Desc",
  });

  it("sets canonical and hreflang alternates", () => {
    expect(meta.alternates).toEqual({
      canonical: "/fr/packages",
      languages: {
        "en-CA": "/en/packages",
        "fr-CA": "/fr/packages",
        "x-default": "/en/packages",
      },
    });
  });

  it("sets Open Graph and Twitter cards with the page title and locale", () => {
    expect(meta.openGraph).toMatchObject({
      title: "Forfaits | CAD Studio Photography",
      locale: "fr_CA",
      alternateLocale: ["en_CA"],
      url: "/fr/packages",
      siteName: "CAD Studio Photography",
    });
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Forfaits | CAD Studio Photography",
    });
  });

  it("leaves the title to the layout default for the home page", () => {
    const home = pageMetadata({ locale: "en", path: "", description: "Home" });
    expect(home).not.toHaveProperty("title");
    expect(home.alternates?.canonical).toBe("/en");
  });
});
