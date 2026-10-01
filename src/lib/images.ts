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
