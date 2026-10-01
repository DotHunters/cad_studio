import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Placeholder images until the owner uploads real work.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },
};

export default withNextIntl(nextConfig);
