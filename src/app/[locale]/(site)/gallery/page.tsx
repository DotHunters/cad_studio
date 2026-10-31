import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { LightboxGrid } from "@/components/gallery/lightbox-grid";
import { FilterGroup } from "@/components/site/filter-group";
import { JsonLd } from "@/components/site/json-ld";
import { Accent } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import {
  filterGallery,
  galleryHref,
  galleryTags,
  paginateGallery,
  parseGalleryFilters,
} from "@/lib/gallery-filters";
import { storedImageSrc } from "@/lib/images";
import { localize } from "@/lib/localize";
import { imageGalleryJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { cn } from "@/lib/utils";
import { getGalleryImages } from "@/server/queries/gallery";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Gallery" });
  return pageMetadata({
    locale,
    path: "/gallery",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/**
 * Gallery (AGENTS.md §6.4): full-width masonry grid under a minimal header, theme (tag)
 * filter only — the service filter is hidden (owner decision 2026-10-31) — and "load more".
 */
export default async function GalleryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Only the theme filter is offered, so a ?category from old links is ignored.
  const filters = { ...parseGalleryFilters(await searchParams), category: null };

  const [t, images] = await Promise.all([getTranslations(), getGalleryImages()]);
  const matching = filterGallery(images, filters);
  const { items, hasMore } = paginateGallery(matching, filters.page);
  const tags = galleryTags(images);
  const hasFilters = Boolean(filters.tag);

  return (
    <div className="px-2 pt-10 pb-16 sm:px-4 sm:pt-14 sm:pb-24 lg:px-6">
      <JsonLd
        data={imageGalleryJsonLd({
          baseUrl: siteConfig.url,
          locale,
          path: "/gallery",
          name: t("Gallery.metaTitle"),
          description: t("Gallery.metaDescription"),
          images: matching.map((image) => ({
            url: storedImageSrc(image),
            caption: localize(image.alt, image.altFr, locale),
            width: image.width,
            height: image.height,
          })),
        })}
      />
      <header className="flex flex-col gap-2 px-2 sm:flex-row sm:items-end sm:justify-between sm:px-0">
        <h1 className="text-4xl leading-none sm:text-5xl">
          {t.rich("Gallery.title", { accent: (chunks: ReactNode) => <Accent>{chunks}</Accent> })}
        </h1>
        <p role="status" className="text-muted-foreground text-sm">
          {t("Gallery.count", { shown: items.length, total: matching.length })}
        </p>
      </header>

      {tags.length > 1 && (
        <nav
          aria-label={t("Gallery.filtersLabel")}
          className="bg-background/90 sticky top-16 z-20 mt-6 border-y px-2 py-3 backdrop-blur sm:px-0"
        >
          <FilterGroup
            label={t("Gallery.tag")}
            hideLabel
            options={[
              {
                key: "all",
                label: t("Gallery.all"),
                active: !filters.tag,
                href: galleryHref(filters, { tag: null }),
              },
              ...tags.map((tag) => ({
                key: tag,
                label: tag.replaceAll("-", " "),
                active: filters.tag === tag,
                href: galleryHref(filters, { tag }),
              })),
            ]}
          />
        </nav>
      )}

      {items.length > 0 ? (
        // CSS columns give a masonry layout while keeping each image's real aspect ratio.
        <LightboxGrid
          images={items.map((image) => ({
            ...image,
            alt: localize(image.alt, image.altFr, locale),
          }))}
          className="mt-4 columns-2 gap-2 sm:mt-6 sm:columns-3 sm:gap-3 lg:columns-4 2xl:columns-5 [&>li]:mb-2 sm:[&>li]:mb-3"
          itemClassName="bg-muted break-inside-avoid overflow-hidden rounded-sm"
          imageClassName="h-auto w-full"
          sizes="(min-width: 1536px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          // First row loads eagerly for a fast LCP; the rest lazy-load.
          priorityCount={4}
        />
      ) : (
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">{t("Gallery.empty")}</p>
          {hasFilters && (
            <Link href="/gallery" className="text-gold-text mt-3 inline-block underline">
              {t("Gallery.clearFilters")}
            </Link>
          )}
        </div>
      )}

      {hasMore && (
        <div className="mt-10 text-center">
          <Link
            href={galleryHref(filters, { page: filters.page + 1 })}
            scroll={false}
            className={cn(buttonVariants({ variant: "outline", size: "cta" }))}
          >
            {t("Gallery.loadMore")}
          </Link>
        </div>
      )}
    </div>
  );
}
