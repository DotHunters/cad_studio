import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { LightboxGrid } from "@/components/gallery/lightbox-grid";
import { FilterGroup } from "@/components/site/filter-group";
import { JsonLd } from "@/components/site/json-ld";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/config/site";
import { categorySlugs } from "@/lib/categories";
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

/** Gallery (AGENTS.md §6.4): masonry grid, category/tag filters, "load more". */
export default async function GalleryPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const filters = parseGalleryFilters(await searchParams);

  const [t, images] = await Promise.all([getTranslations(), getGalleryImages()]);
  const matching = filterGallery(images, filters);
  const { items, hasMore } = paginateGallery(matching, filters.page);
  const tags = galleryTags(images);
  const hasFilters = Boolean(filters.category || filters.tag);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
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
      <SectionHeading
        as="h1"
        align="center"
        eyebrow={t("Gallery.eyebrow")}
        title={t.rich("Gallery.title", {
          accent: (chunks: ReactNode) => <Accent>{chunks}</Accent>,
        })}
        intro={t("Gallery.intro")}
      />

      <nav aria-label={t("Gallery.filtersLabel")} className="mt-12 space-y-3 border-y py-5">
        <FilterGroup
          label={t("Gallery.category")}
          options={[
            {
              key: "all",
              label: t("Gallery.all"),
              active: !filters.category,
              href: galleryHref(filters, { category: null }),
            },
            ...categorySlugs.map((slug) => ({
              key: slug,
              label: t(`Categories.${slug}.name`),
              active: filters.category === slug,
              href: galleryHref(filters, { category: slug }),
            })),
          ]}
        />
        {tags.length > 1 && (
          <FilterGroup
            label={t("Gallery.tag")}
            options={[
              {
                key: "all",
                label: t("Gallery.all"),
                active: !filters.tag,
                href: galleryHref(filters, { tag: null }),
              },
              ...tags.map((tag) => ({
                key: tag,
                label: tag,
                active: filters.tag === tag,
                href: galleryHref(filters, { tag }),
              })),
            ]}
          />
        )}
      </nav>

      <p role="status" className="text-muted-foreground mt-6 text-sm">
        {t("Gallery.count", { shown: items.length, total: matching.length })}
      </p>

      {items.length > 0 ? (
        // CSS columns give a masonry layout while keeping each image's real aspect ratio.
        <LightboxGrid
          images={items.map((image) => ({
            ...image,
            alt: localize(image.alt, image.altFr, locale),
          }))}
          className="mt-6 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-4"
          itemClassName="bg-muted break-inside-avoid overflow-hidden rounded-lg"
          imageClassName="h-auto w-full"
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          // First row loads eagerly for a fast LCP; the rest lazy-load.
          priorityCount={3}
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
