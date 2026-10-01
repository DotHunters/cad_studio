import { defineRouting } from "next-intl/routing";

import { siteConfig } from "@/config/site";

export const routing = defineRouting({
  locales: siteConfig.locales,
  defaultLocale: siteConfig.defaultLocale,
  // Every public URL carries its locale: /en/…, /fr/… (AGENTS.md §9).
  localePrefix: "always",
});
