import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Always render <title>/<meta> in the initial <head> (SEO, task 8.3). By default Next 15
  // streams metadata into the body for clients it doesn't list as HTML-limited bots —
  // including Googlebot — and some crawlers and link previews only read the head.
  htmlLimitedBots: /.*/,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Placeholder images until the owner uploads real work.
      { protocol: "https", hostname: "placehold.co" },
      // Cloudinary images use a custom loader; allowed here for any direct use.
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
