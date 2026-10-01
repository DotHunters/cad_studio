import type { Metadata } from "next";
import type { Locale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";

import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";
import { JsonLd } from "@/components/site/json-ld";
import { FilterGroup } from "@/components/site/filter-group";
import { Accent, SectionHeading } from "@/components/site/section-heading";
import { StarRating } from "@/components/site/star-rating";
import { siteConfig } from "@/config/site";
import { categorySlugs } from "@/lib/categories";
import { applyReviewFilters, parseReviewFilters, reviewsHref } from "@/lib/review-display";
import { averageRating } from "@/lib/reviews";
import { reviewsJsonLd } from "@/lib/seo/json-ld";
import { pageMetadata } from "@/lib/seo/metadata";
import { getPublishedReviews } from "@/server/queries/reviews";
import { getVerifiedBooking } from "@/server/review-links";

type Props = {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Reviews" });
  return pageMetadata({
    locale,
    path: "/reviews",
    title: t("metaTitle"),
    description: t("metaDescription"),
  });
}

/** Reviews (AGENTS.md §6.7): customer reviews + recommendations, average, filter, sort. */
export default async function ReviewsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const filters = parseReviewFilters(query);
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const link = { reference: first(query.booking), exp: first(query.exp), token: first(query.t) };
  const [t, reviews, verified] = await Promise.all([
    getTranslations(),
    getPublishedReviews(),
    getVerifiedBooking(link.reference, link.exp, link.token),
  ]);

  const customers = reviews.filter((review) => review.type === "CUSTOMER");
  const recommendations = reviews.filter((review) => review.type === "RECOMMENDATION");
  const ratings = customers.map((review) => review.rating);
  const average = averageRating(ratings);
  const count = ratings.filter((rating) => rating !== null).length;

  const visibleCustomers = applyReviewFilters(customers, filters);
  const visibleRecommendations = applyReviewFilters(recommendations, {
    ...filters,
    sort: "newest",
  });

  const structuredData = reviewsJsonLd({ baseUrl: siteConfig.url, locale, reviews });

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
      {structuredData && <JsonLd data={structuredData} />}
      <SectionHeading
        as="h1"
        align="center"
        eyebrow={t("Reviews.eyebrow")}
        title={t.rich("Reviews.title", {
          accent: (chunks: ReactNode) => <Accent>{chunks}</Accent>,
        })}
        intro={t("Reviews.intro")}
      />

      <p
        className="mt-6 flex items-center justify-center gap-2 text-sm"
        data-testid="reviews-summary"
      >
        {average !== null ? (
          <>
            <StarRating rating={average} label={t("Home.starsLabel", { rating: average })} />
            {t("Reviews.summary", { rating: average, count })}
          </>
        ) : (
          t("Reviews.noRatings")
        )}
      </p>

      <nav aria-label={t("Reviews.filtersLabel")} className="mt-12 space-y-3 border-y py-5">
        <FilterGroup
          label={t("Reviews.category")}
          options={[
            {
              key: "all",
              label: t("Reviews.all"),
              active: !filters.category,
              href: reviewsHref(filters, { category: null }),
            },
            ...categorySlugs.map((slug) => ({
              key: slug,
              label: t(`Categories.${slug}.name`),
              active: filters.category === slug,
              href: reviewsHref(filters, { category: slug }),
            })),
          ]}
        />
        <FilterGroup
          label={t("Reviews.sort")}
          options={(["newest", "highest"] as const).map((sort) => ({
            key: sort,
            label: t(`Reviews.${sort}`),
            active: filters.sort === sort,
            href: reviewsHref(filters, { sort }),
          }))}
        />
      </nav>

      <section aria-labelledby="customers-title" className="mt-12">
        <h2 id="customers-title" className="text-3xl">
          {t("Reviews.customersTitle")}
        </h2>
        {visibleCustomers.length > 0 ? (
          <ul className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {visibleCustomers.map((review) => (
              <li key={review.id}>
                <ReviewCard review={review} locale={locale} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground mt-4">{t("Reviews.empty")}</p>
        )}
      </section>

      {recommendations.length > 0 && (
        <section aria-labelledby="recommendations-title" className="mt-16">
          <h2 id="recommendations-title" className="text-3xl">
            {t("Reviews.recommendationsTitle")}
          </h2>
          {visibleRecommendations.length > 0 ? (
            <ul className="mt-6 grid gap-5 md:grid-cols-2">
              {visibleRecommendations.map((review) => (
                <li key={review.id}>
                  <ReviewCard review={review} locale={locale} className="md:p-8" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-4">{t("Reviews.empty")}</p>
          )}
        </section>
      )}
      <section aria-labelledby="share-title" id="share" className="mt-20 scroll-mt-24">
        <SectionHeading
          id="share-title"
          eyebrow={t("Reviews.writeCta")}
          title={t.rich("ReviewForm.heading", {
            accent: (chunks: ReactNode) => <Accent>{chunks}</Accent>,
          })}
          intro={t("ReviewForm.intro")}
        />
        <div className="mt-8 max-w-3xl">
          {verified ? (
            <p role="note" className="bg-card mb-6 rounded-lg border p-4 text-sm">
              {t("ReviewForm.verifiedNotice", { reference: verified.reference })}
            </p>
          ) : link.reference ? (
            <p role="note" className="text-muted-foreground mb-6 rounded-lg border p-4 text-sm">
              {t("ReviewForm.linkInvalid")}
            </p>
          ) : null}
          <ReviewForm
            booking={
              verified
                ? {
                    reference: verified.reference,
                    exp: String(link.exp),
                    token: String(link.token),
                    category: verified.categorySlug,
                  }
                : undefined
            }
          />
        </div>
      </section>
    </div>
  );
}
