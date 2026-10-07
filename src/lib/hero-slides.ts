import { isBlobUrl, isLocalId, localImagePath } from "@/lib/images";

/**
 * Home hero slides chosen in Admin → Hero slides. Stored as one `SiteSetting` row: an ordered
 * list of `Image` ids with a crop focus each. An empty list means "use the launch photos from
 * scripts/photos.config.mjs".
 */
export const HERO_SLIDES_KEY = "HERO_SLIDES";
export const MAX_HERO_SLIDES = 8;

/** CSS object-position that keeps the subject in frame when the photo is cropped to the screen. */
export const HERO_FOCUS = {
  top: "50% 25%",
  center: "50% 50%",
  bottom: "50% 75%",
} as const;

export type HeroFocus = keyof typeof HERO_FOCUS;
export type HeroSlideChoice = { imageId: string; focus: HeroFocus };

export const isHeroFocus = (value: unknown): value is HeroFocus =>
  typeof value === "string" && Object.hasOwn(HERO_FOCUS, value);

/** Reads the stored setting: valid entries only, no repeats, at most MAX_HERO_SLIDES. */
export function parseHeroSlides(value: unknown): HeroSlideChoice[] {
  if (!Array.isArray(value)) return [];
  const slides: HeroSlideChoice[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { imageId, focus } = entry as Record<string, unknown>;
    const id = typeof imageId === "string" ? imageId.trim() : "";
    if (!id || slides.some((slide) => slide.imageId === id)) continue;
    slides.push({ imageId: id, focus: isHeroFocus(focus) ? focus : "center" });
    if (slides.length === MAX_HERO_SLIDES) break;
  }
  return slides;
}

/** Appends a photo (centred); unchanged when it is already a slide or the list is full. */
export function addHeroSlide(slides: readonly HeroSlideChoice[], imageId: string) {
  if (slides.length >= MAX_HERO_SLIDES || slides.some((slide) => slide.imageId === imageId)) {
    return [...slides];
  }
  return [...slides, { imageId, focus: "center" as const }];
}

export const removeHeroSlide = (slides: readonly HeroSlideChoice[], imageId: string) =>
  slides.filter((slide) => slide.imageId !== imageId);

/** Swaps a slide with its neighbour; unchanged at the ends or for an unknown id. */
export function moveHeroSlide(
  slides: readonly HeroSlideChoice[],
  imageId: string,
  direction: "up" | "down",
) {
  const index = slides.findIndex((slide) => slide.imageId === imageId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= slides.length) return [...slides];
  const next = [...slides];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export const setHeroSlideFocus = (
  slides: readonly HeroSlideChoice[],
  imageId: string,
  focus: HeroFocus,
) => slides.map((slide) => (slide.imageId === imageId ? { ...slide, focus } : slide));

/**
 * Full-screen hero images go straight to next/image, so only launch photos (`local/…`) and
 * admin uploads (Vercel Blob) qualify; seeded placeholders and old Cloudinary ids don't.
 */
export function heroImageSrc(publicId: string): string | null {
  if (isLocalId(publicId)) return localImagePath(publicId);
  if (isBlobUrl(publicId)) return publicId;
  return null;
}
