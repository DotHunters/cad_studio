/**
 * Converts the owner's original photos to compressed, web-ready WebP (`pnpm photos`).
 *
 *   assets/<folder>/<file>.jpg  →  public/photos/<slug>/<slug>-NN.webp
 *   assets/Owner.jpg            →  public/photos/owner/owner-NN.webp
 *   assets/Slide1.jpg           →  public/photos/background/background-NN.webp
 *
 * Each image is auto-rotated from EXIF, resized so its longest edge is at most MAX_EDGE (never
 * upscaled), stripped of metadata (camera serials, GPS) and encoded as WebP. Width, height, a
 * tiny blur placeholder and the year it was taken are written to `src/data/photos.json`.
 *
 * Unchanged images are skipped (output newer than its source); pass `--force` to re-encode all.
 * Outputs that no longer match a source are deleted.
 */
import { mkdir, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import { groups, hero, MAX_EDGE, singles, WEBP_QUALITY } from "./photos.config.mjs";

const ASSETS = "assets";
const PUBLIC = "public";
const OUT_DIR = path.join(PUBLIC, "photos");
const MANIFEST = path.join("src", "data", "photos.json");
const SOURCE_EXT = /\.(jpe?g|png|tiff?|webp)$/i;
const force = process.argv.includes("--force");
const print = (line) =>
  process.stdout.write(`${line}
`);

const naturalSort = new Intl.Collator("en", { numeric: true, sensitivity: "base" }).compare;
const pad = (n) => String(n).padStart(2, "0");
const toPosix = (p) => p.split(path.sep).join("/");

async function mtime(file) {
  try {
    return (await stat(file)).mtimeMs;
  } catch {
    return 0;
  }
}

/** Year the photo was taken, from the EXIF DateTimeOriginal/DateTime text, if present. */
function exifYear(exif) {
  const match = exif?.toString("latin1").match(/(19|20)\d{2}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/);
  return match ? Number(match[0].slice(0, 4)) : null;
}

async function optimize(source, output) {
  const input = sharp(source, { limitInputPixels: false, failOn: "none" });
  const { exif } = await input.metadata();

  if (force || (await mtime(output)) <= (await mtime(source))) {
    await mkdir(path.dirname(output), { recursive: true });
    await input
      .clone()
      .rotate()
      .resize(MAX_EDGE, MAX_EDGE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 6, smartSubsample: true })
      .toFile(output);
  }

  const encoded = sharp(output);
  const { width, height } = await encoded.metadata();
  const blur = await encoded
    .clone()
    .resize(16, 16, { fit: "inside" })
    .webp({ quality: 40 })
    .toBuffer();
  const [before, after] = await Promise.all([stat(source), stat(output)]);

  return {
    src: `/${toPosix(path.relative(PUBLIC, output))}`,
    width,
    height,
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
    year: exifYear(exif),
    source: toPosix(path.relative(ASSETS, source)),
    bytes: { before: before.size, after: after.size },
  };
}

/** Optimizes files in order, a few at a time, naming them `<slug>-NN.webp`. */
async function optimizeAll(files, slug) {
  const results = new Array(files.length);
  let next = 0;
  const worker = async () => {
    while (next < files.length) {
      const index = next++;
      results[index] = await optimize(
        files[index],
        path.join(OUT_DIR, slug, `${slug}-${pad(index + 1)}.webp`),
      );
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return results;
}

async function listSources(folder) {
  const names = (await readdir(path.join(ASSETS, folder))).filter((n) => SOURCE_EXT.test(n));
  return names.sort(naturalSort).map((n) => path.join(ASSETS, folder, n));
}

/** Most common EXIF year in a set of images (null if none carry one). */
function commonYear(images) {
  const counts = new Map();
  for (const { year } of images) if (year) counts.set(year, (counts.get(year) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

async function removeStale(written) {
  const keep = new Set(written.map((src) => path.join(PUBLIC, src)));
  for (const dir of await readdir(OUT_DIR, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const file of await readdir(path.join(OUT_DIR, dir.name))) {
      const full = path.join(OUT_DIR, dir.name, file);
      if (!keep.has(full)) await rm(full);
    }
  }
}

async function main() {
  const started = Date.now();
  const manifest = { groups: [], hero: [], owner: [], background: [] };
  const all = [];
  // Drop build-only fields (original path, sizes, per-image year) from the manifest.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const strip = ({ source, bytes, year, ...image }) => image;

  for (const group of groups) {
    const images = await optimizeAll(await listSources(group.source), group.slug);
    all.push(...images);
    const { source, ...rest } = group;
    manifest.groups.push({
      ...rest,
      featured: group.featured ?? false,
      year: commonYear(images),
      images: images.map(strip),
    });
    print(`${group.slug}: ${images.length} images (from "${source}")`);
  }

  for (const [kind, files] of Object.entries(singles)) {
    const images = await optimizeAll(
      files.map((f) => path.join(ASSETS, f)),
      kind,
    );
    all.push(...images);
    manifest[kind] = images.map(strip);
    print(`${kind}: ${images.length} images`);
  }

  for (const { group: slug, file, position } of hero) {
    const image = all.find(
      (i) => i.source === `${groups.find((g) => g.slug === slug)?.source}/${file}`,
    );
    if (!image) throw new Error(`Hero image not found: ${slug} / ${file}`);
    manifest.hero.push({ ...strip(image), group: slug, position });
  }

  await removeStale(all.map((i) => i.src));
  await mkdir(path.dirname(MANIFEST), { recursive: true });
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const before = all.reduce((sum, i) => sum + i.bytes.before, 0);
  const after = all.reduce((sum, i) => sum + i.bytes.after, 0);
  const mb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  print(
    `\n${all.length} images: ${mb(before)} → ${mb(after)} ` +
      `(${Math.round((1 - after / before) * 100)}% smaller) in ${((Date.now() - started) / 1000).toFixed(0)} s`,
  );
  print(`Wrote ${MANIFEST}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
