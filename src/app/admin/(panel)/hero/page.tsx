import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { StoredImage } from "@/components/site/stored-image";
import { buttonVariants } from "@/components/ui/button";
import { MAX_HERO_SLIDES } from "@/lib/hero-slides";
import { cn } from "@/lib/utils";
import {
  moveHeroPhoto,
  removeHeroPhoto,
  setHeroPhotoFocus,
} from "@/server/actions/admin/hero-slides";
import { requireAdminPage } from "@/server/auth/guards";
import { getHeroSlides, getHeroSlidesForAdmin } from "@/server/queries/hero-slides";

import { SlideControls } from "./slide-controls";

export const metadata: Metadata = { title: "Hero slides" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const NOTICES: Record<string, string> = {
  added: "Photo added. The home page shows it now.",
};
const ERRORS: Record<string, string> = {
  full: `The slideshow already has ${MAX_HERO_SLIDES} photos. Remove one first.`,
};

export default async function AdminHeroPage({ searchParams }: Props) {
  await requireAdminPage("ADMIN");
  const { saved, error } = await searchParams;
  // No Suspense here: row actions must be able to refresh the page (see add-ons list).
  const [slides, defaults] = await Promise.all([getHeroSlidesForAdmin(), getHeroSlides("en")]);
  const full = slides.length >= MAX_HERO_SLIDES;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-4xl">Hero slides</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            The full-screen photos at the top of the home page, in order. Choose up to{" "}
            {MAX_HERO_SLIDES} photos with client consent; upload new ones in Portfolio or Images
            first.
          </p>
        </div>
        {full ? (
          <span className={cn(buttonVariants(), "pointer-events-none opacity-50")} aria-disabled>
            Add photo
          </span>
        ) : (
          <Link href="/admin/hero/add" className={buttonVariants()}>
            Add photo
          </Link>
        )}
      </div>

      {typeof saved === "string" && NOTICES[saved] && (
        <p
          role="status"
          className="mt-6 rounded-lg border bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
        >
          {NOTICES[saved]}
        </p>
      )}
      {typeof error === "string" && ERRORS[error] && (
        <p role="alert" className="text-destructive mt-6 rounded-lg border p-3 text-sm">
          {ERRORS[error]}
        </p>
      )}

      {slides.length === 0 ? (
        <section aria-labelledby="hero-default" className="mt-8">
          <h2 id="hero-default" className="text-lg font-medium">
            Showing the launch photos
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Add a photo to replace these with your own choice.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {defaults.map((slide) => (
              <li
                key={slide.src}
                className="bg-muted relative aspect-video overflow-hidden rounded-lg"
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 50vw"
                  className="object-cover"
                  style={{ objectPosition: slide.position }}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <ol className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slides.map((slide, index) => {
            const label = `slide ${index + 1}`;
            return (
              <li key={slide.imageId} className="bg-card overflow-hidden rounded-xl border">
                <div className="bg-muted relative aspect-video">
                  {slide.image ? (
                    <StoredImage
                      image={slide.image}
                      alt=""
                      fill
                      sizes="(min-width: 1280px) 30vw, (min-width: 640px) 45vw, 100vw"
                      className="object-cover"
                    />
                  ) : null}
                  <span className="bg-ink/80 text-paper absolute top-2 left-2 rounded-full px-2 py-0.5 text-xs">
                    {index + 1}
                  </span>
                </div>
                <div className="space-y-3 p-4">
                  <p className="truncate text-sm font-medium">
                    {slide.image?.alt ?? "Photo removed"}
                  </p>
                  {!slide.showable && (
                    <p className="text-destructive text-xs">
                      Not shown: the photo was removed or no longer has client consent.
                    </p>
                  )}
                  <SlideControls
                    label={label}
                    focus={slide.focus}
                    setFocus={setHeroPhotoFocus.bind(null, slide.imageId)}
                    moveUp={moveHeroPhoto.bind(null, slide.imageId, "up")}
                    moveDown={moveHeroPhoto.bind(null, slide.imageId, "down")}
                    remove={removeHeroPhoto.bind(null, slide.imageId)}
                    isFirst={index === 0}
                    isLast={index === slides.length - 1}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
