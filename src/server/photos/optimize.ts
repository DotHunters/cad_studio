import "server-only";

import sharp from "sharp";

/** Same output as `pnpm photos` — keep in sync with scripts/photos.config.mjs. */
export const MAX_EDGE = 2400;
export const WEBP_QUALITY = 80;

export type OptimizedPhoto = {
  webp: Buffer;
  width: number;
  height: number;
  blurDataUrl: string;
};

/**
 * Turns an uploaded original into a web-ready WebP (AGENTS.md §10): rotated upright from
 * EXIF, longest edge ≤ 2400 px (never enlarged), quality 80, plus a 16 px blur preview.
 * Metadata (camera details, GPS location) is dropped — sharp keeps none unless asked to.
 */
export async function optimizePhoto(original: Buffer): Promise<OptimizedPhoto> {
  const webp = await sharp(original, { failOn: "none" })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 5, smartSubsample: true })
    .toBuffer();
  const output = sharp(webp);
  const { width, height } = await output.metadata();
  const blur = await output
    .clone()
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();
  if (!width || !height) throw new Error("Couldn't read the photo's size");
  return { webp, width, height, blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}` };
}
