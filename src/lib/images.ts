/**
 * Placeholder images until real work is uploaded (AGENTS.md §13). Uses placehold.co PNGs
 * in brand colours. Cloudinary delivery arrives with task 3.1.
 */
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

/**
 * URL for a stored image. Seeded samples use `placeholder/<slug>-<n>` ids and render as blank
 * brand-toned placeholders; real Cloudinary delivery is added in task 3.1.
 */
export function storedImageSrc(image: StoredImage): string {
  if (image.publicId.startsWith(PLACEHOLDER_PREFIX)) {
    const index = Number(image.publicId.match(/-(\d+)$/)?.[1] ?? 0);
    const background = PLACEHOLDER_SHADES[index % PLACEHOLDER_SHADES.length];
    return placeholderImage(image.width, image.height, { background });
  }
  // TODO(3.1): Cloudinary URL with transformations.
  throw new Error(`Cloudinary images are not wired up yet (task 3.1): ${image.publicId}`);
}
