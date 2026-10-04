/**
 * Builds the social-share thumbnail (Open Graph / Twitter card): `public/brand/og-default.jpg`,
 * 1200×630. The first home hero photo, darkened, with the gold logo and one line of text.
 * Re-run after changing the hero photos: `pnpm og`.
 */
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

const WIDTH = 1200;
const HEIGHT = 630;
const OUTPUT = path.join("public", "brand", "og-default.jpg");
const LINE = "PHOTOGRAPHY & VIDEOGRAPHY  ·  TORONTO  ·  SRI LANKA";

const { hero } = JSON.parse(await readFile(path.join("src", "data", "photos.json"), "utf8"));
const photo = path.join("public", hero[0].src);

// Darker at the centre-bottom where the logo and text sit, so they read on any photo.
const shade = Buffer.from(`
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="55%" r="75%">
      <stop offset="0%" stop-color="#111111" stop-opacity="0.78"/>
      <stop offset="100%" stop-color="#111111" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
</svg>`);

const logoWidth = 640;
const logo = await sharp(path.join("public", "brand", "logo-gold.png"))
  .resize({ width: logoWidth })
  .toBuffer();
const logoHeight = (await sharp(logo).metadata()).height;
const logoTop = Math.round((HEIGHT - logoHeight) / 2) - 30;

const text = Buffer.from(`
<svg width="${WIDTH}" height="80" xmlns="http://www.w3.org/2000/svg">
  <rect x="${WIDTH / 2 - 40}" y="6" width="80" height="2" fill="#C79856"/>
  <text x="50%" y="52" text-anchor="middle" fill="#FAF8F5" font-family="Helvetica, Arial, sans-serif"
        font-size="22" letter-spacing="5">${LINE.replace("&", "&amp;")}</text>
</svg>`);

await sharp(photo)
  .resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" })
  .composite([
    { input: shade, top: 0, left: 0 },
    { input: logo, top: logoTop, left: Math.round((WIDTH - logoWidth) / 2) },
    { input: text, top: logoTop + logoHeight + 6, left: 0 },
  ])
  // JPEG keeps it small (link previews time out on heavy images); photos don't need PNG.
  .jpeg({ quality: 85, progressive: true, mozjpeg: true })
  .toFile(OUTPUT);

const { size } = await stat(OUTPUT);
process.stdout.write(
  `og: wrote ${OUTPUT} (${WIDTH}×${HEIGHT}, ${Math.round(size / 1024)} KB) from ${hero[0].src}\n`,
);
