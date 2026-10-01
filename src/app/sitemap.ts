import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getActivePackages } from "@/server/queries/packages";
import { getPublishedProjects } from "@/server/queries/portfolio";

// Public pages without a locale prefix ("" = home). Portfolio, gallery, reviews, quote and
// booking are added as those milestones ship.
const STATIC_PATHS = ["", "/packages", "/portfolio", "/about", "/contact", "/privacy", "/terms"];

// Regenerate hourly so new or renamed packages appear without a deploy.
export const revalidate = 3600;

function entry(path: string, priority: number): MetadataRoute.Sitemap[number] {
  const url = (locale: string) => new URL(`/${locale}${path}`, siteConfig.url).toString();
  return {
    url: url(siteConfig.defaultLocale),
    changeFrequency: "weekly",
    priority,
    alternates: {
      languages: Object.fromEntries(
        siteConfig.locales.map((locale) => [locale === "en" ? "en-CA" : "fr-CA", url(locale)]),
      ),
    },
  };
}

/** One entry per page (English URL) with en-CA / fr-CA alternates (AGENTS.md §10). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [packages, projects] = await Promise.all([getActivePackages(), getPublishedProjects()]);
  return [
    ...STATIC_PATHS.map((path) => entry(path, path === "" ? 1 : 0.7)),
    ...packages.map((pkg) => entry(`/packages/${pkg.slug}`, 0.8)),
    // Sample projects are excluded automatically when sample content is off (production).
    ...projects.map((project) => entry(`/portfolio/${project.slug}`, 0.6)),
  ];
}
