import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

/**
 * Production allows crawling except admin and API routes. Vercel preview deployments are
 * blocked entirely so they never compete with the real site in search results.
 */
export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.VERCEL_ENV !== undefined && process.env.VERCEL_ENV !== "production";
  if (isPreview) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api"] },
    sitemap: new URL("/sitemap.xml", siteConfig.url).toString(),
  };
}
