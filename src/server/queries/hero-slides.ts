import "server-only";

import { unstable_cache } from "next/cache";

import type { Locale } from "@/config/site";
import { db } from "@/lib/db";
import { shouldShowSampleContent } from "@/lib/flags";
import {
  HERO_FOCUS,
  HERO_SLIDES_KEY,
  heroImageSrc,
  type HeroSlideChoice,
  parseHeroSlides,
} from "@/lib/hero-slides";
import { localize } from "@/lib/localize";
import { photos } from "@/lib/photos";
import { CACHE_TAGS, CONTENT_REVALIDATE_SECONDS } from "@/server/cache";

export type HeroSlide = { src: string; alt: string; blurDataUrl?: string; position: string };

const imageSelect = {
  id: true,
  publicId: true,
  width: true,
  height: true,
  blurDataUrl: true,
  alt: true,
  altFr: true,
  consentToPublish: true,
  isSample: true,
} as const;

async function readChoices(): Promise<HeroSlideChoice[]> {
  const setting = await db.siteSetting.findUnique({ where: { key: HERO_SLIDES_KEY } });
  return parseHeroSlides(setting?.value);
}

/** The launch photos picked in scripts/photos.config.mjs — used until the owner chooses. */
function defaultSlides(locale: Locale): HeroSlide[] {
  return photos.hero.map((photo) => {
    const group = photos.groups.find((g) => g.slug === photo.group);
    return {
      src: photo.src,
      blurDataUrl: photo.blurDataUrl,
      position: photo.position,
      alt: group ? localize(group.alt, group.altFr, locale) : "",
    };
  });
}

// Locale and sample flag are arguments so they are part of the cache key.
const cachedHeroSlides = unstable_cache(
  async (locale: Locale, includeSamples: boolean): Promise<HeroSlide[]> => {
    const choices = await readChoices();
    const images = await db.image.findMany({
      where: { id: { in: choices.map((choice) => choice.imageId) } },
      select: imageSelect,
    });
    const byId = new Map(images.map((image) => [image.id, image]));
    const slides = choices.flatMap((choice) => {
      const image = byId.get(choice.imageId);
      // A removed photo, withdrawn consent or an unservable id drops out of the show.
      const src = image && heroImageSrc(image.publicId);
      if (!image || !src || !image.consentToPublish || (image.isSample && !includeSamples)) {
        return [];
      }
      return [
        {
          src,
          blurDataUrl: image.blurDataUrl ?? undefined,
          position: HERO_FOCUS[choice.focus],
          alt: localize(image.alt, image.altFr, locale),
        },
      ];
    });
    return slides.length > 0 ? slides : defaultSlides(locale);
  },
  ["home:hero-slides"],
  {
    tags: [CACHE_TAGS.settings, CACHE_TAGS.gallery, CACHE_TAGS.portfolio],
    revalidate: CONTENT_REVALIDATE_SECONDS,
  },
);

/** Home hero slides: the admin's choice, else the launch photos. */
export const getHeroSlides = (locale: Locale) =>
  cachedHeroSlides(locale, shouldShowSampleContent());

/** Admin list: the chosen slides with their photos, plus whether each one can be shown. */
export async function getHeroSlidesForAdmin() {
  const choices = await readChoices();
  const images = await db.image.findMany({
    where: { id: { in: choices.map((choice) => choice.imageId) } },
    select: imageSelect,
  });
  const byId = new Map(images.map((image) => [image.id, image]));
  return choices.map((choice) => {
    const image = byId.get(choice.imageId) ?? null;
    return {
      ...choice,
      image,
      showable: Boolean(image && image.consentToPublish && heroImageSrc(image.publicId)),
    };
  });
}

/** Photos that can be added: client consent given, servable full screen, not already a slide. */
export async function getHeroPhotoOptions() {
  const [choices, images] = await Promise.all([
    readChoices(),
    db.image.findMany({
      where: {
        consentToPublish: true,
        ...(shouldShowSampleContent() ? {} : { isSample: false }),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: imageSelect,
    }),
  ]);
  const chosen = new Set(choices.map((choice) => choice.imageId));
  return images.filter((image) => !chosen.has(image.id) && heroImageSrc(image.publicId));
}
