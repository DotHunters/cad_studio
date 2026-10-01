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
 * placeholders; real ids are delivered by Cloudinary.
 */
export function storedImageSrc(
  image: StoredImage,
  cloudName: string = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "",
): string {
  if (isPlaceholderId(image.publicId)) {
    return placeholderImage(image.width, image.height, {
      background: placeholderShade(image.publicId),
    });
  }
  return cloudinaryUrl(image.publicId, { cloudName });
}
