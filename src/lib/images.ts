/**
 * Placeholder images until real work is uploaded (AGENTS.md §13). Uses placehold.co PNGs
 * in brand colours. Cloudinary delivery arrives with task 3.1.
 */
import { cloudinaryUrl, solidBlurDataUrl } from "./cloudinary";

const PLACEHOLDER_HOST = "https://placehold.co";

type PlaceholderOptions = {
  /** Optional label. Leave empty where real text is overlaid on the image. */
  text?: string;
  /** Background hex without "#". Defaults to a near-black card colour. */
  background?: string;
};

export function placeholderImage(
  width: number,
  height: number,
  { text, background = "1a1a1a" }: PlaceholderOptions = {},
): string {
  const label = text?.trim();
  if (!label) {
    // placehold.co always prints something (dimensions by default); matching the text colour
    // to the background makes the image blank.
    return `${PLACEHOLDER_HOST}/${width}x${height}/${background}/${background}.png`;
  }
  const encoded = encodeURIComponent(label).replace(/%20/g, "+");
  return `${PLACEHOLDER_HOST}/${width}x${height}/${background}/c79856.png?text=${encoded}&font=playfair-display`;
}

/** Image record fields needed to render a stored image. */
export type StoredImage = { publicId: string; width: number; height: number };

const PLACEHOLDER_PREFIX = "placeholder/";
/** Photos optimized by `pnpm photos` and served from `public/` (e.g. `local/photos/x/x-01.webp`). */
const LOCAL_PREFIX = "local/";

export function isLocalId(publicId: string): boolean {
  return publicId.startsWith(LOCAL_PREFIX);
}

/** Site-relative path of a local photo: `local/photos/a.webp` → `/photos/a.webp`. */
export function localImagePath(publicId: string): string {
  return `/${publicId.slice(LOCAL_PREFIX.length)}`;
}
/** Photos uploaded in admin are stored in Vercel Blob; their id is the file's public URL. */
const BLOB_URL = /^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i;

export function isBlobUrl(publicId: string): boolean {
  return BLOB_URL.test(publicId);
}

/** "Maternity Session — photo 3": the alt text uploaded photos start with (editable later). */
export function uploadedPhotoAlt(prefix: string, index: number): string {
  return `${prefix.trim()} — photo ${index}`;
}

const PLACEHOLDER_SHADES = ["1c1c1c", "231d16", "1a1a1a", "2a2118", "181818"];

export function isPlaceholderId(publicId: string): boolean {
  return publicId.startsWith(PLACEHOLDER_PREFIX);
}

function placeholderShade(publicId: string): string {
  const index = Number(publicId.match(/-(\d+)$/)?.[1] ?? 0);
  return PLACEHOLDER_SHADES[index % PLACEHOLDER_SHADES.length];
}

/** Blur placeholder matching a seeded placeholder image's shade. */
export function placeholderBlur(publicId: string): string {
  return solidBlurDataUrl(placeholderShade(publicId));
}

/**
 * Full-size URL for a stored image (for Open Graph, JSON-LD and other non-<img> uses).
 * Seeded samples use `placeholder/<slug>-<n>` ids and render as blank brand-toned
 * placeholders; `local/…` photos are absolute URLs on the site; other ids are delivered by
 * Cloudinary.
 */
export function storedImageSrc(
  image: StoredImage,
  cloudName: string = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
  siteUrl: string = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cadstudio.example",
): string {
  if (isLocalId(image.publicId)) {
    return new URL(localImagePath(image.publicId), siteUrl).toString();
  }
  if (isBlobUrl(image.publicId)) return image.publicId;
  if (isPlaceholderId(image.publicId)) {
    return placeholderImage(image.width, image.height, {
      background: placeholderShade(image.publicId),
    });
  }
  return cloudinaryUrl(image.publicId, { cloudName });
}

/** The project's chosen cover if it's among its publishable images, else the first one. */
export function pickCover<T extends { id: string }>(
  images: readonly T[],
  coverId: string | null,
): T | null {
  return images.find((image) => image.id === coverId) ?? images[0] ?? null;
}
