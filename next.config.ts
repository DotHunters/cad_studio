import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // e2e builds go to their own folder so they never clobber a running `pnpm dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Always render <title>/<meta> in the initial <head> (SEO, task 8.3). By default Next 15
  // streams metadata into the body for clients it doesn't list as HTML-limited bots —
  // including Googlebot — and some crawlers and link previews only read the head.
  htmlLimitedBots: /.*/,
  // sharp (photo uploads → WebP) picks its native binary at runtime, which file tracing can't
  // follow, so the serverless function shipped without it ("Could not load the sharp module
  // using the linux-x64 runtime"). Copy the installed platform packages in explicitly.
  outputFileTracingIncludes: {
    "/admin/**": [
      "./node_modules/.pnpm/@img+sharp-*/**/*",
      "./node_modules/.pnpm/sharp@*/node_modules/@img/**/*",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      // Placeholder images until the owner uploads real work.
      { protocol: "https", hostname: "placehold.co" },
      // Cloudinary images use a custom loader; allowed here for any direct use.
      { protocol: "https", hostname: "res.cloudinary.com" },
      // Photos uploaded in admin (Vercel Blob).
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default withNextIntl(nextConfig);
